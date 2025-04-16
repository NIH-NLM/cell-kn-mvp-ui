from django.http import JsonResponse, HttpResponseNotFound
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from arango_api import utils
from arango_api.db import db_ontologies, GRAPH_NAME_ONTOLOGIES
from arango_api.utils import get_collection_info

# TODO: Move from global?
EDGE_COLLECTIONS = {
    "CL": "CL-CL",
    "GO": "GO-GO",
    "PATO": "PATO-PATO",
    "MONDO": "MONDO-MONDO",
    "UBERON": "UBERON-UBERON",
}

INITIAL_ROOT_IDS = [
    "CL/0000000",
    "GO/0008150",  # biological_process
    "GO/0003674",  # molecular_function
    "GO/0005575",  # cellular_component
    "PATO/0000001",
    "MONDO/0000001",
    "UBERON/0000000",
]


@api_view(["POST"])
def list_collection_names(request):
    graph = request.data.get("graph")
    objects = utils.get_document_collections(graph)
    collection_names = [collection["name"] for collection in objects]
    return JsonResponse(collection_names, safe=False)


@api_view(["POST"])
def list_by_collection(request, coll):
    graph = request.data.get("graph")
    objects = utils.get_all_by_collection(coll, graph)
    return JsonResponse(list(objects), safe=False)


@api_view(["GET", "PUT", "DELETE"])
def get_object(request, coll, pk):
    try:
        item = utils.get_by_id(coll, pk)
        if item:
            return JsonResponse(item, safe=False)
        else:
            return HttpResponseNotFound("Object not found")
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["GET"])
def get_related_edges(request, edge_coll, dr, item_coll, pk):
    # TODO: Document arguments
    edges = utils.get_edges_by_id(edge_coll, dr, item_coll, pk)
    return JsonResponse(list(edges), safe=False)


@api_view(["GET"])
def get_search_items(request, st):
    search_results = utils.search_by_term(st)
    return JsonResponse(search_results, safe=False)


@api_view(["POST"])
def get_graph(request):
    node_ids = request.data.get("node_ids")
    depth = request.data.get("depth")
    edge_direction = request.data.get("edge_direction")
    allowed_collections = request.data.get("allowed_collections")
    node_limit = request.data.get("node_limit", 100)
    graph = request.data.get("graph", 100)

    search_results = utils.get_graph(
        node_ids, depth, edge_direction, allowed_collections, node_limit, graph
    )
    return JsonResponse(search_results, safe=False)


@api_view(["POST"])
def get_shortest_paths(request):
    node_ids = request.data.get("node_ids")
    edge_direction = request.data.get("edge_direction")

    search_results = utils.get_shortest_paths(
        node_ids,
        edge_direction,
    )
    return JsonResponse(search_results, safe=False)


@api_view(["GET"])
def get_all(request):
    search_results = utils.get_all()
    return JsonResponse(search_results, safe=False)


@api_view(["POST"])
def run_aql_query(request):
    # Extract the AQL query from the request body
    query = request.data.get("query")
    if not query:
        return JsonResponse({"error": "No query provided"}, status=400)

    # Run the AQL query
    try:
        search_results = utils.run_aql_query(query)
        return JsonResponse(search_results, safe=False)
    except Exception as e:
        ##TODO: Handle errors
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["POST"])
def get_sunburst(request):
    """
    API endpoint for fetching sunburst data.
    - If no 'parent_id' is provided, returns the initial root structure.
    - If 'parent_id' is provided, returns the direct children of that node.
    """
    parent_id = request.data.get("parent_id", None)

    if parent_id:
        # --- Fetch Children ---
        edge_col = get_collection_info(parent_id, EDGE_COLLECTIONS)
        if not edge_col:
            return Response(
                {
                    "error": f"Could not determine edge collection for parent_id: {parent_id}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # AQL query to get direct children and check if they have children themselves
        query = """
            LET parent_id = @parent_id

            FOR child_node, edge IN 1..1 INBOUND parent_id GRAPH @graph_name 
                FILTER edge.label == 'subClassOf' // Filter on the edge label

                // Check if this child_node has children using the same relationship
                LET has_children = COUNT(
                    FOR grandchild, grandchild_edge IN 1..1 INBOUND child_node._id GRAPH @graph_name 
                        FILTER grandchild_edge.label == 'subClassOf'
                        LIMIT 1 
                        RETURN 1
                ) > 0

                // Ensure required fields exist, provide defaults if necessary
                RETURN {
                    _id: child_node._id,
                    label: child_node.label || child_node.name || child_node._key, // Use label, fallback to name or _key
                    value: 1, // Assign a default value for size calculation in D3
                    _hasChildren: has_children,
                    children: null // Children are not loaded at this stage
                }
        """

        bind_vars = {
            "parent_id": parent_id,
            "graph_name": GRAPH_NAME_ONTOLOGIES,
        }

        try:
            cursor = db_ontologies.aql.execute(query, bind_vars=bind_vars)
            children_data = list(cursor)
            return Response(children_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error fetching children for {parent_id}: {e}")
            # Consider more specific error logging/handling
            return Response(
                {"error": "Failed to fetch children data."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    else:
        # --- Fetch Initial Roots ---
        initial_nodes = []
        graph_root_id = "root_nlm"  # Give the top-level root a unique ID

        for node_id in INITIAL_ROOT_IDS:
            edge_col = get_collection_info(node_id, EDGE_COLLECTIONS)
            if not edge_col:
                print(
                    f"Skipping initial node due to missing edge collection: {node_id}"
                )
                continue  # Skip nodes that can't be processed

            # Query to get node details and check if it has children
            query = """
                LET node_id = @node_id

                LET node_details = DOCUMENT(node_id)
                FILTER node_details != null // Ensure the root node exists

                // Check if this node has children
                LET has_children = COUNT(
                    FOR child, edge IN 1..1 INBOUND node_id GRAPH @graph_name 
                        FILTER edge.label == 'subClassOf'
                        LIMIT 1
                        RETURN 1
                ) > 0

                RETURN {
                    _id: node_details._id,
                    label: node_details.label || node_details.name || node_details._key,
                    value: 1,
                    _hasChildren: has_children,
                    children: null // Children are not loaded initially
                }
            """
            bind_vars = {
                "node_id": node_id,
                "graph_name": GRAPH_NAME_ONTOLOGIES,
            }

            try:
                cursor = db_ontologies.aql.execute(query, bind_vars=bind_vars)
                node_data = cursor.next()  # Expecting exactly one result for the root
                if node_data:
                    initial_nodes.append(node_data)
                else:
                    print(
                        f"Warning: Initial root node not found or query failed for {node_id}"
                    )

            except Exception as e:
                print(f"Error processing initial node {node_id}: {e}")
                # Decide if one failure should stop the whole process or just skip the node

        # Create the top-level root node structure expected by the frontend
        graph_root = {
            "_id": graph_root_id,
            "label": "NLM Cell Knowledge Network",
            "_hasChildren": True,
            "children": initial_nodes,
        }
        return Response(graph_root, status=status.HTTP_200_OK)
