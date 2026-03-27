# API Endpoints Documentation

Base URL: `http://localhost:5000/api/`

---

## Auth
- **POST** `/auth/register` — Register a new tenant and owner user
- **POST** `/auth/login` — Login (returns JWT token)
- **GET** `/auth/me` — Get current user info (auth required)

## Tenant
- **GET** `/tenant` — Get tenant info (auth required)
- **PUT** `/tenant` — Update tenant info (owner/manager)

## Users
- **GET** `/users` — List users (owner/manager)
- **POST** `/users` — Create user (owner/manager)
- **PUT** `/users/:id` — Update user (owner/manager)
- **DELETE** `/users/:id` — Delete user (owner)

## Customers
- **GET** `/customers` — List customers
- **GET** `/customers/:id` — Get customer by ID
- **POST** `/customers` — Create customer (owner/manager/staff)
- **PUT** `/customers/:id` — Update customer (owner/manager/staff)
- **DELETE** `/customers/:id` — Delete customer (owner/manager)

## Services
- **GET** `/services` — List services
- **POST** `/services` — Create service (owner/manager)
- **PUT** `/services/:id` — Update service (owner/manager)
- **DELETE** `/services/:id` — Delete service (owner/manager)

## Jobs
- **GET** `/jobs` — List jobs
- **GET** `/jobs/:id` — Get job by ID
- **POST** `/jobs` — Create job (owner/manager/staff)
- **PUT** `/jobs/:id` — Update job (owner/manager/staff)
- **PATCH** `/jobs/:id/status` — Update job status (owner/manager/staff/cleaner)
- **DELETE** `/jobs/:id` — Delete job (owner/manager)

## Invoices
- **GET** `/invoices` — List invoices
- **GET** `/invoices/:id` — Get invoice by ID
- **POST** `/invoices` — Create invoice (owner/manager/staff)
- **PUT** `/invoices/:id` — Update invoice (owner/manager/staff)
- **POST** `/invoices/:id/send` — Send invoice (owner/manager/staff)

## Recurring Rules
- **GET** `/recurringRules` — List recurring rules
- **POST** `/recurringRules` — Create recurring rule (owner/manager/staff)
- **PUT** `/recurringRules/:id` — Update recurring rule (owner/manager/staff)
- **DELETE** `/recurringRules/:id` — Delete recurring rule (owner/manager)

## Messages
- **GET** `/messages` — List messages
- **POST** `/messages/send` — Send message (owner/manager/staff)

## Automations
- **GET** `/automations` — List automations
- **POST** `/automations` — Create automation (owner/manager)
- **PUT** `/automations/:id` — Update automation (owner/manager)
- **DELETE** `/automations/:id` — Delete automation (owner/manager)

## Dashboard
- **GET** `/dashboard` — Get dashboard data (auth required)

---

> **Note:** Most endpoints require a valid JWT token in the `Authorization` header: `Bearer <token>`
