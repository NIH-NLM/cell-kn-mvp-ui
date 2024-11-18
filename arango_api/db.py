import environ
from arango import ArangoClient


# Load db info from .env file
env = environ.Env()
environ.Env.read_env()

# Retrieve ArangoDB credentials from the environment
ARANGO_DB_HOST = env('ARANGO_DB_HOST')
ARANGO_DB_NAME = env('ARANGO_DB_NAME')
ARANGO_DB_USER = env('ARANGO_DB_USER')
ARANGO_DB_PASSWORD = env('ARANGO_DB_PASSWORD')

# Configure the connection
client = ArangoClient()
db = client.db(ARANGO_DB_NAME, username=ARANGO_DB_USER, password=ARANGO_DB_PASSWORD)
