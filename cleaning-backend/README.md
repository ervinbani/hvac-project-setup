# Brillo — Multi-tenant SaaS Backend for Service Businesses

**Brillo** is a production-grade, multi-tenant SaaS backend built for cleaning companies and other service businesses (HVAC, plumbing, landscaping, electrical, painting). It provides a complete REST API for managing customers, jobs, invoices, teams, scheduling, communications, and an AI-powered conversational agent.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Framework | Express 4 |
| Database | MongoDB 8 + Mongoose 8 |
| Auth | JWT (jsonwebtoken) + bcrypt |
| AI | Vercel AI SDK v6 + OpenAI GPT-4o-mini |
| Email | Resend + HTML templates (4 languages) |
| PDF | PDFKit |
| File Storage | Cloudflare R2 (S3-compatible) |
| Validation | Zod 4 |
| Security | Helmet, CORS, express-rate-limit |
| Testing | Jest + Supertest + mongodb-memory-server |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (SPA)                              │
│                    React / Vue / Mobile                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS + Bearer JWT
┌───────────────────────────▼─────────────────────────────────────┐
│                        EXPRESS API                                │
│                                                                   │
│  Middleware stack:                                                 │
│    Helmet → CORS → Morgan → Rate Limiter → JWT Auth → Routes     │
│                                                                   │
│  19 route groups → 60+ endpoints                                  │
└───┬──────────┬──────────┬──────────┬──────────┬─────────────────┘
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌──────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
│ Auth │ │ Core   │ │ Jobs   │ │ Finance  │ │ AI Agent     │
│/api/ │ │/api/   │ │/api/   │ │/api/     │ │/api/ai       │
│auth  │ │custome │ │jobs    │ │invoices  │ │chat          │
│      │ │rs      │ │        │ │          │ │              │
└──────┘ └────────┘ └────────┘ └──────────┘ └──────────────┘
    │          │          │          │              │
    ▼          ▼          ▼          ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MONGODB (Tenant-scoped)                       │
│  Tenant → Users, Customers, Jobs, Invoices, Services, ...        │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-tenant Model

Each `Tenant` is an isolated organization. Every document in the database carries a `tenantId` field and every query filters by it — cross-tenant data access is **physically impossible** at the query level.

---

## Features

### 1. Authentication & Account Management (`/api/auth`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/register` | POST | No | Register new tenant + owner |
| `/verify-email` | GET | No | Verify email via token |
| `/login` | POST | No | Login (email + password + optional slug) |
| `/me` | GET | JWT | Get current user profile |
| `/me` | PUT | JWT | Update profile |
| `/forgot-password` | POST | No | Send password reset email |
| `/reset-password` | POST | No | Reset password with token |

- Password policy: uppercase + number + special char + 8+ chars
- Multi-tenant login: `slug` query param for scoping to a specific tenant
- JWT payload: `{ userId, tenantId, role, roleId, businessType }`, expires 7 days
- Email verification required before activation
- Forgot password always returns 200 (prevents user enumeration)

### 2. Tenant Settings (`/api/tenant`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | JWT | Get tenant profile |
| `/` | PUT | JWT | Update tenant settings |
| `/` | DELETE | JWT (owner) | Delete tenant + all data |
| `/languages` | GET | JWT | List available system languages |
| `/languages` | PUT | JWT | Configure tenant languages |
| `/units` | GET | JWT | Get effective product/price units |
| `/units` | PUT | JWT | Add custom units |

- 4 supported languages: English, Spanish, Italian, Albanian
- Language config: exactly one default, any number active
- Units: per business-type defaults + custom additions
- Full account deletion with password confirmation

### 3. User Management (`/api/users`)

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/` | GET | owner/director/mgr_ops/mgr_hr/staff | List users |
| `/:id` | GET | owner/director/mgr_ops/mgr_hr/staff | Get user |
| `/` | POST | owner/director/mgr_ops/mgr_hr | Create user |
| `/:id` | PUT | owner/director/mgr_ops/mgr_hr | Update user |
| `/:id` | DELETE | owner | Soft-delete user |

- **Role hierarchy**: owner(6) > director(5) > manager(4) > staff(2) > worker(1)
- Users can only see/manage users with equal or lower role rank
- 6 system roles with tiered permissions (see Role-Based Access Control section)
- Soft delete (sets `isActive: false`)

### 4. Customer Management (`/api/customers`)

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/` | GET | All authenticated | List customers |
| `/:id` | GET | All authenticated | Get customer |
| `/` | POST | owner/director/mgr_ops/mgr_hr/staff | Create customer |
| `/:id` | PUT | owner/director/mgr_ops/mgr_hr/staff | Update customer |
| `/:id` | DELETE | owner/director/mgr_ops/mgr_hr | Delete customer |

