Simple inventory and sales management for small businesses.

**Stage 1: Foundation & Authentication** — this repo currently contains the
backend and multi-tenant skeleton. Inventory, sales, POS, and reporting come
in later stages.

## Tech Stack

- **Backend**: Python 3.12, Django 5.2, Django REST Framework, SimpleJWT
- **Database**: PostgreSQL 15
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS (pending — stage 2)
- **Auth**: JWT (access + refresh tokens)

## Project Structure

BizTrack/
├── biztrack/
│ └── backend/
│ ├── manage.py
│ ├── requirements.txt
│ ├── .env (gitignored)
│ ├── config/ Django project settings + URLs
│ ├── accounts/ Custom User model + auth endpoints
│ └── businesses/ Business + BusinessMember + tenant APIs
├── .gitignore
└── README.md


## Architecture Highlights

- **Custom email-based User model** — no username field. Login with email.
- **Multi-tenant by design** — a User can belong to many Businesses via
  `BusinessMember`. Every business-scoped endpoint checks membership before
  returning data.
- **404 over 403 for non-members** — hides business existence from users who
  don't belong to it (prevents ID enumeration).
- **Role hierarchy** — OWNER, ADMIN, MANAGER, CASHIER, STAFF.
- **JWT auth** — short-lived access tokens (60 min), longer refresh tokens
  (7 days). SimpleJWT signs with `SECRET_KEY`.

## Backend Setup (Windows, dev)

```powershell
# 1. Clone
git clone <repo-url>
cd BizTrack\biztrack\backend

# 2. Create virtualenv with Python 3.12
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install deps
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# 4. Create .env (see .env.example)
# Then run migrations
python manage.py makemigrations
python manage.py migrate

# 5. Create an admin user
python manage.py createsuperuser

# 6. Run dev server
python manage.py runserver

Open http://127.0.0.1:8000/admin/ to log in.

Environment Variables (.env)
Variable	Purpose	Example
SECRET_KEY	Django + JWT signing key	50+ random chars
DEBUG	Debug mode	True
ALLOWED_HOSTS	Comma-separated hosts	localhost,127.0.0.1
DB_NAME	Postgres DB	biztrack
DB_USER	Postgres user	biztrack
DB_PASSWORD	Postgres password	biztrack
DB_HOST	Postgres host	localhost
DB_PORT	Postgres port	5432
CORS_ALLOWED_ORIGINS	Frontend origins	http://localhost:3000

Database Setup
-- As postgres superuser
CREATE DATABASE biztrack;
CREATE USER biztrack WITH PASSWORD 'biztrack';
ALTER ROLE biztrack SET client_encoding TO 'utf8';
ALTER ROLE biztrack SET default_transaction_isolation TO 'read committed';
ALTER ROLE biztrack SET timezone TO 'UTC';
ALTER USER biztrack CREATEDB;   -- required for running tests
\c biztrack
GRANT ALL ON SCHEMA public TO biztrack;
ALTER SCHEMA public OWNER TO biztrack;

API Overview
All endpoints are under /api/. Authenticated endpoints require
Authorization: Bearer <access_token>.

Auth
Method	Endpoint	Auth	Body / Notes
POST	/api/auth/register/	No	{email, first_name, last_name, phone, password, password_confirm}
POST	/api/auth/login/	No	{email, password} → {access, refresh}
POST	/api/auth/refresh/	No	{refresh} → {access}
GET	/api/auth/me/	Yes	Returns current user profile
Businesses
Method	Endpoint	Auth	Notes
GET	/api/businesses/	Yes	List businesses the user belongs to
POST	/api/businesses/	Yes	Create business; creator becomes OWNER
GET	/api/businesses/<id>/	Member	Retrieve
PATCH	/api/businesses/<id>/	Member	Update
GET	/api/businesses/<id>/members/	Member	List members
POST	/api/businesses/<id>/members/add/	Owner/Admin	{email, role}
GET	/api/businesses/<id>/members/<pk>/	Owner/Admin	Retrieve membership
PATCH	/api/businesses/<id>/members/<pk>/	Owner/Admin	Update role
DELETE	/api/businesses/<id>/members/<pk>/	Owner/Admin	Remove member
Running Tests
powershell
python manage.py test -v 2
Tests create a temporary database (test_biztrack), run, and tear down.
12 tests cover registration, login, JWT auth, business CRUD, membership,
multi-tenant isolation, role enforcement, and unauthorized access.

Current Development Stage
Stage 1 — Foundation & Authentication ✅

☑ Custom email-based User model
☑ JWT authentication (register, login, refresh, me)
☑ Business + BusinessMember models with roles
☑ Multi-tenant isolation on all business endpoints
☑ Django admin for all models
☑ 12 automated tests, all passing
□ Frontend (Next.js + Tailwind)
Not in scope for Stage 1 (later stages): products, inventory, sales,
purchases, customers, suppliers, expenses, invoices, reports, POS, M-Pesa,
subscriptions.
'@

[System.IO.File]::WriteAllText(
(Join-Path (Get-Location) "README.md"),
c
o
n
t
e
n
t
,
(
N
e
w
−
O
b
j
e
c
t
S
y
s
t
e
m
.
T
e
x
t
.
U
T
F
8
E
n
c
o
d
i
n
g
(
content,(New−ObjectSystem.Text.UTF8Encoding(false))
)

Write-Host "README.md written:"
Get-Content README.md | Select-Object -First 15

text

---

## 👉 Step K12: Commit the Work

```powershell
cd C:\Users\jubil\Projects\BizTrack

