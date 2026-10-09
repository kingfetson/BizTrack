from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from businesses.models import Business, BusinessMember
from customers.models import Supplier
from products.models import Product, StockLevel, StockMovement
from products.services import adjust_stock
from .models import Purchase

User = get_user_model()


def _stock_qty(product):
    return StockLevel.objects.get(product=product).quantity


class PurchaseTests(APITestCase):

    def setUp(self):
        # Users
        self.owner = User.objects.create_user(email="owner@biztrack.local", password="StrongPass123!")
        self.manager = User.objects.create_user(email="manager@biztrack.local", password="StrongPass123!")
        self.staff = User.objects.create_user(email="staff@biztrack.local", password="StrongPass123!")
        self.outsider = User.objects.create_user(email="outsider@biztrack.local", password="StrongPass123!")

        # Business + members
        self.business = Business.objects.create(name="Shop", currency="KES")
        BusinessMember.objects.create(user=self.owner, business=self.business, role="OWNER")
        BusinessMember.objects.create(user=self.manager, business=self.business, role="MANAGER")
        BusinessMember.objects.create(user=self.staff, business=self.business, role="STAFF")

        # Second business
        self.other_business = Business.objects.create(name="Other", currency="KES")
        BusinessMember.objects.create(user=self.outsider, business=self.other_business, role="OWNER")

        # Product (no stock yet - purchases will add it)
        self.product_a = Product.objects.create(
            business=self.business, name="Coke 500ml", sku="COKE-500",
            price=Decimal("60.00"), cost=Decimal("40.00"),
        )
        self.product_b = Product.objects.create(
            business=self.business, name="Fanta 500ml", sku="FANTA-500",
            price=Decimal("60.00"), cost=Decimal("40.00"),
        )

        # Supplier
        self.supplier = Supplier.objects.create(
            business=self.business, name="Kenyatta Suppliers", phone="0722000001",
        )

        self._login("owner@biztrack.local")

    def _login(self, email):
        resp = self.client.post(reverse("login"), {"email": email, "password": "StrongPass123!"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    def _purchase_url(self):
        return reverse("purchase-list-create", args=[self.business.id])

    def _purchase_detail_url(self, pk):
        return reverse("purchase-detail", args=[self.business.id, pk])

    def _purchase_void_url(self, pk):
        return reverse("purchase-void", args=[self.business.id, pk])

    def _sample_items(self, qty_a=20, qty_b=10, cost="40.00"):
        items = []
        if qty_a > 0:
            items.append({"product_id": self.product_a.id, "quantity": qty_a, "unit_cost": cost})
        if qty_b > 0:
            items.append({"product_id": self.product_b.id, "quantity": qty_b, "unit_cost": cost})
        return items

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------

    def test_create_purchase(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(),
            "supplier_id": self.supplier.id,
            "is_paid": True,
            "note": "First order",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], "COMPLETED")
        self.assertEqual(len(resp.data["items"]), 2)
        # 20 * 40 + 10 * 40 = 1200
        self.assertEqual(Decimal(resp.data["total"]), Decimal("1200.00"))
        self.assertTrue(resp.data["is_paid"])

    def test_purchase_increases_stock(self):
        self.client.post(self._purchase_url(), {
            "items": self._sample_items(20, 10),
            "supplier_id": self.supplier.id,
        }, format="json")
        self.assertEqual(_stock_qty(self.product_a), 20)
        self.assertEqual(_stock_qty(self.product_b), 10)

    def test_purchase_writes_purchase_movements(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(20, 10),
            "supplier_id": self.supplier.id,
        }, format="json")
        purchase_id = resp.data["id"]

        movements = StockMovement.objects.filter(
            product=self.product_a, reason="PURCHASE", note=f"Purchase #{purchase_id}"
        )
        self.assertEqual(movements.count(), 1)
        self.assertEqual(movements.first().quantity_delta, 20)
        self.assertEqual(movements.first().quantity_after, 20)

    def test_purchase_snapshots_supplier(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0),
            "supplier_id": self.supplier.id,
        }, format="json")
        self.assertEqual(resp.data["supplier_id"], self.supplier.id)
        self.assertEqual(resp.data["supplier_name"], "Kenyatta Suppliers")
        self.assertEqual(resp.data["supplier_phone"], "0722000001")

    def test_supplier_renaming_does_not_change_purchase_snapshot(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0),
            "supplier_id": self.supplier.id,
        }, format="json")
        # Rename the supplier
        self.supplier.name = "Renamed Suppliers"
        self.supplier.save()

        purchase = Purchase.objects.get(pk=resp.data["id"])
        self.assertEqual(purchase.supplier_name, "Kenyatta Suppliers")

    def test_purchase_snapshots_product_info(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0),
        }, format="json")
        # Rename the product after purchase
        self.product_a.name = "Renamed Coke"
        self.product_a.save()

        purchase = Purchase.objects.get(pk=resp.data["id"])
        item = purchase.items.first()
        self.assertEqual(item.product_name, "Coke 500ml")
        self.assertEqual(item.product_sku, "COKE-500")

    def test_total_ignores_client_value(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(10, 5),
            "total": "1.00",  # bogus
            "supplier_id": self.supplier.id,
        }, format="json")
        # 10 * 40 + 5 * 40 = 600
        self.assertEqual(Decimal(resp.data["total"]), Decimal("600.00"))

    def test_purchase_without_supplier(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0),
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data["supplier_id"])

    def test_purchase_with_adhoc_supplier_name(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0),
            "supplier_name": "Local Farmer",
            "supplier_phone": "0700111222",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["supplier_name"], "Local Farmer")
        self.assertIsNone(resp.data["supplier_id"])

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def test_reject_empty_items(self):
        resp = self.client.post(self._purchase_url(), {"items": []}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_duplicate_products(self):
        items = [
            {"product_id": self.product_a.id, "quantity": 5, "unit_cost": "40.00"},
            {"product_id": self.product_a.id, "quantity": 3, "unit_cost": "40.00"},
        ]
        resp = self.client.post(self._purchase_url(), {"items": items}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_product_from_other_business(self):
        foreign = Product.objects.create(
            business=self.other_business, name="Foreign",
            price=Decimal("10.00"), cost=Decimal("5.00"),
        )
        resp = self.client.post(self._purchase_url(), {
            "items": [{"product_id": foreign.id, "quantity": 5, "unit_cost": "10.00"}],
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_supplier_from_other_business(self):
        foreign = Supplier.objects.create(business=self.other_business, name="Foreign Supplier")
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0),
            "supplier_id": foreign.id,
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------
    # Isolation
    # ------------------------------------------------------------------

    def test_outsider_cannot_list_purchases(self):
        self._login("outsider@biztrack.local")
        resp = self.client.get(self._purchase_url())
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_outsider_cannot_create_purchase(self):
        self._login("outsider@biztrack.local")
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0),
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # ------------------------------------------------------------------
    # Roles
    # ------------------------------------------------------------------

    def test_staff_can_read_but_not_create(self):
        # Create as owner
        self.client.post(self._purchase_url(), {"items": self._sample_items(5, 0)}, format="json")

        # Staff reads OK
        self._login("staff@biztrack.local")
        self.assertEqual(self.client.get(self._purchase_url()).status_code, status.HTTP_200_OK)

        # Staff tries to create → 403
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0),
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_create(self):
        self._login("manager@biztrack.local")
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0),
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # Voiding
    # ------------------------------------------------------------------

    def test_void_reduces_stock(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(20, 10),
        }, format="json")
        purchase_id = resp.data["id"]

        self.assertEqual(_stock_qty(self.product_a), 20)
        self.assertEqual(_stock_qty(self.product_b), 10)

        void_resp = self.client.post(
            self._purchase_void_url(purchase_id),
            {"reason": "Wrong order"}, format="json",
        )
        self.assertEqual(void_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(void_resp.data["status"], "VOIDED")

        self.assertEqual(_stock_qty(self.product_a), 0)
        self.assertEqual(_stock_qty(self.product_b), 0)

    def test_void_writes_loss_movements(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(20, 0),
        }, format="json")
        purchase_id = resp.data["id"]

        self.client.post(
            self._purchase_void_url(purchase_id),
            {"reason": "test"}, format="json",
        )
        loss = StockMovement.objects.filter(
            product=self.product_a, reason="LOSS", note=f"Void of purchase #{purchase_id}"
        )
        self.assertEqual(loss.count(), 1)
        self.assertEqual(loss.first().quantity_delta, -20)

    def test_void_fails_if_stock_insufficient(self):
        # Purchase 20
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(20, 0),
        }, format="json")
        purchase_id = resp.data["id"]

        # Sell 15 units → stock now 5
        adjust_stock(product=self.product_a, delta=-15, reason="SALE", note="test sale")

        # Try to void the purchase → needs to remove 20 but only 5 left
        void_resp = self.client.post(
            self._purchase_void_url(purchase_id),
            {"reason": "test"}, format="json",
        )
        self.assertEqual(void_resp.status_code, status.HTTP_400_BAD_REQUEST)
        # Stock unchanged
        self.assertEqual(_stock_qty(self.product_a), 5)

    def test_void_records_metadata(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0),
        }, format="json")
        purchase_id = resp.data["id"]

        self.client.post(
            self._purchase_void_url(purchase_id),
            {"reason": "Wrong product"}, format="json",
        )
        purchase = Purchase.objects.get(pk=purchase_id)
        self.assertIsNotNone(purchase.voided_at)
        self.assertEqual(purchase.voided_by, self.owner)
        self.assertEqual(purchase.void_reason, "Wrong product")

    def test_void_is_idempotent(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0),
        }, format="json")
        purchase_id = resp.data["id"]

        first = self.client.post(self._purchase_void_url(purchase_id), {"reason": "first"}, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self.client.post(self._purchase_void_url(purchase_id), {"reason": "second"}, format="json")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_cannot_void(self):
        resp = self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0),
        }, format="json")
        purchase_id = resp.data["id"]

        self._login("staff@biztrack.local")
        void_resp = self.client.post(
            self._purchase_void_url(purchase_id),
            {"reason": "test"}, format="json",
        )
        self.assertEqual(void_resp.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------
    # Filtering
    # ------------------------------------------------------------------

    def test_filter_by_status(self):
        r1 = self.client.post(self._purchase_url(), {"items": self._sample_items(5, 0)}, format="json")
        self.client.post(self._purchase_url(), {"items": self._sample_items(3, 0)}, format="json")

        # Void the first
        self.client.post(self._purchase_void_url(r1.data["id"]), {"reason": "test"}, format="json")

        # Filter COMPLETED → 1
        completed = self.client.get(self._purchase_url() + "?status=COMPLETED")
        self.assertEqual(len(completed.data), 1)

        # Filter VOIDED → 1
        voided = self.client.get(self._purchase_url() + "?status=VOIDED")
        self.assertEqual(len(voided.data), 1)

    def test_filter_by_paid(self):
        self.client.post(self._purchase_url(), {
            "items": self._sample_items(5, 0), "is_paid": True,
        }, format="json")
        self.client.post(self._purchase_url(), {
            "items": self._sample_items(3, 0), "is_paid": False,
        }, format="json")

        paid = self.client.get(self._purchase_url() + "?is_paid=true")
        self.assertEqual(len(paid.data), 1)
        unpaid = self.client.get(self._purchase_url() + "?is_paid=false")
        self.assertEqual(len(unpaid.data), 1)

    # ------------------------------------------------------------------
    # PROTECT
    # ------------------------------------------------------------------

    def test_cannot_delete_product_with_purchase(self):
        self.client.post(self._purchase_url(), {"items": self._sample_items(5, 0)}, format="json")
        product_id = self.product_a.id

        del_url = reverse("product-detail", args=[self.business.id, product_id])
        try:
            self.client.delete(del_url)
        except Exception:
            pass  # ProtectedError is expected

        self.assertTrue(Product.objects.filter(pk=product_id).exists())