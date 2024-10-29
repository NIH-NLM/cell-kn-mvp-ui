from itertools import chain

from arango_api.db import db


# TODO: Clean up class
class DBEntry:
    @staticmethod
    def get_document_collections():
        # Filter for document collections
        all_collections = db.collections()
        collections = [collection for collection in all_collections if collection['type'] == "document"]
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
    def get_graph(node_ids, depth, graph_name):

        query = """
            LET temp = (
                FOR node_id IN @node_ids
                    FOR v, e, p IN 0..@depth ANY node_id GRAPH @graph_name
                    RETURN {node: v, link: e}
                )

            LET uniqueNodes = UNIQUE(temp[*].node)

            RETURN {
                nodes: uniqueNodes,
                links: temp[*].link
            }
        """

        bind_vars = {'node_ids': node_ids, 'graph_name': graph_name, 'depth': depth}

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
                        OR CONTAINS(doc.comment, @search_term) 
                        OR CONTAINS(doc.definition, @search_term)
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