- Filters: status (lead/active/inactive), source (manual/website/phone/referral/facebook/google), full-text search
- ReDoS-safe regex search with 100-char limit
- Address with optional geo-coordinates
- Tags for categorization

### 5. Job Scheduling (`/api/jobs`)

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/` | GET | All authenticated | List jobs |
| `/:id` | GET | All authenticated | Get job details |
| `/` | POST | owner/director/mgr_ops/mgr_hr/staff | Create job |
| `/:id` | PUT | owner/director/mgr_ops/mgr_hr/staff | Update job |
| `/:id/status` | PATCH | All roles (restricted for workers) | Update job status |
| `/:id/checklist/:itemId` | PATCH | All roles | Update checklist item |
| `/:id/punch-in` | POST | All roles | Clock in |
| `/:id/punch-out` | POST | All roles | Clock out |
| `/:id/time-entries` | POST | Admin roles | Add manual time entry |
| `/:id` | DELETE | owner/director/mgr_ops/mgr_hr | Delete job |

- Statuses: scheduled → confirmed → in_progress → completed / canceled / no_show
- Cross-tenant validation on customer, service, assigned users
- Workers see only their assigned jobs; price hidden for workers
- **Punch in/out**: auto-transitions status to `in_progress`, prevents double clock-in
- Checklist with bilingual labels (EN/ES)
- Recurring job support (via RecurringRule)

### 6. Service Catalog (`/api/services`)

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/` | GET | All authenticated | List services |
| `/` | POST | owner/director/mgr_ops/mgr_hr | Create service |
| `/:id` | PUT | owner/director/mgr_ops/mgr_hr | Update service |
| `/:id` | DELETE | owner/director/mgr_ops/mgr_hr | Delete service |

- Bilingual names/descriptions (EN + ES)
- Overtime configuration (percentage-based)
- Price unit validation against tenant settings
- Soft deactivation (`isActive` flag)

