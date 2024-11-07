from rest_framework import serializers
from .models import PredefinedQuery

class PredefinedQuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = PredefinedQuery
        fields = ['id', 'name', 'query']  # Specify the fields you want to serialize
