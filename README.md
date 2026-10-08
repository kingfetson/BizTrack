# Simple inventory and sales management for small businesses.

> **Stage 1 of the BizTrack SaaS** — foundation, authentication, and multi-tenant
> architecture. Inventory, products, sales, POS, and reporting arrive in later
> stages.

## Overview

BizTrack is a multi-tenant SaaS built for small business owners. One user can
belong to many businesses, each with isolated data and role-based access.

Stage 1 delivers:

- Email-based authentication with JWT
- Business creation and management
- Team membership with roles (OWNER / ADMIN / MANAGER / CASHIER / STAFF)nmkju;'oiu7
- Multi-tenant isolation enforced at the API layer
- A modern, responsive Next.js frontend

## Tech Stack

**Backend:** Python 3.12, Django 5.2, Django REST Framework, SimpleJWT,
PostgreSQL 15, psycopg2-binary, Pillow
**Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS 3, React 18
**Development:** Git, environment variables, REST API

## Architecture
BizTrack/
├── biztrack/
│ ├── backend/ Django project
│ │ ├── manage.py
│ │ ├── requirements.txt
│ │ ├── .env (gitignored)
│ │ ├── config/ Settings + root URLs
│ │ ├── accounts/ Custom User + auth API
│ │ └── businesses/ Business + BusinessMember + tenant API
│ │
│ └── frontend/ Next.js app
│ ├── app/ Pages (App Router)
│ │ ├── page.tsx Landing
│ │ ├── (auth)/login/ Login
│ │ ├── (auth)/register/ Register
│ │ └── (dashboard)/ Authenticated shell
│ ├── components/ui/ Button, Input, Card
│ ├── lib/ api.ts, auth.tsx
│ └── tailwind.config.ts
│
├── .gitignore
└── README.md


### Key design decisions

- **Custom email-based User model.** No `username`. Login with email.
- **Multi-tenant via `BusinessMember` join table.** A user can belong to many
  businesses. Every business-scoped endpoint checks membership.
- **404 over 403 for non-members.** Prevents business-ID enumeration.
- **Role hierarchy.** OWNER and ADMIN can manage membership. Enforcement lives
  in `businesses/permissions.py`.
- **JWT auth.** 60-min access tokens, 7-day refresh tokens.
- **Frontend is a thin client.** All authorization lives on the backend.

## Backend Setup

Prerequisites: Python 3.12, PostgreSQL 15, Git.