### 7. Invoicing (`/api/invoices`)

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/` | GET | All authenticated | List invoices |
| `/:id` | GET | All authenticated | Get invoice details |
| `/` | POST | owner/director/mgr_ops/mgr_hr/staff | Create invoice |
| `/:id` | PUT | owner/director/mgr_ops/mgr_hr/staff | Update invoice |
| `/:id/send` | POST | owner/director/mgr_ops/mgr_hr/staff | Send invoice via email |
| `/:id/pdf` | GET | owner/director/mgr_ops/mgr_hr/staff | Download invoice PDF |
| `/:id` | DELETE | owner | Delete invoice |

- **Invoice number generation**: `INV-{SLUG}-{00001}` format (auto-increment per tenant)
- Statuses: draft → sent → paid / partially_paid / overdue / void
- Items with quantity, unit price, `priceUnit` (hour/job/day/m²/sqft/meter/unit/point/no_price)
- Discount (percentage or fixed amount)
- Tax rate with automatic calculation
- Multiple currencies (USD, EUR), 4-language support
- **Send invoice**: attaches PDF to email, updates status to "sent"
- **PDF generation**: professional A4 PDF via PDFKit

### 8. Recurring Rules (`/api/recurring`)

| Endpoint | Method | Required Role | Description |
|----------|--------|---------------|-------------|
| `/` | GET | All authenticated | List recurring rules |
| `/` | POST | Admin roles | Create rule |
| `/:id` | GET | All authenticated | Get rule |
| `/:id` | PUT | Admin roles | Update rule |
| `/:id` | DELETE | Admin roles | Delete rule |
| `/:id/generate` | POST | Admin roles | Generate jobs for date range |

- 3 frequencies: daily, weekly, monthly
- Day-of-week selection for weekly; day-of-month for monthly
- Month-of-year restriction for seasonal businesses
- Start time, duration, price, assigned users
- **Auto-generation**: creates Job documents for up to 90 days
- **Idempotent**: skips dates with existing jobs from the same rule

### 9. Dashboard (`/api/dashboard`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | JWT | Dashboard overview stats |

Returns:
- Total active customers
- Jobs today / this week
- Monthly revenue (paid invoices)
- Pending invoices count
- Today's jobs (populated, sorted, limited to 10)
- Jobs by status breakdown

### 10. Internal Messaging (`/api/inbox`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | JWT | Received messages |
| `/sent` | GET | JWT | Sent messages |
| `/` | POST | JWT | Send message |
| `/:id` | PUT | JWT | Mark as read |

- Messages between team members within the same tenant
- Max 255-char subject, 2000-char body
- Read tracking with timestamp

### 11. Message Log (`/api/messages`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | JWT | List message log |
| `/:id` | GET | JWT | Get message details |

- Logs all outbound/inbound communications (SMS, email, WhatsApp)
- Tracks provider, status, template used
- Paginated with filters for customer, job, channel, status

### 12. Automation Rules (`/api/automations`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | JWT | List automation rules |
| `/` | POST | JWT | Create rule |
| `/:id` | PUT | JWT | Update rule |
| `/:id` | DELETE | JWT | Delete rule |

- Triggers: `job_created`, `job_reminder_24h`, `job_completed`, `invoice_overdue`
- Channels: SMS, email
- Template-based messaging

### 13. Roles & Permissions (`/api/roles`, `/api/permissions`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `GET /api/roles` | GET | JWT | List tenant roles |
| `POST /api/roles` | POST | JWT | Create role |
| `PUT /api/roles/:id` | PUT | JWT | Update role |
| `DELETE /api/roles/:id` | DELETE | JWT | Delete role |
| `GET /api/permissions` | GET | JWT | List all permissions |

- 22 granular permissions across 6 entities: users, jobs, services, invoices, roles, permissions
- 6 seeded roles with tiered permissions:
  - **Owner**: full access
  - **Director**: operations + HR
  - **Manager Operations**: jobs + services
  - **Manager HR**: users only
  - **Staff**: read-only (no writes, no revenue)
  - **Worker**: read-only jobs + assigned-only filter
- Owner bypasses permission checks entirely
- Permission-based middleware: `authorize('jobs.create')`

### 14. Products & Categories (`/api/products`, `/api/product-categories`)

**Products:**
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | JWT | List products |
| `/:id` | GET | JWT | Get product |
| `/` | POST | JWT | Create product |
| `/:id` | PUT | JWT | Update product |
| `/:id` | DELETE | JWT | Delete product |

**Categories:**
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | JWT | List categories |
| `/` | POST | JWT | Create category |
| `/:id` | PUT | JWT | Update category |
| `/:id` | DELETE | JWT | Delete category |

- Bilingual names/descriptions (EN + ES)
- SKU, barcode, stock tracking with low-stock alerts
- Cost tracking, taxable flag
- Categories with color coding

### 15. File Uploads (`/api/uploads`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | JWT | List files for a resource |
| `/:id` | GET | JWT | Get file metadata |
| `/presigned-url` | POST | JWT | Generate presigned upload URL |
| `/:id/delete` | DELETE | JWT | Delete file from R2 |
| `/` | POST | JWT | Upload file (multipart) |

- Cloudflare R2 storage (S3-compatible)
- Presigned URLs for direct client uploads (5-minute TTL)
- Allowed types: PDF, JPEG, PNG, WebP, GIF
- Resources: invoices, customers, jobs, services, tenants
- 50MB file size limit

### 16. AI Agent System (`/api/ai`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/chat` | POST | JWT | Conversational AI agent |

**Rate limit**: 10 requests per 5 minutes (cost control)

The AI agent is a **fully autonomous, multi-turn conversational system** powered by OpenAI GPT-4o-mini with function calling. Documentation in `lessons/02-ai-implementation-complete.md`.

#### Architecture

```
Request { messages, sessionId }
  → Validate with Zod
  → Load/create ChatSession (MongoDB persistence)
  → Build tools via closure (tenant-scoped)
  → Build dynamic system prompt (business type + role)
  → generateText with maxSteps = 12
  → Save response to session
  → Response { reply, sessionId }
```

#### Tools (12 total)

**Read tools** (no confirmation needed):

| Tool | Description |
|------|-------------|
| `searchCustomers` | Find customers by name, phone, or email |
| `listCustomers` | List all customers (for "how many customers?" queries) |
| `searchJobs` | Search jobs with status/date/customer filters |
| `getInvoiceById` | Get single invoice details |
| `searchServices` | List available services |
| `listUsers` | List team members with role filter |

**Write tools** (return JWT pending token — never execute directly):

| Tool | Description |
|------|-------------|
| `createCustomer` | Prepare customer creation (pending) |
| `createJob` | Prepare job creation with business validation (pending) |
| `updateJobStatus` | Prepare status update (pending) |
| `createInvoice` | Prepare invoice with itemized line items (pending) |
| `confirmAction` | Execute pending action by verifying signed JWT |

