from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Business, BusinessMember

User = get_user_model()


class BusinessTests(APITestCase):

    def setUp(self):
        """Create two users and login the first one."""
        self.owner = User.objects.create_user(
            email="owner@biztrack.local", password="StrongPass123!"
        )
        self.other = User.objects.create_user(
            email="other@biztrack.local", password="StrongPass123!"
        )

        # Login owner
        resp = self.client.post(reverse("login"), {
            "email": "owner@biztrack.local",
            "password": "StrongPass123!",
        })
        self.owner_token = resp.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_token}")

    def _login_as(self, email):
        resp = self.client.post(reverse("login"), {
            "email": email,
            "password": "StrongPass123!",
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    def test_create_business_makes_creator_owner(self):
        resp = self.client.post(reverse("business-list-create"), {"name": "Shop A"})
        self.assertEqual(resp.status_code, 201)

        biz = Business.objects.get(pk=resp.data["id"])
        self.assertTrue(
            BusinessMember.objects.filter(
                user=self.owner, business=biz, role="OWNER"
            ).exists()
        )

    def test_list_only_user_businesses(self):
        # Owner creates one
        self.client.post(reverse("business-list-create"), {"name": "Mine"})

        # Other user creates one
        self._login_as("other@biztrack.local")
        self.client.post(reverse("business-list-create"), {"name": "Theirs"})

        # Owner logs back in and lists
        self._login_as("owner@biztrack.local")
        resp = self.client.get(reverse("business-list-create"))
        names = [b["name"] for b in resp.data]
        self.assertIn("Mine", names)
        self.assertNotIn("Theirs", names)

    def test_non_member_cannot_view_business(self):
        # Owner creates one
        r = self.client.post(reverse("business-list-create"), {"name": "Secret"})
        biz_id = r.data["id"]

        # Other user (not a member) tries to fetch it
        self._login_as("other@biztrack.local")
        resp = self.client.get(reverse("business-detail", args=[biz_id]))
        self.assertEqual(resp.status_code, 404)

    def test_unauthorized_access_denied(self):
        # Clear credentials
        self.client.credentials()
        resp = self.client.get(reverse("business-list-create"))
        self.assertEqual(resp.status_code, 401)

    def test_add_member_by_email(self):
        r = self.client.post(reverse("business-list-create"), {"name": "Shop"})
        biz_id = r.data["id"]

        resp = self.client.post(
            reverse("member-add", args=[biz_id]),
            {"email": "other@biztrack.local", "role": "CASHIER"},
        )
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(
            BusinessMember.objects.filter(
                user=self.other, business_id=biz_id, role="CASHIER"
            ).exists()
        )

    def test_non_admin_cannot_add_member(self):
        # Owner creates a business and adds `other` as CASHIER
        r = self.client.post(reverse("business-list-create"), {"name": "Shop"})
        biz_id = r.data["id"]
        self.client.post(
            reverse("member-add", args=[biz_id]),
            {"email": "other@biztrack.local", "role": "CASHIER"},
        )

        # Other (CASHIER) tries to add another member
        self._login_as("other@biztrack.local")
        resp = self.client.post(
            reverse("member-add", args=[biz_id]),
            {"email": "owner@biztrack.local", "role": "STAFF"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_duplicate_membership_fails_gracefully(self):
        r = self.client.post(reverse("business-list-create"), {"name": "Shop"})
        biz_id = r.data["id"]

        # Add other as CASHIER
        self.client.post(
            reverse("member-add", args=[biz_id]),
            {"email": "other@biztrack.local", "role": "CASHIER"},
        )
        # Add again - should not create a second row
        self.client.post(
            reverse("member-add", args=[biz_id]),
            {"email": "other@biztrack.local", "role": "MANAGER"},
        )
        count = BusinessMember.objects.filter(
            user=self.other, business_id=biz_id
        ).count()
        self.assertEqual(count, 1)