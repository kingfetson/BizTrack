from django.urls import path

from .views import (
    BusinessListCreateView,
    BusinessDetailView,
    BusinessMemberListView,
    BusinessMemberAddView,
    BusinessMemberDetailView,
)

urlpatterns = [
    path("", BusinessListCreateView.as_view(), name="business-list-create"),
    path("<int:pk>/", BusinessDetailView.as_view(), name="business-detail"),

    path("<int:business_pk>/members/", BusinessMemberListView.as_view(), name="member-list"),
    path("<int:business_pk>/members/add/", BusinessMemberAddView.as_view(), name="member-add"),
    path("<int:business_pk>/members/<int:pk>/", BusinessMemberDetailView.as_view(), name="member-detail"),
]