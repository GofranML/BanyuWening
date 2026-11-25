<?php

namespace Tests\Unit;

use App\Services\Upload\Exceptions\FileValidationException;
use App\Services\Upload\FileSecurityInspector;
use App\Services\Upload\Scanners\ClamAvScanner;
use App\Services\Upload\Scanners\FakeMalwareScanner;
use App\Services\Upload\ScanResult;
use Tests\TestCase;

class FileSecurityInspectorTest extends TestCase
{
    private array $tempFiles = [];

    protected function tearDown(): void
    {
        FakeMalwareScanner::reset();
        foreach ($this->tempFiles as $file) {
            if (is_file($file)) {
                @unlink($file);
            }
        }
        parent::tearDown();
    }

    private function writeTemp(string $content): string
    {
        $path = tempnam(sys_get_temp_dir(), 'bw_unit_');
        file_put_contents($path, $content);
        $this->tempFiles[] = $path;

        return $path;
    }

    /**
     * Build a minimal valid ZIP binary from [name => content] or custom Central Directory overrides.
     *
     * @param  array<int, array{name: string, content: string, uncompSizeOverride?: int, compSizeOverride?: int}>  $entries
     */
    private function buildZip(array $entries): string
    {
        $localData = '';
        $centralDir = '';
        $offset = 0;

        foreach ($entries as $entry) {
            $name = $entry['name'];
            $content = $entry['content'];
            $compressed = gzdeflate($content, 9);
            $crc = crc32($content);
            $compLen = $entry['compSizeOverride'] ?? strlen($compressed);
            $uncompLen = $entry['uncompSizeOverride'] ?? strlen($content);

            $localHeader = pack(
                'VvvvvvVVVvv',
                0x04034B50,
                20,
                0,
                8,
                0,
                0,
                $crc,
                strlen($compressed),
                strlen($content),
                strlen($name),
                0
            ).$name.$compressed;

            $centralHeader = pack(
                'VvvvvvvVVVvvvvvVV',
                0x02014B50,
                20,
                20,
                0,
                8,
                0,
                0,
                $crc,
                $compLen,
                $uncompLen,
                strlen($name),
                0,
                0,
                0,
                0,
                0,
                $offset
            ).$name;

            $localData .= $localHeader;
            $centralDir .= $centralHeader;
            $offset += strlen($localHeader);
        }

        $eocd = pack(
            'VvvvvVVv',
            0x06054B50,
            0,
            0,
            count($entries),
            count($entries),
            strlen($centralDir),
            $offset,
            0
        );

        return $localData.$centralDir.$eocd;
    }

    public function test_zip_bomb_high_compression_ratio_is_blocked(): void
    {
        $inspector = app(FileSecurityInspector::class);
        $zipBytes = $this->buildZip([
            [
                'name' => 'report.txt',
                'content' => 'small',
                'compSizeOverride' => 10,
                'uncompSizeOverride' => 5000000, // 500,000x ratio
            ],
        ]);
        $path = $this->writeTemp($zipBytes);

        $this->expectException(FileValidationException::class);
        $inspector->inspect($path, 'bomb.zip', 'tenant_document');
    }

    public function test_zip_with_path_traversal_or_php_entry_is_blocked(): void
    {
        $inspector = app(FileSecurityInspector::class);

        $traversalZip = $this->writeTemp($this->buildZip([
            ['name' => '../../etc/passwd.txt', 'content' => 'root:x:0:0'],
        ]));

        try {
            $inspector->inspect($traversalZip, 'traversal.zip', 'tenant_document');
            $this->fail('Expected path traversal in ZIP to throw.');
        } catch (FileValidationException $e) {
            $this->assertSame('ARCHIVE_PATH_TRAVERSAL', $e->errorCode());
        }

        $phpZip = $this->writeTemp($this->buildZip([
            ['name' => 'shell.php', 'content' => 'hello'],
        ]));

        try {
            $inspector->inspect($phpZip, 'payload.zip', 'tenant_document');
            $this->fail('Expected dangerous PHP member in ZIP to throw.');
        } catch (FileValidationException $e) {
            $this->assertSame('ARCHIVE_DANGEROUS_ENTRY', $e->errorCode());
        }

        $nestedZip = $this->writeTemp($this->buildZip([
            ['name' => 'inner.zip', 'content' => 'PK'],
        ]));

        try {
            $inspector->inspect($nestedZip, 'nested.zip', 'tenant_document');
            $this->fail('Expected nested archive in ZIP to throw.');
        } catch (FileValidationException $e) {
            $this->assertSame('ARCHIVE_NESTED_BLOCKED', $e->errorCode());
        }
    }

    public function test_valid_clean_zip_passes_inspection(): void
    {
        $inspector = app(FileSecurityInspector::class);
        $zipPath = $this->writeTemp($this->buildZip([
            ['name' => 'pond_log.csv', 'content' => "ts,ph,temp\n2026-11-25,7.2,28.5\n"],
        ]));

        $result = $inspector->inspect($zipPath, 'pond_logs.zip', 'tenant_document');
        $this->assertSame('zip', $result->extension);
        $this->assertSame(1, $result->metadata['zip_entries']);
    }

    public function test_malicious_pdf_with_javascript_action_is_blocked(): void
    {
        $inspector = app(FileSecurityInspector::class);
        $maliciousPdf = "%PDF-1.7\n1 0 obj\n<< /Type /Catalog /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>\nendobj\n%%EOF";
        $path = $this->writeTemp($maliciousPdf);

        $this->expectException(FileValidationException::class);
        $inspector->inspect($path, 'report.pdf', 'tenant_document');
    }

    public function test_clamav_scanner_fails_closed_when_unavailable(): void
    {
        config()->set('uploads.scanner.clamav.mode', 'daemon');
        config()->set('uploads.scanner.clamav.host', '127.0.0.1');
        config()->set('uploads.scanner.clamav.port', 65431);

        $path = $this->writeTemp('safe content');
        $scanner = new ClamAvScanner;
        $result = $scanner->scan($path);

        $this->assertSame(ScanResult::STATUS_UNAVAILABLE, $result->status);
        $this->assertTrue($result->isFailure());
        $this->assertFalse($result->isClean());
    }

    public function test_fake_scanner_refuses_to_run_in_production_environment(): void
    {
        $originalEnv = $this->app['env'];
        $this->app['env'] = 'production';

        try {
            $path = $this->writeTemp('safe content');
            $scanner = new FakeMalwareScanner;
            $result = $scanner->scan($path);

            $this->assertSame(ScanResult::STATUS_UNAVAILABLE, $result->status);
            $this->assertFalse($result->isClean());
            $this->assertFalse($scanner->health()['available']);
        } finally {
            $this->app['env'] = $originalEnv;
        }
    }
}
