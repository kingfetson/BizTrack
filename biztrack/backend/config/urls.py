from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/businesses/", include("businesses.urls")),
    path("api/businesses/<int:business_pk>/", include("products.urls")),
    path("api/businesses/<int:business_pk>/", include("sales.urls")),
    path("api/businesses/<int:business_pk>/", include("customers.urls")),
    path("api/businesses/<int:business_pk>/", include("purchases.urls")),
    path("api/businesses/<int:business_pk>/", include("reports.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)