from django.urls import path
from .views import list_collection, get_object, get_related_edges

urlpatterns = [
    path('<str:coll>/', list_collection, name='list_collection'),
    path('<str:coll>/<str:pk>/', get_object, name="get_object"),
    path('edges/<str:edge_coll>/<str:dr>/<str:item_coll>/<str:pk>/', get_related_edges, name="get_related_edges"),
]
