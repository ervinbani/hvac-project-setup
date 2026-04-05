# Brillo — Frontend Specification (React + TypeScript)

> This document fully describes the existing Node.js/Express/MongoDB backend so that an AI can build a complete React + TypeScript frontend on top of it, without reading any backend source code.

---

## 1. Application Overview

**Brillo** is a multi-tenant SaaS platform for residential and commercial cleaning businesses. Each business (tenant) manages its own customers, jobs, team members, invoices, recurring schedules, automated messages, and business settings through a single web application.

The app is bilingual (English / Spanish) and designed to support both office staff on desktop and field cleaners on mobile.

---

## 2. Tech Stack — Backend (already built)

| Layer     | Technology                  |
| --------- | --------------------------- |
| Runtime   | Node.js + Express           |
| Database  | MongoDB (Mongoose)          |
| Auth      | JWT (Bearer token)          |
| Transport | REST/JSON                   |
| Base URL  | `http://localhost:5000/api` |

All responses follow this envelope:

```json
// success
{ "success": true, "data": { ... } }

// error
{ "success": false, "error": "Human-readable message" }
```

---

## 3. Authentication

### Endpoints

| Method | Path             | Description                                     |
| ------ | ---------------- | ----------------------------------------------- |
| POST   | `/auth/register` | Register a new tenant + owner user              |
| POST   | `/auth/login`    | Login — returns a JWT token                     |
| GET    | `/auth/me`       | Get current authenticated user (token required) |

### Login request / response

```json
// POST /auth/login — body
{ "email": "owner@example.com", "password": "secret" }

// Response
{
  "success": true,
  "data": {
    "token": "<JWT>",
    "user": {
      "_id": "...",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "owner@example.com",
      "role": "owner",
      "tenantId": "...",
      "preferredLanguage": "en"
    }
  }
}
```

### Register request

