from arango_api.db import db


class DBEntry:
    @staticmethod
    def get_all(coll):
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