from arango_api.db import db


class DBEntry:
    def __init__(self, title, content):
        self.title = title
        self.content = content

    def save(self):
        db.collection('notes').insert({
            'title': self.title,
            'content': self.content
        })

    ##TODO: convert dict to array for use in JS
    @staticmethod
    def get_all(coll):
        collection = db.collection(coll)
        if not collection:
            print(f"Collection '{coll}' not found.")
        return collection.all()

    @staticmethod
    def get_by_id(coll, note_id):
        return db.collection(coll).get(note_id)

    def update(self, note_id):
        db.collection('notes').update(note_id, {
            'title': self.title,
            'content': self.content
        })

    @staticmethod
    def delete(note_id):
        db.collection('notes').delete(note_id)
