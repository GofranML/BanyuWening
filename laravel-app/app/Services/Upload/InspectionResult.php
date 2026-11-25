<?php

namespace App\Services\Upload;

readonly class InspectionResult
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function __construct(
        public string $extension,
        public string $mime,
        public int $sizeBytes,
        public string $sha256,
        public ?int $width,
        public ?int $height,
        public string $originalNameSanitized,
        public array $metadata = [],
    ) {}
}