```json
// POST /auth/register — body
{
  "tenantName": "Sparkle Clean LLC",
  "email": "owner@sparkle.com",
  "password": "secret",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

### Token usage

Every protected request must include the header:

```
Authorization: Bearer <token>
```

Store the token in `localStorage` or a secure cookie. Persist the decoded user object in a global authcontext/store.

---

## 4. Roles & Permissions

There are six roles. The UI must conditionally render actions based on the logged-in user's role.

| Role                 | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| `owner`              | Full access — super admin of the tenant                       |
| `director`           | Near-full access; can view roles/permissions but not delete   |
| `manager_operations` | Operations management — jobs, customers, invoices, scheduling |
| `manager_hr`         | HR management — users, team, settings                         |
| `staff`              | Create and edit — no delete on sensitive resources            |
| `worker`             | Read-only + can update job status and checklist items only    |

> **Shorthand used in this document:**
>
> - **manager+** = owner, director, manager_operations, manager_hr
> - **staff+** = owner, director, manager_operations, manager_hr, staff
> - **all** = all six roles (any authenticated user)

### Permission Matrix

| Feature                       | worker | staff | mgr_hr | mgr_ops | director | owner |
| ----------------------------- | :----: | :---: | :----: | :-----: | :------: | :---: |
| View users/team               |   ❌   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Create/edit users             |   ❌   |  ❌   |   ✅   |   ✅    |    ✅    |  ✅   |
| Delete users                  |   ❌   |  ❌   |   ❌   |   ❌    |    ❌    |  ✅   |
| View customers                |   ✅   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Create/edit customer          |   ❌   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Delete customer               |   ❌   |  ❌   |   ✅   |   ✅    |    ✅    |  ✅   |
| View jobs                     |   ✅   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Create/edit job               |   ❌   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Update job status             |   ✅   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Delete job                    |   ❌   |  ❌   |   ✅   |   ✅    |    ✅    |  ✅   |
| View invoices                 |   ✅   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Create/edit invoice           |   ❌   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Send invoice                  |   ❌   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Delete invoice                |   ❌   |  ❌   |   ❌   |   ❌    |    ❌    |  ✅   |
| View services                 |   ✅   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Create/edit/delete service    |   ❌   |  ❌   |   ✅   |   ✅    |    ✅    |  ✅   |
| View automations              |   ✅   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Create/edit/delete automation |   ❌   |  ❌   |   ✅   |   ✅    |    ✅    |  ✅   |
| View messages                 |   ✅   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Send messages                 |   ❌   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| View settings                 |   ✅   |  ✅   |   ✅   |   ✅    |    ✅    |  ✅   |
| Edit settings (tenant)        |   ❌   |  ❌   |   ✅   |   ✅    |    ✅    |  ✅   |
| View roles & permissions      |   ❌   |  ❌   |   ❌   |   ❌    |    ✅    |  ✅   |
| Manage roles & permissions    |   ❌   |  ❌   |   ❌   |   ❌    |    ❌    |  ✅   |

**Important:** The API enforces permissions server-side. The frontend should hide/disable UI elements that a role cannot access, but it does NOT need to implement logic itself — unauthorized API calls return HTTP `403`.

---

## 5. Data Models

### Tenant

```ts
interface Tenant {
  _id: string;
  name: string;
  slug: string;
  businessType: string; // 'cleaning'
  defaultLanguage: "en" | "es";
  supportedLanguages: ("en" | "es")[];
  timezone: string; // e.g. 'America/New_York'
  contactEmail?: string;
  contactPhone?: string;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
  };
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  subscription: {
    plan: "trial" | "basic" | "pro" | "enterprise";
    status: "active" | "past_due" | "canceled";
    renewalDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

### User (Team Member)

```ts
interface User {
  _id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  role:
    | "owner"
    | "director"
    | "manager_operations"
    | "manager_hr"
    | "staff"
    | "worker";
  preferredLanguage: "en" | "es";
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Customer

```ts
interface Customer {
  _id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  preferredLanguage: "en" | "es";
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    location?: { lat: number; lng: number };
  };
  notes?: string;
  tags: string[];
  status: "lead" | "active" | "inactive";
  source: "manual" | "website" | "phone" | "referral" | "facebook" | "google";
  createdAt: string;
  updatedAt: string;
}
```

### Service

```ts
interface Service {
  _id: string;
  tenantId: string;
  name: { en: string; es: string };
  description: { en?: string; es?: string };
  durationMinutes?: number;
  basePrice?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Job

```ts
type JobStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "canceled"
  | "no_show";

interface Job {
  _id: string;
  tenantId: string;
  customerId: string | Customer; // populated in GET responses
  serviceId?: string | Service; // populated in GET responses
  title?: string;
  propertyAddress: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    location?: { lat: number; lng: number };
  };
  scheduledStart: string; // ISO date string
  scheduledEnd?: string;
  status: JobStatus;
  assignedUsers: (string | User)[];
  checklist: { label: { en: string; es: string }; completed: boolean }[];
  notesInternal?: string;
  notesCustomer?: string;
  recurringRuleId?: string;
  price?: number;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Invoice

```ts
type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

interface InvoiceItem {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

interface Invoice {
  _id: string;
  tenantId: string;
  customerId: string | Customer;
  jobId?: string | Job;
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  currency: string; // default 'USD'
  status: InvoiceStatus;
  dueDate?: string;
  paidAt?: string;
  paymentMethod?: "cash" | "card" | "bank_transfer" | "stripe" | "other";
  createdAt: string;
  updatedAt: string;
}
```

### RecurringRule

```ts
interface RecurringRule {
  _id: string;
  tenantId: string;
  customerId: string | Customer;
  serviceId?: string | Service;
  frequency: "weekly" | "biweekly" | "monthly";
  dayOfWeek?: number; // 0 = Sunday … 6 = Saturday
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### MessageLog

```ts
interface MessageLog {
  _id: string;
  tenantId: string;
  customerId?: string;
  jobId?: string;
  channel: "sms" | "email" | "whatsapp";
  direction: "outbound" | "inbound";
  language: "en" | "es";
  templateKey?: string;
  subject?: string;
  body?: string;
  provider?: string;
  providerMessageId?: string;
  status: "queued" | "sent" | "delivered" | "failed" | "opened";
  createdAt: string;
  updatedAt: string;
}
```

### AutomationRule

```ts
type AutomationTrigger =
  | "job_created"
  | "job_reminder_24h"
  | "job_completed"
  | "invoice_overdue";

interface AutomationRule {
  _id: string;
  tenantId: string;
  name?: string;
  trigger: AutomationTrigger;
  channel?: "sms" | "email";
  templateKey?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Dashboard (GET /api/dashboard response)

```ts
interface DashboardData {
  totalCustomers: number;
  jobsToday: number;
  jobsThisWeek: number;
  revenueMonth: number;
  pendingInvoices: number;
  recentJobs: Job[]; // today's jobs, populated, sorted by scheduledStart
  statusBreakdown: Record<JobStatus, number>;
}
```

---

## 6. API Endpoints Reference

> All endpoints require `Authorization: Bearer <token>` unless otherwise noted.

### Auth

| Method | Path             | Body / Notes                                                |
| ------ | ---------------- | ----------------------------------------------------------- |
| POST   | `/auth/register` | `tenantName, email, password, firstName, lastName` — public |
| POST   | `/auth/login`    | `email, password` — returns `{ token, user }` — public      |
| GET    | `/auth/me`       | Returns current user                                        |

### Tenant

| Method | Path      | Required Role                                   |
| ------ | --------- | ----------------------------------------------- |
| GET    | `/tenant` | any                                             |
| PUT    | `/tenant` | owner, director, manager_operations, manager_hr |

### Users (Team)

| Method | Path         | Required Role                                          |
| ------ | ------------ | ------------------------------------------------------ |
| GET    | `/users`     | owner, director, manager_operations, manager_hr, staff |
| GET    | `/users/:id` | owner, director, manager_operations, manager_hr, staff |
| POST   | `/users`     | owner, director, manager_operations, manager_hr        |
| PUT    | `/users/:id` | owner, director, manager_operations, manager_hr        |
| DELETE | `/users/:id` | owner                                                  |

### Customers

| Method | Path             | Required Role                                          |
| ------ | ---------------- | ------------------------------------------------------ |
| GET    | `/customers`     | any                                                    |
| GET    | `/customers/:id` | any                                                    |
| POST   | `/customers`     | owner, director, manager_operations, manager_hr, staff |
| PUT    | `/customers/:id` | owner, director, manager_operations, manager_hr, staff |
| DELETE | `/customers/:id` | owner, director, manager_operations, manager_hr        |

### Services

| Method | Path            | Required Role                                   |
| ------ | --------------- | ----------------------------------------------- |
| GET    | `/services`     | any                                             |
| POST   | `/services`     | owner, director, manager_operations, manager_hr |
| PUT    | `/services/:id` | owner, director, manager_operations, manager_hr |
| DELETE | `/services/:id` | owner, director, manager_operations, manager_hr |

### Jobs

| Method | Path               | Required Role                                          |
| ------ | ------------------ | ------------------------------------------------------ |
| GET    | `/jobs`            | any                                                    |
| GET    | `/jobs/:id`        | any                                                    |
| POST   | `/jobs`            | owner, director, manager_operations, manager_hr, staff |
| PUT    | `/jobs/:id`        | owner, director, manager_operations, manager_hr, staff |
| PATCH  | `/jobs/:id/status` | all roles (including worker)                           |
| DELETE | `/jobs/:id`        | owner, director, manager_operations, manager_hr        |

PATCH body: `{ "status": "in_progress" }` (one of the JobStatus values)

### Invoices

| Method | Path                 | Required Role                                          |
| ------ | -------------------- | ------------------------------------------------------ |
| GET    | `/invoices`          | any                                                    |
| GET    | `/invoices/:id`      | any                                                    |
| POST   | `/invoices`          | owner, director, manager_operations, manager_hr, staff |
| PUT    | `/invoices/:id`      | owner, director, manager_operations, manager_hr, staff |
| POST   | `/invoices/:id/send` | owner, director, manager_operations, manager_hr, staff |
| DELETE | `/invoices/:id`      | owner                                                  |

### Recurring Rules

| Method | Path             | Required Role                                          |
| ------ | ---------------- | ------------------------------------------------------ |
| GET    | `/recurring`     | any                                                    |
| POST   | `/recurring`     | owner, director, manager_operations, manager_hr, staff |
| PUT    | `/recurring/:id` | owner, director, manager_operations, manager_hr, staff |
| DELETE | `/recurring/:id` | owner, director, manager_operations, manager_hr        |

### Messages

| Method | Path             | Required Role                                          |
| ------ | ---------------- | ------------------------------------------------------ |
| GET    | `/messages`      | any                                                    |
| POST   | `/messages/send` | owner, director, manager_operations, manager_hr, staff |

### Automations

| Method | Path               | Required Role                                   |
| ------ | ------------------ | ----------------------------------------------- |
| GET    | `/automations`     | any                                             |
| POST   | `/automations`     | owner, director, manager_operations, manager_hr |
| PUT    | `/automations/:id` | owner, director, manager_operations, manager_hr |
| DELETE | `/automations/:id` | owner, director, manager_operations, manager_hr |

### Roles

> **Note:** `/api/roles` manages **custom role definitions** that an owner can create (with assigned permissions). These are separate from the six built-in system roles (`owner`, `director`, etc.) stored in the `User.role` enum. The list is empty until custom roles are created via `POST /api/roles`.

| Method | Path         | Permission required |
| ------ | ------------ | ------------------- |
| GET    | `/roles`     | `roles.read`        |
| GET    | `/roles/:id` | `roles.read`        |
| POST   | `/roles`     | `roles.create`      |
| PUT    | `/roles/:id` | `roles.update`      |
| DELETE | `/roles/:id` | `roles.delete`      |

> Role endpoints use a capability-based `authorize` middleware (not `requireRole`). Only `owner` has all role permissions by default; `director` has `roles.read`.

**Query params (GET `/roles`):** `page` (default 1), `limit` (default 20, max 100)

**Paginated response:**

```json
{
  "success": true,
  "data": [
    /* Role objects */
  ],
  "pagination": { "total": 5, "page": 1, "limit": 20 }
}
```

**Role object:**

```ts
interface Role {
  _id: string;
  tenantId: string;
  name: string;
  code: string; // lowercase, unique per tenant
  description?: string;
  permissions: Permission[]; // populated
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Permissions

| Method | Path           | Permission required |
| ------ | -------------- | ------------------- |
| GET    | `/permissions` | `permissions.read`  |

### Dashboard

| Method | Path         | Required Role |
| ------ | ------------ | ------------- |
| GET    | `/dashboard` | any           |

---

## 7. Frontend Architecture

### Recommended Stack

- **React 18** with **TypeScript**
- **React Router v6** — client-side routing
- **TanStack Query (React Query)** — server state, caching, mutations
- **Axios** — HTTP client with a configured instance that injects the Bearer token automatically
- **React Hook Form + Zod** — forms and validation
- **Tailwind CSS** (or shadcn/ui) — styling
- **date-fns** — date formatting and manipulation
- **Context API** — AuthContext for the current user / token

### Folder Structure (suggested)

```
src/
  api/            # Axios instance + one file per resource (auth.ts, jobs.ts, …)
  components/     # Shared UI components (Button, Modal, Table, Badge, …)
  features/       # Feature folders, each with its own components + hooks
    auth/
    dashboard/
    customers/
    jobs/
    invoices/
    services/
    team/
    recurringRules/
    messages/
    automations/
    settings/
  hooks/          # Custom hooks (useAuth, usePermission, …)
  layouts/        # AppLayout (sidebar), AuthLayout (centered card)
  pages/          # Route-level pages (thin wrappers over feature components)
  types/          # Shared TypeScript interfaces (models as described in §5)
  utils/          # Helpers (formatCurrency, formatDate, statusColor, …)
  router.tsx      # React Router config
  main.tsx
```

---

## 8. Pages & Routes

| Path             | Page                   | Roles allowed                                                      |
| ---------------- | ---------------------- | ------------------------------------------------------------------ |
| `/login`         | Login                  | public (unauthenticated)                                           |
| `/register`      | Register (onboarding)  | public                                                             |
| `/`              | Dashboard              | all                                                                |
| `/customers`     | Customer List          | all                                                                |
| `/customers/new` | New Customer           | owner, director, manager_operations, manager_hr, staff             |
| `/customers/:id` | Customer Detail / Edit | all (edit: owner, director, manager_operations, manager_hr, staff) |
| `/jobs`          | Job List / Calendar    | all                                                                |
| `/jobs/new`      | New Job                | owner, director, manager_operations, manager_hr, staff             |
| `/jobs/:id`      | Job Detail / Edit      | all (edit: staff+; status update: all including worker)            |
| `/invoices`      | Invoice List           | all                                                                |
| `/invoices/new`  | New Invoice            | owner, director, manager_operations, manager_hr, staff             |
| `/invoices/:id`  | Invoice Detail / Edit  | all (edit/send: staff+; delete: owner only)                        |
| `/services`      | Service List           | all                                                                |
| `/recurring`     | Recurring Rules List   | all                                                                |
| `/team`          | Team / Users List      | owner, director, manager_operations, manager_hr, staff             |
| `/messages`      | Message Log            | all                                                                |
| `/automations`   | Automation Rules       | all                                                                |
| `/settings`      | Tenant Settings        | all (edit: owner, director, manager_operations, manager_hr)        |
| `/roles`         | Role Management        | director, owner                                                    |
| `/roles/:id`     | Role Detail / Edit     | owner only (edit/delete)                                           |

---

## 9. Key UI Components & Behaviors

### AppLayout

- Sidebar with navigation links (hide links the current role cannot access)
- Top bar with tenant name, user avatar, and logout button
- Mobile-responsive: sidebar collapses to bottom tab bar or hamburger menu

### AuthContext

```ts
interface AuthContext {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
}
```

`hasRole('owner', 'manager')` returns `true` if the current user's role is in the list. Use this to conditionally render buttons, menus, and routes.

### Protected Routes

Wrap all authenticated pages in a `<PrivateRoute>` component that redirects to `/login` if no token is present.

### Dashboard Page

Displays: KPI cards (active customers, jobs today, jobs this week, monthly revenue, pending invoices) + a table of today's jobs + a status breakdown chart.

### Customer List

Table with search/filter by name, status (lead / active / inactive), source. Click-through to detail page. "New Customer" button (hidden for `worker`).

### Customer Detail

Tabs: Info | Jobs | Invoices | Messages. Edit button conditionally visible.

### Job List

Two views: **List** (table, sortable by date/status) and **Calendar** (week view showing scheduled jobs). Filters: status, assigned user, date range.

### Job Detail

Shows all job fields. Status badge with color: `scheduled`=blue, `confirmed`=cyan, `in_progress`=yellow, `completed`=green, `canceled`=gray, `no_show`=red.

**Status Update:** A dropdown or set of action buttons to advance status. `worker` role sees only the status-update action; all other fields are read-only.

**Checklist:** Interactive checklist items (can be checked/unchecked by cleaner and above).

### Invoice Detail

Line-items table with subtotal / tax / total. "Send Invoice" button (calls `POST /invoices/:id/send`). Status badge with colors.

### Services Page

List of services with bilingual name (en/es), price, duration, and active toggle. Create/edit form (owner/manager only).

### Recurring Rules Page

Table showing customer → service → frequency. Create/edit form with frequency selector (weekly / biweekly / monthly) and day picker.

### Team Page (Users)

List of team members with role badge. Visible to `staff` and above. Create user form (owner, director, manager_operations, manager_hr only). Delete only for `owner`.

### Messages Page

Log table: date, customer, channel (SMS / Email / WhatsApp), direction (outbound / inbound), status badge.

**Send Message form:** select customer, channel, language, subject, body.

### Automations Page

List of automation rules with trigger badge + channel badge. Toggle active/inactive. Create/edit/delete form (owner, director, manager_operations, manager_hr only).

### Settings Page

Form to update tenant: name, contact email, phone, address, default language, branding (logo URL, primary color). Read-only for `staff` and `worker`.

---

## 10. Axios Instance Setup

```ts
// src/api/client.ts
import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("brillo_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("brillo_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default apiClient;
```

---

## 11. Environment Variables

Create a `.env` file at the root of the React project:

```
VITE_API_URL=http://localhost:5000/api
```

---

## 12. Internationalization Notes

- Some backend fields store bilingual content: `Service.name.en`, `Service.name.es`, `Service.description.en`, `Service.description.es`, and Job checklist labels.
- The `preferredLanguage` field exists on both `User` and `Customer`.
- The UI should display the appropriate language variant based on either the logged-in user's `preferredLanguage` or a global language toggle.
- i18n library recommendation: **react-i18next**.

---

## 13. Worker Mobile Experience

The `worker` role primarily uses the app on mobile. Design the Job List and Job Detail pages to be **mobile-first**:

- Large tap targets for status update buttons.
- Checklist items are prominent and easy to toggle.
- No unnecessary columns or actions are shown.
- Consider bottom navigation with only: Jobs, Customers, Profile.

---

## 14. Error Handling

- API errors return `{ success: false, error: "message" }`. Display the `error` string in a toast or inline alert.
- 401 → redirect to `/login`.
- 403 → show "Access denied" toast; do not redirect.
- 404 → show "Not found" message in the page.
- Network errors → show "Connection error" toast with a retry option.

---

## 15. Status Color Reference

| Entity   | Status      | Color suggestion     |
| -------- | ----------- | -------------------- |
| Job      | scheduled   | Blue                 |
| Job      | confirmed   | Cyan                 |
| Job      | in_progress | Amber/Yellow         |
| Job      | completed   | Green                |
| Job      | canceled    | Gray                 |
| Job      | no_show     | Red                  |
| Invoice  | draft       | Gray                 |
| Invoice  | sent        | Blue                 |
| Invoice  | paid        | Green                |
| Invoice  | overdue     | Red                  |
| Invoice  | void        | Gray (strikethrough) |
| Customer | lead        | Yellow               |
| Customer | active      | Green                |
| Customer | inactive    | Gray                 |
| Message  | queued      | Gray                 |
| Message  | sent        | Blue                 |
| Message  | delivered   | Cyan                 |
| Message  | failed      | Red                  |
| Message  | opened      | Green                |
