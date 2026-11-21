<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Services\AsyncApiSpecGenerator;
use App\Services\OpenApiSpecGenerator;
use App\Services\RealtimeBroadcaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class SwaggerController extends Controller
{
    public function ui(Request $request): View
    {
        [$autoAuthDevices, $selectedDevice] = $this->resolveAdminAutoAuthDevices($request);

        return view('swagger', [
            'specUrl' => url('/api/docs/openapi.json'),
            'wsUrl' => config('services.realtime.ws_public_url', 'ws://127.0.0.1:8081'),
            'autoAuthDevices' => $autoAuthDevices,
            'selectedDevice' => $selectedDevice,
        ]);
    }

    public function spec(Request $request, OpenApiSpecGenerator $generator): JsonResponse
    {
        return response()->json(
            $generator->generate($request->getSchemeAndHttpHost()),
            200,
            ['Cache-Control' => 'no-store']
        );
    }

    /**
     * Halaman AsyncAPI Studio & WebSocket Multi-Protokol Simulator (GET /api/docs/asyncapi)
     */
    public function asyncApiUi(
        Request $request,
        AsyncApiSpecGenerator $asyncGenerator,
        RealtimeBroadcaster $broadcaster
    ): View {
        [$autoAuthDevices, $selectedDevice] = $this->resolveAdminAutoAuthDevices($request);
        $user = Auth::user();
        $specArray = $asyncGenerator->generate($request->getSchemeAndHttpHost());
        $specYaml = $asyncGenerator->toYaml($specArray);

        return view('asyncapi', [
            'specJsonUrl' => url('/api/docs/asyncapi.json'),
            'specYamlUrl' => url('/api/docs/asyncapi.yaml'),
            'specArray' => $specArray,
            'specYaml' => $specYaml,
            'realtimeConfig' => $broadcaster->getRealtimeConfig(
                ($user && $user->isAdmin()) ? $user : null,
                $request->getSchemeAndHttpHost()
            ),
            'autoAuthDevices' => $autoAuthDevices,
            'selectedDevice' => $selectedDevice,
        ]);
    }

    public function asyncApiJson(Request $request, AsyncApiSpecGenerator $generator): JsonResponse
    {
        return response()->json(
            $generator->generate($request->getSchemeAndHttpHost()),
            200,
            [
                'Cache-Control' => 'no-store',
                'Access-Control-Allow-Origin' => '*',
            ]
        );
    }

    public function asyncApiYaml(Request $request, AsyncApiSpecGenerator $generator): Response
    {
        $yaml = $generator->toYaml($generator->generate($request->getSchemeAndHttpHost()));

        return response($yaml, 200, [
            'Content-Type' => 'application/yaml; charset=utf-8',
            'Cache-Control' => 'no-store',
            'Access-Control-Allow-Origin' => '*',
            'Content-Disposition' => 'inline; filename="banyuwening-asyncapi-3.0.yaml"',
        ]);
    }

    /**
     * Auto-authorize token alat aktif hanya diberikan untuk sesi Super Administrator yang sedang login.
     *
     * @return array{0: array<int, array<string, string>>, 1: ?array<string, string>}
     */
    private function resolveAdminAutoAuthDevices(Request $request): array
    {
        $user = Auth::user();
        $autoAuthDevices = [];
        $selectedDevice = null;

        if ($user && $user->isAdmin()) {
            $activeDevices = Device::where('token_active', true)
                ->whereNotNull('api_token_encrypted')
                ->orderBy('id')
                ->get();

            foreach ($activeDevices as $device) {
                $plain = $device->decryptToken();
                if ($plain) {
                    $autoAuthDevices[] = [
                        'device_code' => $device->device_code,
                        'name' => $device->name,
                        'pond_name' => $device->pond_name,
                        'token' => $plain,
                    ];
                }
            }

            $requestedCode = $request->query('device');
            if ($requestedCode) {
                foreach ($autoAuthDevices as $item) {
                    if (strcasecmp($item['device_code'], (string) $requestedCode) === 0) {
                        $selectedDevice = $item;
                        break;
                    }
                }
            }

            $selectedDevice ??= $autoAuthDevices[0] ?? null;
        }

        return [$autoAuthDevices, $selectedDevice];
    }
}
