"""
Service for sunburst visualization data.
"""

import logging
import threading
import time

from arango_api.db import (
    db_ontologies,
    db_phenotypes,
    GRAPH_NAME_ONTOLOGIES,
    GRAPH_NAME_PHENOTYPES,
)

logger = logging.getLogger(__name__)

# Per-process cache of {graph_name: {uberon_id: distinct_cl_count}}, ordered by
# descending dataset count. Graph names embed a version (e.g. KN-Phenotypes-v2.0),
# so a DB re-ingest with a new version key triggers a rebuild automatically.
_UBERON_CL_COUNT_CACHE: dict = {}
_UBERON_CL_COUNT_LOCK = threading.Lock()


class SunburstServiceError(Exception):
    """Custom exception for sunburst service errors."""

    def __init__(self, message, db_error=None):
        super().__init__(message)
        self.db_error = db_error


# Edge collection carrying CSD -> UBERON. Read directly rather than filtering
# on a predicate label: the labels get renamed between ETL releases, and a stale
# label filter would empty the base ring with no error.
CSD_UBERON_EDGES = "CSD-UBERON"
PHENOTYPES_HUMAN_ID = "NCBITaxon/9606"
UBERON_SUBTREE_DEPTH = 5


def _get_uberon_cl_counts(db, graph_name):
    """Return {uberon_id: distinct_cl_count} for the base organs, ordered by
    descending dataset count. Built on first use and memoized per graph_name
    for the life of the process.

    Every organ a dataset points at is kept, including one whose CL count is
    zero: dropping it would hide a dataset's organ from the ring with nothing
    to say so. Callers floor the count for arc sizing.

    The organs are the UBERON terms a cell set dataset points at directly, read
    from the CSD-UBERON edge collection so the ring tracks the loaded data
    instead of a hardcoded list that goes stale on the next ETL release.

    Only these organs' counts are ever read (initial load and the organ-children
    expansion), so we traverse from just those roots rather than scanning the
    whole UBERON collection — the latter ran a depth-5 traversal per UBERON node
    and was the heaviest read on the Arango host."""
    cached = _UBERON_CL_COUNT_CACHE.get(graph_name)
    if cached is not None:
        return cached
    with _UBERON_CL_COUNT_LOCK:
        cached = _UBERON_CL_COUNT_CACHE.get(graph_name)
        if cached is not None:
            return cached
        logger.info("Building UBERON CL-count cache for %s", graph_name)
        start = time.monotonic()
        query = """
            LET organs = (
                FOR e IN @@edges
                    FILTER IS_SAME_COLLECTION("UBERON", e._to)
                    COLLECT organ = e._to WITH COUNT INTO datasets
                    SORT datasets DESC, organ ASC
                    RETURN organ
            )
            FOR organ IN organs
                LET cls = (
                    FOR v IN 1..@depth INBOUND organ GRAPH @g
                        OPTIONS { bfs: true, uniqueVertices: "global" }
                        FILTER IS_SAME_COLLECTION("CL", v)
                        RETURN DISTINCT v._id
                )
                RETURN [organ, LENGTH(cls)]
        """
        cursor = db.aql.execute(
            query,
            bind_vars={
                "g": graph_name,
                "depth": UBERON_SUBTREE_DEPTH,
                "@edges": CSD_UBERON_EDGES,
            },
        )
        # Insertion order is the query's dataset-count order, and every caller
        # iterates this mapping to lay out the base ring.
        entries = {row[0]: row[1] for row in cursor}
        if not entries:
            logger.warning(
                "UBERON CL-count query returned no rows for %s; not caching",
                graph_name,
            )
            return entries
        _UBERON_CL_COUNT_CACHE[graph_name] = entries
        logger.info(
            "Cached CL counts for %d UBERON nodes (%.2fs)",
            len(entries),
            time.monotonic() - start,
        )
        return entries


