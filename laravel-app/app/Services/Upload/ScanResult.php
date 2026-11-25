<?php

namespace App\Services\Upload;

readonly class ScanResult
{
    public const STATUS_CLEAN = 'CLEAN';

    public const STATUS_INFECTED = 'INFECTED';

    public const STATUS_TIMEOUT = 'TIMEOUT';

    public const STATUS_UNAVAILABLE = 'UNAVAILABLE';

    public const STATUS_ERROR = 'ERROR';

    public function __construct(
        public string $status,
        public string $scannerName,
        public ?string $scannerVersion,
        public ?string $signature,
        public int $durationMs,
        public string $message,
    ) {}

    public static function clean(string $scannerName, ?string $version, int $durationMs, string $message = 'OK'): self
    {
        return new self(self::STATUS_CLEAN, $scannerName, $version, null, $durationMs, $message);
    }

    public static function infected(string $scannerName, ?string $version, string $signature, int $durationMs, string $message = 'Malware signature detected.'): self
    {
        return new self(self::STATUS_INFECTED, $scannerName, $version, $signature, $durationMs, $message);
    }

    public static function timeout(string $scannerName, ?string $version, int $durationMs, string $message = 'Malware scan timed out.'): self
    {
        return new self(self::STATUS_TIMEOUT, $scannerName, $version, null, $durationMs, $message);
    }

    public static function unavailable(string $scannerName, ?string $version, int $durationMs, string $message = 'Malware scanner unavailable.'): self
    {
        return new self(self::STATUS_UNAVAILABLE, $scannerName, $version, null, $durationMs, $message);
    }

    public static function error(string $scannerName, ?string $version, int $durationMs, string $message = 'Malware scanner error.'): self
    {
        return new self(self::STATUS_ERROR, $scannerName, $version, null, $durationMs, $message);
    }

    public function isClean(): bool
    {
        return $this->status === self::STATUS_CLEAN;
    }

    public function isInfected(): bool
    {
        return $this->status === self::STATUS_INFECTED;
    }

    public function isFailure(): bool
    {
        return in_array($this->status, [self::STATUS_TIMEOUT, self::STATUS_UNAVAILABLE, self::STATUS_ERROR], true);
    }
}