```powershell
# 1. Clone
git clone https://github.com/kingfetson/BizTrack.git
cd BizTrack\biztrack\backend

# 2. Create virtualenv
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# 4. Create .env (see Environment Variables section)

# 5. Create the database (see Database Setup)

# 6. Migrate
python manage.py migrate

# 7. Create admin user
python manage.py createsuperuser

# 8. Run
python manage.py runserver
Backend: http://127.0.0.1:8000
Admin: http://127.0.0.1:8000/admin/

Frontend Setup
Prerequisites: Node.js 20+, npm 10+.

powershell
cd BizTrack\biztrack\frontend
npm install
npm run dev
Frontend: http://localhost:3000

Note: Open the frontend in a PowerShell window where the Python venv is
not activated. Mixing Python and Node tooling in one shell can break npx.

Environment Variables
Backend — biztrack/backend/.env
env
SECRET_KEY=<50+ random characters>
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=biztrack
DB_USER=biztrack
DB_PASSWORD=biztrack
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:3000
Generate a SECRET_KEY:

powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
Frontend — biztrack/frontend/.env.local
env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
Database Setup
Run as the postgres superuser:

sql
CREATE DATABASE biztrack;
CREATE USER biztrack WITH PASSWORD 'biztrack';
ALTER ROLE biztrack SET client_encoding TO 'utf8';
ALTER ROLE biztrack SET default_transaction_isolation TO 'read committed';
ALTER ROLE biztrack SET timezone TO 'UTC';
ALTER USER biztrack CREATEDB;
\c biztrack
GRANT ALL ON SCHEMA public TO biztrack;
ALTER SCHEMA public OWNER TO biztrack;
Then:

powershell
python manage.py makemigrations
python manage.py migrate
Running the Project
Two terminals:

Terminal A — backend:

powershell
cd C:\Users\jubil\Projects\BizTrack\biztrack\backend
.\venv\Scripts\Activate.ps1
python manage.py runserver
Terminal B — frontend:

powershell
cd C:\Users\jubil\Projects\BizTrack\biztrack\frontend
npm run dev
Open http://localhost:3000.

API Overview
Base URL: http://127.0.0.1:8000/api
Auth header: Authorization: Bearer <access_token>

Authentication
Method	Endpoint	Auth	Body	Response
POST	/auth/register/	No	{email, first_name, last_name, phone, password, password_confirm}	User object
POST	/auth/login/	No	{email, password}	{access, refresh}
POST	/auth/refresh/	No	{refresh}	{access}
GET	/auth/me/	Yes	—	Current user profile
Businesses
Method	Endpoint	Auth	Purpose
GET	/businesses/	Yes	List businesses the user belongs to
POST	/businesses/	Yes	Create a business (creator becomes OWNER)
GET	/businesses/<id>/	Member	Retrieve
PATCH / PUT	/businesses/<id>/	Member	Update
GET	/businesses/<id>/members/	Member	List members
POST	/businesses/<id>/members/add/	Owner / Admin	Add member {email, role}
GET	/businesses/<id>/members/<pk>/	Owner / Admin	Retrieve membership
PATCH / PUT	/businesses/<id>/members/<pk>/	Owner / Admin	Update role
DELETE	/businesses/<id>/members/<pk>/	Owner / Admin	Remove member
Testing
Backend
powershell
cd biztrack\backend
.\venv\Scripts\Activate.ps1
python manage.py test -v 2
12 tests cover registration, login, JWT auth, business creation, multi-tenant
listing, non-member access (returns 404), unauthorized access (returns 401),
member invitations, role enforcement, and duplicate-membership prevention.

Frontend
powershell
cd biztrack\frontend
npm run lint
npm run build
Security Highlights
Passwords hashed with PBKDF2-SHA256

Secrets in .env, never committed

JWT signing key ≥32 bytes (HS256)

CORS restricted to configured origins

API never returns password hashes

Authorization enforced at the queryset level

Bulk writes wrapped in transactions

Current Development Stage
Stage 1 — Foundation & Authentication ✅

☑ Custom email-based User model
☑ JWT authentication (register, login, refresh, me)
☑ Business + BusinessMember with five roles
☑ Multi-tenant isolation at the queryset level
☑ Django admin for all models
☑ 12 automated backend tests, all passing
☑ Next.js + TypeScript + Tailwind frontend
☑ Landing, Login, Register, Dashboard pages
☑ Responsive design with mobile sidebar
☑ End-to-end auth flow working
Not yet implemented: Products, Inventory, Stock movements, Sales,
Purchases, Customers, Suppliers, Expenses, Invoices, Reports, POS, M-Pesa,
Subscriptions.

License
Proprietary — © BizTrack. All rights reserved.
'@

[System.IO.File]::WriteAllText(readmePath,
readmePath,content, (New-Object System.Text.UTF8Encoding(false)))Write−Host"README.mdupdatedat
false)))Write−Host"README.mdupdatedatreadmePath"
Get-Content $readmePath | Select-Object -First 6


### Step 5: Stage everything

powershell
# Return to repo root for cleaner git commands
cd (git rev-parse --show-toplevel)

git add -A
git status
Expected: staged files include:

README.md (modified)

biztrack/frontend/... (new)

.gitignore (modified, if we added a line)

Any change to biztrack/backend/accounts/readme.md — either removed or modified

Step 6: Commit
powershell
git commit -m "Stage 1: Frontend complete - landing, auth pages, dashboard shell

- Next.js 14 + TypeScript + Tailwind
- API client and auth context
- Landing page (Features / How It Works / Pricing / CTA)
- Register and Login pages with validation
- Authenticated dashboard layout with responsive sidebar
- Dashboard placeholder listing user's businesses
- Full end-to-end auth flow verified in browser

Stage 1 complete: multi-tenant foundation, JWT auth, responsive SaaS UI."
Step 7: Push
powershell
git push
Step 8: Tag Stage 1 (recommended)
powershell
git tag -a v0.1.0-stage1 -m "Stage 1 complete: foundation, auth, multi-tenant, frontend"
git push --tags
What to Do Now — In Order
Run git rev-parse --show-toplevel and paste the output

Run Get-Content .\backend\accounts\readme.md and paste the content

Decide on the accounts/readme.md — remove it or keep it

Run Step 4 (README rewrite)

Run Step 5 (git add -A and git status) and paste the full output before committing

I want to see the git status after staging, to confirm nothing unexpected (like node_modules) sneaks in. Then you commit + push + tag.v**Simple inventory and sales management for small businesses.**

> **Stage 1 of the BizTrack SaaS** — foundation, authentication, and multi-tenant
> architecture. Inventory, products, sales, POS, and reporting arrive in later
> stages.

## Overview

BizTrack is a multi-tenant SaaS built for small business owners. One user can
belong to many businesses, each with isolated data and role-based access.

Stage 1 delivers:

- Email-based authentication with JWT
- Business creation and management
- Team membership with roles (OWNER / ADMIN / MANAGER / CASHIER / STAFF)
- Multi-tenant isolation enforced at the API layer
- A modern, responsive Next.js frontend

## Tech Stack

**Backend:** Python 3.12, Django 5.2, Django REST Framework, SimpleJWT,
PostgreSQL 15, psycopg2-binary, Pillow
**Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS 3, React 18
**Development:** Git, environment variables, REST API

## Architecture
BizTrack/
├── biztrack/
│ ├── backend/ Django project
│ │ ├── manage.py
│ │ ├── requirements.txt
│ │ ├── .env (gitignored)
│ │ ├── config/ Settings + root URLs
│ │ ├── accounts/ Custom User + auth API
│ │ └── businesses/ Business + BusinessMember + tenant API
│ │
│ └── frontend/ Next.js app
│ ├── app/ Pages (App Router)
│ │ ├── page.tsx Landing
│ │ ├── (auth)/login/ Login
│ │ ├── (auth)/register/ Register
│ │ └── (dashboard)/ Authenticated shell
│ ├── components/ui/ Button, Input, Card
│ ├── lib/ api.ts, auth.tsx
│ └── tailwind.config.ts
│
├── .gitignore
└── README.md


### Key design decisions

- **Custom email-based User model.** No `username`. Login with email.
- **Multi-tenant via `BusinessMember` join table.** A user can belong to many
  businesses. Every business-scoped endpoint checks membership.
- **404 over 403 for non-members.** Prevents business-ID enumeration.
- **Role hierarchy.** OWNER and ADMIN can manage membership. Enforcement lives
  in `businesses/permissions.py`.
- **JWT auth.** 60-min access tokens, 7-day refresh tokens.
- **Frontend is a thin client.** All authorization lives on the backend.

## Backend Setup

Prerequisites: Python 3.12, PostgreSQL 15, Git.

powershell
# 1. Clone
git clone https://github.com/kingfetson/BizTrack.git
cd BizTrack\biztrack\backend

# 2. Create virtualenv
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# 4. Create .env (see Environment Variables section)

# 5. Create the database (see Database Setup)

# 6. Migrate
python manage.py migrate

# 7. Create admin user
python manage.py createsuperuser

# 8. Run
python manage.py runserver
Backend: http://127.0.0.1:8000
Admin: http://127.0.0.1:8000/admin/

Frontend Setup
Prerequisites: Node.js 20+, npm 10+.

powershell
cd BizTrack\biztrack\frontend
npm install
npm run dev
Frontend: http://localhost:3000

Note: Open the frontend in a PowerShell window where the Python venv is
not activated. Mixing Python and Node tooling in one shell can break npx.

Environment Variables
Backend — biztrack/backend/.env
env
SECRET_KEY=<50+ random characters>
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=biztrack
DB_USER=biztrack
DB_PASSWORD=biztrack
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:3000
Generate a SECRET_KEY:

powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
Frontend — biztrack/frontend/.env.local
env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
Database Setup
Run as the postgres superuser:

sql
CREATE DATABASE biztrack;
CREATE USER biztrack WITH PASSWORD 'biztrack';
ALTER ROLE biztrack SET client_encoding TO 'utf8';
ALTER ROLE biztrack SET default_transaction_isolation TO 'read committed';
ALTER ROLE biztrack SET timezone TO 'UTC';
ALTER USER biztrack CREATEDB;
\c biztrack
GRANT ALL ON SCHEMA public TO biztrack;
ALTER SCHEMA public OWNER TO biztrack;
Then:

powershell
python manage.py makemigrations
python manage.py migrate
Running the Project
Two terminals:

Terminal A — backend:

powershell
cd C:\Users\jubil\Projects\BizTrack\biztrack\backend
.\venv\Scripts\Activate.ps1
python manage.py runserver
Terminal B — frontend:

powershell
cd C:\Users\jubil\Projects\BizTrack\biztrack\frontend
npm run dev
Open http://localhost:3000.

API Overview
Base URL: http://127.0.0.1:8000/api
Auth header: Authorization: Bearer <access_token>

Authentication
Method	Endpoint	Auth	Body	Response
POST	/auth/register/	No	{email, first_name, last_name, phone, password, password_confirm}	User object
POST	/auth/login/	No	{email, password}	{access, refresh}
POST	/auth/refresh/	No	{refresh}	{access}
GET	/auth/me/	Yes	—	Current user profile
Businesses
Method	Endpoint	Auth	Purpose
GET	/businesses/	Yes	List businesses the user belongs to
POST	/businesses/	Yes	Create a business (creator becomes OWNER)
GET	/businesses/<id>/	Member	Retrieve
PATCH / PUT	/businesses/<id>/	Member	Update
GET	/businesses/<id>/members/	Member	List members
POST	/businesses/<id>/members/add/	Owner / Admin	Add member {email, role}
GET	/businesses/<id>/members/<pk>/	Owner / Admin	Retrieve membership
PATCH / PUT	/businesses/<id>/members/<pk>/	Owner / Admin	Update role
DELETE	/businesses/<id>/members/<pk>/	Owner / Admin	Remove member
Testing
Backend
powershell
cd biztrack\backend
.\venv\Scripts\Activate.ps1
python manage.py test -v 2
12 tests cover registration, login, JWT auth, business creation, multi-tenant
listing, non-member access (returns 404), unauthorized access (returns 401),
member invitations, role enforcement, and duplicate-membership prevention.

Frontend
powershell
cd biztrack\frontend
npm run lint
npm run build
Security Highlights
Passwords hashed with PBKDF2-SHA256

Secrets in .env, never committed

JWT signing key ≥32 bytes (HS256)

CORS restricted to configured origins

API never returns password hashes

Authorization enforced at the queryset level

Bulk writes wrapped in transactions

Current Development Stage
Stage 1 — Foundation & Authentication ✅

☑ Custom email-based User model
☑ JWT authentication (register, login, refresh, me)
☑ Business + BusinessMember with five roles
☑ Multi-tenant isolation at the queryset level
☑ Django admin for all models
☑ 12 automated backend tests, all passing
☑ Next.js + TypeScript + Tailwind frontend
☑ Landing, Login, Register, Dashboard pages
☑ Responsive design with mobile sidebar
☑ End-to-end auth flow working
Not yet implemented: Products, Inventory, Stock movements, Sales,
Purchases, Customers, Suppliers, Expenses, Invoices, Reports, POS, M-Pesa,
Subscriptions.

### Products & Categories

All product and category endpoints are nested under a business.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/businesses/<id>/categories/` | Member | List categories (with product counts) |
| POST | `/api/businesses/<id>/categories/` | Manager+ | Create category |
| PATCH/PUT | `/api/businesses/<id>/categories/<pk>/` | Manager+ | Update category |
| DELETE | `/api/businesses/<id>/categories/<pk>/` | Manager+ | Delete (products become uncategorized) |
| GET | `/api/businesses/<id>/products/` | Member | List (supports `?search=`, `?category=`, `?is_active=`) |
| POST | `/api/businesses/<id>/products/` | Manager+ | Create product |
| GET | `/api/businesses/<id>/products/<pk>/` | Member | Retrieve |
| PATCH/PUT | `/api/businesses/<id>/products/<pk>/` | Manager+ | Update |
| DELETE | `/api/businesses/<id>/products/<pk>/` | Manager+ | Delete |

