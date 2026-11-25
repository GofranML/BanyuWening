<?php

namespace App\Services\Upload;

use App\Services\Upload\Exceptions\FileValidationException;
use Illuminate\Support\Str;

class FileSecurityInspector
{
    private const DANGEROUS_EXTENSIONS = [
        'php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'php8', 'phar', 'pht',
        'shtml', 'html', 'htm', 'svg', 'svgz', 'js', 'mjs', 'cjs', 'jsx',
        'ts', 'tsx', 'xml', 'xhtml', 'exe', 'dll', 'bat', 'cmd', 'com', 'msi',
        'sh', 'bash', 'zsh', 'ps1', 'vbs', 'py', 'rb', 'pl', 'cgi', 'asp',
        'aspx', 'jsp', 'htaccess',
    ];

    private const DANGEROUS_MIMES = [
        'image/svg+xml',
        'text/html',
        'application/xhtml+xml',
        'application/javascript',
        'text/javascript',
        'application/x-httpd-php',
        'text/x-php',
        'application/x-php',
        'application/x-executable',
        'application/x-dosexec',
        'application/x-mach-binary',
    ];

    private const NESTED_ARCHIVE_EXTENSIONS = [
        'zip', 'gz', 'tgz', 'tar', '7z', 'rar', 'bz2', 'xz',
    ];

    public function inspect(string $filePath, string $clientOriginalName, string $profile): InspectionResult
    {
        $profiles = config('uploads.profiles', []);
        if (! isset($profiles[$profile]) || ! is_array($profiles[$profile])) {
            throw new FileValidationException('INVALID_UPLOAD_PROFILE', "Profil upload '{$profile}' tidak dikenali.");
        }
        $cfg = $profiles[$profile];

        // 1. Filename safety, path traversal, null byte, double extension & extension allowlist
        [$extension, $sanitizedOriginal] = $this->validateFilename($clientOriginalName, $cfg['extensions'] ?? []);

        // 2. File existence, non-empty & size limits
        if (! is_file($filePath) || ! is_readable($filePath)) {
            throw new FileValidationException('FILE_UNREADABLE', 'File upload tidak dapat dibaca di server.');
        }

        $sizeBytes = filesize($filePath);
        if ($sizeBytes === false || $sizeBytes <= 0) {
            throw new FileValidationException('EMPTY_FILE', 'File kosong (0 byte) tidak diperbolehkan.');
        }

        $maxBytes = (int) ($cfg['max_bytes'] ?? 10485760);
        if (in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true) && isset($cfg['image_max_bytes'])) {
            $maxBytes = min($maxBytes, (int) $cfg['image_max_bytes']);
        }
        if ($sizeBytes > $maxBytes) {
            $maxMb = round($maxBytes / 1048576, 2);
            throw new FileValidationException(
                'FILE_TOO_LARGE',
                "Ukuran file melebihi batas maksimum profil ({$maxMb} MB)."
            );
        }

        // 3. Real MIME detection via finfo
        $detectedMime = $this->detectMime($filePath);
        if (in_array($detectedMime, self::DANGEROUS_MIMES, true)) {
            throw new FileValidationException(
                'DANGEROUS_MIME_TYPE',
                "Tipe konten berbahaya terdeteksi ({$detectedMime})."
            );
        }

        $allowedMimes = $cfg['mime_map'][$extension] ?? [];
        if (empty($allowedMimes) || ! in_array($detectedMime, $allowedMimes, true)) {
            throw new FileValidationException(
                'MIME_EXTENSION_MISMATCH',
                "Tipe MIME aktual ({$detectedMime}) tidak cocok dengan ekstensi .{$extension}."
            );
        }

        // 4. Magic bytes / binary signature verification
        $this->verifyMagicBytes($filePath, $extension);

        // 5. Structural validation (images, PDF, ZIP, disguised archives)
        [$width, $height, $extraMeta] = $this->validateStructure($filePath, $extension, $cfg);

        // 6. Full-stream malicious payload & polyglot detection
        $this->scanStreamForMaliciousPayloads($filePath, $extension);

        $sha256 = @hash_file('sha256', $filePath);
        if (! is_string($sha256) || $sha256 === '') {
            throw new FileValidationException('HASH_FAILED', 'Gagal menghitung checksum SHA-256 file.');
        }