def get_phenotypes_sunburst(parent_id=None):
    """
    Lazy-loading sunburst for phenotypes.

    Initial load (parent_id=None): root -> Homo sapiens -> top UBERON organs,
    each populated with ALL distinct CL cells reachable through the organ's
    UBERON subtree (flat aggregation — no intermediate anatomy shown).

    Expansion (parent_id provided): returns direct children:
      NCBITaxon -> the top UBERON organs (with aggregated CL)
      UBERON    -> aggregated CL from subtree
      CL        -> GS via CL-GS
      GS        -> MONDO via GS-MONDO

    Raises:
        SunburstServiceError: If database is unavailable or query fails.
    """
    db = db_phenotypes
    if db is None:
        raise SunburstServiceError("Database connection not available.")
    graph_name = GRAPH_NAME_PHENOTYPES

    try:
        if parent_id is None:
            return _phenotypes_initial_load(db, graph_name)

        collection = parent_id.split("/", 1)[0] if "/" in parent_id else ""
        if collection == "NCBITaxon":
            return _phenotypes_organ_children(db, graph_name)
        if collection == "UBERON":
            return _phenotypes_uberon_children(db, graph_name, parent_id)
        if collection == "CL":
            return _phenotypes_cl_children(db, graph_name, parent_id)
        if collection == "GS":
            return _phenotypes_gs_children(db, graph_name, parent_id)
        return []
    except SunburstServiceError:
        raise
    except Exception as e:
        logger.exception(
            "AQL execution failed for phenotypes sunburst (parent=%s)", parent_id
        )
        db_error = None
        if hasattr(e, "response") and hasattr(e.response, "text"):
            db_error = e.response.text
        raise SunburstServiceError(
            "Failed to fetch phenotype structure.", db_error=db_error
        ) from e


def _aggregate_cl_for_organ(db, graph_name, organ_id):
    """Return all distinct CL nodes reachable from an organ through its
    UBERON PART_OF/SUB_CLASS_OF subtree. Each CL node gets _hasChildren
    set based on whether it has GS outbound edges."""
    query = """
        LET uberon_descendants = (
            FOR v IN 1..@depth INBOUND @organ GRAPH @g
                OPTIONS { bfs: true, uniqueVertices: "global" }
                FILTER IS_SAME_COLLECTION("UBERON", v)
                RETURN v._id
        )
        LET all_uberon = APPEND([@organ], uberon_descendants)
        LET all_cl = (
            FOR ub_id IN all_uberon
                FOR cl IN 1..1 INBOUND ub_id GRAPH @g
                    FILTER IS_SAME_COLLECTION("CL", cl)
                    RETURN DISTINCT cl
        )
        FOR cl IN all_cl
            LET gs_children = (
                FOR gs IN 1..1 OUTBOUND cl._id GRAPH @g
                    FILTER IS_SAME_COLLECTION("GS", gs)
                    LET has_kids = LENGTH(
                        FOR v2 IN 1..1 OUTBOUND gs._id GRAPH @g
                            FILTER IS_SAME_COLLECTION("MONDO", v2)
                                OR IS_SAME_COLLECTION("CHEMBL", v2)
                                OR IS_SAME_COLLECTION("BMC", v2)
                                OR IS_SAME_COLLECTION("PR", v2)
                            LIMIT 1 RETURN 1
                    ) > 0
                    RETURN MERGE(gs, {
                        value: 1, subtree_size: 1,
                        _hasChildren: has_kids, children: null
                    })
            )
            RETURN MERGE(cl, {
                value: 1, subtree_size: 1,
                _hasChildren: LENGTH(gs_children) > 0,
                children: gs_children
            })
    """
    return list(
        db.aql.execute(
            query,
            bind_vars={
                "organ": organ_id,
                "g": graph_name,
                "depth": UBERON_SUBTREE_DEPTH,
            },
        )
    )


def _get_cl_names_for_organ(db, graph_name, organ_id):
    """Lightweight CL list for an organ — names only, no GS/leaf chain."""
    query = """
        LET uberon_descendants = (
            FOR v IN 1..@depth INBOUND @organ GRAPH @g
                OPTIONS { bfs: true, uniqueVertices: "global" }
                FILTER IS_SAME_COLLECTION("UBERON", v)
                RETURN v._id
        )
        LET all_uberon = APPEND([@organ], uberon_descendants)
        FOR ub_id IN all_uberon
            FOR cl IN 1..1 INBOUND ub_id GRAPH @g
                FILTER IS_SAME_COLLECTION("CL", cl)
                RETURN DISTINCT MERGE(cl, {
                    value: 1, subtree_size: 1,
                    _hasChildren: true, children: null
                })
    """
    return list(
        db.aql.execute(
            query,
            bind_vars={
                "organ": organ_id,
                "g": graph_name,
                "depth": UBERON_SUBTREE_DEPTH,
            },
        )
    )


