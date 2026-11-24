# Security Audit — BanyuWening (Laravel + Inertia/React)

Audit period: adversarial chaos suite `tests/Feature/AdversarialSecurityChaosTest.php`
("A1/A2 ring of privilege", "B1–B4 cross-tenant", "A5 backup doxxing", "C3/C5 upload &
polyglot", "C6 soft-delete auth", "D2/D3 doc disclosure", "E3 stored XSS",
"H1 concurrency", "realtime tickets", "token binding").

## Severity scale used

| Level | Meaning |
|---|---|
| **Critical** | RCE, data breach, credential theft |
| **High** | Privilege escalation, cross-tenant access, credential leak |
| **Medium** | Stored XSS, weak validation, DoS |
| **Low** | Minor config/hardening issues |

---

## Exploit narratives, findings, fixes, and prevention rules

### A1 — Privilege rings via fake `custom_permissions` (High → Fixed)

**Narrative.** An OPERATOR plants forged `custom_permissions` (`manage_users`,
`view_docs_api`, `manage_backups`, …) and POSTs to user/tenant/backup/ML/notification
management endpoints. Before the fix the gates were `isAdmin() || hasPermission(...)`,
so the forged flags opened every privileged route (the malicious operator reached
`POST /dashboard/users`, `POST /dashboard/tenants`, `POST /dashboard/backups/create`,
`POST /dashboard/ml/agent/config`, `POST /dashboard/notifications/config`,
`POST /dashboard/ml/evaluate`, and `POST /dashboard/devices/{id}/rotate-token`
with 302/200 — later corrected to 403).

**Fix.** Strict role gates: `isAdmin()` (`role === 'ADMIN'`) is now required on
`storeUser`, `storeTenant`, `updateUser`, `updateUserPermissions`, `destroyUser`,
`updateTenant`, `destroyTenant`, `createBackup`, `downloadBackup`, `deleteBackup`,
`saveLandingContent`, `uploadLandingMedia`, `saveNotificationConfig`,
`testNotification`, `clearDispatchLogs`, `rotateDeviceToken`,
`MlApiController::authorizeStrictAdmin()` on all mutating ML endpoints
(`updateAgentConfig`, `triggerEvaluate`, `triggerSelfLearn`, `fetchRemoteModels`,
`storeFieldValidation`, `destroyFieldValidation`, `promoteModel`), while reads such as
`adminOverview` remain available to `view_docs_api` holders (preserves the documented
operator workflow).

**Prevention.**
- Custom permissions cannot substitute for the role. `User::sanitizeCustomPermissions()`
  keeps keys valid per role, but gates never consult forged flags for privileged actions.
- When a limit blocks an action, return a clear message; never silently authorize.
- Regression fence: `test_privileged_routes_enforce_role_not_just_custom_permission_flag`.

### A2 — Operator/manager escalation to ADMIN or takeover of an ADMIN account (High → Fixed)

**Narrative.** A non-admin "Manager" with a legitimate `manage_users` permission:
1. Creates a user with `role=ADMIN` (backdoor).
2. Sets his own role to `ADMIN`.
3. Downgrades/passwords an ADMIN account, or deletes it, or attaches admin permissions.

**Fix.** User-management endpoints now abort with 403 for non-ADMIN callers
(`updateUser`, `updateUserPermissions`, `destroyUser`). `updateUser` no longer allows
role changes for anyone but ADMIN; `destroyUser` refuses self/protected deletes
(`admin@banyuwening.id`); new accounts can only be created by ADMIN via `storeUser`.
The migration-level expectation that non-admins get 403 on user updates is preserved.

**Prevention.**
- Server-side role validation: `role` is in `ADMIN,OPERATOR,ANALIS,PEMILIK` and only
  reachable to Super Admin.
- Defaults: `User::defaultPermissionsForRole()` is the only permission source.
- Regression fences: `test_operator_with_legit_permission_cannot_escalate_to_admin_or_take_over_admin_account`,
  plus `BanyuWeningMigrationTest::test_non_admin_cannot_update_other_users` and
  `ComprehensiveBackendTest::test_rbac_and_guest_route_protections`.

### A5 — Backup doxxing / credential leak (High → Fixed, verified by chaos test)

**Narrative.** An attacker who reads backup snapshots finds plaintext passwords, TOTP
secrets, or device token hashes/material.

**Fix.** `DashboardController::createBackup()` JSON snapshot selects only
`('id','name','email','role','title','pond_name','phone','two_factor_enabled','created_at')`
on `users`, so `password`, `remember_token`, `two_factor_secret`, and
`two_factor_recovery_codes` never enter the snapshot. Device serialization only exposes
the token prefix + `has_token`. Regression: `test_backup_snapshot_never_contains_credential_material`.

**Prevention.**
- Least-information backup payloads; treat backups as data exports, not credentials.
- Backup/download/delete endpoints are strict-ADMIN.

### C3 / C5 — Polyglot / script uploads (Medium → Fixed)

**Narrative.** Uploading `GIF89a<?php system($_GET['c']); ?><svg …>` as `payload.jpg`
or `shell.php` to `POST /dashboard/landing-media/upload`.