# Check status
git status

# Add everything except ignored files
git add -A

# Commit
git commit -m "Stage 1: Backend complete - auth, businesses, multi-tenant isolation, tests"

# Push to GitHub
git push
If git add -A accidentally stages venv/ or .env, cancel with Ctrl+C and check .gitignore:

powershell
Get-Content .gitignore
You should see venv/ and .env listed. If not, add them:

powershell
Add-Content .gitignore "`nvenv/`n.env`n__pycache__/`n*.pyc`n"
Then re-run git add -A and commit.

What to Paste Back
Output of the SECRET_KEY fix (length 50 confirmation)

python manage.py test -v 2 — verify still 12/12 OK

git status — what's staged

git log --oneline -3 — confirm the commit

Then we're done with backend. Next up: the frontend — create-next-app, landing page, login, register, dashboard.

Progress Tracker
Step	Status
Infrastructure	✅
API code	✅
Smoke test	✅
403 → 404 fix	✅
12 automated tests	✅
K11. README	👈 you are here
K12. Git commit	this message
L. Frontend	next
Backend is 100% done. Frontend is the only piece left for Stage 1.





# 🎉 All 12 Tests Pass — Stage 1 Backend Completed


The test suite exercises every security guarantee we built:

| Test | What it proves |
|------|---------------|
| `test_register_creates_user` | Users sign up; passwords are never returned |
| `test_register_password_mismatch_fails` | Validation catches mismatches |
| `test_login_returns_tokens` | JWT auth works |
| `test_me_requires_auth` | Protected endpoints reject unauthenticated calls |
| `test_me_returns_current_user` | JWT decodes and maps to the right user |
| `test_create_business_makes_creator_owner` | Auto-owner logic on business creation |
| `test_list_only_user_businesses` | Multi-tenant isolation on list |
| `test_non_member_cannot_view_business` | **404** (not 403) hides existence from non-members |
| `test_unauthorized_access_denied` | 401 without token |
| `test_add_member_by_email` | Owner can invite by email |
| `test_non_admin_cannot_add_member` | Cashiers can't add members |
| `test_duplicate_membership_fails_gracefully` | `get_or_create` prevents duplicate rows |

This is exactly what a production SaaS needs to be safe from the start.

---

## ⚠️ One Warning to Fix — JWT Signing Key Too Short

You saw this in the test output:

```
InsecureKeyLengthWarning: The HMAC key is 16 bytes long, which is 
below the minimum recommended length of 32 bytes for SHA256.
```

That comes from **SimpleJWT** warning that your `SECRET_KEY` — which it uses to sign tokens — is too short. This is a **security warning, not a failure**, but we should fix it now. The `django.core.management.utils.get_random_secret_key()` function returns 50 characters, so why is it 16?

