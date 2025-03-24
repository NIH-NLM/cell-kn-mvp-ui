from django.http import JsonResponse, HttpResponseNotFound
from rest_framework.decorators import api_view

from arango_api import utils


@api_view(["GET"])
def list_collection_names(request):
    objects = utils.get_document_collections()
    collection_names = [collection["name"] for collection in objects]
    return JsonResponse(collection_names, safe=False)


@api_view(["GET"])
def list_by_collection(request, coll):
    objects = utils.get_all_by_collection(coll)
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
    graph_name = request.data.get("graph_name")
    edge_direction = request.data.get("edge_direction")
    collections_to_prune = request.data.get("collections_to_prune")
    nodes_to_prune = request.data.get("nodes_to_prune")
    db_name = request.data.get("db_name", "base")

    search_results = utils.get_graph(
        node_ids,
        depth,
        graph_name,
        edge_direction,
        collections_to_prune,
        nodes_to_prune,
        db_name,
    )
    return JsonResponse(search_results, safe=False)

@api_view(["POST"])
def get_shortest_paths(request):
    node_ids = request.data.get("node_ids")
    graph_name = request.data.get("graph_name")
    edge_direction = request.data.get("edge_direction")

    search_results = utils.get_shortest_paths(
        node_ids,
        graph_name,
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
    search_results = utils.get_sunburst()
    return JsonResponse(search_results, safe=False)
