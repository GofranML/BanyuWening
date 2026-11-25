# Secure File Upload Implementation — BanyuWening

Dokumentasi teknis seluruh perubahan kode, konfigurasi, keputusan desain, dan panduan pemeliharaan pipeline unggahan aman.

---

## 1. Inventarisasi File yang Dibuat & Dimodifikasi

### File Baru
- **Konfigurasi & Infrastruktur:**
  - `laravel-app/config/uploads.php` — Konfigurasi terpusat profil upload (`landing_media`, `firmware`, `tenant_document`), batas ukuran, TTL karantina, batas arsip ZIP, dan konfigurasi scanner ClamAV.
  - `laravel-app/public/uploads/.htaccess` — Hardening direktori publik agar tidak mengeksekusi PHP/skrip dan memaksa `X-Content-Type-Options: nosniff`.
  - `laravel-app/deploy/nginx-upload-hardening.conf.example` — Template referensi Nginx (`client_max_body_size`, timeout, blokir eksekusi di `/uploads/`).
  - `laravel-app/deploy/php-uploads.ini.example` — Template referensi `php.ini` (`upload_max_filesize`, `post_max_size`, `max_file_uploads`).
- **Database & Model:**
  - `laravel-app/database/migrations/2026_11_25_000003_create_secure_uploads_tables.php` — Tabel `secure_uploads`, `secure_upload_audit_logs`, dan penambahan `secure_upload_id` + `scan_status` pada `firmware_releases`.
  - `laravel-app/app/Enums/UploadStatus.php` — State machine eksplisit (`PENDING_SCAN`, `SCANNING`, `CLEAN`, `REJECTED`, `QUARANTINED`, `SCAN_FAILED`).
  - `laravel-app/app/Models/SecureUpload.php` — Model lifecycle upload dengan `transitionTo()`, `isApproved()`, `isAccessibleBy()`, dan route key `uuid`.
  - `laravel-app/app/Models/SecureUploadAuditLog.php` — Model log audit keamanan upload.
- **Services, Scanner, Job, Middleware, Controller & Command:**
  - `laravel-app/app/Services/Upload/Exceptions/FileValidationException.php`
  - `laravel-app/app/Services/Upload/Exceptions/ScannerTransientException.php`
  - `laravel-app/app/Services/Upload/Exceptions/ScannerUnavailableException.php`
  - `laravel-app/app/Services/Upload/InspectionResult.php`
  - `laravel-app/app/Services/Upload/ScanResult.php`
  - `laravel-app/app/Services/Upload/Contracts/MalwareScannerInterface.php`
  - `laravel-app/app/Services/Upload/Scanners/ClamAvScanner.php`
  - `laravel-app/app/Services/Upload/Scanners/FakeMalwareScanner.php`
  - `laravel-app/app/Services/Upload/FileSecurityInspector.php`
  - `laravel-app/app/Services/Upload/SecureUploadAuditService.php`
  - `laravel-app/app/Services/Upload/SecureFileUploadService.php`
  - `laravel-app/app/Jobs/ScanAndPromoteUploadJob.php`
  - `laravel-app/app/Console/Commands/CleanupQuarantineUploadsCommand.php`
  - `laravel-app/app/Http/Middleware/EnforceUploadRequestLimits.php`
  - `laravel-app/app/Http/Controllers/SecureUploadController.php`
- **Frontend:**
  - `laravel-app/resources/js/lib/upload-validation.ts` — Helper validasi sisi klien (ekstensi, double extension, path traversal, ukuran, MIME, file count, dimensi gambar).
- **Test Suites:**
  - `laravel-app/tests/Unit/FileSecurityInspectorTest.php`
  - `laravel-app/tests/Feature/SecureFileUploadPipelineTest.php`

