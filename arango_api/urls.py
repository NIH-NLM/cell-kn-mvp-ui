from django.urls import path
from .views import list_collection, get_object, get_related_edges, get_search_items, get_all, get_graph

urlpatterns = [
    path('collection/<str:coll>/', list_collection, name='list_collection'),
    path('collection/<str:coll>/<str:pk>/', get_object, name="get_object"),
    path('graph/<str:coll>/<str:pk>/<int:d>/', get_graph, name="get_graph"),
    path('edges/<str:edge_coll>/<str:dr>/<str:item_coll>/<str:pk>/', get_related_edges, name="get_related_edges"),
    path('search/<str:st>/', get_search_items, name="get_search_items"),
    path('get_all/', get_all, name="get_all"),
]
