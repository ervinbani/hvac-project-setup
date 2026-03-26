# Brillo — Role Permissions

## Roles

| Role    | Who is it                                              |
|---------|--------------------------------------------------------|
| `owner`   | The business owner — full access, like a super admin |
| `manager` | Office manager — can do everything except delete users |
| `staff`   | Front desk / admin — can create and edit, no delete  |
| `cleaner` | Field worker — read-only + update job status only    |

---

## Permissions per feature

### Users (Team)

| Action      | owner | manager | staff | cleaner |
|-------------|:-----:|:-------:|:-----:|:-------:|
| View list   | ✅    | ✅      | ❌    | ❌      |
| Create user | ✅    | ✅      | ❌    | ❌      |
| Edit user   | ✅    | ✅      | ❌    | ❌      |
| Delete user | ✅    | ❌      | ❌    | ❌      |

### Customers

| Action | owner | manager | staff | cleaner |
|--------|:-----:|:-------:|:-----:|:-------:|
| View   | ✅    | ✅      | ✅    | ✅      |
| Create | ✅    | ✅      | ✅    | ❌      |
| Edit   | ✅    | ✅      | ✅    | ❌      |
| Delete | ✅    | ✅      | ❌    | ❌      |

### Jobs

| Action             | owner | manager | staff | cleaner |
|--------------------|:-----:|:-------:|:-----:|:-------:|
| View               | ✅    | ✅      | ✅    | ✅      |
| Create             | ✅    | ✅      | ✅    | ❌      |
| Edit               | ✅    | ✅      | ✅    | ❌      |
| Update status only | ✅    | ✅      | ✅    | ✅      |
| Delete             | ✅    | ✅      | ❌    | ❌      |

### Services / Automations

| Action        | owner | manager | staff | cleaner |
|---------------|:-----:|:-------:|:-----:|:-------:|
| View          | ✅    | ✅      | ✅    | ✅      |
| Create / Edit | ✅    | ✅      | ❌    | ❌      |
| Delete        | ✅    | ✅      | ❌    | ❌      |

### Invoices

| Action              | owner | manager | staff | cleaner |
|---------------------|:-----:|:-------:|:-----:|:-------:|
| View                | ✅    | ✅      | ✅    | ❌      |
| Create / Edit / Send| ✅    | ✅      | ✅    | ❌      |

### Tenant Settings

| Action | owner | manager | staff | cleaner |
|--------|:-----:|:-------:|:-----:|:-------:|
| View   | ✅    | ✅      | ✅    | ✅      |
| Edit   | ✅    | ✅      | ❌    | ❌      |

---

## Cleaner flow (mobile-first use case)

A cleaner logs in and can only:

1. **See their assigned jobs** — `GET /api/jobs`
2. **Update job status** — `PATCH /api/jobs/:id/status`
   ```json
   { "status": "in_progress" }
   { "status": "completed" }
   ```
3. **View customers** — read only

They **cannot** create, edit, or delete anything.

---

## Access denied response

When a role attempts an unauthorized action the API returns HTTP `403`:

```json
{
  "success": false,
  "error": "Access denied. Required role(s): owner, manager"
}
```

---

## Route-level enforcement (code reference)

| Route | Method | Required roles |
|-------|--------|----------------|
| `/api/users` | GET | owner, manager |
| `/api/users` | POST | owner, manager |
| `/api/users/:id` | PUT | owner, manager |
| `/api/users/:id` | DELETE | owner |
| `/api/customers` | POST | owner, manager, staff |
| `/api/customers/:id` | PUT | owner, manager, staff |
| `/api/customers/:id` | DELETE | owner, manager |
| `/api/jobs` | POST | owner, manager, staff |
| `/api/jobs/:id` | PUT | owner, manager, staff |
| `/api/jobs/:id/status` | PATCH | owner, manager, staff, cleaner |
| `/api/jobs/:id` | DELETE | owner, manager |
| `/api/services` | POST / PUT | owner, manager |
| `/api/services/:id` | DELETE | owner, manager |
| `/api/invoices` | POST / PUT | owner, manager, staff |
| `/api/invoices/:id/send` | POST | owner, manager, staff |
| `/api/automations` | POST / PUT / DELETE | owner, manager |
| `/api/tenant` | PUT | owner, manager |