def _phenotypes_initial_load(db, graph_name):
    """Return Homo sapiens -> organs -> CL names (lightweight, no GS chain).
    The full GS/leaf chain loads on drilldown into a specific organ."""
    counts = _get_uberon_cl_counts(db, graph_name)
    organ_nodes = []
    for organ_id, cl_count in counts.items():
        cursor = db.aql.execute("RETURN DOCUMENT(@id)", bind_vars={"id": organ_id})
        doc_list = list(cursor)
        if not doc_list or doc_list[0] is None:
            continue
        doc = doc_list[0]
        cl_children = _get_cl_names_for_organ(db, graph_name, organ_id)
        # Floor at 1 so an organ with no CL descendants still gets a visible
        # arc rather than a zero-width one.
        doc["value"] = cl_count or 1
        doc["subtree_size"] = cl_count or 1
        doc["_hasChildren"] = len(cl_children) > 0
        doc["children"] = cl_children
        organ_nodes.append(doc)

    cursor = db.aql.execute(
        "RETURN DOCUMENT(@id)", bind_vars={"id": PHENOTYPES_HUMAN_ID}
    )
    human_list = list(cursor)
    human_doc = human_list[0] if human_list else None

    if human_doc:
        human_doc["value"] = 1
        human_doc["_hasChildren"] = len(organ_nodes) > 0
        human_doc["children"] = organ_nodes
        return human_doc

    return {
        "_id": PHENOTYPES_HUMAN_ID,
        "label": "Homo sapiens",
        "_hasChildren": False,
        "children": [],
    }


def _phenotypes_organ_children(db, graph_name):
    """Children of Homo sapiens: lightweight organ list."""
    counts = _get_uberon_cl_counts(db, graph_name)
    results = []
    for organ_id, cl_count in counts.items():
        cursor = db.aql.execute("RETURN DOCUMENT(@id)", bind_vars={"id": organ_id})
        doc_list = list(cursor)
        if not doc_list or doc_list[0] is None:
            continue
        doc = doc_list[0]
        doc["value"] = cl_count or 1
        doc["subtree_size"] = cl_count or 1
        doc["_hasChildren"] = cl_count > 0
        doc["children"] = None
        results.append(doc)
    return results


def _phenotypes_uberon_children(db, graph_name, parent_id):
    """Full CL -> GS -> leaf chain for a single organ (drilldown payload)."""
    return _aggregate_cl_for_organ(db, graph_name, parent_id)


def _phenotypes_cl_children(db, graph_name, parent_id):
    """CL -> GS, each GS with its MONDO/CHEMBL/BMC/PR children."""
    query = """
        FOR gs IN 1..1 OUTBOUND @pid GRAPH @g
            FILTER IS_SAME_COLLECTION("GS", gs)
            LET gs_kids = (
                FOR v2 IN 1..1 OUTBOUND gs._id GRAPH @g
                    FILTER IS_SAME_COLLECTION("MONDO", v2)
                        OR IS_SAME_COLLECTION("CHEMBL", v2)
                        OR IS_SAME_COLLECTION("BMC", v2)
                        OR IS_SAME_COLLECTION("PR", v2)
                    RETURN MERGE(v2, {
                        value: 1, subtree_size: 1,
                        _hasChildren: false, children: null
                    })
            )
            RETURN MERGE(gs, {
                value: 1, subtree_size: 1,
                _hasChildren: LENGTH(gs_kids) > 0,
                children: gs_kids
            })
    """
    return list(db.aql.execute(query, bind_vars={"pid": parent_id, "g": graph_name}))


def _phenotypes_gs_children(db, graph_name, parent_id):
    """GS -> MONDO/CHEMBL/BMC/PR (leaf nodes)."""
    query = """
        FOR v IN 1..1 OUTBOUND @pid GRAPH @g
            FILTER IS_SAME_COLLECTION("MONDO", v)
                OR IS_SAME_COLLECTION("CHEMBL", v)
                OR IS_SAME_COLLECTION("BMC", v)
                OR IS_SAME_COLLECTION("PR", v)
            RETURN MERGE(v, { value: 1, subtree_size: 1, _hasChildren: false, children: null })
    """
    return list(db.aql.execute(query, bind_vars={"pid": parent_id, "g": graph_name}))


