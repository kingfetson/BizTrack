from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from businesses.models import Business, BusinessMember
from products.models import Product, StockLevel, StockMovement
from products.services import adjust_stock
from .models import Sale

User = get_user_model()


def _stock_qty(product):
    """Fetch fresh stock quantity from DB, bypassing ORM caching."""
    return StockLevel.objects.get(product=product).quantity


class SaleTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(email="owner@biztrack.local", password="StrongPass123!")
        self.manager = User.objects.create_user(email="manager@biztrack.local", password="StrongPass123!")
        self.staff = User.objects.create_user(email="staff@biztrack.local", password="StrongPass123!")
        self.outsider = User.objects.create_user(email="outsider@biztrack.local", password="StrongPass123!")

        self.business = Business.objects.create(name="Shop", currency="KES")
        BusinessMember.objects.create(user=self.owner, business=self.business, role="OWNER")
        BusinessMember.objects.create(user=self.manager, business=self.business, role="MANAGER")
        BusinessMember.objects.create(user=self.staff, business=self.business, role="STAFF")

        self.other_business = Business.objects.create(name="Other", currency="KES")
        BusinessMember.objects.create(user=self.outsider, business=self.other_business, role="OWNER")

        self.product_a = Product.objects.create(
            business=self.business, name="Coke 500ml", sku="COKE-500",
            price=Decimal("60.00"), cost=Decimal("40.00"),
        )
        self.product_b = Product.objects.create(
            business=self.business, name="Fanta 500ml", sku="FANTA-500",
            price=Decimal("60.00"), cost=Decimal("40.00"),
        )

        adjust_stock(product=self.product_a, delta=100, reason="PURCHASE", note="Init")
        adjust_stock(product=self.product_b, delta=50, reason="PURCHASE", note="Init")

        self._login("owner@biztrack.local")

    def _login(self, email):
        resp = self.client.post(reverse("login"), {"email": email, "password": "StrongPass123!"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    def _sale_url(self):
        return reverse("sale-list-create", args=[self.business.id])

    def _sample_items(self, qty_a=3, qty_b=2):
        """Build items list. Skips items with qty <= 0."""
        items = []
        if qty_a > 0:
            items.append({"product_id": self.product_a.id, "quantity": qty_a, "unit_price": "60.00"})
        if qty_b > 0:
            items.append({"product_id": self.product_b.id, "quantity": qty_b, "unit_price": "60.00"})
        return items

    # --- Creation ---

    def test_create_sale(self):
        resp = self.client.post(self._sale_url(), {
            "items": self._sample_items(),
            "payment_method": "CASH",
            "customer_name": "John Doe",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], "COMPLETED")
        self.assertEqual(len(resp.data["items"]), 2)
        self.assertEqual(Decimal(resp.data["total"]), Decimal("300.00"))

    def test_sale_decrements_stock(self):
        self.client.post(self._sale_url(), {"items": self._sample_items(3, 2), "payment_method": "CASH"}, format="json")
        self.assertEqual(_stock_qty(self.product_a), 97)
        self.assertEqual(_stock_qty(self.product_b), 48)

    def test_sale_writes_movement_per_item(self):
        resp = self.client.post(self._sale_url(), {"items": self._sample_items(3, 2), "payment_method": "CASH"}, format="json")
        sale_id = resp.data["id"]
        m_a = StockMovement.objects.filter(product=self.product_a, reason="SALE", note=f"Sale #{sale_id}")
        m_b = StockMovement.objects.filter(product=self.product_b, reason="SALE", note=f"Sale #{sale_id}")
        self.assertEqual(m_a.count(), 1)
        self.assertEqual(m_a.first().quantity_delta, -3)
        self.assertEqual(m_b.count(), 1)
        self.assertEqual(m_b.first().quantity_delta, -2)

    def test_sale_snapshots_product_info(self):
        resp = self.client.post(self._sale_url(), {"items": self._sample_items(1, 1), "payment_method": "CASH"}, format="json")
        sale_id = resp.data["id"]
        # Rename product after sale
        self.product_a.name = "Renamed"
        self.product_a.save()
        sale = Sale.objects.get(pk=sale_id)
        item = sale.items.filter(product=self.product_a).first()
        self.assertEqual(item.product_name, "Coke 500ml")

    def test_total_ignores_client_value(self):
        resp = self.client.post(self._sale_url(), {
            "items": self._sample_items(1, 1),
            "total": "1.00",
            "payment_method": "CASH",
        }, format="json")
        self.assertEqual(Decimal(resp.data["total"]), Decimal("120.00"))

    def test_reject_empty_items(self):
        resp = self.client.post(self._sale_url(), {"items": [], "payment_method": "CASH"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_duplicate_products(self):
        items = [
            {"product_id": self.product_a.id, "quantity": 1, "unit_price": "60.00"},
            {"product_id": self.product_a.id, "quantity": 2, "unit_price": "60.00"},
        ]
        resp = self.client.post(self._sale_url(), {"items": items, "payment_method": "CASH"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_product_from_other_business(self):
        foreign = Product.objects.create(business=self.other_business, name="Foreign",
                                         price=Decimal("10.00"), cost=Decimal("5.00"))
        resp = self.client.post(self._sale_url(), {
            "items": [{"product_id": foreign.id, "quantity": 1, "unit_price": "10.00"}],
            "payment_method": "CASH",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Overselling / atomicity ---

    def test_overselling_rejected(self):
        resp = self.client.post(self._sale_url(), {
            "items": [{"product_id": self.product_a.id, "quantity": 999, "unit_price": "60.00"}],
            "payment_method": "CASH",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_overselling_rolls_back_everything(self):
        before_a = _stock_qty(self.product_a)
        before_b = _stock_qty(self.product_b)
        before_sales = Sale.objects.count()

        resp = self.client.post(self._sale_url(), {
            "items": [
                {"product_id": self.product_a.id, "quantity": 2, "unit_price": "60.00"},
                {"product_id": self.product_b.id, "quantity": 999, "unit_price": "60.00"},
            ],
            "payment_method": "CASH",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertEqual(_stock_qty(self.product_a), before_a)
        self.assertEqual(_stock_qty(self.product_b), before_b)
        self.assertEqual(Sale.objects.count(), before_sales)

    # --- Listing / filtering ---

    def test_list_sales(self):
        self.client.post(self._sale_url(), {"items": self._sample_items(1, 1), "payment_method": "CASH"}, format="json")
        self.client.post(self._sale_url(), {"items": self._sample_items(2, 2), "payment_method": "MPESA"}, format="json")
        resp = self.client.get(self._sale_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 2)

    def test_filter_by_payment_method(self):
        self.client.post(self._sale_url(), {"items": self._sample_items(1, 1), "payment_method": "CASH"}, format="json")
        self.client.post(self._sale_url(), {"items": self._sample_items(2, 2), "payment_method": "MPESA"}, format="json")
        resp = self.client.get(self._sale_url() + "?payment_method=MPESA")
        self.assertEqual(len(resp.data), 1)

    # --- Voiding ---

    def test_void_restores_stock(self):
        resp = self.client.post(self._sale_url(), {"items": self._sample_items(3, 2), "payment_method": "CASH"}, format="json")
        sale_id = resp.data["id"]
        self.assertEqual(_stock_qty(self.product_a), 97)
        self.assertEqual(_stock_qty(self.product_b), 48)

        void_resp = self.client.post(
            reverse("sale-void", args=[self.business.id, sale_id]),
            {"reason": "Customer returned goods"}, format="json",
        )
        self.assertEqual(void_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(void_resp.data["status"], "VOIDED")

        self.assertEqual(_stock_qty(self.product_a), 100)
        self.assertEqual(_stock_qty(self.product_b), 50)

    def test_void_writes_return_movements(self):
        resp = self.client.post(self._sale_url(), {"items": self._sample_items(3, 0), "payment_method": "CASH"}, format="json")
        sale_id = resp.data["id"]
        self.client.post(
            reverse("sale-void", args=[self.business.id, sale_id]),
            {"reason": "test"}, format="json",
        )
        m = StockMovement.objects.filter(product=self.product_a, reason="RETURN", note=f"Void of sale #{sale_id}")
        self.assertEqual(m.count(), 1)
        self.assertEqual(m.first().quantity_delta, 3)

    def test_void_records_metadata(self):
        resp = self.client.post(self._sale_url(), {"items": self._sample_items(1, 0), "payment_method": "CASH"}, format="json")
        sale_id = resp.data["id"]
        self.client.post(
            reverse("sale-void", args=[self.business.id, sale_id]),
            {"reason": "Damaged goods"}, format="json",
        )
        sale = Sale.objects.get(pk=sale_id)
        self.assertIsNotNone(sale.voided_at)
        self.assertEqual(sale.voided_by, self.owner)
        self.assertEqual(sale.void_reason, "Damaged goods")

    def test_void_is_idempotent(self):
        resp = self.client.post(self._sale_url(), {"items": self._sample_items(1, 0), "payment_method": "CASH"}, format="json")
        sale_id = resp.data["id"]
        url = reverse("sale-void", args=[self.business.id, sale_id])

        first = self.client.post(url, {"reason": "first"}, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self.client.post(url, {"reason": "second"}, format="json")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_cannot_void(self):
        resp = self.client.post(self._sale_url(), {"items": self._sample_items(1, 0), "payment_method": "CASH"}, format="json")
        sale_id = resp.data["id"]

        self._login("staff@biztrack.local")
        void_resp = self.client.post(
            reverse("sale-void", args=[self.business.id, sale_id]),
            {"reason": "test"}, format="json",
        )
        self.assertEqual(void_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_void(self):
        resp = self.client.post(self._sale_url(), {"items": self._sample_items(1, 0), "payment_method": "CASH"}, format="json")
        sale_id = resp.data["id"]

        self._login("manager@biztrack.local")
        void_resp = self.client.post(
            reverse("sale-void", args=[self.business.id, sale_id]),
            {"reason": "test"}, format="json",
        )
        self.assertEqual(void_resp.status_code, status.HTTP_200_OK)

    # --- Isolation ---

    def test_outsider_cannot_list_sales(self):
        self.client.post(self._sale_url(), {"items": self._sample_items(1, 0), "payment_method": "CASH"}, format="json")
        self._login("outsider@biztrack.local")
        resp = self.client.get(self._sale_url())
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_outsider_cannot_create_sale(self):
        self._login("outsider@biztrack.local")
        resp = self.client.post(self._sale_url(), {
            "items": self._sample_items(1, 0), "payment_method": "CASH",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_can_create_sale(self):
        self._login("staff@biztrack.local")
        resp = self.client.post(self._sale_url(), {
            "items": self._sample_items(1, 1), "payment_method": "CASH",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    # --- Product PROTECT ---

    def test_cannot_delete_product_with_sale(self):
        self.client.post(self._sale_url(), {"items": self._sample_items(1, 0), "payment_method": "CASH"}, format="json")
        product_id = self.product_a.id
        del_url = reverse("product-detail", args=[self.business.id, product_id])
        try:
            self.client.delete(del_url)
        except Exception:
            pass  # ProtectedError is expected
        self.assertTrue(Product.objects.filter(pk=product_id).exists())