**Likely cause:** when we wrote the `.env` file, the secret generated was shorter than expected, or the `.env` didn't load and Django fell back to `"dev-insecure-key"` (16 characters).

Let's check:

```powershell
Get-Content .env | Where-Object { $_ -match '^SECRET_KEY=' } | ForEach-Object {
    $len = $_.Length - "SECRET_KEY=".Length
    "SECRET_KEY length: $len characters"
}
```

**Expected:** length of 50.

**If it's 16 or short:**

Regenerate and rewrite:

```powershell
$secret = python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Read current .env
$env_content = Get-Content .env -Raw
# Replace SECRET_KEY line
$env_content = $env_content -replace 'SECRET_KEY=.*', "SECRET_KEY=$secret"
# Write back (without BOM)
[System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) ".env"),
    $env_content,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "New SECRET_KEY length: $($secret.Length)"
```

Then verify:

```powershell
python manage.py shell -c "from django.conf import settings; print('SECRET_KEY length:', len(settings.SECRET_KEY))"
```

**Expected:** `SECRET_KEY length: 50`

---

## 👉 Step K11: README

Write a proper `README.md` at the repo root documenting everything. This is what a new contributor (or future you) reads first.

```powershell
cd C:\Users\jubil\Projects\BizTrack

$content = @'
# BizTrack

Simple inventory and sales management for small businesses.

**Stage 1: Foundation & Authentication** — this repo currently contains the
backend and multi-tenant skeleton. Inventory, sales, POS, and reporting come
in later stages.

## Tech Stack

- **Backend**: Python 3.12, Django 5.2, Django REST Framework, SimpleJWT
- **Database**: PostgreSQL 15
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS (pending — stage 2)
- **Auth**: JWT (access + refresh tokens)

## Project Structure

```
BizTrack/
├── biztrack/
│   └── backend/
│       ├── manage.py
│       ├── requirements.txt
│       ├── .env                    (gitignored)
│       ├── config/                 Django project settings + URLs
│       ├── accounts/               Custom User model + auth endpoints
│       └── businesses/             Business + BusinessMember + tenant APIs
├── .gitignore
└── README.md
```

## Architecture Highlights

- **Custom email-based User model** — no username field. Login with email.
- **Multi-tenant by design** — a User can belong to many Businesses via
  `BusinessMember`. Every business-scoped endpoint checks membership before
  returning data.
- **404 over 403 for non-members** — hides business existence from users who
  don't belong to it (prevents ID enumeration).
- **Role hierarchy** — OWNER, ADMIN, MANAGER, CASHIER, STAFF.
- **JWT auth** — short-lived access tokens (60 min), longer refresh tokens
  (7 days). SimpleJWT signs with `SECRET_KEY`.

## Backend Setup (Windows, dev)

```powershell
# 1. Clone
git clone <repo-url>
cd BizTrack\biztrack\backend

# 2. Create virtualenv with Python 3.12
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install deps
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# 4. Create .env (see .env.example)
# Then run migrations
python manage.py makemigrations
python manage.py migrate

# 5. Create an admin user
python manage.py createsuperuser

# 6. Run dev server
python manage.py runserver
```

Open **http://127.0.0.1:8000/admin/** to log in.

## Environment Variables (`.env`)

| Variable | Purpose | Example |
|----------|---------|---------|
| `SECRET_KEY` | Django + JWT signing key | 50+ random chars |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated hosts | `localhost,127.0.0.1` |
| `DB_NAME` | Postgres DB | `biztrack` |
| `DB_USER` | Postgres user | `biztrack` |
| `DB_PASSWORD` | Postgres password | `biztrack` |
| `DB_HOST` | Postgres host | `localhost` |
| `DB_PORT` | Postgres port | `5432` |
| `CORS_ALLOWED_ORIGINS` | Frontend origins | `http://localhost:3000` |

## Database Setup

