<?php

namespace Tests\Feature;

use App\Enums\UploadStatus;
use App\Jobs\ScanAndPromoteUploadJob;
use App\Models\Device;
use App\Models\SecureUpload;
use App\Models\SecureUploadAuditLog;
use App\Models\User;
use App\Services\Upload\Exceptions\ScannerTransientException;
use App\Services\Upload\Scanners\FakeMalwareScanner;
use App\Services\Upload\SecureFileUploadService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class SecureFileUploadPipelineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        FakeMalwareScanner::reset();
        Storage::fake('quarantine');
        Storage::fake('landing_public');
        Storage::fake('firmware_private');
        Storage::fake('private_uploads');
        config()->set('uploads.scanner.driver', 'fake');
        config()->set('uploads.async_scan', false);
    }

    protected function tearDown(): void
    {
        FakeMalwareScanner::reset();
        parent::tearDown();
    }

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin Upload',
            'email' => 'admin-up-'.uniqid().'@banyuwening.test',
            'password' => Hash::make('AdminUpload#2026'),
            'role' => 'ADMIN',
            'pond_name' => 'Kolam Utama',
            'tenant_code' => null,
        ]);
    }

    private function operator(string $tenant): User
    {
        return User::create([
            'name' => 'Operator '.$tenant,
            'email' => 'op-'.uniqid().'@banyuwening.test',
            'password' => Hash::make('OpUpload#2026'),
            'role' => 'OPERATOR',
            'pond_name' => 'Kolam '.$tenant,
            'tenant_code' => $tenant,
        ]);
    }

    private function validPdfBytes(): string
    {
        return "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n";
    }

    // 1. Valid image upload
    public function test_01_valid_image_upload_succeeds_and_is_audited(): void
    {
        $admin = $this->admin();
        $img = UploadedFile::fake()->image('kolam_lele.png', 200, 150);

        $res = $this->actingAs($admin)->postJson('/dashboard/landing-media/upload', ['file' => $img]);
        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('status', 'CLEAN');

        $upload = SecureUpload::where('uuid', $res->json('upload_id'))->firstOrFail();
        $this->assertSame(UploadStatus::CLEAN, $upload->status);
        $this->assertTrue(Storage::disk('landing_public')->exists($upload->permanent_path));
        $this->assertNull($upload->quarantine_path);

        $this->assertDatabaseHas('secure_upload_audit_logs', [
            'secure_upload_id' => $upload->id,
            'event' => 'PROMOTED',
            'promotion_result' => 'PROMOTED',
        ]);
    }

    // 2. Fake extension
    public function test_02_fake_extension_is_rejected(): void
    {
        $admin = $this->admin();
        $fake = UploadedFile::fake()->createWithContent('fake.jpg', 'plain text disguised as jpeg');

        $this->actingAs($admin)
            ->postJson('/dashboard/landing-media/upload', ['file' => $fake])
            ->assertStatus(422);
    }

    // 3. MIME mismatch
    public function test_03_mime_mismatch_is_rejected(): void
    {
        $admin = $this->admin();
        $pdfAsJpg = UploadedFile::fake()->createWithContent('doc.jpg', $this->validPdfBytes());

        $this->actingAs($admin)
            ->postJson('/dashboard/landing-media/upload', ['file' => $pdfAsJpg])
            ->assertStatus(422)
            ->assertJsonPath('error', 'MIME_EXTENSION_MISMATCH');
    }

    // 4. Invalid magic bytes
    public function test_04_invalid_magic_bytes_is_rejected(): void
    {
        $op = $this->operator('TENANT-A');
        $fakePng = UploadedFile::fake()->createWithContent('bad.png', str_repeat('NOTAPNG', 20));

        $this->actingAs($op)
            ->postJson('/dashboard/uploads', ['file' => $fakePng, 'profile' => 'tenant_document'])
            ->assertStatus(422);
    }

    // 5. Double extension
    public function test_05_double_extension_is_blocked(): void
    {
        $admin = $this->admin();
        $validImg = UploadedFile::fake()->image('innocent.png', 50, 50);
        $doubleExt = new UploadedFile(
            $validImg->getRealPath(),
            'shell.php.png',
            'image/png',
            null,
            true
        );

        $this->actingAs($admin)
            ->postJson('/dashboard/landing-media/upload', ['file' => $doubleExt])
            ->assertStatus(422)
            ->assertJsonPath('error', 'DOUBLE_EXTENSION_BLOCKED');
    }

    // 6. PHP payload
    public function test_06_php_payload_is_blocked_on_all_endpoints(): void
    {
        $admin = $this->admin();
        $php = UploadedFile::fake()->createWithContent('shell.php', '<?php system($_GET["c"]); ?>');
        $phpBin = UploadedFile::fake()->createWithContent('fw.bin', '<?php phpinfo(); ?>');

        $this->actingAs($admin)->postJson('/dashboard/landing-media/upload', ['file' => $php])->assertStatus(422);
        $this->actingAs($admin)->postJson('/dashboard/ota/releases', [
            'version' => 'v9.9.9-php',
            'channel' => 'stable',
            'firmware_file' => $phpBin,
        ])->assertStatus(422);
    }

    // 7. SVG payload
    public function test_07_svg_payload_is_blocked(): void
    {
        $admin = $this->admin();
        $svg = UploadedFile::fake()->createWithContent('xss.svg', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');

        $this->actingAs($admin)
            ->postJson('/dashboard/landing-media/upload', ['file' => $svg])
            ->assertStatus(422);
    }

    // 8. HTML/script payload
    public function test_08_html_and_script_payload_is_blocked(): void
    {
        $op = $this->operator('TENANT-A');
        $htmlTxt = UploadedFile::fake()->createWithContent('note.txt', '<html><body><script>alert(1)</script></body></html>');

        $this->actingAs($op)
            ->postJson('/dashboard/uploads', ['file' => $htmlTxt, 'profile' => 'tenant_document'])
            ->assertStatus(422);
    }

    // 9. Polyglot file (payload past 8KB tail of valid PNG)
    public function test_09_polyglot_image_with_payload_past_8kb_is_blocked(): void
    {
        $admin = $this->admin();
        $baseImg = UploadedFile::fake()->image('clean.png', 100, 100);
        $rawBytes = file_get_contents($baseImg->getRealPath());
        $polyglotBytes = $rawBytes.str_repeat("\x00", 9000).'<?php system($_GET["cmd"]); ?>';
        $polyglot = UploadedFile::fake()->createWithContent('polyglot.png', $polyglotBytes);

        $this->actingAs($admin)
            ->postJson('/dashboard/landing-media/upload', ['file' => $polyglot])
            ->assertStatus(422);
    }

    // 10. Oversized file (422 profile limit + 413 Content-Length middleware)
    public function test_10_oversized_file_and_request_limit_are_rejected(): void
    {
        $op = $this->operator('TENANT-A');
        config()->set('uploads.profiles.tenant_document.max_bytes', 1024);
        $bigTxt = UploadedFile::fake()->createWithContent('big.txt', str_repeat('A', 2048));

        $this->actingAs($op)
            ->postJson('/dashboard/uploads', ['file' => $bigTxt, 'profile' => 'tenant_document'])
            ->assertStatus(422)
            ->assertJsonPath('error', 'FILE_TOO_LARGE');

        $this->actingAs($op)
            ->withServerVariables([
                'CONTENT_LENGTH' => (string) (60 * 1024 * 1024),
                'HTTP_CONTENT_LENGTH' => (string) (60 * 1024 * 1024),
            ])
            ->post('/dashboard/uploads', ['file' => $bigTxt, 'profile' => 'tenant_document'], ['Accept' => 'application/json'])
            ->assertStatus(413)
            ->assertJsonPath('error', 'PAYLOAD_TOO_LARGE');
    }

    // 11. Empty file
    public function test_11_empty_file_is_rejected(): void
    {
        $admin = $this->admin();
        $empty = UploadedFile::fake()->createWithContent('empty.png', '');

        $this->actingAs($admin)
            ->postJson('/dashboard/landing-media/upload', ['file' => $empty])
            ->assertStatus(422);
    }

    // 12. Corrupted image
    public function test_12_corrupted_image_with_valid_magic_header_is_rejected(): void
    {
        $admin = $this->admin();
        $corruptPng = UploadedFile::fake()->createWithContent('corrupt.png', "\x89PNG\r\n\x1A\nCORRUPTED_BYTES_HERE");

        $this->actingAs($admin)
            ->postJson('/dashboard/landing-media/upload', ['file' => $corruptPng])
            ->assertStatus(422);
    }

    // 13. Malformed document
    public function test_13_malformed_and_scripted_pdf_is_rejected(): void
    {
        $op = $this->operator('TENANT-A');
        $badPdf = UploadedFile::fake()->createWithContent('broken.pdf', "%PDF-1.4\nNOT_A_VALID_PDF_BODY");

        $this->actingAs($op)
            ->postJson('/dashboard/uploads', ['file' => $badPdf, 'profile' => 'tenant_document'])
            ->assertStatus(422)
            ->assertJsonPath('error', 'MALFORMED_DOCUMENT');
    }

    // 14. Path traversal
    public function test_14_path_traversal_filename_is_rejected(): void
    {
        $op = $this->operator('TENANT-A');
        $txt = UploadedFile::fake()->createWithContent('ok.txt', 'hello');
        $traversal = new UploadedFile($txt->getRealPath(), 'evil..txt', 'text/plain', null, true);

        $this->actingAs($op)
            ->postJson('/dashboard/uploads', ['file' => $traversal, 'profile' => 'tenant_document'])
            ->assertStatus(422)
            ->assertJsonPath('error', 'PATH_TRAVERSAL_FILENAME');
    }

    // 15. Archive bomb protection
    public function test_15_archive_bomb_is_blocked_at_upload_endpoint(): void
    {
        $op = $this->operator('TENANT-A');
        $content = 'A';
        $compressed = gzdeflate($content, 9);
        $crc = crc32($content);
        $name = 'bomb.txt';
        $local = pack('VvvvvvVVVvv', 0x04034B50, 20, 0, 8, 0, 0, $crc, strlen($compressed), 1, strlen($name), 0).$name.$compressed;
        $central = pack('VvvvvvvVVVvvvvvVV', 0x02014B50, 20, 20, 0, 8, 0, 0, $crc, 10, 5000000, strlen($name), 0, 0, 0, 0, 0, 0).$name;
        $eocd = pack('VvvvvVVv', 0x06054B50, 0, 0, 1, 1, strlen($central), strlen($local), 0);
        $bombZip = UploadedFile::fake()->createWithContent('bomb.zip', $local.$central.$eocd);

        $this->actingAs($op)
            ->postJson('/dashboard/uploads', ['file' => $bombZip, 'profile' => 'tenant_document'])
            ->assertStatus(422)
            ->assertJsonPath('error', 'ARCHIVE_BOMB_DETECTED');
    }

    // 16. Malware scanning (EICAR / Infected simulation)
    public function test_16_eicar_malware_is_quarantined_and_never_promoted(): void
    {
        FakeMalwareScanner::setForcedBehavior('infected');
        $op = $this->operator('TENANT-A');
        $eicar = UploadedFile::fake()->createWithContent('eicar.txt', 'simulated infected payload');

        $res = $this->actingAs($op)
            ->postJson('/dashboard/uploads', ['file' => $eicar, 'profile' => 'tenant_document']);

        $res->assertStatus(422)
            ->assertJsonPath('error', 'QUARANTINED');

        $upload = SecureUpload::where('uuid', $res->json('upload.id'))->firstOrFail();
        $this->assertSame(UploadStatus::QUARANTINED, $upload->status);
        $this->assertNull($upload->permanent_path);
        $this->assertNotNull($upload->quarantine_path);
        $this->assertTrue(Storage::disk('quarantine')->exists($upload->quarantine_path));
        $this->assertSame('Simulated.Malware.Test', $upload->scan_signature);
    }

    // 17. Unauthorized upload
    public function test_17_unauthorized_users_cannot_upload(): void
    {
        $img = UploadedFile::fake()->image('pic.png', 50, 50);
        $bin = UploadedFile::fake()->createWithContent('fw.bin', str_repeat('FW', 32));

        $this->postJson('/dashboard/landing-media/upload', ['file' => $img])->assertStatus(401);
        $this->postJson('/dashboard/uploads', ['file' => $img])->assertStatus(401);

        $operatorWithDocs = User::create([
            'name' => 'Op Docs',
            'email' => 'op-docs-'.uniqid().'@banyuwening.test',
            'password' => Hash::make('OpDocs#2026'),
            'role' => 'OPERATOR',
            'tenant_code' => 'TENANT-A',
            'custom_permissions' => ['view_docs_api' => true],
        ]);

        $this->actingAs($operatorWithDocs)
            ->postJson('/dashboard/landing-media/upload', ['file' => $img])
            ->assertStatus(403);

        $this->actingAs($operatorWithDocs)
            ->postJson('/dashboard/ota/releases', [
                'version' => 'v1.9.9-unauth',
                'channel' => 'stable',
                'firmware_file' => $bin,
            ])
            ->assertStatus(403);
    }

    // 18. Cross-tenant upload
    public function test_18_cross_tenant_upload_is_blocked(): void
    {
        $opA = $this->operator('TENANT-ALPHA');
        $pdf = UploadedFile::fake()->createWithContent('doc.pdf', $this->validPdfBytes());

        $this->actingAs($opA)->postJson('/dashboard/uploads', [
            'file' => $pdf,
            'profile' => 'tenant_document',
            'tenant_code' => 'TENANT-BETA',
        ])->assertStatus(403);
    }

    // 19. Cross-tenant download
    public function test_19_cross_tenant_download_is_blocked_and_audited(): void
    {
        $opA = $this->operator('TENANT-ALPHA');
        $opB = $this->operator('TENANT-BETA');
        $pdf = UploadedFile::fake()->createWithContent('alpha_doc.pdf', $this->validPdfBytes());

        $up = $this->actingAs($opA)->postJson('/dashboard/uploads', [
            'file' => $pdf,
            'profile' => 'tenant_document',
        ])->assertStatus(201);

        $uuid = $up->json('upload.id');

        $this->actingAs($opB)->getJson("/dashboard/uploads/{$uuid}")->assertStatus(403);
        $this->actingAs($opB)->get("/dashboard/uploads/{$uuid}/download")->assertStatus(403);
        $this->actingAs($opB)->deleteJson("/dashboard/uploads/{$uuid}")->assertStatus(403);

        $this->assertDatabaseHas('secure_upload_audit_logs', [
            'upload_uuid' => $uuid,
            'user_id' => $opB->id,
            'event' => 'ACCESS_DENIED',
        ]);
    }

    // 20. Concurrent upload / lock protection
    public function test_20_concurrent_processing_respects_cache_lock(): void
    {
        config()->set('uploads.async_scan', true);
        config()->set('queue.default', 'database');
        $op = $this->operator('TENANT-A');
        $pdf = UploadedFile::fake()->createWithContent('concurrent.pdf', $this->validPdfBytes());

        $res = $this->actingAs($op)->postJson('/dashboard/uploads', [
            'file' => $pdf,
            'profile' => 'tenant_document',
        ])->assertStatus(202);

        $upload = SecureUpload::where('uuid', $res->json('upload.id'))->firstOrFail();
        $lock = Cache::lock("secure-upload:process:{$upload->uuid}", 60);
        $this->assertTrue($lock->get());

        try {
            $result = app(SecureFileUploadService::class)->processScanAndPromote($upload);
            $this->assertSame(UploadStatus::PENDING_SCAN, $result->status);
        } finally {
            $lock->release();
        }
    }

    // 21. Scanner timeout
    public function test_21_scanner_timeout_fails_closed(): void
    {
        FakeMalwareScanner::setForcedBehavior('timeout');
        $admin = $this->admin();
        $img = UploadedFile::fake()->image('timeout.png', 60, 60);

        $res = $this->actingAs($admin)
            ->postJson('/dashboard/landing-media/upload', ['file' => $img]);

        $res->assertStatus(503)->assertJsonPath('error', 'SCAN_FAILED');
        $upload = SecureUpload::where('uuid', $res->json('upload_id'))->firstOrFail();
        $this->assertSame(UploadStatus::SCAN_FAILED, $upload->status);
        $this->assertNull($upload->public_url);
        $this->assertEmpty(Storage::disk('landing_public')->allFiles());
    }

    // 22. Scanner unavailable
    public function test_22_scanner_unavailable_fails_closed(): void
    {
        FakeMalwareScanner::setForcedBehavior('unavailable');
        $admin = $this->admin();
        $bin = UploadedFile::fake()->createWithContent('fw.bin', str_repeat('ESP32_FW', 32));

        $res = $this->actingAs($admin)->postJson('/dashboard/ota/releases', [
            'version' => 'v2.0.0-failclosed',
            'channel' => 'stable',
            'firmware_file' => $bin,
        ]);

        $res->assertStatus(503)->assertJsonPath('error', 'SCAN_FAILED');
        $this->assertDatabaseMissing('firmware_releases', ['version' => 'v2.0.0-failclosed']);
    }

    // 23. Queue retry
    public function test_23_queue_retry_recovers_after_transient_scanner_failure(): void
    {
        config()->set('uploads.async_scan', true);
        config()->set('queue.default', 'database');
        FakeMalwareScanner::setForcedBehavior('fail_once_then_clean');

        $op = $this->operator('TENANT-A');
        $pdf = UploadedFile::fake()->createWithContent('retry.pdf', $this->validPdfBytes());
        $res = $this->actingAs($op)->postJson('/dashboard/uploads', [
            'file' => $pdf,
            'profile' => 'tenant_document',
        ])->assertStatus(202);

        $upload = SecureUpload::where('uuid', $res->json('upload.id'))->firstOrFail();
        $service = app(SecureFileUploadService::class);

        try {
            $service->processScanAndPromote($upload, true);
            $this->fail('Expected transient exception on first attempt.');
        } catch (ScannerTransientException) {
            // Expected on attempt 1; quarantine file preserved for retry
        }

        $this->assertSame(UploadStatus::SCAN_FAILED, $upload->fresh()->status);
        $this->assertTrue(Storage::disk('quarantine')->exists($upload->fresh()->quarantine_path));

        // Second attempt succeeds
        $promoted = $service->processScanAndPromote($upload->fresh(), false);
        $this->assertSame(UploadStatus::CLEAN, $promoted->status);
        $this->assertTrue(Storage::disk('private_uploads')->exists($promoted->permanent_path));
    }

    // 24. Temporary file cleanup
    public function test_24_quarantine_cleanup_command_purges_expired_files(): void
    {
        $op = $this->operator('TENANT-A');
        $rel = 'pending/expired-test.part';
        Storage::disk('quarantine')->put($rel, 'stale temp bytes');

        $expired = SecureUpload::create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $op->id,
            'tenant_code' => 'TENANT-A',
            'profile' => 'tenant_document',
            'status' => UploadStatus::PENDING_SCAN,
            'original_name_sanitized' => 'stale.pdf',
            'quarantine_disk' => 'quarantine',
            'quarantine_path' => $rel,
            'file_size_bytes' => 16,
            'sha256_hash' => hash('sha256', 'stale temp bytes'),
            'expires_at' => now()->subMinutes(10),
        ]);

        $this->artisan('uploads:cleanup-quarantine')->assertExitCode(0);

        $this->assertFalse(Storage::disk('quarantine')->exists($rel));
        $this->assertNull($expired->fresh()->quarantine_path);
        $this->assertSame(UploadStatus::SCAN_FAILED, $expired->fresh()->status);
    }

    // 25. Unauthorized quarantine access
    public function test_25_quarantined_and_pending_files_cannot_be_downloaded(): void
    {
        FakeMalwareScanner::setForcedBehavior('infected');
        $op = $this->operator('TENANT-A');
        $eicar = UploadedFile::fake()->createWithContent('bad.txt', 'simulated infected payload');

        $res = $this->actingAs($op)
            ->postJson('/dashboard/uploads', ['file' => $eicar, 'profile' => 'tenant_document'])
            ->assertStatus(422);

        $uuid = $res->json('upload.id');
        $this->actingAs($op)->get("/dashboard/uploads/{$uuid}/download")->assertStatus(403);
    }

    // 26. Direct public access before approval
    public function test_26_async_pending_upload_is_not_publicly_accessible_before_clean_approval(): void
    {
        config()->set('uploads.async_scan', true);
        config()->set('queue.default', 'database');
        $admin = $this->admin();
        $img = UploadedFile::fake()->image('pending.png', 80, 80);

        $res = $this->actingAs($admin)->postJson('/dashboard/landing-media/upload', ['file' => $img]);
        $res->assertStatus(202)
            ->assertJsonPath('pending', true)
            ->assertJsonPath('url', null)
            ->assertJsonPath('status', 'PENDING_SCAN');

        $this->assertEmpty(Storage::disk('landing_public')->allFiles());

        // Also verify OTA firmware in PENDING_SCAN cannot be downloaded by device
        $device = Device::create([
            'device_code' => 'ESP32-GATE-01',
            'name' => 'Gate Node',
            'pond_name' => 'Kolam Gate',
            'tenant_code' => 'TENANT-UTAMA',
            'hardware_profile' => 'ESP32-WROOM-CoreHub-v2',
        ]);
        $token = $device->issueToken();

        $bin = UploadedFile::fake()->createWithContent('pending.bin', str_repeat('ESP32_FRAME', 32));
        $fwRes = $this->actingAs($admin)->postJson('/dashboard/ota/releases', [
            'version' => 'v2.5.0-pending',
            'channel' => 'stable',
            'firmware_file' => $bin,
        ])->assertStatus(202);

        $this->withToken($token)->getJson('/api/http/ota/download/v2.5.0-pending')->assertStatus(404);

        // Now run the scan job -> promoted and downloadable
        $fwUpload = SecureUpload::where('uuid', $fwRes->json('upload_id'))->firstOrFail();
        ScanAndPromoteUploadJob::dispatchSync($fwUpload->id);

        $this->withToken($token)->get('/api/http/ota/download/v2.5.0-pending')->assertStatus(200);
    }

    // 27. File replacement after scanning
    public function test_27_file_replacement_preserves_original_when_new_file_fails_and_cleans_old_on_success(): void
    {
        $op = $this->operator('TENANT-A');
        $v1 = UploadedFile::fake()->createWithContent('v1.pdf', $this->validPdfBytes());
        $up1 = $this->actingAs($op)->postJson('/dashboard/uploads', [
            'file' => $v1,
            'profile' => 'tenant_document',
        ])->assertStatus(201);

        $uuid1 = $up1->json('upload.id');
        $upload1 = SecureUpload::where('uuid', $uuid1)->firstOrFail();
        $oldPath = $upload1->permanent_path;

        // Malicious replacement fails and leaves original intact
        FakeMalwareScanner::setForcedBehavior('infected');
        $badReplacement = UploadedFile::fake()->createWithContent('bad.txt', 'simulated infected payload');
        $this->actingAs($op)->postJson("/dashboard/uploads/{$uuid1}/replace", ['file' => $badReplacement])
            ->assertStatus(422);
        $this->assertTrue(Storage::disk('private_uploads')->exists($oldPath));
        FakeMalwareScanner::reset();

        // Clean replacement promotes and removes old file
        $v2 = UploadedFile::fake()->createWithContent('v2.pdf', $this->validPdfBytes()."\n% v2");
        $rep = $this->actingAs($op)->postJson("/dashboard/uploads/{$uuid1}/replace", ['file' => $v2])
            ->assertStatus(201);

        $upload2 = SecureUpload::where('uuid', $rep->json('upload.id'))->firstOrFail();
        $this->assertTrue(Storage::disk('private_uploads')->exists($upload2->permanent_path));
        $this->assertFalse(Storage::disk('private_uploads')->exists($oldPath));
    }

    // 28. Duplicate processing (idempotency)
    public function test_28_duplicate_job_processing_is_idempotent(): void
    {
        $op = $this->operator('TENANT-A');
        $pdf = UploadedFile::fake()->createWithContent('idem.pdf', $this->validPdfBytes());
        $res = $this->actingAs($op)->postJson('/dashboard/uploads', [
            'file' => $pdf,
            'profile' => 'tenant_document',
        ])->assertStatus(201);

        $upload = SecureUpload::where('uuid', $res->json('upload.id'))->firstOrFail();
        $attemptsBefore = $upload->scan_attempts;

        // Re-running job must be a no-op
        ScanAndPromoteUploadJob::dispatchSync($upload->id);
        $this->assertSame($attemptsBefore, $upload->fresh()->scan_attempts);
        $this->assertSame(UploadStatus::CLEAN, $upload->fresh()->status);
    }

    // 29. Database / storage consistency (TOCTOU + DB failure rollback)
    public function test_29_database_storage_consistency_on_toctou_and_db_failure(): void
    {
        config()->set('uploads.async_scan', true);
        config()->set('queue.default', 'database');
        $op = $this->operator('TENANT-A');
        $pdf = UploadedFile::fake()->createWithContent('toctou.pdf', $this->validPdfBytes());
        $res = $this->actingAs($op)->postJson('/dashboard/uploads', [
            'file' => $pdf,
            'profile' => 'tenant_document',
        ])->assertStatus(202);

        $upload = SecureUpload::where('uuid', $res->json('upload.id'))->firstOrFail();

        // Tamper quarantine file before scan -> TOCTOU rejected
        Storage::disk('quarantine')->put($upload->quarantine_path, 'TAMPERED');
        $processed = app(SecureFileUploadService::class)->processScanAndPromote($upload);
        $this->assertSame(UploadStatus::REJECTED, $processed->status);
        $this->assertEmpty(Storage::disk('private_uploads')->allFiles());

        // Simulate DB failure during promotion -> permanent file must be rolled back
        $pdf2 = UploadedFile::fake()->createWithContent('rollback.pdf', $this->validPdfBytes());
        $res2 = $this->actingAs($op)->postJson('/dashboard/uploads', [
            'file' => $pdf2,
            'profile' => 'tenant_document',
        ])->assertStatus(202);
        $upload2 = SecureUpload::where('uuid', $res2->json('upload.id'))->firstOrFail();

        // Force DB failure when updating firmware_releases by pointing metadata to non-existent column or trigger listener
        DB::listen(function ($query) {
            if (str_contains($query->sql, 'update "secure_uploads"') && str_contains($query->sql, '"promoted_at"')) {
                throw new \RuntimeException('Simulated DB commit failure');
            }
        });

        try {
            app(SecureFileUploadService::class)->processScanAndPromote($upload2);
            $this->fail('Expected simulated DB failure.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('Simulated DB commit failure', $e->getMessage());
        }

        $this->assertEmpty(Storage::disk('private_uploads')->allFiles());
    }

    public function test_audit_logs_never_expose_secrets_or_file_contents(): void
    {
        $op = $this->operator('TENANT-A');
        $secretContent = 'SECRET_API_TOKEN_DO_NOT_LOG';
        $txt = UploadedFile::fake()->createWithContent('secret.txt', $secretContent);

        $this->actingAs($op)->postJson('/dashboard/uploads', [
            'file' => $txt,
            'profile' => 'tenant_document',
        ])->assertStatus(201);

        $allLogs = json_encode(SecureUploadAuditLog::all()->toArray());
        $this->assertStringNotContainsString($secretContent, (string) $allLogs);
        $this->assertStringNotContainsString((string) config('app.key'), (string) $allLogs);
    }
}