        return new InspectionResult(
            extension: $extension,
            mime: $detectedMime,
            sizeBytes: $sizeBytes,
            sha256: $sha256,
            width: $width,
            height: $height,
            originalNameSanitized: $sanitizedOriginal,
            metadata: $extraMeta,
        );
    }

    /**
     * @param  array<int, string>  $allowedExtensions
     * @return array{0: string, 1: string}
     */
    private function validateFilename(string $rawName, array $allowedExtensions): array
    {
        if ($rawName === '' || str_contains($rawName, "\0") || stripos($rawName, '%00') !== false) {
            throw new FileValidationException('INVALID_FILENAME', 'Nama file mengandung null byte atau kosong.');
        }

        if (preg_match('/[\x00-\x1F\x7F]/', $rawName)) {
            throw new FileValidationException('INVALID_FILENAME', 'Nama file mengandung karakter kontrol ilegal.');
        }

        if (
            str_contains($rawName, '..')
            || str_contains($rawName, '/')
            || str_contains($rawName, '\\')
            || str_contains($rawName, ':')
        ) {
            throw new FileValidationException('PATH_TRAVERSAL_FILENAME', 'Nama file mengandung karakter path traversal.');
        }

        $segments = explode('.', $rawName);
        if (count($segments) < 2) {
            throw new FileValidationException('MISSING_EXTENSION', 'File wajib memiliki ekstensi yang valid.');
        }

        $extension = strtolower((string) array_pop($segments));
        if ($extension === '' || ! in_array($extension, $allowedExtensions, true)) {
            throw new FileValidationException(
                'DISALLOWED_EXTENSION',
                "Ekstensi file .{$extension} tidak diizinkan."
            );
        }

        foreach ($segments as $segment) {
            $segLower = strtolower(trim($segment));
            if ($segLower !== '' && in_array($segLower, self::DANGEROUS_EXTENSIONS, true)) {
                throw new FileValidationException(
                    'DOUBLE_EXTENSION_BLOCKED',
                    "Nama file mengandung ekstensi ganda berbahaya (.{$segLower}.{$extension})."
                );
            }
        }

        $baseName = implode('.', $segments);
        $slugBase = Str::slug($baseName, '_');
        if ($slugBase === '') {
            $slugBase = 'upload';
        }
        $sanitizedOriginal = substr($slugBase, 0, 120).'.'.$extension;

        return [$extension, $sanitizedOriginal];
    }

    private function detectMime(string $filePath): string
    {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo === false) {
            throw new FileValidationException('MIME_DETECTION_FAILED', 'Deteksi MIME server tidak tersedia.');
        }

        $mime = @finfo_file($finfo, $filePath);
        if (! is_string($mime) || $mime === '') {
            throw new FileValidationException(
                'FILE_UNREADABLE_OR_BLOCKED',
                'File diblokir oleh lapisan keamanan sistem atau tidak dapat dibaca.'
            );
        }

        return strtolower(trim($mime));
    }

    private function verifyMagicBytes(string $filePath, string $extension): void
    {
        $fh = @fopen($filePath, 'rb');
        if ($fh === false) {
            throw new FileValidationException('FILE_UNREADABLE_OR_BLOCKED', 'Tidak dapat membaca header file.');
        }
        $head = fread($fh, 64);
        fclose($fh);

        if (! is_string($head) || $head === '') {
            throw new FileValidationException('EMPTY_FILE', 'Header file kosong.');
        }

        // Disguised archive check for non-zip extensions
        if ($extension !== 'zip') {
            if (str_starts_with($head, "PK\x03\x04") || str_starts_with($head, "\x1F\x8B")) {
                throw new FileValidationException(
                    'MAGIC_BYTES_MISMATCH',
                    'Header file menunjukkan arsip terkompresi yang menyamar.'
                );
            }
        }

        switch ($extension) {
            case 'jpg':
            case 'jpeg':
                if (! str_starts_with($head, "\xFF\xD8\xFF")) {
                    throw new FileValidationException('MAGIC_BYTES_MISMATCH', 'Magic bytes JPEG tidak valid.');
                }
                break;

            case 'png':
                if (! str_starts_with($head, "\x89PNG\r\n\x1A\n")) {
                    throw new FileValidationException('MAGIC_BYTES_MISMATCH', 'Magic bytes PNG tidak valid.');
                }
                break;

            case 'gif':
                if (! str_starts_with($head, 'GIF87a') && ! str_starts_with($head, 'GIF89a')) {
                    throw new FileValidationException('MAGIC_BYTES_MISMATCH', 'Magic bytes GIF tidak valid.');
                }
                break;

            case 'webp':
                if (strlen($head) < 12 || substr($head, 0, 4) !== 'RIFF' || substr($head, 8, 4) !== 'WEBP') {
                    throw new FileValidationException('MAGIC_BYTES_MISMATCH', 'Magic bytes WebP tidak valid.');
                }
                break;

            case 'mp4':
                if (strlen($head) < 12 || substr($head, 4, 4) !== 'ftyp') {
                    throw new FileValidationException('MAGIC_BYTES_MISMATCH', 'Magic bytes MP4 tidak valid.');
                }
                break;

            case 'webm':
                if (! str_starts_with($head, "\x1A\x45\xDF\xA3")) {
                    throw new FileValidationException('MAGIC_BYTES_MISMATCH', 'Magic bytes WebM tidak valid.');
                }
                break;

            case 'ogg':
                if (! str_starts_with($head, 'OggS')) {
                    throw new FileValidationException('MAGIC_BYTES_MISMATCH', 'Magic bytes Ogg tidak valid.');
                }
                break;

            case 'pdf':
                if (! preg_match('/^%PDF-[12]\.\d/', $head)) {
                    throw new FileValidationException('MAGIC_BYTES_MISMATCH', 'Header PDF tidak valid.');
                }
                break;

            case 'zip':
                if (! str_starts_with($head, "PK\x03\x04") && ! str_starts_with($head, "PK\x05\x06")) {
                    throw new FileValidationException('MAGIC_BYTES_MISMATCH', 'Header ZIP tidak valid.');
                }
                break;

            case 'csv':
            case 'txt':
                if (str_contains($head, "\x00")) {
                    throw new FileValidationException('MAGIC_BYTES_MISMATCH', 'File teks mengandung byte biner null.');
                }
                break;

            case 'bin':
                $this->verifyFirmwareBinaryHeader($head);
                break;
        }
    }

    private function verifyFirmwareBinaryHeader(string $head): void
    {
        if (str_starts_with($head, "\x7FELF")) {
            throw new FileValidationException('FORBIDDEN_EXECUTABLE_BINARY', 'Binary ELF executable ditolak.');
        }
        if (str_starts_with($head, 'MZ')) {
            throw new FileValidationException('FORBIDDEN_EXECUTABLE_BINARY', 'Binary PE/DOS executable ditolak.');
        }
        if (
            str_starts_with($head, "\xFE\xED\xFA\xCE")
            || str_starts_with($head, "\xFE\xED\xFA\xCF")
            || str_starts_with($head, "\xCA\xFE\xBA\xBE")
        ) {
            throw new FileValidationException('FORBIDDEN_EXECUTABLE_BINARY', 'Binary Mach-O executable ditolak.');
        }
        if (str_starts_with($head, '#!')) {
            throw new FileValidationException('FORBIDDEN_SCRIPT_PAYLOAD', 'Skrip shell shebang ditolak.');
        }

        $trimmed = ltrim($head);
        if (preg_match('/^(<\?php|<\?=|<svg|<html|<!doctype|<script)/i', $trimmed)) {
            throw new FileValidationException('FORBIDDEN_SCRIPT_PAYLOAD', 'Payload skrip/markup menyamar sebagai .bin ditolak.');
        }

        if (config('uploads.firmware_require_esp32_magic', false) && ord($head[0]) !== 0xE9) {
            throw new FileValidationException(
                'INVALID_ESP32_MAGIC',
                'Header firmware ESP32 wajib diawali magic byte 0xE9.'
            );
        }
    }

    /**
     * @param  array<string, mixed>  $cfg
     * @return array{0: ?int, 1: ?int, 2: array<string, mixed>}
     */
    private function validateStructure(string $filePath, string $extension, array $cfg): array
    {
        if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true)) {
            return $this->validateImageStructure($filePath, $extension, $cfg);
        }

        if ($extension === 'pdf') {
            $this->validatePdfStructure($filePath);

            return [null, null, []];
        }

        if ($extension === 'zip') {
            $zipMeta = $this->validateZipStructure($filePath);

            return [null, null, $zipMeta];
        }

        return [null, null, []];
    }

    /**
     * @param  array<string, mixed>  $cfg
     * @return array{0: int, 1: int, 2: array<string, mixed>}
     */
    private function validateImageStructure(string $filePath, string $extension, array $cfg): array
    {
        $info = @getimagesize($filePath);
        if (! is_array($info) || empty($info[0]) || empty($info[1]) || empty($info[2])) {
            throw new FileValidationException('CORRUPTED_IMAGE', 'Struktur gambar rusak atau tidak dapat dibaca.');
        }

        $expectedType = match ($extension) {
            'jpg', 'jpeg' => IMAGETYPE_JPEG,
            'png' => IMAGETYPE_PNG,
            'gif' => IMAGETYPE_GIF,
            'webp' => IMAGETYPE_WEBP,
            default => null,
        };

        if ($expectedType !== null && (int) $info[2] !== $expectedType) {
            throw new FileValidationException('IMAGE_TYPE_MISMATCH', 'Tipe internal gambar tidak sesuai dengan ekstensi.');
        }

        $width = (int) $info[0];
        $height = (int) $info[1];
        $maxWidth = (int) ($cfg['max_width'] ?? 8192);
        $maxHeight = (int) ($cfg['max_height'] ?? 8192);
        $maxPixels = (int) ($cfg['max_pixels'] ?? 40000000);

        if ($width <= 0 || $height <= 0 || $width > $maxWidth || $height > $maxHeight || ($width * $height) > $maxPixels) {
            throw new FileValidationException(
                'IMAGE_DIMENSIONS_EXCEEDED',
                "Dimensi gambar ({$width}x{$height}) melebihi batas keamanan."
            );
        }

        $gd = match ($extension) {
            'jpg', 'jpeg' => @imagecreatefromjpeg($filePath),
            'png' => @imagecreatefrompng($filePath),
            'gif' => @imagecreatefromgif($filePath),
            'webp' => @imagecreatefromwebp($filePath),
            default => false,
        };

        if ($gd === false) {
            throw new FileValidationException('CORRUPTED_IMAGE', 'Gambar gagal didekode oleh engine grafis (file korup).');
        }
        unset($gd);

        $this->checkImageTrailingPolyglot($filePath, $extension);

        return [$width, $height, ['width' => $width, 'height' => $height]];
    }

    private function checkImageTrailingPolyglot(string $filePath, string $extension): void
    {
        $size = filesize($filePath);
        if ($size === false || $size < 12) {
            return;
        }

        $content = @file_get_contents($filePath);
        if (! is_string($content)) {
            return;
        }

        $trailing = '';
        if (in_array($extension, ['jpg', 'jpeg'], true)) {
            $pos = strrpos($content, "\xFF\xD9");
            if ($pos !== false && $pos + 2 < strlen($content)) {
                $trailing = substr($content, $pos + 2);
            }
        } elseif ($extension === 'png') {
            $pos = strrpos($content, 'IEND');
            if ($pos !== false && $pos + 8 < strlen($content)) {
                $trailing = substr($content, $pos + 8);
            }
        }

        if ($trailing !== '' && preg_match('/(<\?php|<\?=|<svg|<script|<html|PK\x03\x04)/i', $trailing)) {
            throw new FileValidationException(
                'POLYGLOT_PAYLOAD_DETECTED',
                'Terdeteksi payload tersembunyi setelah penanda akhir gambar (polyglot).'
            );
        }
    }

    private function validatePdfStructure(string $filePath): void
    {
        $content = @file_get_contents($filePath);
        if (! is_string($content) || $content === '') {
            throw new FileValidationException('MALFORMED_DOCUMENT', 'Dokumen PDF tidak dapat dibaca.');
        }

        if (! preg_match('/^%PDF-[12]\.\d/', $content)) {
            throw new FileValidationException('MALFORMED_DOCUMENT', 'Header dokumen PDF tidak valid.');
        }

        if (! str_contains($content, 'obj') || ! str_contains($content, 'endobj') || ! str_contains($content, '%%EOF')) {
            throw new FileValidationException('MALFORMED_DOCUMENT', 'Struktur objek atau EOF dokumen PDF tidak lengkap.');
        }

        if (preg_match('/\/(JavaScript|JS|Launch|RichMedia|XFA)\b/i', $content)) {
            throw new FileValidationException(
                'MALICIOUS_PDF_CONTENT',
                'Dokumen PDF mengandung aksi skrip atau launch aktif yang dilarang.'
            );
        }

        if (preg_match('/\/OpenAction\b/i', $content) && preg_match('/\/(JS|JavaScript|Launch|URI|SubmitForm)\b/i', $content)) {
            throw new FileValidationException(
                'MALICIOUS_PDF_CONTENT',
                'Dokumen PDF mengandung OpenAction aktif yang dilarang.'
            );
        }
    }

    /**
     * Pure-PHP ZIP Central Directory inspection (works without ext-zip).
     *
     * @return array<string, mixed>
     */
    private function validateZipStructure(string $filePath): array
    {
        $limits = config('uploads.archive_limits', []);
        $maxEntries = (int) ($limits['max_entries'] ?? 100);
        $maxUncompressed = (int) ($limits['max_uncompressed_bytes'] ?? 26214400);
        $maxSingleEntry = (int) ($limits['max_single_entry_bytes'] ?? 15728640);
        $maxRatio = (float) ($limits['max_compression_ratio'] ?? 100.0);

        $data = @file_get_contents($filePath);
        if (! is_string($data) || strlen($data) < 22) {
            throw new FileValidationException('MALFORMED_ARCHIVE', 'Arsip ZIP korup atau terlalu kecil.');
        }

        // Locate End of Central Directory (EOCD) signature PK\x05\x06
        $eocdPos = strrpos($data, "PK\x05\x06");
        if ($eocdPos === false || $eocdPos + 22 > strlen($data)) {
            throw new FileValidationException('MALFORMED_ARCHIVE', 'Header End of Central Directory ZIP tidak ditemukan.');
        }

        $eocd = unpack('vtotalEntries/VcdSize/VcdOffset', substr($data, $eocdPos + 10, 10));
        if (! is_array($eocd)) {
            throw new FileValidationException('MALFORMED_ARCHIVE', 'Gagal membaca header EOCD ZIP.');
        }

        $totalEntries = (int) $eocd['totalEntries'];
        $cdOffset = (int) $eocd['cdOffset'];
        $cdSize = (int) $eocd['cdSize'];

        if ($totalEntries <= 0 || $totalEntries > $maxEntries) {
            throw new FileValidationException(
                'ARCHIVE_BOMB_DETECTED',
                "Jumlah entri arsip ZIP ({$totalEntries}) tidak valid atau melebihi batas ({$maxEntries})."
            );
        }

        if ($cdOffset < 0 || $cdOffset + $cdSize > $eocdPos) {
            throw new FileValidationException('MALFORMED_ARCHIVE', 'Offset Central Directory ZIP tidak valid.');
        }

        $cursor = $cdOffset;
        $sumUncompressed = 0;

        for ($i = 0; $i < $totalEntries; $i++) {
            if ($cursor + 46 > $eocdPos || substr($data, $cursor, 4) !== "PK\x01\x02") {
                throw new FileValidationException('MALFORMED_ARCHIVE', 'Entri Central Directory ZIP korup.');
            }

            $hdr = unpack(
                'VcompSize/VuncompSize/vnameLen/vextraLen/vcommentLen',
                substr($data, $cursor + 20, 14)
            );
            if (! is_array($hdr)) {
                throw new FileValidationException('MALFORMED_ARCHIVE', 'Gagal membaca header entri ZIP.');
            }

            $compSize = (int) $hdr['compSize'];
            $uncompSize = (int) $hdr['uncompSize'];
            $nameLen = (int) $hdr['nameLen'];
            $extraLen = (int) $hdr['extraLen'];
            $commentLen = (int) $hdr['commentLen'];

            if ($cursor + 46 + $nameLen > $eocdPos) {
                throw new FileValidationException('MALFORMED_ARCHIVE', 'Nama file entri ZIP terpotong.');
            }

            $entryName = substr($data, $cursor + 46, $nameLen);
            $cursor += 46 + $nameLen + $extraLen + $commentLen;

            // Zip64 / overflow sentinel rejection
            if ($uncompSize === 0xFFFFFFFF || $compSize === 0xFFFFFFFF) {
                throw new FileValidationException('ARCHIVE_BOMB_DETECTED', 'Ukuran entri ZIP64 melebihi batas yang diizinkan.');
            }

            if ($uncompSize > $maxSingleEntry) {
                throw new FileValidationException('ARCHIVE_BOMB_DETECTED', 'Ukuran satu entri ZIP melebihi batas keamanan.');
            }

            $sumUncompressed += $uncompSize;
            if ($sumUncompressed > $maxUncompressed) {
                throw new FileValidationException('ARCHIVE_BOMB_DETECTED', 'Total ukuran dekompresi arsip ZIP melebihi batas (zip bomb).');
            }

            if ($uncompSize > 0) {
                $ratio = $uncompSize / max(1, $compSize);
                if ($ratio > $maxRatio) {
                    throw new FileValidationException(
                        'ARCHIVE_BOMB_DETECTED',
                        'Rasio kompresi ZIP mencurigakan terdeteksi (indikasi zip bomb).'
                    );
                }
            }

            // Path traversal inside archive
            if (
                str_contains($entryName, "\0")
                || str_contains($entryName, '..')
                || str_starts_with($entryName, '/')
                || str_starts_with($entryName, '\\')
                || preg_match('/^[A-Za-z]:/', $entryName)
            ) {
                throw new FileValidationException('ARCHIVE_PATH_TRAVERSAL', 'Entri arsip ZIP mengandung path traversal.');
            }

            // Ignore directory entries
            if (str_ends_with($entryName, '/')) {
                continue;
            }

            $entryExt = strtolower(pathinfo($entryName, PATHINFO_EXTENSION));
            if (in_array($entryExt, self::DANGEROUS_EXTENSIONS, true)) {
                throw new FileValidationException(
                    'ARCHIVE_DANGEROUS_ENTRY',
                    "Arsip ZIP mengandung file berbahaya (.{$entryExt})."
                );
            }
            if (in_array($entryExt, self::NESTED_ARCHIVE_EXTENSIONS, true)) {
                throw new FileValidationException(
                    'ARCHIVE_NESTED_BLOCKED',
                    "Arsip ZIP bersarang (.{$entryExt}) tidak diperbolehkan."
                );
            }
        }

        return [
            'zip_entries' => $totalEntries,
            'zip_uncompressed_bytes' => $sumUncompressed,
        ];
    }

    private function scanStreamForMaliciousPayloads(string $filePath, string $extension): void
    {
        $fh = @fopen($filePath, 'rb');
        if ($fh === false) {
            throw new FileValidationException('FILE_UNREADABLE_OR_BLOCKED', 'Tidak dapat memindai stream file.');
        }

        $chunkSize = 65536;
        $overlap = '';
        $pattern = '/(<\?php|<\?=|<script\b|<\/script|<svg\b|<html\b|<!doctype\s+html|<iframe\b|<object\b|<embed\b|javascript:|vbscript:|data:text\/html|phar:\/\/|\bon(?:load|error|click|focus|mouseover)\s*=)/i';

        try {
            while (! feof($fh)) {
                $chunk = fread($fh, $chunkSize);
                if (! is_string($chunk) || $chunk === '') {
                    break;
                }

                $window = $overlap.$chunk;
                if (preg_match($pattern, $window, $match)) {
                    throw new FileValidationException(
                        'MALICIOUS_PAYLOAD_DETECTED',
                        'Konten file mengandung skrip atau markup berbahaya ('.$match[1].') dan diblokir.'
                    );
                }

                $overlap = strlen($window) > 256 ? substr($window, -256) : $window;
            }
        } finally {
            fclose($fh);
        }
    }
}
