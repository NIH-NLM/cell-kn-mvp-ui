from django.urls import path
from .views import PredefinedQueryList

urlpatterns = [
    path('predefined-queries/', PredefinedQueryList.as_view(), name='predefined-queries'),
]
