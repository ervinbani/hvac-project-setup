# Test Coverage Report
**Project:** Brillo Cleaning SaaS — Backend
**Date:** 2026-03-27
**Test runner:** Jest `--runInBand`
**Command:** `npm run test:coverage`

---

## Overall Summary

| Metric     | Coverage |
|------------|----------|
| Statements | **57%**  |
| Branches   | **38%**  |
| Functions  | **48%**  |
| Lines      | **58%**  |
| Test Suites | 4 passed |
| Tests       | **50 passed / 50 total** |

---

## Coverage by Layer

### Routes — `src/routes/` — 100% across all files

All 11 route files are fully covered. The routes themselves are thin wiring (middleware + controller calls), so exercising any endpoint through the test HTTP requests covers them completely.

| File | Stmts | Branches | Funcs | Lines |
|------|-------|----------|-------|-------|
| auth.routes.js | 100% | 100% | 100% | 100% |
| automations.routes.js | 100% | 100% | 100% | 100% |
| customers.routes.js | 100% | 100% | 100% | 100% |
| dashboard.routes.js | 100% | 100% | 100% | 100% |
| invoices.routes.js | 100% | 100% | 100% | 100% |
| jobs.routes.js | 100% | 100% | 100% | 100% |
| messages.routes.js | 100% | 100% | 100% | 100% |
| recurringRules.routes.js | 100% | 100% | 100% | 100% |
| services.routes.js | 100% | 100% | 100% | 100% |
| tenant.routes.js | 100% | 100% | 100% | 100% |
| users.routes.js | 100% | 100% | 100% | 100% |

---

### Models — `src/models/` — ~92% statements

All models are exercised through MongoDB document creation in tests. `AuditLog.js` reads as 0% because the model is imported and registered but no AuditLog documents are created in the current test suite.

| File | Stmts | Branches | Funcs | Lines | Notes |
|------|-------|----------|-------|-------|-------|
| AutomationRule.js | 100% | 100% | 100% | 100% | |
| Customer.js | 100% | 100% | 100% | 100% | |
| Invoice.js | 100% | 100% | 100% | 100% | |
| Job.js | 100% | 100% | 100% | 100% | |
| MessageLog.js | 100% | 100% | 100% | 100% | |
| RecurringRule.js | 100% | 100% | 100% | 100% | |
| Service.js | 100% | 100% | 100% | 100% | |
| Tenant.js | 100% | 100% | 100% | 100% | |
| User.js | 100% | 100% | 100% | 100% | |
| AuditLog.js | **0%** | 100% | 100% | **0%** | No audit log tests yet |

---

### Middleware — `src/middleware/` — 67% statements

| File | Stmts | Branches | Funcs | Lines | Notes |
|------|-------|----------|-------|-------|-------|
| auth.js | **100%** | **100%** | **100%** | **100%** | Fully covered |
| requireRole.js | 88% | 75% | 100% | 88% | Missing: `!req.user` branch (line 4) |
| errorHandler.js | 37% | 16% | 50% | 39% | Validation, CastError, JWT errors partially hit; duplicate key (11000) and TokenExpiredError not triggered |

**errorHandler gaps:**
- `ValidationError` handler — not triggered (Mongoose validation errors not reached through current tests)
- Duplicate key error (`code 11000`) — not triggered
- `TokenExpiredError` — not triggered (test uses an expired-signature token which throws `JsonWebTokenError`, not `TokenExpiredError`)

---

### Controllers — `src/controllers/` — 43% statements

These have the widest coverage gap. Only the controllers with dedicated test files are meaningfully covered.

