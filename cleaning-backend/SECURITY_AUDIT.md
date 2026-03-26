# Security Audit — Brillo API

**Date:** 2026-03-25
**Overall Risk:** 3/10 — A real attacker causes serious damage in minutes.

---

## CRITICAL

### CRIT-1: No role guard on `PATCH /api/jobs/:id/status`
- **Location:** `src/routes/jobs.routes.js:20`
- **Attack:** Any cleaner logs in → sends `PATCH /api/jobs/<any_id>/status` with `{"status":"canceled"}` → mass-cancels all jobs in the tenant
- **Impact:** Business operations destroyed by any low-privilege account

### CRIT-2: Open unauthenticated tenant registration
- **Location:** `src/routes/auth.routes.js:6`
- **Attack:** Loop `POST /api/auth/register` with random slugs → thousands of tenants created, no approval, no rate limit
- **Impact:** DB pollution, resource exhaustion, abuse of billing

### CRIT-3: ReDoS via `new RegExp(search, 'i')`
- **Location:** `src/controllers/customers.controller.js:13`
- **Attack:** `GET /api/customers?search=(a+)+$` → locks Node.js event loop → full API down with 1 request
- **Impact:** Any authenticated user can take down the entire API

---

## HIGH

### HIGH-1: Manager can escalate own role to `owner`
- **Location:** `src/controllers/users.controller.js:75`
- **Attack:** Manager calls `PUT /api/users/<own_id>` with `{"role":"owner"}` → re-login → full owner access
- **Impact:** Permanent privilege escalation

### HIGH-2: NoSQL injection via query parameters
- **Location:** `jobs.controller.js:16`, `customers.controller.js:8`, `messages.controller.js:7`
- **Attack:** `GET /api/jobs?status[$ne]=canceled` → Express parses `$ne` as a MongoDB operator → filter bypassed
- **Impact:** Data enumeration and filter bypass within tenant

### HIGH-3: Wildcard CORS — any origin allowed
- **Location:** `src/app.js:21`
- **Attack:** Malicious page uses victim's JWT to make authenticated API calls cross-origin
- **Impact:** Data exfiltration if victim visits attacker-controlled page

### HIGH-4: No rate limiting on login — brute force
- **Location:** `src/controllers/auth.controller.js:87`
- **Attack:** Password spray against `POST /api/auth/login` at full network speed
- **Impact:** Full account compromise

### HIGH-5: Hardcoded credentials committed to source
- **Location:** `scripts/seed.js:90` — `'Password123!'` in plaintext + printed on server startup
- **Impact:** Instant access to any environment where seed was run

---

## MEDIUM

| # | Issue | Location |
|---|---|---|
| MED-1 | Cross-tenant data leak — no validation that `customerId`/`jobId` belongs to same tenant | `jobs.controller.js:95`, `invoices.controller.js:84` |
| MED-2 | Invoice totals accepted from client — financial fraud possible | `invoices.controller.js:63` |
| MED-3 | Manager can create a new `owner`-role user via `POST /api/users` | `users.controller.js:37` |
| MED-4 | Unbounded `?limit=999999999` — memory exhaustion DoS | All list controllers |
| MED-5 | `/api/auth/me` returns full internal user document | `auth.controller.js:140` |

---

## LOW / INFO

- Morgan logs query params (customer IDs, filters) to stdout
- 404 handler reflects full URL back
- JWT 7 days, no revocation, no logout endpoint
- No email format validation
- `bcryptjs` is unmaintained — consider `argon2`

---

## Fix Priority

```
1. CRIT-3  →  escape input before RegExp, or use $text index
2. CRIT-1  →  add requireRole + check assignedUsers includes req.user.id
3. HIGH-2  →  sanitize query params (cast to string, whitelist values)
4. HIGH-1 + MED-3  →  block role elevation to >= creator's role
5. HIGH-4  →  add express-rate-limit on /api/auth/*
6. HIGH-3  →  configure CORS with explicit origin whitelist
7. MED-2   →  recalculate totals server-side, never trust client
8. MED-1   →  verify all referenced IDs belong to tenantId before save
9. MED-4   →  cap limit to max 100
10. CRIT-2  →  add rate limit + optional invite-only mode
```

---

## Status

| ID | Fixed | Date |
|---|---|---|
| CRIT-1 | ✅ | 2026-03-25 |
| CRIT-2 | ✅ | 2026-03-25 |
| CRIT-3 | ✅ | 2026-03-25 |
| HIGH-1 | ✅ | 2026-03-25 |
| HIGH-2 | ✅ | 2026-03-25 |
| HIGH-3 | ✅ | 2026-03-25 |
| HIGH-4 | ✅ | 2026-03-25 |
| HIGH-5 | ✅ | 2026-03-25 |
| MED-1  | ✅ | 2026-03-25 |
| MED-2  | ✅ | 2026-03-25 |
| MED-3  | ✅ | 2026-03-25 |
| MED-4  | ✅ | 2026-03-25 |
| MED-5  | ✅ | 2026-03-25 |
