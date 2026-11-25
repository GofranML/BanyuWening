<?php

namespace App\Enums;

enum UploadStatus: string
{
    case PENDING_SCAN = 'PENDING_SCAN';
    case SCANNING = 'SCANNING';
    case CLEAN = 'CLEAN';
    case REJECTED = 'REJECTED';
    case QUARANTINED = 'QUARANTINED';
    case SCAN_FAILED = 'SCAN_FAILED';

    public function canTransitionTo(self $next): bool
    {
        return match ($this) {
            self::PENDING_SCAN => in_array($next, [
                self::SCANNING,
                self::REJECTED,
                self::SCAN_FAILED,
            ], true),
            self::SCANNING => in_array($next, [
                self::CLEAN,
                self::QUARANTINED,
                self::REJECTED,
                self::SCAN_FAILED,
                self::PENDING_SCAN,
            ], true),
            self::SCAN_FAILED => in_array($next, [
                self::PENDING_SCAN,
                self::SCANNING,
            ], true),
            self::CLEAN, self::REJECTED, self::QUARANTINED => false,
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::CLEAN, self::REJECTED, self::QUARANTINED], true);
    }
}
