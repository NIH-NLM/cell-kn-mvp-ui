from django.urls import path

# Disabled endpoint — view/model retained for future use. This route was only
# consumed by the (unrouted) AQL query page. Uncomment the import and route to
# restore.
# from .views import PredefinedQueryList

urlpatterns = [
    # path(
    #     "predefined-queries/", PredefinedQueryList.as_view(), name="predefined-queries"
    # ),
]