| File | Stmts | Branches | Funcs | Lines | Covered By |
|------|-------|----------|-------|-------|------------|
| auth.controller.js | **90%** | **92%** | **100%** | **90%** | `auth.edge.test.js` |
| jobs.controller.js | **70%** | **66%** | **71%** | **73%** | `jobs.edge.test.js` |
| invoices.controller.js | **67%** | **49%** | **80%** | **70%** | `invoices.edge.test.js` |
| services.controller.js | 29% | 31% | 25% | 30% | Partially via jobs tests |
| users.controller.js | 29% | 21% | 25% | 30% | Partially via role tests |
| customers.controller.js | 20% | 9% | 20% | 21% | Basic creation only |
| tenant.controller.js | 19% | 0% | 0% | 19% | Not tested |
| recurringRules.controller.js | 15% | 0% | 0% | 16% | Not tested |
| automations.controller.js | 16% | 0% | 0% | 16% | Not tested |
| dashboard.controller.js | 17% | 0% | 0% | 17% | Not tested |
| messages.controller.js | 12% | 0% | 0% | 13% | Not tested |

---

### App entry — `src/app.js` — 85% statements

| Lines uncovered | Reason |
|-----------------|--------|
| 30–31 | CORS origin rejection path (foreign origin test not written) |
| 42 | Morgan logger (skipped in `NODE_ENV=test`) |
| 73–75 | Rate limiters (skipped in `NODE_ENV=test`) |
| 80 | Fallback CORS origin check |

---

## What the Tests Cover

### `auth.edge.test.js` (13 tests)
- Register: missing fields, duplicate slug, email stored lowercase, JWT returned, owner role assigned
- Login: missing fields, wrong password, unknown email, bad slug, email case-insensitive match
- `GET /auth/me`: no token, malformed token, wrong secret, valid token returns profile without `passwordHash`

### `jobs.edge.test.js` (22 tests)
- Create: missing `customerId`, missing `scheduledStart`, cross-tenant customer, cross-tenant service, cross-tenant user in `assignedUsers`, unknown body fields ignored
- Status update: invalid status string, cleaner blocked from `canceled`/`confirmed`, cleaner allowed `in_progress` when assigned, unassigned cleaner blocked, cross-tenant 404, owner can set all valid statuses
- List: cleaner only sees assigned jobs, `limit` clamped to 100, `page` clamped to min 1, NoSQL operator in status filter ignored

### `invoices.edge.test.js` (11 tests)
- Create: server-side totals override client values, empty items = 0 total, negative `unitPrice` clamped to 0, description truncated at 500 chars, missing `customerId`, cross-tenant `customerId`
- Update: invalid status ignored, totals recalculated on item change, cross-tenant 404
- Send: status set to `sent`, cross-tenant 404

### `middleware.edge.test.js` (4 tests)
- Auth: no `Authorization` header, missing `Bearer` prefix, expired JWT signature
- Roles: cleaner cannot delete job, staff cannot delete customer, manager cannot delete user
- Error handler: invalid ObjectId returns 400, unknown route returns 404

---

## Coverage Gaps — What to Test Next

| Priority | Area | What to Add |
|----------|------|-------------|
| High | `customers.controller.js` | List/get/update/delete, search by name, status filter |
| High | `users.controller.js` | Create user, update user, delete (owner only), role escalation blocked |
| High | `errorHandler.js` | Trigger `ValidationError` (Mongoose schema violation), `TokenExpiredError`, duplicate key (11000) |
| Medium | `recurringRules.controller.js` | Full CRUD — create/list/update/delete |
| Medium | `tenant.controller.js` | Get settings, update settings |
| Medium | `dashboard.controller.js` | Stats endpoint with jobs/invoices in various states |
| Medium | `services.controller.js` | Full CRUD, missing `name.es` validation |
| Low | `automations.controller.js` | CRUD for automation rules |
| Low | `messages.controller.js` | List messages, send message |
| Low | `AuditLog.js` | At least one log creation path |
| Low | `app.js` | CORS rejection with a disallowed `Origin` header |

---

## Running Coverage Locally

```bash
# Run tests + generate report
npm run test:coverage

# Output locations
coverage/lcov-report/index.html   # Visual HTML report (open in browser)
coverage/lcov.info                # For CI/SonarQube/Codecov integration
```

To view the HTML report, open `coverage/lcov-report/index.html` in a browser for a line-by-line breakdown of every covered and uncovered statement.
