<?php

namespace App\Services;

/**
 * Implementasi ringan protokol RFC 6455 WebSocket untuk server native PHP (ws:serve).
 */
class WebSocketProtocol
{
    public const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

    public const OPCODE_CONTINUATION = 0x0;
    public const OPCODE_TEXT = 0x1;
    public const OPCODE_BINARY = 0x2;
    public const OPCODE_CLOSE = 0x8;
    public const OPCODE_PING = 0x9;
    public const OPCODE_PONG = 0xA;

    /**
     * Parse HTTP Upgrade request dari client WebSocket.
     */
    public static function parseHttpRequest(string $raw): ?array
    {
        $headerEnd = strpos($raw, "\r\n\r\n");
        if ($headerEnd === false) {
            return null;
        }

        $headerBlock = substr($raw, 0, $headerEnd);
        $lines = explode("\r\n", $headerBlock);
        $requestLine = array_shift($lines);

        if (!$requestLine || !preg_match('/^([A-Z]+)\s+(\S+)\s+HTTP\/1\.[01]$/', trim($requestLine), $m)) {
            return null;
        }

        $headers = [];
        foreach ($lines as $line) {
            if (str_contains($line, ':')) {
                [$name, $value] = explode(':', $line, 2);
                $headers[strtolower(trim($name))] = trim($value);
            }
        }

        $parsedUrl = parse_url($m[2]);
        $query = [];
        if (isset($parsedUrl['query'])) {
            parse_str($parsedUrl['query'], $query);
        }

        return [
            'method' => $m[1],
            'target' => $m[2],
            'path' => $parsedUrl['path'] ?? '/',
            'query' => $query,
            'headers' => $headers,
            'consumed_bytes' => $headerEnd + 4,
        ];
    }

    /**
     * Pilih sub-protokol WebSocket yang cocok dari header Sec-WebSocket-Protocol.
     */
    public static function negotiateSubprotocol(?string $clientHeader, array $supported): ?string
    {
        if (!$clientHeader) {
            return null;
        }

        $requested = array_map('trim', explode(',', $clientHeader));
        foreach ($requested as $proto) {
            if (in_array($proto, $supported, true)) {
                return $proto;
            }
        }

        return null;
    }

    /**
     * Bangun respons HTTP 101 Switching Protocols sesuai RFC 6455.
     */
    public static function buildHandshakeResponse(string $secWebSocketKey, ?string $selectedProtocol = null): string
    {
        $accept = base64_encode(sha1(trim($secWebSocketKey) . self::GUID, true));

        $lines = [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            'Sec-WebSocket-Accept: ' . $accept,
        ];

        if ($selectedProtocol !== null && $selectedProtocol !== '') {
            $lines[] = 'Sec-WebSocket-Protocol: ' . $selectedProtocol;
        }

        return implode("\r\n", $lines) . "\r\n\r\n";
    }

    public static function buildHttpErrorResponse(int $status, string $reason, string $bodyJson = ''): string
    {
        $body = $bodyJson !== '' ? $bodyJson : json_encode(['success' => false, 'message' => $reason]);
        $lines = [
            "HTTP/1.1 {$status} {$reason}",
            'Content-Type: application/json',
            'Content-Length: ' . strlen($body),
            'Connection: close',
        ];

        return implode("\r\n", $lines) . "\r\n\r\n" . $body;
    }

    /**
     * Encode frame WebSocket dari server ke client (unmasked sesuai RFC 6455).
     */
    public static function encodeFrame(string $payload, int $opcode = self::OPCODE_TEXT): string
    {
        $finAndOpcode = chr(0x80 | ($opcode & 0x0F));
        $length = strlen($payload);

        if ($length <= 125) {
            return $finAndOpcode . chr($length) . $payload;
        }

        if ($length <= 65535) {
            return $finAndOpcode . chr(126) . pack('n', $length) . $payload;
        }

        return $finAndOpcode . chr(127) . pack('J', $length) . $payload;
    }

    /**
     * Decode satu atau lebih frame RFC 6455 dari buffer stream; menyisakan byte parsial di $buffer.
     *
     * @return array<int, array{opcode:int, fin:bool, payload:string}>
     */
    public static function decodeFrames(string &$buffer): array
    {
        $frames = [];

        while (strlen($buffer) >= 2) {
            $b1 = ord($buffer[0]);
            $b2 = ord($buffer[1]);

            $fin = (bool) ($b1 & 0x80);
            $opcode = $b1 & 0x0F;
            $masked = (bool) ($b2 & 0x80);
            $payloadLen = $b2 & 0x7F;
            $offset = 2;

            if ($payloadLen === 126) {
                if (strlen($buffer) < 4) {
                    break;
                }
                $unpacked = unpack('nlen', substr($buffer, 2, 2));
                $payloadLen = $unpacked['len'];
                $offset = 4;
            } elseif ($payloadLen === 127) {
                if (strlen($buffer) < 10) {
                    break;
                }
                $unpacked = unpack('Jlen', substr($buffer, 2, 8));
                $payloadLen = $unpacked['len'];
                $offset = 10;
            }

            $maskLen = $masked ? 4 : 0;
            $totalFrameLen = $offset + $maskLen + $payloadLen;

            if (strlen($buffer) < $totalFrameLen) {
                break;
            }

            $maskKey = $masked ? substr($buffer, $offset, 4) : '';
            $rawPayload = substr($buffer, $offset + $maskLen, $payloadLen);
            $buffer = substr($buffer, $totalFrameLen);

            if ($masked && $payloadLen > 0) {
                $unmasked = '';
                for ($i = 0; $i < $payloadLen; $i++) {
                    $unmasked .= $rawPayload[$i] ^ $maskKey[$i % 4];
                }
                $payload = $unmasked;
            } else {
                $payload = $rawPayload;
            }

            $frames[] = [
                'opcode' => $opcode,
                'fin' => $fin,
                'payload' => $payload,
            ];
        }

        return $frames;
    }
}
