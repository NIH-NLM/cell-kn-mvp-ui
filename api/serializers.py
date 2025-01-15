from rest_framework import serializers
from .models import PredefinedQuery


class PredefinedQuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = PredefinedQuery
        fields = ["id", "name", "query", "placeholder_1", "placeholder_2", "settings"]
