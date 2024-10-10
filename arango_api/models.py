from arango_api.db import db


class DBEntry:
    def __init__(self, title, content):
        self.title = title
        self.content = content

    @staticmethod
    def get_all(coll):
        collection = db.collection(coll)
        if not collection:
            print(f"Collection '{coll}' not found.")
        return collection.all()

    @staticmethod
    def get_by_id(coll, id):
        return db.collection(coll).get(id)
