from django.db import models

class PredefinedQuery(models.Model):
    name = models.CharField(max_length=255, unique=True)
    query = models.TextField()

    def __str__(self):
        return self.name
