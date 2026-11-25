# Secure File Upload Audit — BanyuWening

**Tanggal Audit:** 2026-11-25  
**Scope:** Seluruh mekanisme unggahan file, penyimpanan, otorisasi, dan distribusi pada proyek BanyuWening (`laravel-app/` — Laravel 13.42 + Inertia/React 19).

---

## 1. Kondisi Awal & Inventarisasi Upload Endpoint

Penelusuran menyeluruh pada `laravel-app/routes/web.php`, `laravel-app/routes/api.php`, `laravel-app/app/Http/Controllers/`, `laravel-app/app/Services/`, dan `laravel-app/resources/js/` mengidentifikasi **2 endpoint upload aktif** serta **3 mekanisme distribusi/unduh file terkait**:

| # | Endpoint | Controller / Method | Komponen Frontend | Profil File | Otorisasi Awal | Penyimpanan Awal |
|---|---|---|---|---|---|---|
| 1 | `POST /dashboard/landing-media/upload` | `DashboardController@uploadLandingMedia` | `SuperAdminContentManagement.tsx` | Gambar (`jpg,jpeg,png,webp,gif`) & Video (`mp4,webm,ogg`), maks 50 MB | `auth` + `$user->isAdmin()` | Langsung ke `public/uploads/landing/` (`$file->move`) |
| 2 | `POST /dashboard/ota/releases` | `OtaController@storeRelease` -> `FirmwareOtaService@createRelease` | `SuperAdminOtaProtocolPanel.tsx` | Binary firmware ESP32 (`.bin`), maks 16 MB | `auth` + `authorizeAdmin()` (`isAdmin() \|\| view_docs_api`) | Langsung ke `storage/app/private/firmware/` (`$binaryFile->move`) |
| 3 | `GET /api/http/ota/download/{version}` | `OtaController@download` | Device ESP32 (`device.token`) | Binary firmware `.bin` | `device.token` + ACL per perangkat | `storage/app/private/firmware/` |
| 4 | `GET /dashboard/backups/{filename}/download` | `DashboardController@downloadBackup` | `SuperAdminSecurityBackup.tsx` | Backup SQL/SQLite/JSON (server-generated) | `auth` + `$user->isAdmin()` | `storage/app/backups/` |
| 5 | `POST /dashboard/uploads` *(baru)* | `SecureUploadController@store` | API / Tenant Document Pipeline | Dokumen & media tenant (`pdf,jpg,jpeg,png,webp,csv,txt,zip`) & `landing_media` | `auth` + tenant isolation | Karantina privat -> `storage/app/private/uploads/tenants/{tenant}/` |

---

## 2. Kontrol Keamanan yang Sudah Ada Sebelum Audit

Berdasarkan inspeksi kode aktual dan `SECURITY_AUDIT.md`:
1. **`DashboardController@uploadLandingMedia`**:
   - Membatasi akses hanya untuk `ADMIN`.
   - Memiliki allowlist ekstensi dan validasi `mimes:jpg,jpeg,png,webp,gif,mp4,webm,ogg`.
   - Menggunakan `$file->guessExtension()` dan menamai ulang file di server (`time() . '_' . $slug . '_' . random_bytes`).
   - Memeriksa 8 KB awal file (`readUploadHead`) untuk string `<?php`, `<?=`, `<svg`, `<script`, `javascript:`.
2. **`OtaController@storeRelease` & `FirmwareOtaService`**:
   - Menghitung checksum `SHA-256` dan tanda tangan `HMAC-SHA256` per rilis.
   - Menyimpan binary di `storage/app/private/firmware/` (di luar `public/`).
   - Mendukung ACL per perangkat (`allowed_device_ids`) dan validasi kompatibilitas hardware/semver.
