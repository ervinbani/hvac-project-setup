# Email Verification & User Activation — Frontend Notes

---

## 1. Registration (`POST /api/auth/register`)

**Response (201):**

```json
{
  "success": true,
  "data": {
    "message": "Registration successful. Please check your email to verify your account before logging in.",
    "email": "user@example.com"
  }
}
```

- **No JWT is returned.** Do not log the user in automatically.
- Show a screen: _"Check your inbox — click the link in the email to activate your account."_

---

## 2. Verify Email page (`/verify-email`)

The email sent to the user contains a link like:

```
http://localhost:5174/verify-email?token=<TOKEN>
```

The page must:

1. Read `token` from the URL query params.
2. On mount, call:
   ```
   GET /api/auth/verify-email?token=<TOKEN>
   ```
3. **Success `200`:**

   ```json
   {
     "success": true,
     "data": { "message": "Email verified successfully. You can now log in." }
   }
   ```

   → Show success message, redirect to `/login` after 2–3 seconds.

4. **Error `400`:**
   ```json
   { "success": false, "error": "Invalid or expired verification token" }
   ```
   → Show error: _"Link non valido o scaduto."_ Token scade dopo **24 ore**.

---

## 3. Login (`POST /api/auth/login`)

If the user logs in before verifying their email:

**Response `403`:**

```json
{
  "success": false,
  "error": "Please verify your email address before logging in.",
  "code": "EMAIL_NOT_VERIFIED"
}
```

→ When `code === "EMAIL_NOT_VERIFIED"`, show a specific banner:

> _"Devi verificare la tua email prima di accedere. Controlla la tua casella."_

Questo è separato dall'errore `401` (credenziali sbagliate).

---

## 4. Forgot Password (`POST /api/auth/forgot-password`)

```json
{ "email": "user@example.com" }
```

Risponde sempre `200` (anche se l'email non esiste, per sicurezza):

```json
{
  "success": true,
  "data": { "message": "If that email exists, a reset link has been sent." }
}
```

→ Mostrare sempre: _"Se l'email è registrata, riceverai un link a breve."_

---

## 5. Reset Password (`POST /api/auth/reset-password`)

Pagina `/reset-password?token=<TOKEN>` — form con "nuova password" e "conferma password".

```json
{ "token": "<TOKEN dall'URL>", "newPassword": "nuovaPassword123" }
```

- **Success `200`:** redirect a `/login`.
- **Error `400`:** _"Link scaduto o non valido. Richiedi un nuovo reset."_ (token scade dopo **1 ora**)

---

## 6. Backoffice — Gestione utenti (`PUT /api/users/:id`)

Nel pannello di gestione utenti, ogni user ha due nuovi campi: `isActive` e `emailVerified`.

### Attiva / Disattiva utente

```json
{ "isActive": true }   // attiva
{ "isActive": false }  // disattiva
```

→ Bottone toggle "Attivo / Inattivo" nella scheda utente.

### Verifica email manualmente (bypass click email)

```json
{ "emailVerified": true }
```

→ Il backend imposta automaticamente anche `isActive: true` e pulisce il token.
→ Bottone "Verifica email" visibile solo se `user.emailVerified === false`.

### Cambio email

- L'email **si può cambiare** in qualsiasi momento.
- Se l'email cambia → il backend resetta `emailVerified: false` e `isActive: false` automaticamente.
- Il frontend deve mostrare un avviso: _"Cambiando l'email, l'utente dovrà riverificarla."_

---

## Campi utente da mostrare nel backoffice

| Campo           | Tipo    | Note UI                                           |
| --------------- | ------- | ------------------------------------------------- |
| `isActive`      | Boolean | Badge verde/rosso + toggle                        |
| `emailVerified` | Boolean | Badge + bottone "Verifica manualmente" se `false` |
| `email`         | String  | Mostrare warning se si modifica                   |