**Fix.**
1. Extension allowlist (`jpg, jpeg, png, webp, gif, mp4, webm, ogg`) — SVG is not allowed.
2. New content sniffing (`DashboardController::readUploadHead`): reads up to 8 KB of
   the upload head (real path, or via the test-stream for `Illuminate\Http\Testing\File`)
   and rejects 422 when it contains `<?php`, `<?=`, `<svg`, `<script`, or
   `javascript:`.
3. Accepts only real media: `finfo`/`guessExtension` must return an allowed extension.

**Prevention.**
- No filename trust: server re-generates names (`time_slug_random.ext`).
- Extension must match the sniffed magic; scripts/SVG rejected server-side.
- Regression: `test_media_upload_rejects_polyglot_svg_and_php_files` +
  `SecurityAndResilienceHardeningTest::test_svg_upload_and_backup_traversal_are_blocked`.

### C6 — Deleted user cannot authenticate (Medium → Fixed/Closed, verified)

**Narrative.** Deleted users keep authenticating or could be resurrected by admin actions.

**Fix.** Users are hard-deleted (`User::delete()` in `destroyUser`; `users` migration has
no `deleted_at`). Auth regression fence updated to `test_deleted_user_cannot_still_authenticate`:
after delete, the row is gone and `POST /login` returns `session errors` (verified).
For environments that later add `deleted_at`, `AuthController::login` should re-check
`User::withTrashed()` vs scope — noted for the auth refactor.

**Prevention.**
- Auth uses email lookup + `Hash::check` (see also the prior fix: hardcoded-password
  backdoors removed, rate limiting on `/login` and `/login/2fa`).

### D2 / D3 — Documentation credential disclosure (High → Fixed, verified)

**Narrative.** Anonymous users reading `/api/docs/asyncapi`, `/api/docs/asyncapi.json`,
`/api/docs/asyncapi.yaml`, or the Studio page could see plaintext device tokens or
`APP_KEY`.

**Fix (verified by chaos):** `SwaggerController` + `asyncapi.blade.php` surfaces are
built so tokens are only attached for authenticated Super Admin, and anonymous views
exclude token/`api_token_encrypted` content. Regression:
`test_api_and_websocket_docs_do_not_disclose_credentials_to_anonymous_users`.

**Prevention.**
- Docs surfaces are read-only; secrets stay in DB (encrypted) and are only decrypted
  for the owning device/user.

### E3 — Stored XSS in landing content (Medium → Fixed)

**Narrative.** An ADMIN posts `hero_title = "<img src=x onerror=alert(1)>"` or
`hero_subtitle = "<script>alert(document.cookie)</script>"` to `/dashboard/landing-content`.
Landing page `/` then renders the payload (stored XSS → session theft in admin dashboard).

**Fix.** `LandingContent::sanitizeValue()` strips tags on every write path:
`LandingContent::setValue()` → `setMany()` from `saveLandingContent`. All string leaves
(`strings`, nested `capabilities[]`, `faqs[]`) are run through `strip_tags`.
Verification: chaos test asserts the landing page props contain neither
`onerror=alert` nor `<script>alert(document.cookie)</script>`.

**Prevention.**
- Defense-in-depth: frontend React renders via escaped props (no `dangerouslySetInnerHTML`
  anywhere in `resources/js`).
- Consider a CSP header as a second layer.

### H1 — ML single-active-model concurrency (Medium → Fixed, verified)

**Narrative.** Two promote requests race and leave two "active" models.

**Fix (by predecessor, verified):** `test_ml_model_promotion_keeps_single_active_model_under_concurrency`
passes — v2 promote without artifact fails cleanly and v1 stays active.

### Realtime tickets (Medium → Fixed, verified)

**Narrative.** Anonymous GET `/api/realtime/config` mints a dashboard ticket.

**Fix:** unauthenticated returns `dashboard_ticket: null`; authenticated users get a ticket
bound to their tenant. Regression: `test_unauthenticated_realtime_ticket`.

### B1–B4 — Cross-tenant writes (High → Fixed, verified by chaos)

**Narrative.** Tenant A operators write into tenant B: acks, token rotations, aerator
control, OTA profile updates, firmware releases/simulations, telemetry under device B.

**Fix (by predecessor):** routes/middleware enforce tenant scope on every write
(`acknowledgeAlert`, `rotateDeviceToken` (now strict-admin), `controlAerator`,
`updateDeviceOtaProfile`, `OtaController`, telemetry binding in
`AuthenticateDeviceToken`). Chaos suite asserts each stays 403 + state unchanged.

### Token binding (High → Fixed, verified)

**Narrative.** Device A (Bearer A) sends telemetry with `device_code: B`.

**Fix:** `AuthenticateDeviceToken` middleware binds token↔device_code; mismatches are 403.
Regression: `test_ota_status_reports_are_token_bound_and_cannot_hijack_other_devices`.

---

## Backlog notes (open, not fixed in this pass)

- n/a at time of writing; growth rules for the audit trail:
  - When SoftDelete is added to `users`, extend `AuthController::login` to reject
    `withTrashed()` matches (see C6).
  - Review `routes/api.php` telemetry acceptance surface for anonymous device writes
    when hardening budgets allow.
