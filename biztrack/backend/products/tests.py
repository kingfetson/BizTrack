from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from businesses.models import Business, BusinessMember
from .models import Category, Product, StockLevel, StockMovement

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

# ============================================================================
# Stock tests
# ============================================================================
class StockTests(APITestCase):

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

        # Business
        self.business = Business.objects.create(name="Shop", currency="KES")
        BusinessMember.objects.create(user=self.owner, business=self.business, role="OWNER")
        BusinessMember.objects.create(user=self.manager, business=self.business, role="MANAGER")
        BusinessMember.objects.create(user=self.staff, business=self.business, role="STAFF")

        # Second business owned by outsider
        self.other_business = Business.objects.create(name="Other", currency="KES")
        BusinessMember.objects.create(user=self.outsider, business=self.other_business, role="OWNER")

        # Product in the first business
        self.product = Product.objects.create(
            business=self.business, name="Coke 500ml", sku="COKE-500",
            price=Decimal("60.00"), cost=Decimal("40.00"),
        )

        self._login("owner@biztrack.local")

    def _login(self, email):
        resp = self.client.post(reverse("login"), {
            "email": email, "password": "StrongPass123!",
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    # ------------------------------------------------------------------
    # Auto-creation
    # ------------------------------------------------------------------

    def test_stock_level_auto_created(self):
        self.assertTrue(StockLevel.objects.filter(product=self.product).exists())

    def test_initial_movement_written(self):
        m = StockMovement.objects.filter(product=self.product)
        self.assertEqual(m.count(), 1)
        self.assertEqual(m.first().reason, "INITIAL")
        self.assertEqual(m.first().quantity_delta, 0)

    # ------------------------------------------------------------------
    # Retrieve
    # ------------------------------------------------------------------

    def test_retrieve_stock(self):
        url = reverse("stock-detail", args=[self.business.id, self.product.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["quantity"], 0)
        self.assertEqual(resp.data["low_stock_threshold"], 5)
        self.assertTrue(resp.data["is_low"])  # 0 <= 5

    # ------------------------------------------------------------------
    # Adjust
    # ------------------------------------------------------------------

    def test_adjust_stock_increases_quantity(self):
        url = reverse("stock-adjust", args=[self.business.id, self.product.id])
        resp = self.client.post(url, {
            "delta": 20, "reason": "PURCHASE", "note": "Restock",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["quantity"], 20)

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock.quantity, 20)

    def test_adjust_stock_writes_movement(self):
        url = reverse("stock-adjust", args=[self.business.id, self.product.id])
        self.client.post(url, {"delta": 15, "reason": "PURCHASE"})

        movements = StockMovement.objects.filter(product=self.product).order_by("created_at")
        self.assertEqual(movements.count(), 2)  # INITIAL + PURCHASE
        last = movements.last()
        self.assertEqual(last.reason, "PURCHASE")
        self.assertEqual(last.quantity_delta, 15)
        self.assertEqual(last.quantity_after, 15)
        self.assertEqual(last.created_by, self.owner)

    def test_adjust_stock_decreases_quantity(self):
        url = reverse("stock-adjust", args=[self.business.id, self.product.id])
        self.client.post(url, {"delta": 20, "reason": "PURCHASE"})
        resp = self.client.post(url, {"delta": -5, "reason": "SALE"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["quantity"], 15)

    def test_cannot_go_below_zero(self):
        url = reverse("stock-adjust", args=[self.business.id, self.product.id])
        resp = self.client.post(url, {"delta": -10, "reason": "SALE"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("below zero", resp.data["detail"].lower())

    def test_zero_delta_rejected(self):
        url = reverse("stock-adjust", args=[self.business.id, self.product.id])
        resp = self.client.post(url, {"delta": 0, "reason": "ADJUSTMENT"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_initial_reason_rejected(self):
        url = reverse("stock-adjust", args=[self.business.id, self.product.id])
        resp = self.client.post(url, {"delta": 5, "reason": "INITIAL"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_reason_rejected(self):
        url = reverse("stock-adjust", args=[self.business.id, self.product.id])
        resp = self.client.post(url, {"delta": 5, "reason": "MAGIC"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------
    # Isolation
    # ------------------------------------------------------------------

    def test_outsider_cannot_view_stock(self):
        self._login("outsider@biztrack.local")
        url = reverse("stock-detail", args=[self.business.id, self.product.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_outsider_cannot_adjust_stock(self):
        self._login("outsider@biztrack.local")
        url = reverse("stock-adjust", args=[self.business.id, self.product.id])
        resp = self.client.post(url, {"delta": 10, "reason": "PURCHASE"})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Roles
    # ------------------------------------------------------------------

    def test_staff_can_view_but_not_adjust(self):
        self._login("staff@biztrack.local")

        detail_url = reverse("stock-detail", args=[self.business.id, self.product.id])
        self.assertEqual(self.client.get(detail_url).status_code, status.HTTP_200_OK)

        adjust_url = reverse("stock-adjust", args=[self.business.id, self.product.id])
        resp = self.client.post(adjust_url, {"delta": 10, "reason": "PURCHASE"})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_adjust(self):
        self._login("manager@biztrack.local")
        url = reverse("stock-adjust", args=[self.business.id, self.product.id])
        resp = self.client.post(url, {"delta": 10, "reason": "PURCHASE"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    # ------------------------------------------------------------------
    # Movements list
    # ------------------------------------------------------------------

    def test_movements_list_returns_history(self):
        url = reverse("stock-adjust", args=[self.business.id, self.product.id])
        self.client.post(url, {"delta": 20, "reason": "PURCHASE"})
        self.client.post(url, {"delta": -3, "reason": "SALE"})

        list_url = reverse("stock-movements", args=[self.business.id, self.product.id])
        resp = self.client.get(list_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # 3 movements: INITIAL, PURCHASE, SALE
        self.assertEqual(len(resp.data), 3)

    def test_movements_filter_by_reason(self):
        url = reverse("stock-adjust", args=[self.business.id, self.product.id])
        self.client.post(url, {"delta": 20, "reason": "PURCHASE"})
        self.client.post(url, {"delta": -3, "reason": "SALE"})

        list_url = reverse("stock-movements", args=[self.business.id, self.product.id])
        resp = self.client.get(list_url + "?reason=PURCHASE")
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["reason"], "PURCHASE")

    def test_outsider_cannot_list_movements(self):
        self._login("outsider@biztrack.local")
        url = reverse("stock-movements", args=[self.business.id, self.product.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)