from itertools import chain

from arango_api.db import (
    db_ontologies,
    GRAPH_NAME_ONTOLOGIES,
    GRAPH_NAME_PHENOTYPES,
    db_phenotypes,
)


def get_document_collections(graph):
    # Filter for document collections
    if graph == "phenotypes":
        all_collections = db_phenotypes.collections()
    else:
        all_collections = db_ontologies.collections()
    collections = [
        collection
        for collection in all_collections
        if collection["type"] == "document" and not collection["name"].startswith("_")
    ]
    return collections


def get_all_by_collection(coll, graph):
    if graph == "phenotypes":
        collection = db_phenotypes.collection(coll)
    else:
        collection = db_ontologies.collection(coll)

    if not collection:
        print(f"Collection '{coll}' not found.")
    return collection.all()


def get_by_id(coll, id):
    return db_ontologies.collection(coll).get(id)


def get_edges_by_id(edge_coll, dr, item_coll, item_id):
    return db_ontologies.collection(edge_coll).find({dr: f"{item_coll}/{item_id}"})


def get_graph(
    node_ids,
    depth,
    edge_direction,
    allowed_collections,
    node_limit,
    graph,
):
    query = f"""
            // Create temp variable for paths for each origin node
            LET temp = FLATTEN(
              FOR node_id IN @node_ids
                // For each origin, collect up to @node_limit paths
                LET paths = (
                  FOR v, e, p IN 0..@depth {edge_direction} node_id GRAPH @graph_name
                    OPTIONS {{ 
                      vertexCollections: @allowed_collections,
                      order: "bfs"
                    }}
                    LIMIT @node_limit
                    RETURN {{
                      node: v,
                      link: e,
                      path: p,
                      depth: LENGTH(p.vertices)
                    }}
                )
                // Attach the origin node_id to each returned path
                RETURN (
                  FOR path IN paths
                    RETURN MERGE(path, {{ origin: node_id }})
                )
            )

            // Filter nodes to ensure uniqueness
            LET filteredNodes = UNIQUE(
              FOR obj IN temp
                FILTER obj.depth != (@depth + 1)
                RETURN {{ node: obj.node, path: obj.path, origin: obj.origin }}
            )

            // Filter links to ensure uniqueness
            LET uniqueLinks = UNIQUE(
              FOR t IN temp
                FILTER t.link != null
                RETURN t.link
            )

            // Organize nodes in object, sorting by origin node id
            LET nodesGrouped = MERGE(
              FOR node_id IN @node_ids
                RETURN {{
                  [node_id]: (
                    FOR obj IN filteredNodes
                      FILTER obj.origin == node_id
                      RETURN {{ node: obj.node, path: obj.path }}
                  )
                }}
            )

            RETURN {{
              nodes: nodesGrouped,
              links: uniqueLinks
            }}
    """

    # Use correct graph name
    if graph == "phenotypes":
        graph_name = GRAPH_NAME_PHENOTYPES
    else:
        graph_name = GRAPH_NAME_ONTOLOGIES
    # Depth is increased by one to find all edges that connect to final nodes
    bind_vars = {
        "node_ids": node_ids,
        "graph_name": graph_name,
        "depth": int(depth) + 1,
        "allowed_collections": allowed_collections,
        "node_limit": node_limit,
    }

    # Execute the query
    try:
        if graph == "phenotypes":
            cursor = db_phenotypes.aql.execute(query, bind_vars=bind_vars)
        else:
            cursor = db_ontologies.aql.execute(query, bind_vars=bind_vars)

        results = list(cursor)[
            0
        ]  # Collect the results - one element should be guaranteed

    except Exception as e:
        print(f"Error executing query: {e}")
        results = []

    return results


