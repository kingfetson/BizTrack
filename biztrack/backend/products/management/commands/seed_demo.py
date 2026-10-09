"""
Seed the database with a realistic demo dataset for BizTrack.

Usage:
    python manage.py seed_demo
    python manage.py seed_demo --email test1@biztrack.local
    python manage.py seed_demo --flush   (deletes existing demo data first)
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from businesses.models import Business, BusinessMember
from customers.models import Customer, Supplier
from products.models import Category, Product
from products.services import adjust_stock
from purchases.services import record_purchase
from sales.services import record_sale

User = get_user_model()


CATEGORIES = [
    ("Beverages", "Sodas, juices, water"),
    ("Snacks", "Crisps, biscuits, sweets"),
    ("Dairy", "Milk, cheese, yoghurt"),
    ("Bakery", "Bread, cakes, pastries"),
    ("Cooking", "Oil, spices, flour"),
    ("Household", "Soap, detergent, cleaning"),
    ("Personal Care", "Toothpaste, lotion, shampoo"),
    ("Stationery", "Pens, notebooks, paper"),
    ("Electronics", "Batteries, cables, bulbs"),
    ("Baby", "Diapers, formula, wipes"),
    ("Pet", "Pet food, treats"),
    ("Frozen", "Ice cream, frozen veg"),
]

# (name, sku_prefix, price, cost) per category
PRODUCTS_BY_CAT = {
    "Beverages": [
        ("Coca-Cola 500ml", "COKE500", 60, 40),
        ("Coca-Cola 1L", "COKE1L", 110, 75),
        ("Fanta Orange 500ml", "FANTA500", 60, 40),
        ("Sprite 500ml", "SPRITE500", 60, 40),
        ("Dasani Water 500ml", "WATER500", 50, 30),
        ("Dasani Water 1L", "WATER1L", 80, 50),
        ("Rwanda Tea 100g", "TEA100", 150, 100),
        ("Nescafe 50g", "NESCAFE50", 350, 250),
        ("Fresh Milk 500ml", "MILK500", 60, 45),
        ("Mango Juice 1L", "MANGO1L", 180, 120),
        ("Passion Juice 1L", "PASS1L", 180, 120),
        ("Bottled Water 5L", "WATER5L", 200, 140),
    ],
    "Snacks": [
        ("Lays Original 60g", "LAYS60", 100, 70),
        ("Lays Salt & Vinegar 60g", "LAYSV60", 100, 70),
        ("Tropical Heat Crisps", "THC80", 120, 85),
        ("Digestive Biscuits", "DIGBISC", 90, 60),
        ("Oreo Original", "OREO", 120, 80),
        ("Kit Kat 4-finger", "KITKAT", 130, 90),
        ("Peanuts 100g", "PEANUT100", 80, 55),
        ("Cashews 100g", "CASHEW100", 250, 180),
        ("Popcorn 100g", "POP100", 100, 65),
        ("Chocolate Bar 80g", "CHOCO80", 150, 100),
    ],
    "Dairy": [
        ("Brookside Fresh Milk 1L", "BROOK1L", 90, 70),
        ("Tuzo Yoghurt 500ml", "TUZO500", 180, 130),
        ("Blue Band 250g", "BLUE250", 220, 170),
        ("Cheese Block 200g", "CHEESE200", 380, 280),
        ("Butter 250g", "BUTTER250", 350, 270),
        ("Cream 250ml", "CREAM250", 180, 130),
    ],
    "Bakery": [
        ("White Bread 400g", "BREADW", 60, 45),
        ("Brown Bread 400g", "BREADB", 65, 50),
        ("Baguette", "BAGUE", 90, 60),
        ("Croissant", "CROISS", 120, 80),
        ("Cake Slice", "CAKE", 150, 100),
        ("Doughnut", "DONUT", 80, 50),
        ("Scone", "SCONE", 60, 35),
    ],
    "Cooking": [
        ("Cooking Oil 1L", "OIL1L", 250, 200),
        ("Cooking Oil 3L", "OIL3L", 700, 550),
        ("Rice 2kg", "RICE2", 320, 240),
        ("Maize Flour 2kg", "UNGA2", 160, 120),
        ("Wheat Flour 1kg", "ATTA1", 140, 100),
        ("Sugar 1kg", "SUGAR1", 160, 130),
        ("Salt 500g", "SALT500", 40, 25),
        ("Royco 100g", "ROYCO100", 100, 75),
        ("Tomato Paste 200g", "TOMPASTE", 90, 65),
        ("Black Pepper 50g", "PEPPER50", 120, 85),
    ],
    "Household": [
        ("Sunlight Bar 800g", "SUN800", 220, 160),
        ("Omo Detergent 1kg", "OMO1", 250, 190),
        ("Vim Dish Soap 500ml", "VIM500", 180, 130),
        ("Harpic 500ml", "HARP500", 250, 190),
        ("Toilet Paper 10-pack", "TP10", 350, 270),
        ("Paper Towels 2-pack", "PT2", 180, 130),
        ("Broom", "BROOM", 250, 180),
        ("Bucket 10L", "BUCK10", 350, 260),
    ],
    "Personal Care": [
        ("Colgate 100g", "COLG100", 180, 130),
        ("Rexona Deodorant", "REXDEO", 350, 260),
        ("Nivea Lotion 200ml", "NIVEA200", 450, 340),
        ("Head & Shoulders 200ml", "HS200", 380, 280),
        ("Always Pads", "ALWAYS", 200, 150),
        ("Gillette Razor", "GILRAZ", 400, 300),
        ("Toothbrush", "TBRUSH", 100, 60),
    ],
    "Stationery": [
        ("Bic Pen (Black)", "BICB", 20, 10),
        ("Bic Pen (Blue)", "BICBU", 20, 10),
        ("Notebook 80 pages", "NB80", 80, 55),
        ("A4 Paper Ream", "A4REAM", 450, 350),
        ("Pencil 2B", "PENCIL2B", 15, 8),
        ("Eraser", "ERASER", 20, 10),
        ("Stapler", "STAPLER", 250, 180),
        ("Calculator", "CALC", 800, 600),
    ],
    "Electronics": [
        ("AA Batteries (4-pack)", "AA4", 100, 70),
        ("D Batteries (2-pack)", "D2", 180, 130),
        ("USB Cable", "USBCABLE", 350, 250),
        ("Extension Cord 3m", "EXTCORD", 550, 420),
        ("LED Bulb 9W", "LED9W", 250, 180),
        ("Torch", "TORCH", 400, 300),
    ],
    "Baby": [
        ("Huggies Diapers (M)", "HUGM", 750, 600),
        ("Pampers (S)", "PAMPS", 800, 650),
        ("Baby Wipes", "WIPES", 300, 220),
        ("Baby Formula 400g", "FORM400", 900, 700),
        ("Baby Oil 200ml", "BABYOIL", 250, 180),
    ],
    "Pet": [
        ("Dog Food 2kg", "DOG2", 450, 350),
        ("Cat Food 1kg", "CAT1", 350, 260),
        ("Pet Treats", "TREATS", 200, 140),
    ],
    "Frozen": [
        ("Ice Cream 1L", "ICE1L", 450, 350),
        ("Frozen Peas 500g", "PEAS500", 200, 150),
        ("Frozen Chicken 1kg", "CHICK1", 700, 550),
        ("Frozen Fish 1kg", "FISH1", 600, 480),
    ],
}

SUPPLIERS = [
    ("Kenyatta Wholesalers", "0722100100", "info@kenyattawholesalers.co.ke"),
    ("Nakuru Distributors", "0722100200", "sales@nakurudist.co.ke"),
    ("Mombasa Importers Ltd", "0722100300", "orders@mombasaimport.co.ke"),
    ("Nairobi Fresh Produce", "0722100400", "hello@nfbresh.co.ke"),
    ("Central Supplies Ltd", "0722100500", "cs@centralsupplies.co.ke"),
    ("Brookside Distributor", "0722100600", "brookside@dist.co.ke"),
    ("Kericho Tea Traders", "0722100700", "tea@kericho.co.ke"),
    ("Kisumu Wholesale Mart", "0722100800", "kisumu@mart.co.ke"),
    ("Eldoret Traders", "0722100900", "eldoret@traders.co.ke"),
    ("Thika General Suppliers", "0722101000", "thika@gen.co.ke"),
    ("Rift Valley Produce", "0722101100", "riftvalley@produce.co.ke"),
    ("Coastal Imports Co", "0722101200", "coastal@imports.co.ke"),
]

CUSTOMERS = [
    ("Jane Wanjiru", "0711000001", "jane@example.com"),
    ("John Kamau", "0711000002", "john@example.com"),
    ("Mary Njeri", "0711000003", "mary@example.com"),
    ("Peter Ochieng", "0711000004", "peter@example.com"),
    ("Grace Akinyi", "0711000005", "grace@example.com"),
    ("David Mwangi", "0711000006", "david@example.com"),
    ("Sarah Wambui", "0711000007", "sarah@example.com"),
    ("Michael Otieno", "0711000008", "michael@example.com"),
    ("Lucy Chebet", "0711000009", "lucy@example.com"),
    ("James Kipchoge", "0711000010", "james@example.com"),
    ("Faith Muthoni", "0711000011", "faith@example.com"),
    ("Brian Onyango", "0711000012", "brian@example.com"),
    ("Esther Mueni", "0711000013", "esther@example.com"),
    ("Paul Kariuki", "0711000014", "paul@example.com"),
    ("Ann Wafula", "0711000015", "ann@example.com"),
]


class Command(BaseCommand):
    help = "Seed the database with a realistic demo dataset."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email", type=str, default=None,
            help="Email of the user whose business to seed. Defaults to the first OWNER found.",
        )
        parser.add_argument(
            "--flush", action="store_true",
            help="Delete existing demo data (products/sales/purchases/customers/suppliers) for this business before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        email = options["email"]
        flush = options["flush"]

        # ---- Find the business ----
        if email:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"No user with email {email}"))
                return
            membership = BusinessMember.objects.filter(user=user, role="OWNER").first()
            if not membership:
                self.stderr.write(self.style.ERROR(f"{email} is not an OWNER of any business"))
                return
            business = membership.business
        else:
            # Pick the first business whose owner we can find
            membership = BusinessMember.objects.filter(role="OWNER").select_related("business").first()
            if not membership:
                self.stderr.write(self.style.ERROR(
                    "No business found. Register a user first, or pass --email."
                ))
                return
            business = membership.business
            user = membership.user

        self.stdout.write(self.style.SUCCESS(f"Seeding business: {business.name} (id={business.id})"))

        # ---- Optional flush ----
        if flush:
            self.stdout.write("  Flushing existing demo data…")
            from sales.models import Sale
            from purchases.models import Purchase
            Sale.objects.filter(business=business).delete()
            Purchase.objects.filter(business=business).delete()
            Product.objects.filter(business=business).delete()
            Category.objects.filter(business=business).delete()
            Customer.objects.filter(business=business).delete()
            Supplier.objects.filter(business=business).delete()

        # ---- Suppliers ----
        suppliers = []
        for name, phone, email_addr in SUPPLIERS:
            s, created = Supplier.objects.get_or_create(
                business=business, phone=phone,
                defaults={"name": name, "email": email_addr},
            )
            suppliers.append(s)
        self.stdout.write(f"  Suppliers: {len(suppliers)} ({Supplier.objects.filter(business=business).count()} total)")

        # ---- Customers ----
        customers = []
        for name, phone, email_addr in CUSTOMERS:
            c, created = Customer.objects.get_or_create(
                business=business, phone=phone,
                defaults={"name": name, "email": email_addr},
            )
            customers.append(c)
        self.stdout.write(f"  Customers: {len(customers)} ({Customer.objects.filter(business=business).count()} total)")

        # ---- Categories + Products ----
        created_products = 0
        skipped_products = 0
        for cat_name, cat_desc in CATEGORIES:
            cat, _ = Category.objects.get_or_create(
                business=business, name=cat_name,
                defaults={"description": cat_desc},
            )
            products_in_cat = PRODUCTS_BY_CAT.get(cat_name, [])
            for prod_name, sku, price, cost in products_in_cat:
                product, created = Product.objects.get_or_create(
                    business=business, sku=sku,
                    defaults={
                        "name": prod_name,
                        "category": cat,
                        "price": Decimal(str(price)),
                        "cost": Decimal(str(cost)),
                        "is_active": True,
                    },
                )
                if created:
                    created_products += 1
                else:
                    skipped_products += 1

        total_products = Product.objects.filter(business=business).count()
        self.stdout.write(f"  Products: {created_products} created, {skipped_products} already existed ({total_products} total)")

        # ---- Initial stock via purchases ----
        # Every product gets an initial purchase of 40-120 units
        unstocked = [p for p in Product.objects.filter(business=business) if p.stock.quantity == 0]
        purchase_count = 0
        for i in range(0, len(unstocked), 6):  # 6 products per purchase
            batch = unstocked[i:i + 6]
            if not batch:
                continue
            supplier = random.choice(suppliers)
            items = [
                {
                    "product_id": p.id,
                    "quantity": random.randint(40, 120),
                    "unit_cost": str(p.cost),
                }
                for p in batch
            ]
            record_purchase(
                business=business,
                items_data=items,
                user=user,
                supplier=supplier,
                is_paid=random.choice([True, False]),
                note=f"Initial stock - batch {i // 6 + 1}",
            )
            purchase_count += 1

        self.stdout.write(f"  Initial purchases: {purchase_count}")

        # ---- Sales across the last 60 days ----
        # Only for products that have stock
        stocked = [p for p in Product.objects.filter(business=business) if p.stock.quantity > 20]
        sales_created = 0
        now = timezone.now()
        for _ in range(80):
            # Pick 1-3 random products
            n_items = random.randint(1, 3)
            basket = random.sample(stocked, min(n_items, len(stocked)))
            items = []
            for p in basket:
                max_qty = min(5, p.stock.quantity)
                if max_qty <= 0:
                    continue
                qty = random.randint(1, max_qty)
                items.append({
                    "product_id": p.id,
                    "quantity": qty,
                    "unit_price": str(p.price),
                })
            if not items:
                continue

            days_ago = random.randint(0, 59)
            when = now - timedelta(days=days_ago, hours=random.randint(0, 23))

            customer = random.choice(customers) if random.random() < 0.7 else None
            payment = random.choice(["CASH", "MPESA", "CARD", "BANK"])

            try:
                sale = record_sale(
                    business=business,
                    items_data=items,
                    user=user,
                    payment_method=payment,
                    customer=customer,
                    note="",
                )
                # Backdate the sale
                sale.created_at = when
                sale.save(update_fields=["created_at"])
                sales_created += 1
            except Exception:
                # Skip if stock ran out
                continue

        self.stdout.write(f"  Sales: {sales_created} created")

        self.stdout.write(self.style.SUCCESS("✓ Seed complete!"))
        self.stdout.write("")
        self.stdout.write("Login at http://localhost:3000/login with the owner account.")