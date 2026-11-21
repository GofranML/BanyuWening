<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\User;
use App\Services\RealtimeBroadcaster;
use App\Services\WebSocketProtocol;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RealtimeSwaggerAndDeviceTokenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_swagger_ui_and_openapi_3_spec_are_served(): void
    {
        // Guest tidak boleh menerima auto-authorize token di halaman Swagger UI
        $guestUi = $this->get('/api/docs');
        $guestUi->assertStatus(200);
        $guestUi->assertSee('SwaggerUIBundle', false);
        $guestUi->assertSee('/api/docs/openapi.json', false);
        $guestUi->assertDontSee('bw_dev_', false);

        // Non-admin (Operator) juga tidak boleh menerima auto-authorize token
        $operator = User::where('role', 'OPERATOR')->firstOrFail();
        $operatorUi = $this->actingAs($operator)->get('/api/docs');
        $operatorUi->assertStatus(200);
        $operatorUi->assertDontSee('bw_dev_', false);

        // Super Admin otomatis ter-authorize dengan token alat aktif yang tersimpan
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();
        $device = Device::where('device_code', 'ESP32-NODE-01')->firstOrFail();
        $activeToken = $device->issueToken();

        $adminUi = $this->actingAs($admin)->get('/api/docs');
        $adminUi->assertStatus(200);
        $adminUi->assertSee('Auto-Authorized: ESP32-NODE-01', false);
        $adminUi->assertSee('preauthorizeApiKey', false);
        $adminUi->assertSee($activeToken, false);

        // Pastikan GET /api/latest tidak pernah membocorkan hash atau token terenkripsi
        $latest = $this->getJson('/api/latest');
        $latest->assertStatus(200);
        $latest->assertJsonMissingPath('device.api_token_hash');
        $latest->assertJsonMissingPath('device.api_token_encrypted');

        $spec = $this->getJson('/api/docs/openapi.json');
        $spec->assertStatus(200)
            ->assertJsonPath('openapi', '3.0.3')
            ->assertJsonPath('components.securitySchemes.DeviceBearerAuth.type', 'http')
            ->assertJsonPath('components.securitySchemes.DeviceHeaderAuth.name', 'X-Device-Token')
            ->assertJsonStructure([
                'openapi',
                'info',
                'servers',
                'x-websocket-protocols' => ['telemetry', 'control', 'alerts', 'heartbeat'],
                'paths' => [
                    '/api/telemetry',
                    '/api/http/telemetry',
                    '/api/http/telemetry/batch',
                    '/api/http/heartbeat',
                    '/api/http/commands',
                    '/api/http/commands/ack',
                    '/api/latest',
                    '/api/history',
                    '/api/alerts/recent',
                    '/api/realtime/config',
                    '/api/health',
                ],
            ]);
    }

    public function test_per_device_token_authentication_and_anti_spoofing(): void
    {
        $deviceA = Device::where('device_code', 'ESP32-NODE-01')->firstOrFail();
        $tokenA = $deviceA->issueToken();

        $deviceB = Device::create([
            'device_code' => 'ESP32-NODE-02',
            'name' => 'Node Kolam 02',
            'pond_name' => 'Kolam 02',
        ]);
        $tokenB = $deviceB->issueToken();

        $payload = [
            'device_code' => 'ESP32-NODE-01',
            'ph' => 7.1,
            'temperature_c' => 28.0,
            'tds_ppm' => 330,
            'turbidity_ntu' => 30,
        ];

        // 1. Tanpa token -> 401
        $this->postJson('/api/telemetry', $payload)
            ->assertStatus(401)
            ->assertJsonPath('error', 'UNAUTHORIZED_DEVICE_TOKEN');

        // 2. Token salah -> 401
        $this->withToken('bw_dev_invalid_token_12345')
            ->postJson('/api/telemetry', $payload)
            ->assertStatus(401)
            ->assertJsonPath('error', 'INVALID_OR_REVOKED_TOKEN');

        // 3. Token Device B mencoba mengirim data sebagai Device A -> 403 anti-spoofing
        $this->withToken($tokenB)
            ->postJson('/api/telemetry', $payload)
            ->assertStatus(403)
            ->assertJsonPath('error', 'DEVICE_TOKEN_MISMATCH');

        // 4. Token Device A valid via Authorization Bearer -> 201
        $this->withToken($tokenA)
            ->postJson('/api/telemetry', $payload)
            ->assertStatus(201)
            ->assertJsonPath('device_code', 'ESP32-NODE-01');

        // 5. Token Device B valid via X-Device-Token header (tanpa Authorization Bearer) -> 201
        $this->flushHeaders()
            ->withHeader('X-Device-Token', $tokenB)
            ->postJson('/api/http/telemetry', [
                'device_code' => 'ESP32-NODE-02',
                'ph' => 7.3,
                'temperature_c' => 27.8,
            ])
            ->assertStatus(201)
            ->assertJsonPath('transport', 'HTTP_FALLBACK')
            ->assertJsonPath('device_code', 'ESP32-NODE-02');

        // 6. Token dicabut -> langsung ditolak 401
        $deviceA->revokeToken();
        $this->flushHeaders()
            ->withToken($tokenA)
            ->postJson('/api/telemetry', $payload)
            ->assertStatus(401);
    }

    public function test_http_fallback_batch_heartbeat_and_command_cycle(): void
    {
        $device = Device::where('device_code', 'ESP32-NODE-01')->firstOrFail();
        $token = $device->issueToken();
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();

        // 1. Batch telemetry upload pasca putus koneksi
        $batchRes = $this->withToken($token)->postJson('/api/http/telemetry/batch', [
            'readings' => [
                ['ph' => 7.05, 'temperature_c' => 27.5, 'tds_ppm' => 310, 'turbidity_ntu' => 28],
                ['ph' => 7.12, 'temperature_c' => 28.1, 'tds_ppm' => 320, 'turbidity_ntu' => 30],
            ],
        ]);
        $batchRes->assertStatus(201)
            ->assertJsonPath('transport', 'HTTP_FALLBACK')
            ->assertJsonPath('ingested_count', 2);

        $this->assertDatabaseHas('sensor_readings', [
            'device_id' => $device->id,
            'transport' => 'HTTP_FALLBACK',
        ]);

        // 2. Admin mengeluarkan perintah aerator ON -> tersimpan sebagai pending_command
        $this->actingAs($admin)->post('/dashboard/aerator', [
            'action' => 'ON',
            'duration_minutes' => 30,
        ])->assertRedirect();

        // 3. Alat memeriksa heartbeat HTTP fallback -> melihat has_pending_command = true
        $this->withToken($token)->postJson('/api/http/heartbeat', [
            'rssi' => -64,
            'uptime_s' => 1200,
            'battery_v' => 4.1,
            'fallback_reason' => 'ws_timeout',
        ])->assertStatus(200)
            ->assertJsonPath('transport', 'HTTP_FALLBACK')
            ->assertJsonPath('has_pending_command', true);

        // 4. Alat polling perintah via HTTP fallback -> mendapat perintah ON
        $cmdRes = $this->withToken($token)->getJson('/api/http/commands');
        $cmdRes->assertStatus(200)
            ->assertJsonPath('aerator_command', 'ON')
            ->assertJsonPath('pending_command.action', 'ON');

        $commandId = $cmdRes->json('pending_command.command_id');

        // 5. Alat mengirim ACK eksekusi -> pending_command bersih
        $this->withToken($token)->postJson('/api/http/commands/ack', [
            'command_id' => $commandId,
            'applied_action' => 'ON',
            'mode' => 'MANUAL',
        ])->assertStatus(200)
            ->assertJsonPath('aerator_on', true);

        $this->assertNull($device->fresh()->pending_command);

        // 6. Alerts HTTP fallback
        $this->getJson('/api/alerts/recent?limit=10')
            ->assertStatus(200)
            ->assertJsonPath('transport_mode', 'HTTP_FALLBACK');
    }

    public function test_super_admin_device_token_crud_and_rbac(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();
        $operator = User::where('role', 'OPERATOR')->firstOrFail();

        // Non-admin tidak boleh membuat perangkat/token
        $this->actingAs($operator)->postJson('/dashboard/devices', [
            'device_code' => 'ESP32-UNAUTH',
            'name' => 'Unauthorized',
            'pond_name' => 'Kolam X',
        ])->assertStatus(403);

        // Super Admin mendaftarkan alat baru & menerima plaintext token sekali
        $create = $this->actingAs($admin)->postJson('/dashboard/devices', [
            'device_code' => 'ESP32-NODE-09',
            'name' => 'Node Kolam 09',
            'pond_name' => 'Kolam Terpal 09',
        ]);
        $create->assertStatus(201)
            ->assertJsonPath('device.device_code', 'ESP32-NODE-09');

        $firstToken = $create->json('plain_token');
        $deviceId = $create->json('device.id');
        $this->assertStringStartsWith('bw_dev_', $firstToken);

        // Token baru langsung bisa digunakan
        $this->withToken($firstToken)->postJson('/api/http/heartbeat', ['rssi' => -55])
            ->assertStatus(200);

        // Rotasi token: token lama langsung ditolak, token baru diterima
        $rotate = $this->actingAs($admin)->postJson("/dashboard/devices/{$deviceId}/rotate-token");
        $rotate->assertStatus(200);
        $secondToken = $rotate->json('plain_token');
        $this->assertNotEquals($firstToken, $secondToken);

        $this->withToken($firstToken)->postJson('/api/http/heartbeat', ['rssi' => -55])
            ->assertStatus(401);
        $this->withToken($secondToken)->postJson('/api/http/heartbeat', ['rssi' => -55])
            ->assertStatus(200);

        // Realtime config memberikan tiket WS untuk pengguna login
        $this->actingAs($admin)->getJson('/api/realtime/config')
            ->assertStatus(200)
            ->assertJsonPath('realtime.http_fallback.enabled', true)
            ->assertJsonStructure([
                'realtime' => [
                    'ws_stream_url',
                    'dashboard_ticket',
                    'protocols' => ['telemetry', 'control', 'alerts', 'heartbeat'],
                ],
            ]);
    }

    public function test_rfc6455_websocket_protocol_handshake_framing_and_tickets(): void
    {
        // RFC 6455 Section 4.2.2 official test vector
        $resp = WebSocketProtocol::buildHandshakeResponse('dGhlIHNhbXBsZSBub25jZQ==', 'banyuwening.telemetry.v1');
        $this->assertStringContainsString('HTTP/1.1 101 Switching Protocols', $resp);
        $this->assertStringContainsString('Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=', $resp);
        $this->assertStringContainsString('Sec-WebSocket-Protocol: banyuwening.telemetry.v1', $resp);

        // Parse HTTP Upgrade request
        $rawUpgrade = "GET /ws/telemetry?token=bw_dev_abc HTTP/1.1\r\n"
            . "Host: 127.0.0.1:8081\r\n"
            . "Upgrade: websocket\r\n"
            . "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
            . "Sec-WebSocket-Protocol: banyuwening.telemetry.v1, banyuwening.control.v1\r\n\r\n";
        $parsed = WebSocketProtocol::parseHttpRequest($rawUpgrade);
        $this->assertNotNull($parsed);
        $this->assertEquals('/ws/telemetry', $parsed['path']);
        $this->assertEquals('bw_dev_abc', $parsed['query']['token']);
        $this->assertEquals(
            'banyuwening.telemetry.v1',
            WebSocketProtocol::negotiateSubprotocol($parsed['headers']['sec-websocket-protocol'], ['banyuwening.telemetry.v1'])
        );

        // Encode & decode roundtrip (masked client frame -> server decode)
        $payload = json_encode(['type' => 'telemetry', 'ph' => 7.2]);
        $mask = "\x37\xfa\x21\x3d";
        $masked = '';
        for ($i = 0; $i < strlen($payload); $i++) {
            $masked .= $payload[$i] ^ $mask[$i % 4];
        }
        $clientFrame = chr(0x81) . chr(0x80 | strlen($payload)) . $mask . $masked;
        $buffer = $clientFrame;
        $decoded = WebSocketProtocol::decodeFrames($buffer);
        $this->assertCount(1, $decoded);
        $this->assertEquals(WebSocketProtocol::OPCODE_TEXT, $decoded[0]['opcode']);
        $this->assertEquals($payload, $decoded[0]['payload']);
        $this->assertSame('', $buffer);

        // Server unmasked frame encode & decode
        $serverFrame = WebSocketProtocol::encodeFrame($payload);
        $serverBuf = $serverFrame;
        $decodedServer = WebSocketProtocol::decodeFrames($serverBuf);
        $this->assertCount(1, $decodedServer);
        $this->assertEquals($payload, $decodedServer[0]['payload']);

        // HMAC Dashboard WebSocket Ticket verification
        $broadcaster = app(RealtimeBroadcaster::class);
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();
        $ticket = $broadcaster->issueDashboardTicket($admin);
        $claims = $broadcaster->verifyDashboardTicket($ticket);
        $this->assertNotNull($claims);
        $this->assertEquals($admin->id, $claims['uid']);
        $this->assertNull($broadcaster->verifyDashboardTicket($ticket . 'tampered'));
    }

    public function test_asyncapi_studio_spec_yaml_json_and_admin_auto_login(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();
        $device = Device::where('device_code', 'ESP32-NODE-01')->firstOrFail();
        $token = $device->issueToken();

        // Guest tidak boleh mendapat token perangkat atau status Auto-Authorized di AsyncAPI Studio
        $guest = $this->get('/api/docs/asyncapi');
        $guest->assertStatus(200);
        $guest->assertSee('AsyncAPI Studio 3.0', false);
        $guest->assertSee('studio.asyncapi.com', false);
        $guest->assertDontSee($token, false);
        $guest->assertDontSee('Auto-Authorized: ESP32-NODE-01', false);

        // Super Admin mendapat auto-login token perangkat pada Simulator WebSocket AsyncAPI
        $adminUi = $this->actingAs($admin)->get('/api/docs/asyncapi');
        $adminUi->assertStatus(200);
        $adminUi->assertSee('Auto-Authorized: ESP32-NODE-01', false);
        $adminUi->assertSee($token, false);

        // AsyncAPI 3.0.0 JSON endpoint
        $json = $this->getJson('/api/docs/asyncapi.json');
        $json->assertStatus(200)
            ->assertJsonPath('asyncapi', '3.0.0')
            ->assertJsonStructure([
                'asyncapi',
                'info',
                'servers' => ['banyuweningWs'],
                'channels' => ['telemetry', 'control', 'alerts', 'heartbeat', 'dashboardStream'],
                'operations' => [
                    'sendTelemetry',
                    'receiveTelemetryAck',
                    'receiveControlCommand',
                    'sendControlAck',
                    'receivePredictionAlerts',
                    'sendHeartbeat',
                    'receiveHeartbeatPong',
                    'subscribeDashboardStream',
                ],
                'components' => ['securitySchemes', 'messages'],
            ]);

        // AsyncAPI 3.0.0 YAML endpoint
        $yaml = $this->get('/api/docs/asyncapi.yaml');
        $yaml->assertStatus(200);
        $yaml->assertHeader('Content-Type', 'application/yaml; charset=utf-8');
        $yaml->assertSee('asyncapi: 3.0.0', false);
        $yaml->assertSee('/ws/telemetry', false);
        $yaml->assertSee('banyuwening.telemetry.v1', false);
    }
}
