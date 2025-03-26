from itertools import chain

from arango_api.db import db, schema_db


def get_document_collections():
    # Filter for document collections
    all_collections = db.collections()
    collections = [
        collection
        for collection in all_collections
        if collection["type"] == "document" and not collection["name"].startswith("_")
    ]
    return collections


def get_all_by_collection(coll):
    collection = db.collection(coll)
    if not collection:
        print(f"Collection '{coll}' not found.")
    return collection.all()


def get_by_id(coll, id):
    return db.collection(coll).get(id)


def get_edges_by_id(edge_coll, dr, item_coll, item_id):
    return db.collection(edge_coll).find({dr: f"{item_coll}/{item_id}"})


def get_graph(
    node_ids,
    depth,
    graph_name,
    edge_direction,
    collections_to_prune,
    nodes_to_prune,
    db_name,
    node_limit,
):
    # Arbitrary limit to ensure fasting loading
    traversal_limit = node_limit * 100

    query = f"""
        LET temp = (
          FOR node_id IN @node_ids
            FOR v, e, p IN 0..@depth {edge_direction} node_id GRAPH @graph_name
              PRUNE (
                CONTAINS_ARRAY(@collections_to_prune, FIRST(SPLIT(v._id, "/", 1))) OR 
                CONTAINS_ARRAY(@nodes_to_prune, v._id)
              )
              FILTER !CONTAINS_ARRAY(@collections_to_prune, FIRST(SPLIT(v._id, "/", 1)))
              FILTER !CONTAINS_ARRAY(@nodes_to_prune, v._id)
            
              LIMIT @traversal_limit
              RETURN {{
                node: v,
                link: e,
                path: p,
                depth: LENGTH(p.vertices),
                origin: node_id
              }}
        )

        LET filteredNodes = UNIQUE(
          FOR obj IN temp
            FILTER obj.depth != (@depth + 1)
            LIMIT @node_limit
            RETURN {{ node: obj.node, path: obj.path, origin: obj.origin }}
        )

        LET uniqueLinks = UNIQUE(
          FOR t IN temp
            FILTER t.link != null
            RETURN t.link
        )

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

    # Depth is increased by one to find all edges that connect to final nodes
    bind_vars = {
        "node_ids": node_ids,
        "graph_name": graph_name,
        "depth": int(depth) + 1,
        "collections_to_prune": collections_to_prune,
        "nodes_to_prune": nodes_to_prune,
        "node_limit": node_limit,
        "traversal_limit": traversal_limit,
    }

    # Execute the query
    try:
        if db_name == "schema":
            # Get schema db
            cursor = schema_db.aql.execute(query, bind_vars=bind_vars)
        else:
            # Get base db
            cursor = db.aql.execute(query, bind_vars=bind_vars)

        results = list(cursor)[
            0
        ]  # Collect the results - one element should be guaranteed

    except Exception as e:
        print(f"Error executing query: {e}")
        results = []

    return results


def get_shortest_paths(
    node_ids,
    graph_name,
    edge_direction,
):
    # Assume only two nodes
    start_node = node_ids[0]
    target_node = node_ids[1]
    # TODO: add ability to get shortest path for more nodes
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
            [@start_node]: (
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
        "graph_name": graph_name,
    }

    # Execute the query
    try:
        cursor = db.aql.execute(query, bind_vars=bind_vars)

        results = list(cursor)[0]  # Collect the results

    except Exception as e:
        print(f"Error executing query: {e}")
        results = []

    return results


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
        cursor = db.aql.execute(final_query)
        results = list(cursor)  # Collect the results
    except Exception as e:
        print(f"Error executing query: {e}")
        results = []

    flat_results = list(chain.from_iterable(results))

    return flat_results


def search_by_term(search_term):
    collections = get_document_collections()

    # Create the base query
    union_queries = []

    for collection in collections:
        union_queries.append(
            f"""
            LET results = (
                FOR doc IN {collection["name"]}
                FILTER CONTAINS(LOWER(doc.label), LOWER(@search_term)) 
                    OR CONTAINS(LOWER(doc.term), LOWER(@search_term)) 
                    OR CONTAINS(LOWER(doc._id), LOWER(@search_term)) 
                LIMIT 100
                RETURN doc
                )
            RETURN {{{collection["name"]}: results}}
        """
        )

    # Combine all queries into a single AQL statement
    final_query = "RETURN UNION(" + ", ".join(union_queries) + ")"

    bind_vars = {"search_term": search_term}
    # Execute the query
    try:
        cursor = db.aql.execute(final_query, bind_vars=bind_vars)
        results = list(cursor)  # Collect the results
    except Exception as e:
        print(f"Error executing query: {e}")
        results = []

    # Flatten and reformat results into one dictionary
    flat_results = list(chain.from_iterable(results))
    merged_dict = {}

    for d in flat_results:
        merged_dict.update(d)

    return merged_dict


def run_aql_query(query):

    print(query)
    # Execute the query
    try:
        cursor = db.aql.execute(query)
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
            cursor = db.aql.execute(query, bind_vars=bind_vars)
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
