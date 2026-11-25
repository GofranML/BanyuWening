<?php

namespace App\Services\Upload\Scanners;

use App\Services\Upload\Contracts\MalwareScannerInterface;
use App\Services\Upload\ScanResult;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;

class ClamAvScanner implements MalwareScannerInterface
{
    public function scan(string $absoluteFilePath): ScanResult
    {
        $start = microtime(true);

        if (! is_file($absoluteFilePath) || ! is_readable($absoluteFilePath)) {
            return ScanResult::error('clamav', null, $this->elapsedMs($start), 'File karantina tidak dapat dibaca untuk pemindaian.');
        }

        $maxScanBytes = (int) config('uploads.scanner.max_scan_bytes', 52428800);
        $size = filesize($absoluteFilePath);
        if ($size === false || $size > $maxScanBytes) {
            return ScanResult::error('clamav', null, $this->elapsedMs($start), 'Ukuran file melebihi batas pemindaian scanner.');
        }

        $cfg = config('uploads.scanner.clamav', []);
        $mode = strtolower((string) ($cfg['mode'] ?? 'auto'));
        $timeout = max(1, (int) config('uploads.scanner.timeout_seconds', 30));

        if ($mode === 'daemon') {
            return $this->scanViaDaemon($absoluteFilePath, $cfg, $timeout, $start);
        }

        if ($mode === 'cli') {
            return $this->scanViaCli($absoluteFilePath, $cfg, $timeout, $start);
        }

        // Auto mode: try clamd socket/TCP first, then CLI binary, fail closed if neither is available.
        $daemonResult = $this->scanViaDaemon($absoluteFilePath, $cfg, $timeout, $start);
        if ($daemonResult->status !== ScanResult::STATUS_UNAVAILABLE) {
            return $daemonResult;
        }

        return $this->scanViaCli($absoluteFilePath, $cfg, $timeout, $start);
    }

    public function health(): array
    {
        $cfg = config('uploads.scanner.clamav', []);
        $mode = strtolower((string) ($cfg['mode'] ?? 'auto'));

        if ($this->pingDaemon($cfg, 2)) {
            return [
                'driver' => 'clamav',
                'available' => true,
                'version' => $this->resolveDaemonVersion($cfg),
                'mode' => 'daemon',
            ];
        }

        foreach ([$cfg['binary'] ?? 'clamdscan', $cfg['fallback_binary'] ?? 'clamscan'] as $bin) {
            if (! $bin) {
                continue;
            }
            try {
                $proc = new Process([(string) $bin, '--version']);
                $proc->setTimeout(3);
                $proc->run();
                if ($proc->isSuccessful()) {
                    return [
                        'driver' => 'clamav',
                        'available' => true,
                        'version' => trim($proc->getOutput()) ?: 'clamav-cli',
                        'mode' => 'cli',
                    ];
                }
            } catch (\Throwable) {
                // ignore and try next
            }
        }

        return [
            'driver' => 'clamav',
            'available' => false,
            'version' => null,
            'mode' => $mode,
        ];
    }

    /**
     * @param  array<string, mixed>  $cfg
     */
    private function scanViaDaemon(string $filePath, array $cfg, int $timeout, float $start): ScanResult
    {
        $target = $this->daemonEndpoint($cfg);
        $errno = 0;
        $errstr = '';

        $socket = @stream_socket_client($target, $errno, $errstr, min(5, $timeout));
        if ($socket === false) {
            return ScanResult::unavailable(
                'clamd',
                null,
                $this->elapsedMs($start),
                "Daemon ClamAV tidak terjangkau ({$target}): {$errstr}"
            );
        }

        $version = null;

        try {
            stream_set_timeout($socket, $timeout);

            if (fwrite($socket, "zINSTREAM\0") === false) {
                return ScanResult::error('clamd', $version, $this->elapsedMs($start), 'Gagal mengirim perintah zINSTREAM ke clamd.');
            }

            $fh = fopen($filePath, 'rb');
            if ($fh === false) {
                return ScanResult::error('clamd', $version, $this->elapsedMs($start), 'Gagal membuka stream file untuk clamd.');
            }

            try {
                while (! feof($fh)) {
                    $chunk = fread($fh, 8192);
                    if (! is_string($chunk) || $chunk === '') {
                        break;
                    }
                    $packet = pack('N', strlen($chunk)).$chunk;
                    if (fwrite($socket, $packet) === false) {
                        return ScanResult::error('clamd', $version, $this->elapsedMs($start), 'Koneksi clamd terputus saat streaming.');
                    }
                }
            } finally {
                fclose($fh);
            }

            fwrite($socket, "\x00\x00\x00\x00");

            $response = '';
            while (! feof($socket)) {
                $buf = fgets($socket, 1024);
                $meta = stream_get_meta_data($socket);
                if (! empty($meta['timed_out'])) {
                    return ScanResult::timeout('clamd', $version, $this->elapsedMs($start), 'Timeout menunggu respons clamd.');
                }
                if ($buf === false) {
                    break;
                }
                $response .= $buf;
            }

            $trimmed = trim(str_replace("\0", '', $response));
            if ($trimmed === '') {
                return ScanResult::error('clamd', $version, $this->elapsedMs($start), 'Respons kosong dari clamd.');
            }

            if (preg_match('/:\s*OK$/i', $trimmed)) {
                return ScanResult::clean('clamd', $this->resolveDaemonVersion($cfg), $this->elapsedMs($start), $trimmed);
            }

            if (preg_match('/:\s*(.+?)\s+FOUND$/i', $trimmed, $m)) {
                return ScanResult::infected('clamd', $this->resolveDaemonVersion($cfg), trim($m[1]), $this->elapsedMs($start), $trimmed);
            }

            return ScanResult::error('clamd', $version, $this->elapsedMs($start), "Respons clamd tidak dikenal: {$trimmed}");
        } finally {
            fclose($socket);
        }
    }