### File yang Dimodifikasi
- `laravel-app/config/filesystems.php` — Menambahkan disk `quarantine`, `private_uploads`, `landing_public`, `firmware_private`.
- `laravel-app/config/logging.php` — Menambahkan channel `security_uploads` (daily, 30 hari).
- `laravel-app/phpunit.xml` — Menambahkan `UPLOAD_SCANNER_DRIVER=fake` dan `UPLOAD_SCAN_ASYNC=false` untuk lingkungan pengujian terisolasi.
- `laravel-app/.env.example` — Menambahkan dokumentasi variabel lingkungan `UPLOAD_*` dan `CLAMAV_*` (default `UPLOAD_SCANNER_DRIVER=clamav`).
- `laravel-app/app/Models/FirmwareRelease.php` — Menambahkan relasi `secureUpload()` dan `isScanApproved()`.
- `laravel-app/app/Providers/AppServiceProvider.php` — Binding `MalwareScannerInterface` dan `RateLimiter::for('upload', ...)`.
- `laravel-app/bootstrap/app.php` — Registrasi alias middleware `upload.limits`.
- `laravel-app/routes/web.php` — Menambahkan middleware `upload.limits` + `throttle:upload` pada endpoint upload dan mendaftarkan 5 route `/dashboard/uploads/*`.
- `laravel-app/routes/console.php` — Menjadwalkan `uploads:cleanup-quarantine` setiap jam (`withoutOverlapping()`).
- `laravel-app/app/Http/Controllers/DashboardController.php` — Mengarahkan `uploadLandingMedia` ke `SecureFileUploadService`, menghapus `readUploadHead()`, dan menambahkan metrik `upload_pipeline` ke `$securityStats`.
- `laravel-app/app/Http/Controllers/OtaController.php` — Memperketat `authorizeAdmin()` ke `$user->isAdmin()`, mengintegrasikan `storeRelease` ke `SecureFileUploadService`, dan menambahkan approval gate pada `download()` & `initiateRollout()`.
- `laravel-app/app/Services/FirmwareOtaService.php` — Menambahkan `createReleaseFromSecureUpload()`, resolusi path via disk `firmware_private`, dan filter `scan_status = 'CLEAN'` pada `checkForDevice()`.
- `laravel-app/resources/js/Components/roles/SuperAdminContentManagement.tsx` — Validasi klien, penghapusan `image/*` (agar `.svg` tidak ditawarkan), pencegahan duplicate submit, inline error banner, dan dukungan polling status `202 PENDING_SCAN`.
- `laravel-app/resources/js/Components/roles/SuperAdminOtaProtocolPanel.tsx` — Validasi klien `.bin` & pencegahan duplicate submit.
- `laravel-app/tests/Feature/BanyuWeningMigrationTest.php` — Memperbarui fixture `test_admin_can_upload_landing_media` dari file 0-filled ke `UploadedFile::fake()->image()` + `Storage::fake()`.

---

## 2. Dependency Baru

**Tidak ada dependency Composer maupun npm baru yang ditambahkan.** Seluruh fitur (inspeksi ZIP Central Directory, PDF structure check, GD image decode, `finfo` MIME check, `clamd` socket streaming, dan `Symfony\Component\Process` CLI execution) dibangun menggunakan ekstensi PHP bawaan dan paket yang sudah terpasang.

---

## 3. Keputusan Teknis & Trade-offs

1. **Pure-PHP ZIP Central Directory Parser:** Ekstensi `ext-zip` tidak aktif di PHP runtime lokal (`php -m`). Implementasi parser EOCD (`PK\x05\x06`) dan Central Directory (`PK\x01\x02`) secara langsung memungkinkan deteksi zip bomb (rasio kompresi, total uncompressed size, jumlah entri), path traversal, nested archive, dan entri berbahaya tanpa menambah ekstensi PHP atau dependency eksternal.
2. **ESP32 Magic Byte (`0xE9`) Bersifat Konfigurabel:** Pengujian existing (`OtaAndMlSelfLearningTest`) mengunggah binary `.bin` uji dengan konten teks ASCII (`ESP32_BW_FIRMWARE_V150_...`), bukan header ESP32 `0xE9`. Oleh karena itu, `FileSecurityInspector` selalu memblokir binary executable berbahaya (ELF, PE/MZ, Mach-O, shebang `#!`, PHP/HTML/SVG/ZIP), sementara kewajiban byte pertama `0xE9` dikendalikan via `UPLOAD_FIRMWARE_REQUIRE_ESP32_MAGIC` (default `false`, dapat diset `true` di production jika seluruh firmware selalu berupa image ESP-IDF standar).
3. **Sync vs Async Scan (`UPLOAD_SCAN_ASYNC`):** `config/uploads.php` mendukung pemrosesan sinkron (`false`, default saat `QUEUE_CONNECTION=sync` atau langsung di dalam request) dan asinkron (`true`, mengembalikan HTTP `202` dan memproses di `ScanAndPromoteUploadJob` pada worker queue).

---

## 4. Panduan Pemeliharaan & Deployment Produksi

1. **Jalankan Migrasi:** `php artisan migrate` (menambahkan `secure_uploads`, `secure_upload_audit_logs`, dan kolom `firmware_releases`).
2. **Aktifkan ClamAV di Server Produksi (Linux):**
   - Pasang `clamav` dan `clamav-daemon` (`sudo apt install clamav clamav-daemon`), jalankan `freshclam` untuk signature terbaru, dan pastikan `clamd` aktif di `127.0.0.1:3310` atau Unix socket.
   - Set `.env` produksi: `UPLOAD_SCANNER_DRIVER=clamav`, `CLAMAV_MODE=auto`.
3. **Queue Worker & Scheduler:**
   - Pastikan Supervisor menjalankan `php artisan queue:work` (lihat `deploy/supervisor/banyuwening-worker.conf`) jika `UPLOAD_SCAN_ASYNC=true`.
   - Pastikan cron Laravel scheduler aktif (`php artisan schedule:run`) agar `uploads:cleanup-quarantine` berjalan setiap jam.
4. **Hardening Web Server:** Terapkan aturan di `deploy/nginx-upload-hardening.conf.example` dan `deploy/php-uploads.ini.example` pada server produksi.