def get_ontologies_sunburst(parent_id=None):
    """
    Fetch ontologies sunburst data.

    Supports initial load (L0+L1) and loading children + grandchildren on demand.

    Args:
        parent_id (str, optional): If provided, fetches children of this node.
            If None, fetches initial root nodes.

    Returns:
        dict or list: Root structure (dict) for initial load,
            or list of children for on-demand loading.

    Raises:
        SunburstServiceError: If database is unavailable or query fails.
    """
    db = db_ontologies
    graph_name = GRAPH_NAME_ONTOLOGIES
    label_filter = "SUB_CLASS_OF"
    initial_root_ids = [
        "CL/0000000",
        "GO/0008150",  # biological_process
        "GO/0003674",  # molecular_function
        "GO/0005575",  # cellular_component
        "PATO/0000001",
        "MONDO/0000001",
        "UBERON/0000000",
    ]

    if db is None:
        raise SunburstServiceError("Database connection not available.")

    if parent_id:
        # Fetch children and grandchildren for a specific parent
        query_children_grandchildren = """
            LET start_node_id = @parent_id

            FOR child_node, edge1 IN 1..1 INBOUND start_node_id GRAPH @graph_name
                FILTER edge1.Label == @label_filter

                LET grandchildren = (
                    FOR grandchild_node, edge2 IN 1..1 INBOUND child_node._id GRAPH @graph_name
                        FILTER edge2.Label == @label_filter

                        LET grandchild_has_children = COUNT(
                            FOR great_grandchild, edge3 IN 1..1 INBOUND grandchild_node._id GRAPH @graph_name
                                FILTER edge3.Label == @label_filter
                                LIMIT 1 RETURN 1
                        ) > 0

                        RETURN {
                            _id: grandchild_node._id,
                            label: grandchild_node.label || grandchild_node.name || grandchild_node._key,
                            value: 1,
                            _hasChildren: grandchild_has_children,
                            children: null
                        }
                )

                LET child_has_children = COUNT(grandchildren) > 0

                RETURN {
                    _id: child_node._id,
                    label: child_node.label || child_node.name || child_node._key,
                    value: 1,
                    _hasChildren: child_has_children,
                    children: grandchildren
                }
        """
        bind_vars = {
            "parent_id": parent_id,
            "graph_name": graph_name,
            "label_filter": label_filter,
        }

        try:
            cursor = db.aql.execute(query_children_grandchildren, bind_vars=bind_vars)
            return list(cursor)
        except Exception as e:
            raise SunburstServiceError(
                f"Failed to fetch nested children data for {parent_id}: {e}"
            )

    else:
        # Fetch initial roots and their children
        initial_nodes_with_children = []
        graph_root_id = "root_nlm"

        for node_id in initial_root_ids:
            query_initial = """
                LET start_node_id = @node_id

                LET start_node_doc = DOCUMENT(start_node_id)
                FILTER start_node_doc != null

                LET start_node_has_children = COUNT(
                    FOR c1, e1 IN 1..1 INBOUND start_node_id GRAPH @graph_name
                        FILTER e1.Label == @label_filter
                        LIMIT 1 RETURN 1
                ) > 0

                LET children_level1 = (
                    FOR child1_node, edge1 IN 1..1 INBOUND start_node_id GRAPH @graph_name
                        FILTER edge1.Label == @label_filter

                        LET child1_has_children = COUNT(
                            FOR c2, e2 IN 1..1 INBOUND child1_node._id GRAPH @graph_name
                                FILTER e2.Label == @label_filter
                                LIMIT 1 RETURN 1
                        ) > 0

                        RETURN {
                            _id: child1_node._id,
                            label: child1_node.label || child1_node.name || child1_node._key,
                            value: 1,
                            _hasChildren: child1_has_children,
                            children: null
                        }
                )

                RETURN {
                    _id: start_node_doc._id,
                    label: start_node_doc.label || start_node_doc.name || start_node_doc._key,
                    value: 1,
                    _hasChildren: start_node_has_children,
                    children: children_level1
                }
            """
            bind_vars = {
                "node_id": node_id,
                "graph_name": graph_name,
                "label_filter": label_filter,
            }

            try:
                cursor = db.aql.execute(query_initial, bind_vars=bind_vars)
                node_data_list = list(cursor)
                if node_data_list:
                    initial_nodes_with_children.append(node_data_list[0])
            except Exception:
                logger.exception("AQL execution failed for initial node %s", node_id)

        return {
            "_id": graph_root_id,
            "label": "NLM Cell Knowledge Network",
            "_hasChildren": len(initial_nodes_with_children) > 0,
            "children": initial_nodes_with_children,
        }
