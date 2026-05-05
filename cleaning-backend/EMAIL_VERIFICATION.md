# Email Verification Flow — Frontend Notes

## What changed on the backend

### 1. Registration (`POST /api/auth/register`)

**Before:** responded with `{ token, user, tenant }` — the user was immediately active and logged in.

**Now:** responds with:
```json
{
  "success": true,
  "data": {
    "message": "Registration successful. Please check your email to verify your account before logging in.",
    "email": "user@example.com"
  }
}
```
- **No JWT is returned anymore.**
- An email with a verification link is sent automatically.
- The user account is created with `isActive: false` until they verify.

**Frontend action:** After successful registration, redirect the user to a "Check your email" page instead of logging them in.

---

### 2. New route — Verify Email (`GET /api/auth/verify-email?token=...`)

The email contains a link like:
```
https://your-frontend-url/verify-email?token=<TOKEN>
```

The frontend page at `/verify-email` must:
1. Read the `token` query param from the URL.
2. Call the backend:
   ```
   GET /api/auth/verify-email?token=<TOKEN>
   ```
3. On **success** (`200`):
   ```json
   { "success": true, "data": { "message": "Email verified successfully. You can now log in." } }
   ```
   → Show a success message and redirect to `/login`.

4. On **error** (`400`):
   ```json
   { "success": false, "error": "Invalid or expired verification token" }
   ```
   → Show an error message. Optionally offer a "resend verification email" button (not yet implemented).

---

### 3. Login (`POST /api/auth/login`)

If the user tries to log in before verifying, the backend returns:
```json
{
  "success": false,
  "error": "Please verify your email address before logging in.",
  "code": "EMAIL_NOT_VERIFIED"
}
```
HTTP status: **403**

**Frontend action:** When login returns `403` with `code: "EMAIL_NOT_VERIFIED"`, show a specific message like:
> "You need to verify your email before logging in. Check your inbox."

This is separate from a generic wrong-password error (`401`).

---

## Summary of new frontend pages / logic needed

| What | Where | Notes |
|---|---|---|
| Post-registration screen | e.g. `/register-success` or inline | Show "Check your email" message |
| Verify email page | `/verify-email` | Read `?token=`, call GET endpoint, redirect to login on success |
| Login error handling | existing login form | Distinguish `403 EMAIL_NOT_VERIFIED` from `401` invalid credentials |
