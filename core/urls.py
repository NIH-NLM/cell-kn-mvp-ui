"""URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import (
    settings,
)
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.views.static import serve


urlpatterns = [
    # Explicitly serve common root static files from the React build directory
    re_path(
        r"^manifest\.json$",
        serve,
        {
            "path": "manifest.json",
            "document_root": settings.REACT_APP_BUILD_DIR,
        },
    ),
    re_path(
        r"^favicon\.ico$",
        serve,
        {  # For the browser tab icon
            "path": "favicon.ico",
            "document_root": settings.REACT_APP_BUILD_DIR,
        },
    ),
    re_path(
        r"^robots\.txt$",
        serve,
        {  # For web crawlers
            "path": "robots.txt",
            "document_root": settings.REACT_APP_BUILD_DIR,
        },
    ),
    re_path(
        r"^asset-manifest\.json$",
        serve,
        {
            "path": "asset-manifest.json",
            "document_root": settings.REACT_APP_BUILD_DIR,
        },
    ),
    # PWA icons
    re_path(
        r"^android-chrome-192x192\.png$",
        serve,
        {
            "path": "android-chrome-192x192.png",
            "document_root": settings.REACT_APP_BUILD_DIR,
        },
    ),
    re_path(
        r"^android-chrome-512x512\.png$",
        serve,
        {
            "path": "android-chrome-512x512.png",
            "document_root": settings.REACT_APP_BUILD_DIR,
        },
    ),
    re_path(
        r"^apple-touch-icon\.png$",
        serve,
        {
            "path": "apple-touch-icon.png",
            "document_root": settings.REACT_APP_BUILD_DIR,
        },
    ),
    re_path(
        r"^logo192\.png$",
        serve,
        {
            "path": "logo192.png",
            "document_root": settings.REACT_APP_BUILD_DIR,
        },
    ),
    re_path(
        r"^logo512\.png$",
        serve,
        {
            "path": "logo512.png",
            "document_root": settings.REACT_APP_BUILD_DIR,
        },
    ),
    # Django URL patterns
    path("admin/", admin.site.urls),
    path("arango_api/", include("arango_api.urls")),
    path("api/", include("api.urls")),
    # React catch-all
    re_path(r"^.*$", TemplateView.as_view(template_name="index.html")),
]
