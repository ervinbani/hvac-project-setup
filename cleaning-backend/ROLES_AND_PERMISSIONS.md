# Roles & Permissions Design

## Overview

The system uses a **role + department** model. Every user has a role (which defines their rank in the hierarchy) and optionally a department (`hr` or `ops`), which defines which box they belong to. Owner and Director are cross-department.

---

## Role Hierarchy

```
owner (5)
  └── director (4)
        ├── [ HR BOX ]
        │     └── manager/hr (3)
        │               └── staff/hr (2)
        │
        └── [ OPS BOX ]
              └── manager/ops (3)
                        ├── staff/ops (2)
                        └── cleaner (1)  ← always ops, hardcoded
```

---

## User Schema Fields

```js
role:       'owner' | 'director' | 'manager' | 'staff' | 'cleaner'
department: 'hr' | 'ops' | null
```

| Role | Department | Notes |
|------|------------|-------|
| owner | `null` | Top level, no department restriction |
| director | `null` | Sees and manages both boxes |
| manager | `'hr'` | Heads the HR box |
| manager | `'ops'` | Heads the Ops box |
| staff | `'hr'` | Works in HR team |
| staff | `'ops'` | Works in Ops team |
| cleaner | `'ops'` | Always Ops — enforced on create/update |

---

## Visibility Rules

Who can see whom when listing/fetching users:

| Caller | Can See |
|--------|---------|
| owner | Everyone |
| director | Everyone below (both departments) |
| hr manager | HR staff only |
| ops manager | Ops staff + cleaners |
| hr staff | Themselves only |
| ops staff | Ops staff + cleaners |
| cleaner | Themselves only |

---

## Permission Rules (Route Access)

| Who | Invoices | Jobs / Schedule / Work Mgmt |
|-----|----------|-----------------------------|
| owner | ✅ | ✅ |
| director | ✅ | ✅ |
| hr manager | ✅ | ❌ |
| hr staff | ✅ | ❌ |
| ops manager | ❌ | ✅ |
| ops staff + cleaner | ❌ | ✅ |

---

## Create / Update Rules

- **Cleaner** → `department` is always forced to `'ops'`, cannot be changed
- **Director** → can create/update users in both `hr` and `ops`
- **HR Manager** → can only create/update users within `hr` department, below their rank
- **Ops Manager** → can only create/update users within `ops` department, below their rank
- **No one** can create a user with a role equal to or higher than their own (except owner)

---

## Implementation Plan

1. Add `department` field to `User` model (`'hr' | 'ops' | null`)
2. Update `ROLE_HIERARCHY` to include `director` (rank 4)
3. Update `listUsers` and `getUser` — apply visibility rules above
4. Update `createUser` and `updateUser` — enforce department scoping + cleaner always ops
5. Add permission middleware for invoice routes (`requireDepartment('hr')`)
6. Add permission middleware for ops routes (`requireDepartment('ops')`)
