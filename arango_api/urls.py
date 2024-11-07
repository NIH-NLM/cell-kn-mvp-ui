from django.urls import path
from .views import list_by_collection, get_object, get_related_edges, get_search_items, get_all, get_graph, \
    run_aql_query, list_collection_names

urlpatterns = [
    path('collections/', list_collection_names, name='list_collection_names'),
    path('collection/<str:coll>/', list_by_collection, name='list_by_collection'),
    path('collection/<str:coll>/<str:pk>/', get_object, name="get_object"),
    path('graph/', get_graph, name="get_graph"),
    path('edges/<str:edge_coll>/<str:dr>/<str:item_coll>/<str:pk>/', get_related_edges, name="get_related_edges"),
    path('search/<str:st>/', get_search_items, name="get_search_items"),
    path('aql/', run_aql_query, name="run_aql_query"),
    path('get_all/', get_all, name="get_all"),
]
