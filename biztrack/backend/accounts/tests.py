from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AuthTests(APITestCase):

    def test_register_creates_user(self):
        url = reverse("register")
        data = {
            "email": "newuser@biztrack.local",
            "first_name": "New",
            "last_name": "User",
            "phone": "0700000001",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        resp = self.client.post(url, data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="newuser@biztrack.local").exists())
        self.assertNotIn("password", resp.data)

    def test_register_password_mismatch_fails(self):
        url = reverse("register")
        data = {
            "email": "x@biztrack.local",
            "first_name": "X",
            "last_name": "Y",
            "phone": "0700000002",
            "password": "StrongPass123!",
            "password_confirm": "Different456!",
        }
        resp = self.client.post(url, data)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens(self):
        User.objects.create_user(email="login@biztrack.local", password="StrongPass123!")
        resp = self.client.post(reverse("login"), {
            "email": "login@biztrack.local",
            "password": "StrongPass123!",
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)

    def test_me_requires_auth(self):
        resp = self.client.get(reverse("me"))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_current_user(self):
        user = User.objects.create_user(email="me@biztrack.local", password="StrongPass123!")
        login = self.client.post(reverse("login"), {
            "email": "me@biztrack.local",
            "password": "StrongPass123!",
        })
        token = login.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = self.client.get(reverse("me"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["email"], "me@biztrack.local")
        self.assertNotIn("password", resp.data)