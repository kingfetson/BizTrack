from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from businesses.models import Business, BusinessMember
from products.models import Product
from products.services import adjust_stock
from .models import Customer, Supplier

User = get_user_model()


class CustomerSupplierTests(APITestCase):

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

        # Product for sale-based stat tests
        self.product = Product.objects.create(
            business=self.business, name="Coke", price=Decimal("60.00"), cost=Decimal("40.00"),
        )
        adjust_stock(product=self.product, delta=100, reason="PURCHASE")

        self._login("owner@biztrack.local")

    def _login(self, email):
        resp = self.client.post(reverse("login"), {"email": email, "password": "StrongPass123!"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    def _customers_url(self):
        return reverse("customer-list-create", args=[self.business.id])

    def _customer_url(self, pk):
        return reverse("customer-detail", args=[self.business.id, pk])

    def _suppliers_url(self):
        return reverse("supplier-list-create", args=[self.business.id])

    def _supplier_url(self, pk):
        return reverse("supplier-detail", args=[self.business.id, pk])

    def _sales_url(self):
        return reverse("sale-list-create", args=[self.business.id])

    # ------------------------------------------------------------------
    # Customer CRUD
    # ------------------------------------------------------------------

    def test_create_customer(self):
        resp = self.client.post(self._customers_url(), {
            "name": "Jane Doe", "phone": "0711000001", "email": "jane@example.com",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["name"], "Jane Doe")
        self.assertTrue(Customer.objects.filter(business=self.business, name="Jane Doe").exists())

    def test_list_customers(self):
        Customer.objects.create(business=self.business, name="A")
        Customer.objects.create(business=self.business, name="B")
        resp = self.client.get(self._customers_url())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)

    def test_retrieve_customer(self):
        c = Customer.objects.create(business=self.business, name="Jane")
        resp = self.client.get(self._customer_url(c.id))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["name"], "Jane")

    def test_update_customer(self):
        c = Customer.objects.create(business=self.business, name="Old Name")
        resp = self.client.patch(self._customer_url(c.id), {"name": "New Name"})
        self.assertEqual(resp.status_code, 200)
        c.refresh_from_db()
        self.assertEqual(c.name, "New Name")

    def test_delete_customer(self):
        c = Customer.objects.create(business=self.business, name="Jane")
        resp = self.client.delete(self._customer_url(c.id))
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Customer.objects.filter(pk=c.id).exists())

    def test_customer_phone_unique_per_business(self):
        Customer.objects.create(business=self.business, name="A", phone="0711000001")
        resp = self.client.post(self._customers_url(), {"name": "B", "phone": "0711000001"})
        self.assertEqual(resp.status_code, 400)

    def test_same_phone_allowed_across_businesses(self):
        Customer.objects.create(business=self.business, name="A", phone="0711000001")
        Customer.objects.create(business=self.other_business, name="B", phone="0711000001")
        self.assertEqual(Customer.objects.filter(phone="0711000001").count(), 2)

    def test_blank_phone_allowed_multiple_times(self):
        Customer.objects.create(business=self.business, name="A", phone="")
        Customer.objects.create(business=self.business, name="B", phone="")
        self.assertEqual(Customer.objects.filter(business=self.business, phone="").count(), 2)

    # ------------------------------------------------------------------
    # Supplier CRUD
    # ------------------------------------------------------------------

    def test_create_supplier(self):
        resp = self.client.post(self._suppliers_url(), {
            "name": "Kenyatta Suppliers", "phone": "0722000001",
        })
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Supplier.objects.filter(business=self.business, name="Kenyatta Suppliers").exists())

    def test_list_suppliers(self):
        Supplier.objects.create(business=self.business, name="A")
        Supplier.objects.create(business=self.business, name="B")
        resp = self.client.get(self._suppliers_url())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)

    def test_supplier_phone_unique_per_business(self):
        Supplier.objects.create(business=self.business, name="A", phone="0722000001")
        resp = self.client.post(self._suppliers_url(), {"name": "B", "phone": "0722000001"})
        self.assertEqual(resp.status_code, 400)

    def test_delete_supplier(self):
        s = Supplier.objects.create(business=self.business, name="X")
        resp = self.client.delete(self._supplier_url(s.id))
        self.assertEqual(resp.status_code, 204)

    # ------------------------------------------------------------------
    # Roles
    # ------------------------------------------------------------------

    def test_staff_can_read_but_not_write_customers(self):
        self._login("staff@biztrack.local")
        # Read
        self.assertEqual(self.client.get(self._customers_url()).status_code, 200)
        # Write
        resp = self.client.post(self._customers_url(), {"name": "X"})
        self.assertEqual(resp.status_code, 403)

    def test_manager_can_write_customers(self):
        self._login("manager@biztrack.local")
        resp = self.client.post(self._customers_url(), {"name": "Manager Customer"})
        self.assertEqual(resp.status_code, 201)

    # ------------------------------------------------------------------
    # Isolation
    # ------------------------------------------------------------------

    def test_outsider_cannot_list_customers(self):
        self._login("outsider@biztrack.local")
        resp = self.client.get(self._customers_url())
        self.assertEqual(resp.status_code, 404)

    def test_outsider_cannot_retrieve_customer(self):
        c = Customer.objects.create(business=self.business, name="X")
        self._login("outsider@biztrack.local")
        resp = self.client.get(self._customer_url(c.id))
        self.assertEqual(resp.status_code, 404)

    def test_outsider_cannot_create_customer(self):
        self._login("outsider@biztrack.local")
        resp = self.client.post(self._customers_url(), {"name": "X"})
        self.assertEqual(resp.status_code, 404)

    # ------------------------------------------------------------------
    # Search / filter
    # ------------------------------------------------------------------

    def test_search_customers_by_name(self):
        Customer.objects.create(business=self.business, name="Alice")
        Customer.objects.create(business=self.business, name="Bob")
        resp = self.client.get(self._customers_url() + "?search=alice")
        self.assertEqual(len(resp.data), 1)

    def test_search_customers_by_phone(self):
        Customer.objects.create(business=self.business, name="A", phone="0711000001")
        Customer.objects.create(business=self.business, name="B", phone="0722000002")
        resp = self.client.get(self._customers_url() + "?search=0711")
        self.assertEqual(len(resp.data), 1)

    # ------------------------------------------------------------------
    # Computed stats
    # ------------------------------------------------------------------

    def test_customer_with_no_sales_has_zero_stats(self):
        c = Customer.objects.create(business=self.business, name="New")
        resp = self.client.get(self._customer_url(c.id))
        self.assertEqual(resp.status_code, 200)
        # After annotation, total_spent is 0, sale_count is 0
        self.assertEqual(Decimal(resp.data["total_spent"] or "0"), Decimal("0"))
        self.assertEqual(resp.data["sale_count"], 0)
        self.assertIsNone(resp.data["last_purchase_at"])

    def test_customer_stats_reflect_completed_sales(self):
        c = Customer.objects.create(business=self.business, name="Jane", phone="0711000001")
        # Two sales for the customer
        for _ in range(2):
            self.client.post(self._sales_url(), {
                "items": [{"product_id": self.product.id, "quantity": 1, "unit_price": "60.00"}],
                "payment_method": "CASH",
                "customer_id": c.id,
            }, format="json")

        resp = self.client.get(self._customer_url(c.id))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(int(resp.data["sale_count"]), 2)
        self.assertEqual(Decimal(resp.data["total_spent"]), Decimal("120.00"))
        self.assertIsNotNone(resp.data["last_purchase_at"])

    def test_voided_sales_dont_count(self):
        c = Customer.objects.create(business=self.business, name="Jane")
        # Create two sales
        r1 = self.client.post(self._sales_url(), {
            "items": [{"product_id": self.product.id, "quantity": 1, "unit_price": "60.00"}],
            "payment_method": "CASH",
            "customer_id": c.id,
        }, format="json")
        self.client.post(self._sales_url(), {
            "items": [{"product_id": self.product.id, "quantity": 1, "unit_price": "60.00"}],
            "payment_method": "CASH",
            "customer_id": c.id,
        }, format="json")

        # Void the first
        self.client.post(
            reverse("sale-void", args=[self.business.id, r1.data["id"]]),
            {"reason": "test"}, format="json",
        )

        # Stats should reflect only the second (COMPLETED) sale
        resp = self.client.get(self._customer_url(c.id))
        self.assertEqual(int(resp.data["sale_count"]), 1)
        self.assertEqual(Decimal(resp.data["total_spent"]), Decimal("60.00"))

    # ------------------------------------------------------------------
    # Customer linkage on sale
    # ------------------------------------------------------------------

    def test_sale_with_customer_snapshots_name_phone(self):
        c = Customer.objects.create(
            business=self.business, name="Jane Doe", phone="0711000001",
        )
        resp = self.client.post(self._sales_url(), {
            "items": [{"product_id": self.product.id, "quantity": 1, "unit_price": "60.00"}],
            "payment_method": "CASH",
            "customer_id": c.id,
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["customer_id"], c.id)
        self.assertEqual(resp.data["customer_name"], "Jane Doe")
        self.assertEqual(resp.data["customer_phone"], "0711000001")

    def test_sale_renaming_customer_does_not_change_snapshot(self):
        c = Customer.objects.create(business=self.business, name="Jane", phone="0711")
        resp = self.client.post(self._sales_url(), {
            "items": [{"product_id": self.product.id, "quantity": 1, "unit_price": "60.00"}],
            "payment_method": "CASH",
            "customer_id": c.id,
        }, format="json")

        # Rename the customer
        self.client.patch(self._customer_url(c.id), {"name": "Jane Doe Renamed"})

        # Re-fetch the sale
        sale_resp = self.client.get(
            reverse("sale-detail", args=[self.business.id, resp.data["id"]])
        )
        self.assertEqual(sale_resp.data["customer_name"], "Jane")  # snapshot preserved

    def test_sale_rejects_customer_from_other_business(self):
        foreign = Customer.objects.create(business=self.other_business, name="Foreign")
        resp = self.client.post(self._sales_url(), {
            "items": [{"product_id": self.product.id, "quantity": 1, "unit_price": "60.00"}],
            "payment_method": "CASH",
            "customer_id": foreign.id,
        }, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_sale_without_customer_is_fine(self):
        resp = self.client.post(self._sales_url(), {
            "items": [{"product_id": self.product.id, "quantity": 1, "unit_price": "60.00"}],
            "payment_method": "CASH",
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertIsNone(resp.data["customer_id"])

    def test_filter_sales_by_customer(self):
        c = Customer.objects.create(business=self.business, name="Jane")
        # Two sales for Jane
        for _ in range(2):
            self.client.post(self._sales_url(), {
                "items": [{"product_id": self.product.id, "quantity": 1, "unit_price": "60.00"}],
                "payment_method": "CASH",
                "customer_id": c.id,
            }, format="json")
        # One sale without a customer
        self.client.post(self._sales_url(), {
            "items": [{"product_id": self.product.id, "quantity": 1, "unit_price": "60.00"}],
            "payment_method": "CASH",
        }, format="json")

        resp = self.client.get(self._sales_url() + f"?customer={c.id}")
        self.assertEqual(len(resp.data), 2)

    # ------------------------------------------------------------------
    # Deleting a customer does not delete their sales
    # ------------------------------------------------------------------

    def test_deleting_customer_preserves_sales(self):
        c = Customer.objects.create(business=self.business, name="Jane")
        resp = self.client.post(self._sales_url(), {
            "items": [{"product_id": self.product.id, "quantity": 1, "unit_price": "60.00"}],
            "payment_method": "CASH",
            "customer_id": c.id,
        }, format="json")
        sale_id = resp.data["id"]

        # Delete the customer
        self.client.delete(self._customer_url(c.id))

        # Sale still exists, customer_id is now null, name snapshot preserved
        sale_resp = self.client.get(reverse("sale-detail", args=[self.business.id, sale_id]))
        self.assertEqual(sale_resp.status_code, 200)
        self.assertIsNone(sale_resp.data["customer_id"])
        self.assertEqual(sale_resp.data["customer_name"], "Jane")