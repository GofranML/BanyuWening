<?php

namespace App\Services\Upload\Exceptions;

use RuntimeException;

class ScannerUnavailableException extends RuntimeException
{
    public function __construct(string $message = 'Malware scanner tidak tersedia.')
    {
        parent::__construct($message);
    }
}