**Stage 2 — Products** ✅

- [x] `Category` and `Product` models scoped to a business
- [x] Partial unique constraint on SKU per business (when non-empty)
- [x] Cross-tenant category validation
- [x] Role enforcement: STAFF reads, MANAGER+ writes
- [x] 15 new tests, all passing (27 total)
- [x] Products list with live search / category / status filters
- [x] Create / edit / delete product pages
- [x] Category management page
- [x] Business context provider + active-business switcher in sidebar


License
Proprietary — © BizTrack. All rights reserved.
'@

[System.IO.File]::WriteAllText(
readmePath,
readmePath,content, (New-Object System.Text.UTF8Encoding(
false)))Write−Host"README.mdupdatedatfalse)))Write−Host"README.mdupdatedatreadmePath"
Get-Content $readmePath | Select-Object -First 6

### Step 5: Stage everything

powershell
# Return to repo root for cleaner git commands
cd (git rev-parse --show-toplevel)

git add -A
git status
Expected: staged files include:

README.md (modified)

biztrack/frontend/... (new)

.gitignore (modified, if we added a line)

Any change to biztrack/backend/accounts/readme.md — either removed or modified

Step 6: Commit
powershell
git commit -m "Stage 1: Frontend complete - landing, auth pages, dashboard shell

- Next.js 14 + TypeScript + Tailwind
- API client and auth context
- Landing page (Features / How It Works / Pricing / CTA)
- Register and Login pages with validation
- Authenticated dashboard layout with responsive sidebar
- Dashboard placeholder listing user's businesses
- Full end-to-end auth flow verified in browser

Stage 1 complete: multi-tenant foundation, JWT auth, responsive SaaS UI."
Step 7: Push
powershell
git push
Step 8: Tag Stage 1 (recommended)
powershell
git tag -a v0.1.0-stage1 -m "Stage 1 complete: foundation, auth, multi-tenant, frontend"
git push --tags
What to Do Now — In Order
Run git rev-parse --show-toplevel and paste the output

Run Get-Content .\backend\accounts\readme.md and paste the content

Decide on the accounts/readme.md — remove it or keep it

Run Step 4 (README rewrite)

Run Step 5 (git add -A and git status) and paste the full output before committing

I want to see the git status after staging, to confirm nothing unexpected (like node_modules) sneaks in. Then you commit + push + tag.