#### JWT Confirm Pattern

Write tools use a **two-phase commit** pattern:
1. Tool validates params + business logic → returns **signed JWT** (5-min expiry)
2. User confirms → `confirmAction` verifies JWT signature + tenantId → executes the real DB write

This makes it **physically impossible** to write data without explicit user confirmation.

#### Multi-turn Session

- Sessions persisted in MongoDB (`ChatSession` model)
- 24-hour TTL auto-cleanup
- History trimmed to 100 messages max
- Frontend sends `sessionId` for continuation

#### Dynamic Prompt

- Adapts to 6 business types (cleaning, HVAC, plumbing, landscaping, electrical, painting)
- Role-based permissions injected into prompt
- workers can only see assigned jobs; pricing hidden for restricted roles

#### Role Enforcement (Defense in Depth)

1. **Prompt level**: system prompt tells LLM what it can/can't do
2. **Code level**: every write tool checks `scoping.canWrite` before creating JWT

---

## Data Models (16 collections)

| Model | Key Fields | Relationships |
|-------|------------|---------------|
| **Tenant** | name, slug, businessType, languages, branding, subscription | — |
| **User** | firstName, lastName, email, passwordHash, role, roleId | → Tenant, → Role |
| **Customer** | firstName, lastName, email, phone, address, status, tags | → Tenant |
| **Job** | title, scheduledStart, status, assignedUsers, price, checklist | → Tenant, → Customer, → Service, → Invoice |
| **Invoice** | invoiceNumber, items, subtotal, tax, total, status, currency | → Tenant, → Customer, → Jobs |
| **Service** | name (EN/ES), basePrice, durationMinutes, overtime | → Tenant |
| **RecurringRule** | frequency, daysOfWeek, startDate, startTime, price | → Tenant, → Customer, → Service |
| **Product** | name (EN/ES), sku, unitPrice, cost, stock | → Tenant, → ProductCategory |
| **ProductCategory** | name (EN/ES), color | → Tenant |
| **Permission** | key, entity, action | Global (seeded) |
| **Role** | name, code, permissions[] | → Tenant, → Permissions |
| **Timesheet** | date, status, notes | → Tenant, → User |
| **TimeEntry** | clockIn, clockOut, duration, breakMinutes | → Tenant, → User, → Job, → Timesheet |
| **ChatSession** | messages[], sessionId, metadata | → Tenant, → User |
| **AutomationRule** | trigger, channel, templateKey | → Tenant |
| **MessageLog** | channel, direction, status, templateKey | → Tenant, → Customer, → Job |
| **InternalMessage** | subject, body, isRead | → Tenant, → User (from/to) |
| **AuditLog** | entityType, entityId, action, metadata | → Tenant, → User |

---

## Services

### Email Service (`src/services/email.service.js`)

- Powered by **Resend**
- 4 languages: English, Spanish, Italian, Albanian
- 4 email types: Welcome, Email Verification, Password Reset, Invoice
- Professional HTML templates with inline CSS
- Invoice emails attach PDF automatically

### PDF Service (`src/services/pdf.service.js`)

- Powered by **PDFKit**
- Generates professional A4 invoice PDFs
- Fully branded (Brillo header, colors, footer)
- 4-language support
- Two modes: stream to HTTP response or return as Buffer (for email)

### File Upload Service (`src/services/upload.service.js` — via `uploads.controller.js`)

- Cloudflare R2 (S3-compatible object storage)
- Presigned URLs for direct client uploads
- Tenant-scoped folder structure: `{tenantId}/{resource}/{file}`
- MIME type validation + size limits

---

## Security

### Rate Limiting

| Endpoint | Window | Max Requests |
|----------|--------|-------------|
| All `/api/*` | 1 minute | 300 |
| `/api/auth/login` | 30 minutes | 20 |
| `/api/auth/register` | 1 hour | 5 |
| `/api/ai` | 5 minutes | 10 |

### Auth Layer
- JWT tokens (7-day expiry)
- Bearer token in `Authorization` header
- Tokens contain `{ userId, tenantId, role, businessType }`
- Password hashing with bcrypt
- Email verification required for account activation
- Forgot password: constant-time response to prevent user enumeration

