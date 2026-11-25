# Secure File Upload Architecture — BanyuWening

Arsitektur **Defense in Depth (10 Lapisan)** untuk seluruh jalur unggahan file di BanyuWening (`landing_media`, `firmware`, dan `tenant_document`).

---

## 1. Arsitektur End-to-End (Diagram Alur)

```mermaid
flowchart TD
    U[Authenticated User / Admin] --> FE[1. Frontend Validation\nExtension, Double-Ext, Size, MIME, Dimensi, Anti-Duplicate]
    FE --> IG[2. Infrastructure & Request Gate\nEnforceUploadRequestLimits 413 + throttle:upload 429 + CSRF]
    IG --> AG[3. Application & Tenant Gate\nAuth + Strict Admin / Tenant Isolation]
    AG --> Q[4. Private Quarantine Disk\nstorage/app/private/quarantine/pending/uuid.part chmod 0600]
    Q --> INSP[5. FileSecurityInspector\nFilename, Magic Bytes, finfo MIME, GD/PDF/ZIP-Bomb, Full-Stream Polyglot]
    INSP -->|Gagal| REJ[REJECTED\nHapus Quarantine + Audit VALIDATION_FAILED + HTTP 422]
    INSP -->|Lolos| DB1[DB: SecureUpload PENDING_SCAN + SHA-256 + TTL]
    DB1 --> JOB[6. ScanAndPromoteUploadJob\nCache Lock + TOCTOU SHA-256 Check + Re-Inspect]
    JOB --> SCAN[7. MalwareScannerInterface\nClamAvScanner clamd/CLI / FakeMalwareScanner non-prod]
    SCAN -->|INFECTED| QUAR[QUARANTINED\nPindah ke infected/ chmod 0600 + Audit SCAN_INFECTED + HTTP 422]
    SCAN -->|TIMEOUT / UNAVAILABLE / ERROR| FAIL[SCAN_FAILED Fail-Closed\nRetry Queue atau Cleanup + Audit SCAN_FAILED + HTTP 503]
    SCAN -->|CLEAN| PROM[8. Atomic Approval & Promotion\nCopy ke Permanent Disk + Verifikasi SHA-256 + DB Transaction]
    PROM -->|DB Gagal| RB[Rollback File Permanen + Audit PROMOTION_FAILED]
    PROM -->|Sukses| CLEAN[CLEAN\nHapus Quarantine + Hapus File Lama jika Replace + Audit PROMOTED]
```

---

## 2. File Lifecycle State Machine

Seluruh file yang masuk ke pipeline dikelola melalui enum `App\Enums\UploadStatus` dengan transisi eksplisit yang dikunci di `SecureUpload::transitionTo()`:

| Status | Makna | Transisi Diizinkan | Akses Publik / Download |
|---|---|---|---|
| `PENDING_SCAN` | File diterima di karantina privat, lolos inspeksi awal, menunggu pemindaian. | `SCANNING`, `REJECTED`, `SCAN_FAILED` | **DIBLOKIR (403/404)** |
| `SCANNING` | Sedang diproses di bawah `Cache::lock` oleh `ScanAndPromoteUploadJob`. | `CLEAN`, `QUARANTINED`, `REJECTED`, `SCAN_FAILED`, `PENDING_SCAN` | **DIBLOKIR (403/404)** |
| `CLEAN` | Lolos validasi + malware scanner + verifikasi SHA-256; dipromosikan ke permanent storage. | *(Terminal)* | **DIIZINKAN** (sesuai tenant/profil) |
| `REJECTED` | Ditolak oleh `FileSecurityInspector` atau gagal cek integritas TOCTOU. | *(Terminal)* | **DIBLOKIR** (file dihapus) |
| `QUARANTINED` | Terdeteksi malware/EICAR oleh scanner; dikunci di `quarantine/infected/`. | *(Terminal)* | **DIBLOKIR (403)** |
| `SCAN_FAILED` | Scanner timeout, error, atau tidak tersedia (**Fail-Closed**). | `PENDING_SCAN`, `SCANNING` (saat queue retry) | **DIBLOKIR (503 / 403)** |

