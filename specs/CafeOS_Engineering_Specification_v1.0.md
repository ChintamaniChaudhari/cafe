# CafeOS Engineering Design Specification

**Version:** 1.0 (MVP Foundation) **Status:** Approved for
Implementation

# 1. Project Overview

## Vision

CafeOS is a cloud-native Restaurant Operating System (ROS) focused on
QR-based ordering, real-time kitchen operations, and scalable
architecture. The MVP must be usable in a real café while providing a
foundation for future AI-powered business intelligence.

## Product Principles

-   Mobile-first customer experience.
-   Zero-friction ordering (no customer login).
-   Real-time updates using WebSockets.
-   Backend is the source of truth.
-   AI is an enhancement, never a dependency.
-   Architecture must scale from one café to SaaS.

# 2. MVP Scope

## Included

-   QR table ordering
-   Customer portal
-   Kitchen dashboard
-   Admin dashboard
-   Menu management
-   Order lifecycle
-   PostgreSQL persistence
-   WebSocket notifications
-   Dockerized development

## Excluded

-   Online payments
-   Loyalty programs
-   Inventory automation
-   AI features
-   Multi-branch support
-   Customer accounts

# 3. Technology Stack

  Layer             Technology
  ----------------- ---------------------------------------------------
  Frontend          React + Vite + Tailwind CSS
  Backend           FastAPI
  ORM               SQLModel / SQLAlchemy 2
  Database          PostgreSQL 16
  Driver            psycopg3 (async)
  Authentication    JWT (staff), HTTP-only session cookie (customers)
  Realtime          WebSockets
  Containers        Docker + Docker Compose
  Version Control   Git

# 4. Architecture

Presentation -\> API Routers -\> Service Layer -\> Repository Layer -\>
SQLModel -\> PostgreSQL

Rules: - Routers contain no business logic. - Services never import from
other services directly. - Repositories are responsible for database
access. - Backend computes all pricing.

# 5. Domains

-   auth
-   tenants
-   dining
-   menu
-   orders
-   kitchen
-   admin
-   notifications
-   shared

Future: - inventory - analytics - ai

# 6. Database Entities

## tenants

id(UUID), slug, name, currency_symbol

## users

id(UUID), tenant_id, name, email, password_hash, role, is_active

## tables

id(UUID), tenant_id, label, qr_shortcode

## dining_sessions

id(UUID), table_id, status(ACTIVE/CLOSED), created_at, closed_at

## menu_categories

id(UUID), tenant_id, name

## menu_items

id(UUID), category_id, name, description, base_price, image_url,
is_available, is_deleted

## orders

id(UUID), session_id, order_number, status, subtotal, tax_amount,
discount_amount, total_amount, created_at

## order_items

id(UUID), order_id, item_id, quantity, unit_price

## audit_logs

id(UUID), user_id, entity, action, entity_id, created_at

# 7. Order State Machine

RECEIVED -\> PREPARING -\> READY -\> SERVED

Invalid transitions must be rejected.

# 8. API Contracts

GET /api/v1/s/{shortcode} - Validate QR - Create/reuse ACTIVE dining
session - Set HTTP-only cookie

GET /api/v1/menu

POST /api/v1/orders

PATCH /api/v1/orders/{id}/status

GET /api/v1/ws/kitchen

# 9. Security

-   JWT for staff
-   HTTP-only cookies for customers
-   Password hashing with Argon2/Bcrypt
-   Parameterized SQL
-   Rate limiting
-   Secure QR shortcodes
-   CORS whitelist

# 10. Folder Structure

backend/ app/ api/ core/ models/ repositories/ services/ schemas/
websocket/ tests/

frontend/ docs/ docker/

# 11. Coding Standards

-   Black + Ruff
-   Type hints required
-   Pydantic validation
-   Conventional Commits
-   Repository pattern
-   Service pattern
-   Unit tests for services

# 12. Development Roadmap

Phase 0 - Architecture - Wireframes - ERD

Phase 1 - Database - Authentication - Menu - Orders - Kitchen - Admin

Phase 2 - Billing - Inventory - Reports - Staff roles

Phase 3 - Deployment - Monitoring - CI/CD

Phase 4 - AI recommendations - Forecasting - Analytics

# 13. Success Criteria

-   Customer scans QR and orders successfully.
-   Kitchen receives order in real time.
-   Admin manages menu.
-   Orders persist correctly.
-   System deploys via Docker.
-   Architecture supports future SaaS expansion.