```sql
-- As postgres superuser
CREATE DATABASE biztrack;
CREATE USER biztrack WITH PASSWORD 'biztrack';
ALTER ROLE biztrack SET client_encoding TO 'utf8';
ALTER ROLE biztrack SET default_transaction_isolation TO 'read committed';
ALTER ROLE biztrack SET timezone TO 'UTC';
ALTER USER biztrack CREATEDB;   -- required for running tests
\c biztrack
GRANT ALL ON SCHEMA public TO biztrack;
ALTER SCHEMA public OWNER TO biztrack;
```

## API Overview

All endpoints are under `/api/`. Authenticated endpoints require
`Authorization: Bearer <access_token>`.

### Auth

| Method | Endpoint | Auth | Body / Notes |
|--------|----------|------|--------------|
| POST | `/api/auth/register/` | No | `{email, first_name, last_name, phone, password, password_confirm}` |
| POST | `/api/auth/login/` | No | `{email, password}` → `{access, refresh}` |
| POST | `/api/auth/refresh/` | No | `{refresh}` → `{access}` |
| GET | `/api/auth/me/` | Yes | Returns current user profile |

### Businesses

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/api/businesses/` | Yes | List businesses the user belongs to |
| POST | `/api/businesses/` | Yes | Create business; creator becomes OWNER |
| GET | `/api/businesses/<id>/` | Member | Retrieve |
| PATCH | `/api/businesses/<id>/` | Member | Update |
| GET | `/api/businesses/<id>/members/` | Member | List members |
| POST | `/api/businesses/<id>/members/add/` | Owner/Admin | `{email, role}` |
| GET | `/api/businesses/<id>/members/<pk>/` | Owner/Admin | Retrieve membership |
| PATCH | `/api/businesses/<id>/members/<pk>/` | Owner/Admin | Update role |
| DELETE | `/api/businesses/<id>/members/<pk>/` | Owner/Admin | Remove member |

## Running Tests

```powershell
python manage.py test -v 2
```

Tests create a temporary database (`test_biztrack`), run, and tear down.
**12 tests** cover registration, login, JWT auth, business CRUD, membership,
multi-tenant isolation, role enforcement, and unauthorized access.

## Current Development Stage

**Stage 1 — Foundation & Authentication** ✅

- [x] Custom email-based User model
- [x] JWT authentication (register, login, refresh, me)
- [x] Business + BusinessMember models with roles
- [x] Multi-tenant isolation on all business endpoints
- [x] Django admin for all models
- [x] 12 automated tests, all passing
- [ ] Frontend (Next.js + Tailwind)

**Not in scope for Stage 1** (later stages): products, inventory, sales,
purchases, customers, suppliers, expenses, invoices, reports, POS, M-Pesa,
subscriptions.
'@

[System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) "README.md"),
    $content,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "README.md written:"
Get-Content README.md | Select-Object -First 15
```

---

## 👉 Step K12: Commit the Work

```powershell
cd C:\Users\jubil\Projects\BizTrack

# Check status
git status

# Add everything except ignored files
git add -A

# Commit
git commit -m "Stage 1: Backend complete - auth, businesses, multi-tenant isolation, tests"

# Push to GitHub
git push
```

If `git add -A` accidentally stages `venv/` or `.env`, **cancel with Ctrl+C** and check `.gitignore`:

```powershell
Get-Content .gitignore
```

You should see `venv/` and `.env` listed. If not, add them:

```powershell
Add-Content .gitignore "`nvenv/`n.env`n__pycache__/`n*.pyc`n"
```

Then re-run `git add -A` and commit.

---

## What to Paste Back

1. Output of the `SECRET_KEY` fix (length 50 confirmation)
2. `python manage.py test -v 2` — verify still 12/12 OK
3. `git status` — what's staged
4. `git log --oneline -3` — confirm the commit

Then we're done with backend. Next up: **the frontend** — `create-next-app`, landing page, login, register, dashboard.

---

## Progress Tracker

| Step | Status |
|------|--------|
| Infrastructure | ✅ |
| API code | ✅ |
| Smoke test | ✅ |
| 403 → 404 fix | ✅ |
| **12 automated tests** | ✅ |
| **K11. README** | 👈 you are here |
| K12. Git commit | this message |
| **L. Frontend** | next |

**Backend is 100% done. Frontend is the only piece left for Stage 1.**