    /**
     * @param  array<string, mixed>  $cfg
     */
    private function scanViaCli(string $filePath, array $cfg, int $timeout, float $start): ScanResult
    {
        $candidates = array_values(array_unique(array_filter([
            (string) ($cfg['binary'] ?? 'clamdscan'),
            (string) ($cfg['fallback_binary'] ?? 'clamscan'),
        ])));

        foreach ($candidates as $bin) {
            $args = str_contains($bin, 'clamdscan')
                ? [$bin, '--no-summary', $filePath]
                : [$bin, '--no-summary', '--infected', $filePath];

            try {
                $process = new Process($args);
                $process->setTimeout($timeout);
                $process->run();

                $exitCode = $process->getExitCode();
                $output = trim($process->getOutput().' '.$process->getErrorOutput());

                if ($exitCode === 0) {
                    return ScanResult::clean($bin, $bin, $this->elapsedMs($start), $output ?: 'OK');
                }

                if ($exitCode === 1) {
                    $sig = 'Malware.Detected';
                    if (preg_match('/:\s*(.+?)\s+FOUND/i', $output, $m)) {
                        $sig = trim($m[1]);
                    }

                    return ScanResult::infected($bin, $bin, $sig, $this->elapsedMs($start), $output ?: 'FOUND');
                }

                // Exit 2 or other error when binary ran
                if ($exitCode !== null && $exitCode !== 127) {
                    return ScanResult::error($bin, $bin, $this->elapsedMs($start), "ClamAV CLI error (exit {$exitCode}): {$output}");
                }
            } catch (ProcessTimedOutException) {
                return ScanResult::timeout($bin, $bin, $this->elapsedMs($start), "Timeout eksekusi {$bin} setelah {$timeout} detik.");
            } catch (\Throwable) {
                // Binary not installed / not executable; try next candidate
                continue;
            }
        }

        return ScanResult::unavailable(
            'clamav-cli',
            null,
            $this->elapsedMs($start),
            'Scanner ClamAV (daemon maupun CLI) tidak tersedia di sistem.'
        );
    }

    /**
     * @param  array<string, mixed>  $cfg
     */
    private function daemonEndpoint(array $cfg): string
    {
        $socketPath = trim((string) ($cfg['socket'] ?? ''));
        if ($socketPath !== '') {
            return 'unix://'.$socketPath;
        }

        $host = trim((string) ($cfg['host'] ?? '127.0.0.1'));
        $port = (int) ($cfg['port'] ?? 3310);

        return "tcp://{$host}:{$port}";
    }

    /**
     * @param  array<string, mixed>  $cfg
     */
    private function pingDaemon(array $cfg, int $timeout): bool
    {
        $errno = 0;
        $errstr = '';
        $socket = @stream_socket_client($this->daemonEndpoint($cfg), $errno, $errstr, $timeout);
        if ($socket === false) {
            return false;
        }

        try {
            stream_set_timeout($socket, $timeout);
            fwrite($socket, "zPING\0");
            $resp = fread($socket, 64);
            $clean = is_string($resp) ? trim(str_replace("\0", '', $resp)) : '';

            return strcasecmp($clean, 'PONG') === 0;
        } finally {
            fclose($socket);
        }
    }

    /**
     * @param  array<string, mixed>  $cfg
     */
    private function resolveDaemonVersion(array $cfg): string
    {
        $daemonVer = $this->queryDaemonVersion($cfg, 2);
        if ($daemonVer !== null) {
            return $daemonVer;
        }

        foreach ([$cfg['binary'] ?? 'clamdscan', $cfg['fallback_binary'] ?? 'clamscan'] as $bin) {
            if (! $bin) {
                continue;
            }
            try {
                $proc = new Process([(string) $bin, '--version']);
                $proc->setTimeout(2);
                $proc->run();
                if ($proc->isSuccessful()) {
                    $raw = trim($proc->getOutput());
                    if (preg_match('/^(ClamAV\s+[^\/\s]+\/\d+)/i', $raw, $m)) {
                        return $m[1];
                    }
                    if ($raw !== '') {
                        return $raw;
                    }
                }
            } catch (\Throwable) {
                // ignore and try next
            }
        }

        return 'clamd';
    }

    /**
     * @param  array<string, mixed>  $cfg
     */
    private function queryDaemonVersion(array $cfg, int $timeout): ?string
    {
        $errno = 0;
        $errstr = '';
        $socket = @stream_socket_client($this->daemonEndpoint($cfg), $errno, $errstr, $timeout);
        if ($socket === false) {
            return null;
        }

        try {
            stream_set_timeout($socket, $timeout);
            fwrite($socket, "zVERSION\0");
            $resp = fread($socket, 256);
            $clean = is_string($resp) ? trim(str_replace("\0", '', $resp)) : '';

            if (
                $clean === ''
                || stripos($clean, 'COMMAND UNAVAILABLE') !== false
                || stripos($clean, 'UNKNOWN COMMAND') !== false
                || stripos($clean, 'ERROR') === 0
            ) {
                return null;
            }

            if (preg_match('/^(ClamAV\s+[^\/\s]+\/\d+)/i', $clean, $m)) {
                return $m[1];
            }

            return $clean;
        } finally {
            fclose($socket);
        }
    }

    private function elapsedMs(float $start): int
    {
        return max(1, (int) round((microtime(true) - $start) * 1000));
    }
}
