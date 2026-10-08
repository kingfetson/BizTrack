from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from businesses.models import Business, BusinessMember
from .models import Category, Product

User = get_user_model()


class ProductAPITests(APITestCase):

    def setUp(self):
        # Users
        self.owner = User.objects.create_user(
            email="owner@biztrack.local", password="StrongPass123!"
        )
        self.manager = User.objects.create_user(
            email="manager@biztrack.local", password="StrongPass123!"
        )
        self.staff = User.objects.create_user(
            email="staff@biztrack.local", password="StrongPass123!"
        )
        self.outsider = User.objects.create_user(
            email="outsider@biztrack.local", password="StrongPass123!"
        )

        # Business owned by self.owner
        self.business = Business.objects.create(
            name="Test Shop", business_type="RETAIL", currency="KES"
        )
        BusinessMember.objects.create(
            user=self.owner, business=self.business, role="OWNER"
        )
        BusinessMember.objects.create(
            user=self.manager, business=self.business, role="MANAGER"
        )
        BusinessMember.objects.create(
            user=self.staff, business=self.business, role="STAFF"
        )

        # A second business owned by outsider
        self.other_business = Business.objects.create(
            name="Other Shop", business_type="RETAIL", currency="KES"
        )
        BusinessMember.objects.create(
            user=self.outsider, business=self.other_business, role="OWNER"
        )

        # Default: login as owner
        self._login("owner@biztrack.local")

    def _login(self, email):
        resp = self.client.post(reverse("login"), {
            "email": email, "password": "StrongPass123!",
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    # ------------------------------------------------------------------
    # Category tests
    # ------------------------------------------------------------------

    def test_create_category(self):
        url = reverse("category-list-create", args=[self.business.id])
        resp = self.client.post(url, {"name": "Beverages", "description": "Drinks"})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Category.objects.filter(business=self.business, name="Beverages").exists()
        )

    def test_category_name_unique_per_business(self):
        url = reverse("category-list-create", args=[self.business.id])
        self.client.post(url, {"name": "Beverages"})
        resp = self.client.post(url, {"name": "Beverages"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_same_category_name_allowed_in_other_business(self):
        Category.objects.create(business=self.business, name="Beverages")
        Category.objects.create(business=self.other_business, name="Beverages")
        self.assertEqual(Category.objects.filter(name="Beverages").count(), 2)

    # ------------------------------------------------------------------
    # Product tests
    # ------------------------------------------------------------------

    def test_create_product(self):
        url = reverse("product-list-create", args=[self.business.id])
        resp = self.client.post(url, {
            "name": "Coke 500ml",
            "sku": "COKE-500",
            "price": "60.00",
            "cost": "40.00",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["margin"], "33.33")
        self.assertTrue(
            Product.objects.filter(business=self.business, sku="COKE-500").exists()
        )

    def test_sku_unique_per_business_when_present(self):
        Product.objects.create(
            business=self.business, name="A", sku="SKU-1",
            price=Decimal("10.00"), cost=Decimal("5.00"),
        )
        url = reverse("product-list-create", args=[self.business.id])
        resp = self.client.post(url, {
            "name": "B", "sku": "SKU-1", "price": "10.00", "cost": "5.00",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_blank_sku_allowed_multiple_times(self):
        Product.objects.create(
            business=self.business, name="A", sku="",
            price=Decimal("10.00"), cost=Decimal("5.00"),
        )
        url = reverse("product-list-create", args=[self.business.id])
        resp = self.client.post(url, {
            "name": "B", "sku": "", "price": "10.00", "cost": "5.00",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_same_sku_allowed_in_different_business(self):
        Product.objects.create(
            business=self.business, name="A", sku="SKU-1",
            price=Decimal("10.00"), cost=Decimal("5.00"),
        )
        Product.objects.create(
            business=self.other_business, name="B", sku="SKU-1",
            price=Decimal("10.00"), cost=Decimal("5.00"),
        )
        self.assertEqual(Product.objects.filter(sku="SKU-1").count(), 2)

    def test_cannot_attach_category_from_other_business(self):
        other_cat = Category.objects.create(business=self.other_business, name="X")
        url = reverse("product-list-create", args=[self.business.id])
        resp = self.client.post(url, {
            "name": "B", "category": other_cat.id, "price": "10.00", "cost": "5.00",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------
    # Multi-tenant isolation
    # ------------------------------------------------------------------

    def test_outsider_cannot_list_products(self):
        Product.objects.create(
            business=self.business, name="A", sku="A1",
            price=Decimal("10.00"), cost=Decimal("5.00"),
        )
        self._login("outsider@biztrack.local")
        url = reverse("product-list-create", args=[self.business.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_outsider_cannot_create_product(self):
        self._login("outsider@biztrack.local")
        url = reverse("product-list-create", args=[self.business.id])
        resp = self.client.post(url, {"name": "B", "price": "10.00", "cost": "5.00"})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_outsider_cannot_retrieve_product(self):
        p = Product.objects.create(
            business=self.business, name="A", sku="A1",
            price=Decimal("10.00"), cost=Decimal("5.00"),
        )
        self._login("outsider@biztrack.local")
        url = reverse("product-detail", args=[self.business.id, p.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Role enforcement
    # ------------------------------------------------------------------

    def test_staff_can_read_but_not_write(self):
        self._login("staff@biztrack.local")

        # Can list
        list_url = reverse("product-list-create", args=[self.business.id])
        self.assertEqual(self.client.get(list_url).status_code, status.HTTP_200_OK)

        # Cannot create
        resp = self.client.post(list_url, {
            "name": "Nope", "price": "10.00", "cost": "5.00",
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_write(self):
        self._login("manager@biztrack.local")
        url = reverse("product-list-create", args=[self.business.id])
        resp = self.client.post(url, {
            "name": "Manager Product", "price": "10.00", "cost": "5.00",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # Query params
    # ------------------------------------------------------------------

    def test_search_filter(self):
        Product.objects.create(
            business=self.business, name="Coca-Cola", sku="CC1",
            price=Decimal("60.00"), cost=Decimal("40.00"),
        )
        Product.objects.create(
            business=self.business, name="Fanta", sku="F1",
            price=Decimal("60.00"), cost=Decimal("40.00"),
        )
        url = reverse("product-list-create", args=[self.business.id])
        resp = self.client.get(url + "?search=coca")
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["name"], "Coca-Cola")

    def test_is_active_filter(self):
        Product.objects.create(
            business=self.business, name="Active", sku="A",
            price=Decimal("10.00"), cost=Decimal("5.00"), is_active=True,
        )
        Product.objects.create(
            business=self.business, name="Inactive", sku="I",
            price=Decimal("10.00"), cost=Decimal("5.00"), is_active=False,
        )
        url = reverse("product-list-create", args=[self.business.id])

        active = self.client.get(url + "?is_active=true").data
        self.assertEqual(len(active), 1)
        self.assertEqual(active[0]["name"], "Active")

        inactive = self.client.get(url + "?is_active=false").data
        self.assertEqual(len(inactive), 1)
        self.assertEqual(inactive[0]["name"], "Inactive")