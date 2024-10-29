from rest_framework import generics
from .models import PredefinedQuery
from .serializers import PredefinedQuerySerializer

class PredefinedQueryList(generics.ListAPIView):
    queryset = PredefinedQuery.objects.all()
    serializer_class = PredefinedQuerySerializer