### Authorization Layer
1. **Role hierarchy** (6 tiers with rules)
2. **Permission-based middleware** (`authorize('jobs.create')`)
3. **Owner bypass** (owner always passes permission checks)
4. **Field-level hiding** (workers can't see prices)
5. **Record-level filtering** (workers see only assigned jobs)

### Multi-tenant Isolation
- Every query includes `tenantId`
- Cross-tenant data access is **physically impossible** at the database level
- 32 automated tests verify cross-tenant isolation

### AI Security
- JWT confirm pattern: write tools return signed tokens (not DB writes)
- 5-minute token expiry
- Tenant verification on every `confirmAction` call
- Role enforcement at tool-code level
- Batch request prevention in system prompt

---

## Testing

**Test runner**: Jest + Supertest + mongodb-memory-server

| File | Tests | Coverage |
|------|-------|----------|
| `ai-security.test.js` | 32 | Cross-tenant isolation, JWT security, role enforcement, edge cases |
| `auth.edge.test.js` | — | Auth edge cases |
| `invoices.edge.test.js` | — | Invoice operations |
| `jobs.edge.test.js` | — | Job operations |
| `middleware.edge.test.js` | — | Middleware behavior |

```bash
npm test                    # Run all tests
npm run test:coverage       # With coverage report
npm run test:watch          # Watch mode
```

---

## Configuration

### Environment Variables (`.env`)

```
MONGODB_URI=mongodb://localhost:27017/brillo
JWT_SECRET=your-secret
PORT=3000
CLIENT_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# OpenAI (for AI agent)
OPENAI_API_KEY=sk-...

# Cloudflare R2 (for file uploads)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=brillo-uploads
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com

# Resend (for emails)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@brilloclean.com
EMAIL_FROM_NAME=Brillo
FRONTEND_URL=http://localhost:5173
```

### Config Files

| File | Purpose |
|------|---------|
| `src/config/db.js` | MongoDB connection setup |
| `src/config/r2.js` | Cloudflare R2 S3 client |
| `src/config/languages.js` | Available languages registry |
| `src/config/businessUnits.js` | Default product/price units per business type |
| `src/config/businessPrompts.js` | AI prompts for 6 business types |
| `src/config/roleScoping.js` | Role permission definitions for AI |

---

## Scripts

| Command | Script | Description |
|---------|--------|-------------|
| `npm run seed` | `scripts/seed.js` | Seed database with demo data |
| `npm run seed:clean` | `scripts/clean.js + seed.js` | Clean + reseed |
| `npm run migrate:roles` | `scripts/migrate-roles.js` | Migrate role assignments |

---

## Project Structure

```
cleaning-backend/
├── server.js                      # Entry point
├── src/
│   ├── app.js                     # Express configuration
│   ├── ai/
│   │   ├── controller.js          # AI chat handler
│   │   ├── prompts/
│   │   │   └── system.js          # Dynamic system prompt builder
│   │   └── tools/
│   │       ├── index.js           # Tool factory (closure context)
│   │       ├── searchCustomers.js
│   │       ├── listCustomers.js
│   │       ├── searchJobs.js
│   │       ├── getInvoiceById.js
│   │       ├── searchServices.js
│   │       ├── listUsers.js
│   │       ├── createCustomer.js
│   │       ├── createJob.js
│   │       ├── updateJobStatus.js
│   │       ├── createInvoice.js
│   │       └── confirmAction.js   # JWT verify + execute
│   ├── config/
│   │   ├── db.js
│   │   ├── r2.js
│   │   ├── languages.js
│   │   ├── businessUnits.js
│   │   ├── businessPrompts.js
│   │   └── roleScoping.js
│   ├── controllers/               # 19 controllers
│   ├── middleware/
│   │   ├── auth.js                # JWT verification
│   │   ├── authorize.js           # Permission checking
│   │   └── errorHandler.js        # Global error handler
│   ├── models/                    # 16 Mongoose models
│   ├── routes/                    # 19 route files
│   └── services/
│       ├── email.service.js       # Resend + HTML templates
│       └── pdf.service.js         # PDFKit invoice generation
├── tests/
│   ├── setup.js                   # mongodb-memory-server config
│   ├── ai-security.test.js
│   ├── auth.edge.test.js
│   ├── invoices.edge.test.js
│   ├── jobs.edge.test.js
│   └── middleware.edge.test.js
├── scripts/                       # Seed, migrate, utility scripts
└── lessons/                       # AI implementation documentation
    ├── 01-agent-theory.md
    └── 02-ai-implementation-complete.md
```

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and API keys

# 3. Start MongoDB (local)
# Ensure mongod is running on port 27017

# 4. Seed demo data
npm run seed

# 5. Start development server
npm run dev

# 6. Run tests
npm test
```

---

## License

UNLICENSED — Private project.
