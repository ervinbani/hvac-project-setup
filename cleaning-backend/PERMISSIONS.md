# Role & Permission Matrix

## Roles

| Code                 | Name               |
| -------------------- | ------------------ |
| `owner`              | Owner              |
| `director`           | Director           |
| `manager_operations` | Operations Manager |
| `manager_hr`         | HR Manager         |
| `staff`              | Staff              |
| `worker`             | Worker             |

---

## Permission Matrix

| Endpoint                               |  worker  |  staff   | manager_hr | manager_operations | director |  owner   |
| -------------------------------------- | :------: | :------: | :--------: | :----------------: | :------: | :------: |
| **USERS**                              |          |          |            |                    |          |          |
| GET /api/users                         |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| POST /api/users                        |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| PUT /api/users/:id                     |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| DELETE /api/users/:id                  |    ✗     |    ✗     |     ✗      |         ✗          |    ✗     |    ✅    |
| **JOBS**                               |          |          |            |                    |          |          |
| GET /api/jobs                          |    ✅    |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| POST /api/jobs                         |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| PUT /api/jobs/:id                      |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| PATCH /api/jobs/:id/status             |    ✅    |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| DELETE /api/jobs/:id                   |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| **SERVICES**                           |          |          |            |                    |          |          |
| GET /api/services                      |    ✅    |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| POST /api/services                     |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| PUT /api/services/:id                  |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| DELETE /api/services/:id               |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| **INVOICES**                           |          |          |            |                    |          |          |
| GET /api/invoices                      |    ✅    |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| POST /api/invoices                     |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| PUT /api/invoices/:id                  |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| POST /api/invoices/:id/send            |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| DELETE /api/invoices/:id               |    ✗     |    ✗     |     ✗      |         ✗          |    ✗     |    ✅    |
| **CUSTOMERS**                          |          |          |            |                    |          |          |
| GET /api/customers                     |    ✅    |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| POST /api/customers                    |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| PUT /api/customers/:id                 |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| DELETE /api/customers/:id              |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| **RECURRING RULES**                    |          |          |            |                    |          |          |
| GET /api/recurring                     |    ✅    |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| POST /api/recurring                    |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| PUT /api/recurring/:id                 |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| DELETE /api/recurring/:id              |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| **MESSAGES**                           |          |          |            |                    |          |          |
| GET /api/messages                      |    ✅    |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| POST /api/messages/send                |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| **ROLES**                              |          |          |            |                    |          |          |
| GET /api/roles                         |    ✗     |    ✗     |     ✗      |         ✗          |    ✅    |    ✅    |
| POST /api/roles                        |    ✗     |    ✗     |     ✗      |         ✗          |    ✗     |    ✅    |
| PUT /api/roles/:id                     |    ✗     |    ✗     |     ✗      |         ✗          |    ✗     |    ✅    |
| DELETE /api/roles/:id                  |    ✗     |    ✗     |     ✗      |         ✗          |    ✗     |    ✅    |
| **PERMISSIONS**                        |          |          |            |                    |          |          |
| GET /api/permissions                   |    ✗     |    ✗     |     ✗      |         ✗          |    ✅    |    ✅    |
| **TENANT**                             |          |          |            |                    |          |          |
| GET /api/tenant                        |    ✅    |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| PUT /api/tenant                        |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| **AUTOMATIONS**                        |          |          |            |                    |          |          |
| GET /api/automations                   |    ✅    |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| POST /api/automations                  |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| PUT /api/automations/:id               |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| DELETE /api/automations/:id            |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| **DOCUMENTS**                          |          |          |            |                    |          |          |
| GET /api/uploads/list                  |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| GET /api/uploads/presigned-read        |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| GET /api/uploads/presigned-url         |    ✗     |    ✅    |     ✅     |         ✅         |    ✅    |    ✅    |
| DELETE /api/uploads                    |    ✗     |    ✗     |     ✗      |         ✅         |    ✅    |    ✅    |
| **TIMESHEETS**                         |          |          |            |                    |          |          |
| GET /api/timesheets                    | ✅ (own) | ✅ (own) |  ✅ (all)  |      ✅ (all)      | ✅ (all) | ✅ (all) |
| PATCH /api/timesheets/:jobId/:entryId  |    ✗     |    ✗     |     ✅     |         ✅         |    ✅    |    ✅    |
| DELETE /api/timesheets/:jobId/:entryId |    ✗     |    ✗     |     ✗      |         ✅         |    ✅    |    ✅    |

---

## Legend

- ✅ — Allowed
- ✗ — Forbidden (returns 403)
- All authenticated routes require a valid JWT (returns 401 if missing/expired)