---

## 3. Strategi Penyimpanan & Isolasi

| Disk Laravel (`config/filesystems.php`) | Root Path | Visibility | Fungsi |
|---|---|---|---|
| `quarantine` | `storage/app/private/quarantine` | Private (`serve: false`) | Penyimpanan sementara `pending/{uuid}.part` (`chmod 0600`) dan `infected/{uuid}.quarantined`. Tidak dapat diakses via HTTP. |
| `private_uploads` | `storage/app/private/uploads` | Private (`serve: false`) | Penyimpanan permanen `tenant_document` per tenant (`tenants/{TENANT_CODE}/{uuid}.{ext}`). Diunduh hanya melalui `SecureUploadController@download` dengan verifikasi tenant + SHA-256 + header `nosniff`. |
| `firmware_private` | `storage/app/private/firmware` | Private (`serve: false`) | Penyimpanan permanen binary OTA `.bin`. Hanya dapat diunduh device jika `is_active = true` dan `scan_status = 'CLEAN'`. |
| `landing_public` | `public/uploads` | Public | Hanya menerima file `landing_media` **setelah** status `CLEAN`. Dilindungi `public/uploads/.htaccess` (`Options -Indexes -ExecCGI`, `php_flag engine off`, blokir ekstensi skrip). |

---

## 4. Integrasi Malware Scanner & Fail-Closed Design

- **Kontrak:** `App\Services\Upload\Contracts\MalwareScannerInterface`
- **Production Adapter (`ClamAvScanner`):**
  - Mendukung mode `daemon` (`clamd` via TCP/Unix socket menggunakan protokol `zINSTREAM`) dan `cli` (`clamdscan --no-summary` / `clamscan --no-summary --infected`), serta mode `auto` (daemon terlebih dahulu, lalu CLI).
  - Menegakkan batas `max_scan_bytes` (50 MB) dan `timeout_seconds` (30 detik).
- **Test Adapter (`FakeMalwareScanner`):**
  - Aktif hanya saat `UPLOAD_SCANNER_DRIVER=fake` (dikonfigurasi di `phpunit.xml`).
  - Memeriksa signature standar `EICAR` dan mendukung simulasi `timeout`, `unavailable`, `error`, `infected`, serta `fail_once_then_clean` untuk uji queue retry.
  - **Hardening Guard:** Menolak berjalan apabila `app()->environment('production')` dan selalu mengembalikan `UNAVAILABLE` (fail-closed).
- **Perilaku Fail-Closed:** Jika scanner mengembalikan `TIMEOUT`, `UNAVAILABLE`, atau `ERROR`, file tidak pernah dipromosikan ke permanent storage maupun `public/uploads/`, `FirmwareRelease` tidak diaktifkan, dan HTTP `503` dikembalikan ke klien.

---

## 5. Tenant Isolation & Security Boundaries

1. **Non-Admin Tenant Binding:** Pengguna non-admin hanya boleh mengunggah ke `tenant_code` miliknya sendiri; upaya menyuplai `tenant_code` tenant lain langsung ditolak `403` (`CROSS_TENANT_UPLOAD_FORBIDDEN`) dan dicatat sebagai `ACCESS_DENIED`.
2. **UUID Route Binding:** Seluruh endpoint `/dashboard/uploads/{upload}` menggunakan `uuid` (bukan sequential integer ID) untuk mencegah enumerasi IDOR.
3. **Strict Admin Gate untuk Sistem:** `uploadLandingMedia` dan seluruh endpoint mutasi OTA admin (`OtaController::authorizeAdmin()`) mewajibkan `$user->isAdmin()` secara ketat.
4. **Audit Trail Bebas Secret:** `SecureUploadAuditService` mencatat event ke tabel `secure_upload_audit_logs` dan channel harian `security_uploads` (`storage/logs/security-uploads.log`) dengan penyaringan eksplisit agar password, token, `APP_KEY`, dan isi file tidak pernah tercatat.