def get_shortest_paths(node_ids, edge_direction):
    combined_result = {"nodes": {}, "links": []}
    link_ids = set()

    # Loop over each unique pair (i, j) with i < j to avoid duplicate paths.
    for i in range(len(node_ids) - 1):
        for j in range(i + 1, len(node_ids)):
            start_node = node_ids[i]
            target_node = node_ids[j]

            query = f"""
                LET paths = (
                  FOR p IN {edge_direction} ALL_SHORTEST_PATHS @start_node TO @target_node
                    GRAPH @graph_name
                    RETURN p
                )

                LET nodesArray = UNIQUE(
                  FOR p IN paths
                    FOR v IN p.vertices
                      RETURN v
                )

                LET linksArray = UNIQUE(
                  FOR p IN paths
                    FOR e IN p.edges
                      RETURN e
                )

                RETURN {{
                  nodes: {{
                    [@target_node]: (
                      FOR v IN nodesArray 
                        RETURN {{ node: v }}
                    )
                  }},
                  links: linksArray
                }}
            """

            bind_vars = {
                "start_node": start_node,
                "target_node": target_node,
                "graph_name": GRAPH_NAME_ONTOLOGIES,
            }

            try:
                cursor = db_ontologies.aql.execute(query, bind_vars=bind_vars)
                result = list(cursor)[0]

                # Merge node results: result["nodes"] is like { target_node: [ { node: v }, ... ] }
                for node_id, node_list in result["nodes"].items():
                    if node_id not in combined_result["nodes"]:
                        combined_result["nodes"][node_id] = node_list
                    else:
                        # Optionally merge node lists without duplicates
                        existing_ids = {
                            n["node"]["_id"] for n in combined_result["nodes"][node_id]
                        }
                        for node_obj in node_list:
                            if node_obj["node"]["_id"] not in existing_ids:
                                combined_result["nodes"][node_id].append(node_obj)

                # Merge links without duplicates
                for link in result["links"]:
                    link_id = link.get("_id")
                    if link_id:
                        if link_id not in link_ids:
                            combined_result["links"].append(link)
                            link_ids.add(link_id)
                    else:
                        if link not in combined_result["links"]:
                            combined_result["links"].append(link)

            except Exception as e:
                print(
                    f"Error executing query for pair {start_node} to {target_node}: {e}"
                )

    return combined_result


def get_all():
    collections = get_document_collections()

    # Create the base query
    union_queries = []

    for collection in collections:
        union_queries.append(
            f"""
            FOR doc IN {collection["name"]}
                RETURN doc
        """
        )

    # Combine all queries into a single AQL statement
    final_query = "RETURN UNION(" + ", ".join(union_queries) + ")"

    # Execute the query
    try:
        cursor = db_ontologies.aql.execute(final_query)
        results = list(cursor)  # Collect the results
    except Exception as e:
        print(f"Error executing query: {e}")
        results = []

    flat_results = list(chain.from_iterable(results))

    return flat_results


def search_by_term(search_term):
    query = f"""
            // Group results by collection
            LET groupedResults = (
                FOR doc IN indexed
                SEARCH ANALYZER(
                  // Search exact match - tokenize to match
                  BOOST(doc.label == TOKENS(@search_term, "text_en")[0], 10.0) OR
                  BOOST(doc.Name == TOKENS(@search_term, "text_en")[0], 10.0) OR
                  BOOST(doc.Symbol == TOKENS(@search_term, "text_en")[0], 10.0) OR
                  BOOST(doc.Label == TOKENS(@search_term, "text_en")[0], 10.0) OR
                  BOOST(doc.PMID == TOKENS(@search_term, "text_en")[0], 10.0) OR
                  BOOST(doc.Phase == TOKENS(@search_term, "text_en")[0], 10.0) OR
                  BOOST(doc.Genotype_annotation == TOKENS(@search_term, "text_en")[0], 10.0)
                  // Search by n-gram similarity
                  OR
                  NGRAM_MATCH(doc._id, @search_term, 0.7, "bigram") OR
                  NGRAM_MATCH(doc.label, @search_term, 0.7, "bigram") OR
                  NGRAM_MATCH(doc.Name, @search_term, 0.7, "bigram") OR
                  NGRAM_MATCH(doc.Label, @search_term, 0.7, "bigram") OR
                  NGRAM_MATCH(doc.Symbol, @search_term, 0.7, "bigram") OR
                  NGRAM_MATCH(doc.PMID, @search_term, 0.7, "bigram") OR
                  NGRAM_MATCH(doc.Phase, @search_term, 0.7, "bigram") OR
                  NGRAM_MATCH(doc.Genotype_annotation, @search_term, 0.7, "bigram")
                , "text_en")
                SORT BM25(doc) DESC
                // Extract the collection name from the _id field:
                COLLECT coll = SPLIT(doc._id, "/")[0] INTO docs = doc
                RETURN {{ [coll]: docs }}
            )
            
            // Merge collection results
            RETURN MERGE(groupedResults)
        """

    bind_vars = {"search_term": search_term}
    # Execute the query
    try:
        cursor = db_ontologies.aql.execute(query, bind_vars=bind_vars)
        results = list(cursor)[0]  # Collect the results
    except Exception as e:
        print(f"Error executing query: {e}")
        results = []

    return results


