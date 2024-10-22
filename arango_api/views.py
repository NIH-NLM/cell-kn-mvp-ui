from django.http import JsonResponse, HttpResponseNotFound
from rest_framework.decorators import api_view
from arango_api.models import DBEntry


@api_view(['GET', 'POST'])
def list_collection(request, coll):
    objects = DBEntry.get_all(coll)
    return JsonResponse(list(objects), safe=False)


@api_view(['GET', 'PUT', 'DELETE'])
def get_object(request, coll, pk):
    try:
        item = DBEntry.get_by_id(coll, pk)
        if item:
            return JsonResponse(item, safe=False)
        else:
            return HttpResponseNotFound("Object not found")
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
def get_related_edges(request, edge_coll, dr, item_coll, pk):
    edges = DBEntry.get_edges_by_id(edge_coll, dr, item_coll, pk)
    return JsonResponse(list(edges), safe=False)
