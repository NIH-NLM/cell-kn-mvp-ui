from itertools import chain

from arango_api.db import db


# TODO: Clean up class
class DBEntry:
    @staticmethod
    def get_document_collections():
        # Filter for document collections
        all_collections = db.collections()
        collections = [collection for collection in all_collections if collection['type'] == "document" and not collection['name'].startswith("_")]
        return collections

    @staticmethod
    def get_all_by_collection(coll):
        collection = db.collection(coll)
        if not collection:
            print(f"Collection '{coll}' not found.")
        return collection.all()

    @staticmethod
    def get_by_id(coll, id):
        return db.collection(coll).get(id)

    @staticmethod
    def get_edges_by_id(edge_coll, dr, item_coll, item_id):
        return db.collection(edge_coll).find({dr: f"{item_coll}/{item_id}"})

    @staticmethod
    def get_graph(node_ids, depth, graph_name, edge_direction, collections_to_prune, nodes_to_prune):

        query = f"""
            LET temp = (
                FOR node_id IN @node_ids
                    FOR v, e, p IN 0..@depth {edge_direction} node_id GRAPH @graph_name
                        PRUNE (CONTAINS_ARRAY(@collections_to_prune, FIRST(SPLIT(v._id, "/", 1 ))) OR 
                            CONTAINS_ARRAY(@nodes_to_prune, v._id))
                        FILTER !CONTAINS_ARRAY(@collections_to_prune, FIRST(SPLIT(v._id, "/", 1 )))
                        FILTER !CONTAINS_ARRAY(@nodes_to_prune, v._id)
                        RETURN {{node: v, link: e}}
                )

            LET uniqueNodes = UNIQUE(temp[*].node)

            RETURN {{
                nodes: uniqueNodes,
                links: temp[*].link
            }}
        """

        bind_vars = {'node_ids': node_ids,
                     'graph_name': graph_name,
                     'depth': depth,
                     'collections_to_prune': collections_to_prune,
                     'nodes_to_prune': nodes_to_prune}

        # Execute the query
        try:
            cursor = db.aql.execute(query, bind_vars=bind_vars)
            results = list(cursor)[0]  # Collect the results - one element should be guaranteed
            # Remove None values from the links - root node edge is always null
            results['links'] = [link for link in results['links'] if link is not None]
        except Exception as e:
            print(f"Error executing query: {e}")
            results = []

        return results

    @staticmethod
    def get_all():
        collections = DBEntry.get_document_collections()

        # Create the base query
        union_queries = []

        for collection in collections:
            union_queries.append(f"""
                FOR doc IN {collection["name"]}
                    RETURN doc
            """)

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

    @staticmethod
    def search_by_term(search_term):
        collections = DBEntry.get_document_collections()

        # Create the base query
        union_queries = []

        for collection in collections:
            union_queries.append(f"""
                FOR doc IN {collection["name"]}
                    FILTER CONTAINS(doc.label, @search_term) 
                        OR CONTAINS(doc.term, @search_term) 
                    LIMIT 100
                    RETURN doc
            """)

        # Combine all queries into a single AQL statement
        final_query = "RETURN UNION(" + ", ".join(union_queries) + ")"

        bind_vars = {'search_term': search_term}
        # Execute the query
        try:
            cursor = db.aql.execute(final_query, bind_vars=bind_vars)
            results = list(cursor)  # Collect the results
        except Exception as e:
            print(f"Error executing query: {e}")
            results = []

        flat_results = list(chain.from_iterable(results))

        return flat_results

    @staticmethod
    def run_aql_query(query):

        # Execute the query
        try:
            cursor = db.aql.execute(query)
            results = list(cursor)[0]  # Collect the results - one element should be guaranteed
        except Exception as e:
            print(f"Error executing query: {e}")
            results = []

        return results

    @staticmethod
    def get_sunburst():

        # Ids of root nodes for each collection
        node_ids = [
            "CL/0000000"
        ]

        edge_col = "CL-CL"

        depth = 3

        query = f"""
            FOR v, e IN 0..@depth INBOUND @node_id @edge_col
                RETURN {{v, e}}
        """

        bind_vars = {'node_id': node_ids[0], 'edge_col': edge_col, 'depth': depth}

        # Execute the query
        try:
            cursor = db.aql.execute(query, bind_vars=bind_vars)
            results = list(cursor)  # Collect the results

            # Init data and path dict
            data = results.pop(0)['v']  # The root object is the first one
            data['children'] = []  # Initialize the children attribute for the root
            paths = {data['_id']: data}  # Dictionary to store object by _id for quick lookup

            # Iterate through results
            for result in results:
                v = result['v']
                e = result['e']

                parent_id = e['_to']  # Parent's _id
                parent = paths.get(parent_id)  # Find parent object by _id

                # If parent exists, append this object to the parent's children list
                if parent:
                    if 'children' not in parent:
                        parent['children'] = []  # Ensure the parent has a children list
                    parent['children'].append(v)

                # Store the current object in the paths dictionary for future lookups
                paths[v['_id']] = v

        except Exception as e:
            print(f"Error executing query: {e}")
            data = []

        return data