def run_aql_query(query):
    print(query)
    # Execute the query
    try:
        cursor = db_ontologies.aql.execute(query)
        results = list(cursor)[
            0
        ]  # Collect the results - one element should be guaranteed
    except Exception as e:
        print(f"Error executing query: {e}")
        results = []

    return results


def get_sunburst():
    # Root node ids for each collection
    # Note that NCBITaxon is starting from cellular organisms, and not root
    node_ids = [
        "CL/0000000",
        "GO/0008150",
        "GO/0003674",
        "GO/0005575",
        "PATO/0000001",
        "MONDO/0000001",
        "UBERON/0000000",
    ]

    # Edge collections for each type
    edge_collections = {
        "CL": "CL-CL",
        "GO": "GO-GO",
        "PATO": "PATO-PATO",
        "MONDO": "MONDO-MONDO",
        "UBERON": "UBERON-UBERON",
    }

    depth = 3

    # Initialize an empty list to collect the final results for the sunburst
    root_nodes = []

    # Query to traverse the graph for each root node
    # TODO: Check whether it is better to combine into one query
    for node_id in node_ids:
        collection_type = node_id.split("/")[0]
        edge_col = edge_collections.get(collection_type)

        # Query to get nodes for a specific root node and edge collection
        query = f"""
            FOR v, e IN 0..@depth INBOUND @node_id @edge_col
                FILTER e.label == 'subClassOf' OR v._id == @node_id
                RETURN {{v, e}}
        """

        bind_vars = {"node_id": node_id, "edge_col": edge_col, "depth": depth}

        # Execute the query
        try:
            cursor = db_ontologies.aql.execute(query, bind_vars=bind_vars)
            results = list(cursor)  # Collect the results

            # Process the results to form the sunburst structure
            paths = {}  # Dictionary to store object by _id for quick lookup

            # Initialize the first root object (the node we start with)
            data = results.pop(0)["v"]
            data["children"] = []  # Initialize the children attribute
            paths[data["_id"]] = data  # Store the root node in paths

            # Iterate through results to build the child hierarchy
            for result in results:
                v = result["v"]
                e = result["e"]

                parent_id = e["_to"]  # Parent's _id
                parent = paths.get(parent_id)  # Look up the parent object

                # If parent exists, append this object to the parent's children list
                if parent:
                    if "children" not in parent:
                        parent["children"] = []  # Ensure the parent has a children list
                    parent["children"].append(v)

                # Store the current object in paths for future lookups
                paths[v["_id"]] = v

            # Append the processed data for this root node to root_nodes
            root_nodes.append(data)

        except Exception as e:
            print(f"Error processing node {node_id}: {e}")

    # Create a Root node that links only to the root nodes in node_ids
    graph_root = {"label": "NLM Cell Knowledge Network", "children": root_nodes}

    return graph_root
