<?php

namespace App\Services\Upload\Exceptions;

use RuntimeException;

class ScannerTransientException extends RuntimeException
{
    public function __construct(
        private readonly string $scanStatus,
        string $message,
    ) {
        parent::__construct($message);
    }

    public function scanStatus(): string
    {
        return $this->scanStatus;
    }
}
