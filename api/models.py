from django.db import models

class PredefinedQuery(models.Model):
    name = models.CharField(max_length=255, unique=True)
    query = models.TextField()
    placeholder_1 = models.TextField()
    placeholder_2 = models.TextField()
    settings = models.JSONField()

    def __str__(self):
        return self.name
