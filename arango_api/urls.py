from django.urls import path
from .views import list_collection, get_object

urlpatterns = [
    path('<str:coll>/', list_collection, name='list_collection'),
    path('<str:coll>/<str:pk>/', get_object, name="get_object"),
]
