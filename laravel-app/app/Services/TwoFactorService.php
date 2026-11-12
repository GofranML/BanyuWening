<?php

namespace App\Services;

class TwoFactorService
{
    private const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a Base32 secret key.
     */
    public function generateSecretKey(int $length = 16): string
    {
        $secret = '';
        for ($i = 0; $i < $length; $i++) {
            $secret .= self::BASE32_CHARS[random_int(0, 31)];
        }
        return $secret;
    }

    /**
     * Generate standard otpauth:// URI for Authenticator apps (Google Authenticator, Microsoft Authenticator, Authy, etc.).
     */
    public function qrCodeUri(string $companyName, string $email, string $secret): string
    {
        $issuer = rawurlencode($companyName);
        $account = rawurlencode($email);

        return "otpauth://totp/{$issuer}:{$account}?secret={$secret}&issuer={$issuer}&algorithm=SHA1&digits=6&period=30";
    }

    /**
     * Calculate 6-digit TOTP code for a given timestamp (default current time).
     */
    public function calculateCode(string $secret, ?int $timestamp = null): string
    {
        $timestamp = $timestamp ?? time();
        $secret = strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret));
        if (empty($secret)) {
            return '';
        }

        $binary = '';
        for ($i = 0; $i < strlen($secret); $i++) {
            $pos = strpos(self::BASE32_CHARS, $secret[$i]);
            if ($pos === false) continue;
            $binary .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }

        $bytes = '';
        for ($i = 0; $i < strlen($binary) - 7; $i += 8) {
            $bytes .= chr(bindec(substr($binary, $i, 8)));
        }

        $timeSlice = floor($timestamp / 30);
        $packedTime = pack('N*', 0) . pack('N*', $timeSlice);
        $hash = hash_hmac('sha1', $packedTime, $bytes, true);
        $offset = ord(substr($hash, -1)) & 0x0F;

        $truncatedHash = (
            ((ord($hash[$offset]) & 0x7F) << 24) |
            ((ord($hash[$offset + 1]) & 0xFF) << 16) |
            ((ord($hash[$offset + 2]) & 0xFF) << 8) |
            (ord($hash[$offset + 3]) & 0xFF)
        ) % 1000000;

        return str_pad((string) $truncatedHash, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Verify a 6-digit TOTP code against a Base32 secret.
     */
    public function verifyCode(string $secret, string $code, int $discrepancy = 1): bool
    {
        $code = trim($code);
        if (strlen($code) !== 6 || !ctype_digit($code)) {
            return false;
        }

        $secret = strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret));
        if (empty($secret)) {
            return false;
        }

        // Base32 to binary
        $binary = '';
        for ($i = 0; $i < strlen($secret); $i++) {
            $pos = strpos(self::BASE32_CHARS, $secret[$i]);
            if ($pos === false) continue;
            $binary .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }

        $bytes = '';
        for ($i = 0; $i < strlen($binary) - 7; $i += 8) {
            $bytes .= chr(bindec(substr($binary, $i, 8)));
        }

        $timeSlice = floor(time() / 30);

        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $slice = $timeSlice + $i;
            $packedTime = pack('N*', 0) . pack('N*', $slice);
            $hash = hash_hmac('sha1', $packedTime, $bytes, true);
            $offset = ord(substr($hash, -1)) & 0x0F;

            $truncatedHash = (
                ((ord($hash[$offset]) & 0x7F) << 24) |
                ((ord($hash[$offset + 1]) & 0xFF) << 16) |
                ((ord($hash[$offset + 2]) & 0xFF) << 8) |
                (ord($hash[$offset + 3]) & 0xFF)
            ) % 1000000;

            $calculatedCode = str_pad((string) $truncatedHash, 6, '0', STR_PAD_LEFT);

            if (hash_equals($calculatedCode, $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate emergency recovery codes (e.g. XXXX-XXXX).
     */
    public function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $part1 = strtoupper(bin2hex(random_bytes(2)));
            $part2 = strtoupper(bin2hex(random_bytes(2)));
            $codes[] = "{$part1}-{$part2}";
        }
        return $codes;
    }
}
