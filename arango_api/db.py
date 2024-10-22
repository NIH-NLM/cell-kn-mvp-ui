from arango import ArangoClient

# Configure the connection
client = ArangoClient()

# Replace these with your ArangoDB connection details
DB_HOST = 'http://127.0.0.1:8528'
##TODO: Generalize DB name?
DB_NAME = 'BioPortal-Slim'
# No auth currently
# USERNAME = ''
# PASSWORD = ''

# Connect to the database
db = client.db(DB_NAME)