3. **`SecurityHeaders` Middleware**:
   - Menetapkan `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, dan `Permissions-Policy`.

---

## 3. Temuan Keamanan & Gap Analysis

| ID | Tingkat Risiko | Temuan & Lokasi | Dampak |
|---|---|---|---|
| **GAP-01** | **High** | **Privilege Escalation pada OTA Firmware Upload (`OtaController::authorizeAdmin`)**: Menggunakan `$user->isAdmin() \|\| $user->hasPermission('view_docs_api')`, sehingga operator dengan izin baca dokumentasi (`view_docs_api`) dapat mengunggah, mengubah ACL, menonaktifkan, dan menghapus rilis firmware `.bin`. | Penyerang dengan akun non-admin berizin `view_docs_api` dapat mengunggah firmware berbahaya. |
| **GAP-02** | **High** | **Tidak Ada Karantina & Malware Scanning**: Baik media landing maupun binary OTA langsung dipindahkan (`$file->move()`) ke direktori tujuan permanen tanpa karantina privat, lifecycle status, maupun pemindaian antivirus (ClamAV). | File terinfeksi atau bermasalah langsung tersedia di tujuan akhir tanpa approval gate. |
| **GAP-03** | **High** | **Eksekusi Publik Tanpa Isolasi & Hardening `public/uploads`**: `public/uploads/landing/` tidak memiliki `.htaccess` anti-eksekusi (`php_flag engine off`, `Options -ExecCGI`), dan file langsung masuk `public/` saat upload. | Jika ada bypass atau misconfig web server, file dapat langsung diakses/dieksekusi publik. |
| **GAP-04** | **Medium** | **Validasi Magic Bytes, Struktural, & Polyglot Tidak Lengkap**: `readUploadHead()` hanya membaca 8 KB pertama pada file uji, tidak memverifikasi `getimagesize()` / GD decode (gambar korup lolos), tidak memblokir polyglot setelah byte ke-8192 atau trailing `IEND`/`\xFF\xD9`, dan tidak memeriksa double extension (`shell.php.jpg`). | Polyglot image+PHP/HTML di luar 8 KB pertama atau file gambar korup dapat lolos. |
| **GAP-05** | **Medium** | **Validasi Firmware `.bin` Terlalu Lemah (`OtaController@storeRelease`)**: Hanya mengecek `$ext === 'bin'`; tidak menolak binary ELF/PE/Mach-O, shebang `#!`, skrip PHP/HTML/SVG/ZIP yang diganti nama menjadi `.bin`, serta mempercayai `getClientOriginalName()` pada kolom `file_name`. | Binary berbahaya atau skrip yang menyamar sebagai `.bin` dapat disimpan sebagai rilis firmware. |
| **GAP-06** | **Medium** | **Tidak Ada Rate Limiting & Request-Size Gate Khusus Upload**: Endpoint upload belum dilindungi `throttle:upload` maupun middleware batas `Content-Length` (HTTP 413), serta belum ada dukungan upload dokumen terisolasi per tenant (`tenant_document`). | Rentan terhadap upload flooding / DoS disk exhaustion dan belum ada jalur aman untuk dokumen tenant. |
| **GAP-07** | **Medium** | **Frontend Validation Kurang Ketat (`SuperAdminContentManagement.tsx` & `SuperAdminOtaProtocolPanel.tsx`)**: Menggunakan `accept="image/*"` (mengizinkan `.svg` di file picker), tidak memvalidasi dimensi/ukuran/double-extension sebelum `fetch`, tidak mencegah duplicate submission pada landing media, dan memakai `alert()`. | Pengalaman pengguna buruk, pemborosan bandwidth, dan pengiriman ganda ke server. |
| **GAP-08** | **Medium** | **Tidak Ada Audit Trail Upload Terstruktur**: Tidak ada pencatatan terpusat untuk `upload_id`, `user_id`, `tenant_code`, `sha256_hash`, `detected_mime`, `scanner_version`, `scan_result`, `rejection_reason`, dan `promotion_result`. | Sulit melakukan forensik insiden atau membuktikan kepatuhan keamanan unggahan. |

---

## 4. Kesimpulan Audit

Meskipun kontrol dasar (seperti proteksi `isAdmin()` di landing upload dan `HMAC-SHA256` di OTA) sudah ada, arsitektur upload sebelumnya bersifat *single-pass direct move* tanpa karantina, tanpa approval gate, tanpa malware scanner fail-closed, tanpa validasi struktural/polyglot penuh, serta memiliki celah otorisasi di `OtaController::authorizeAdmin()`. Seluruh celah di atas ditangani pada implementasi pipeline baru.
