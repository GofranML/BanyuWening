# Secure File Upload Test Report — BanyuWening

**Tanggal Pengujian:** 2026-11-25  
**Lingkungan Uji:** Windows 11, PHP 8.6.0, Laravel 13.42.0, PHPUnit 12.5.12, SQLite `:memory:`, Node.js v24.16.0, Vite v8.3.8.  
**Scanner Uji:** `FakeMalwareScanner` (`UPLOAD_SCANNER_DRIVER=fake` di `phpunit.xml`).

---

## 1. Ringkasan Eksekusi & Hasil Aktual

| Suite / Tool | Perintah | Hasil | Jumlah Test | Assertions | Durasi |
|---|---|---|---|---|---|
| **Upload Security Unit & Feature** | `php vendor/bin/phpunit tests/Unit/FileSecurityInspectorTest.php tests/Feature/SecureFileUploadPipelineTest.php` | **PASS** | 36 / 36 | 108 | 3.643 s |
| **Security, RBAC, Tenant & Device Auth** | `php vendor/bin/phpunit tests/Feature/AdversarialSecurityChaosTest.php tests/Feature/SecurityAndResilienceHardeningTest.php tests/Feature/TenantManagementFeatureTest.php tests/Feature/RealtimeSwaggerAndDeviceTokenTest.php` | **PASS** | 34 / 34 | 381 | 11.244 s |
| **Migration, Backend, E2E, ML & OTA** | `php vendor/bin/phpunit tests/Feature/BanyuWeningMigrationTest.php tests/Feature/ComprehensiveBackendTest.php tests/Feature/EndToEndPipelineTest.php tests/Feature/MlAgentAndHarvestEvaluationFeatureTest.php tests/Feature/OtaAndMlSelfLearningTest.php` | **PASS** | 42 / 42 | 432 | 33.596 s |
| **Laravel Pint (Code Style)** | `php vendor/bin/pint --test ...` | **PASS** | — | — | — |
| **TypeScript Typecheck** | `npx.cmd tsc --noEmit` | **PASS** | — | — | — |
| **Vite Production Build** | `npm.cmd run build` | **PASS** | — | — | 1.12 s |
| **Total PHPUnit** | — | **PASS** | **112 / 112** | **921** | **48.48 s** |

---

## 2. Cakupan 29 Skenario Keamanan Upload (`SecureFileUploadPipelineTest` & `FileSecurityInspectorTest`)

| # | Skenario | Test Method | Hasil |
|---|---|---|---|
| 1 | Valid image upload | `test_01_valid_image_upload_succeeds_and_is_audited` | PASS |
| 2 | Fake extension | `test_02_fake_extension_is_rejected` | PASS |
| 3 | MIME mismatch | `test_03_mime_mismatch_is_rejected` | PASS |
| 4 | Invalid magic bytes | `test_04_invalid_magic_bytes_is_rejected` | PASS |
| 5 | Double extension | `test_05_double_extension_is_blocked` | PASS |
| 6 | PHP payload | `test_06_php_payload_is_blocked_on_all_endpoints` | PASS |
| 7 | SVG payload | `test_07_svg_payload_is_blocked` | PASS |
| 8 | HTML/script payload | `test_08_html_and_script_payload_is_blocked` | PASS |
| 9 | Polyglot file (>8 KB) | `test_09_polyglot_image_with_payload_past_8kb_is_blocked` | PASS |
| 10 | Oversized file (422 & 413) | `test_10_oversized_file_and_request_limit_are_rejected` | PASS |
| 11 | Empty file | `test_11_empty_file_is_rejected` | PASS |
| 12 | Corrupted image | `test_12_corrupted_image_with_valid_magic_header_is_rejected` | PASS |
| 13 | Malformed/scripted document | `test_13_malformed_and_scripted_pdf_is_rejected`, `test_malicious_pdf_with_javascript_action_is_blocked` | PASS |
| 14 | Path traversal | `test_14_path_traversal_filename_is_rejected`, `test_zip_with_path_traversal_or_php_entry_is_blocked` | PASS |
| 15 | Archive bomb protection | `test_15_archive_bomb_is_blocked_at_upload_endpoint`, `test_zip_bomb_high_compression_ratio_is_blocked` | PASS |
| 16 | Malware scanning | `test_16_eicar_malware_is_quarantined_and_never_promoted` | PASS |
| 17 | Unauthorized upload | `test_17_unauthorized_users_cannot_upload` | PASS |
| 18 | Cross-tenant upload | `test_18_cross_tenant_upload_is_blocked` | PASS |
| 19 | Cross-tenant download | `test_19_cross_tenant_download_is_blocked_and_audited` | PASS |
| 20 | Concurrent upload / lock | `test_20_concurrent_processing_respects_cache_lock` | PASS |
| 21 | Scanner timeout | `test_21_scanner_timeout_fails_closed` | PASS |
| 22 | Scanner unavailable | `test_22_scanner_unavailable_fails_closed`, `test_clamav_scanner_fails_closed_when_unavailable` | PASS |
| 23 | Queue retry | `test_23_queue_retry_recovers_after_transient_scanner_failure` | PASS |
| 24 | Temporary file cleanup | `test_24_quarantine_cleanup_command_purges_expired_files` | PASS |
| 25 | Unauthorized quarantine access | `test_25_quarantined_and_pending_files_cannot_be_downloaded` | PASS |
| 26 | Direct public access before approval | `test_26_async_pending_upload_is_not_publicly_accessible_before_clean_approval` | PASS |
| 27 | File replacement after scanning | `test_27_file_replacement_preserves_original_when_new_file_fails_and_cleans_old_on_success` | PASS |
| 28 | Duplicate processing (idempotency) | `test_28_duplicate_job_processing_is_idempotent` | PASS |
| 29 | Database/storage consistency | `test_29_database_storage_consistency_on_toctou_and_db_failure` | PASS |
| + | Audit log bebas secret | `test_audit_logs_never_expose_secrets_or_file_contents` | PASS |

---

## 3. Pengujian yang Tidak Dapat Dijalankan Secara Lokal

- **Live ClamAV Daemon / CLI Scan (`clamd` / `clamscan`):** Binary ClamAV tidak terpasang pada host Windows lokal (`Get-Command clamscan, clamdscan, clamd` tidak menemukan binary). Perilaku fail-closed `ClamAvScanner` saat tidak tersedia telah diverifikasi langsung (`test_clamav_scanner_fails_closed_when_unavailable`), sedangkan pemindaian malware end-to-end dengan signature asli `clamd` perlu diverifikasi di server Linux produksi setelah `clamav-daemon` dan `freshclam` aktif.

---

## 4. Residual Risks & Tindakan Manual Produksi

1. **ClamAV di Produksi:** Karena `UPLOAD_SCANNER_DRIVER=clamav` bersifat fail-closed, apabila `clamd` / `clamscan` belum terpasang di server produksi, seluruh upload akan ditolak dengan HTTP `503` sampai daemon ClamAV dijalankan dan signature `freshclam` diperbarui.
2. **Migrasi Database:** Jalankan `php artisan migrate --force` (otomatis di `deploy/deploy.sh`) agar tabel `secure_uploads`, `secure_upload_audit_logs`, dan kolom `firmware_releases` tersedia.
3. **Konfigurasi Web Server:** Terapkan `deploy/nginx-upload-hardening.conf.example` dan `deploy/php-uploads.ini.example` pada host produksi.
