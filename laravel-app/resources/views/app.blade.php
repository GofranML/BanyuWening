<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="description" content="Platform IoT Modular Multi-Kolam (1 Core Hub untuk 1-4 kolam) dan AI Decision Support untuk UMKM pembesaran ikan lele terpal. Otomasi Edge Fuzzy saat WiFi mati, Sensor Health Watchdog, dan WeningBot WhatsApp-First.">
    <title inertia>BanyuWening : Smart Aquaculture IoT Multi-Kolam & AI Decision Support</title>
    <script>document.documentElement.classList.add('js')</script>

    <link rel="icon" type="image/svg+xml" href="/brand/favicon.svg?v=4">
    <link rel="alternate icon" type="image/x-icon" href="/favicon.ico?v=4">
    <link rel="shortcut icon" href="/favicon.ico?v=4">
    <link rel="apple-touch-icon" href="/brand/favicon.svg?v=4">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Geist:wght@300..800&family=JetBrains+Mono:wght@400;500;700&family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="/vendor/three.min.js"></script>

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body class="font-sans antialiased selection:bg-brand selection:text-brand-ink min-h-screen">
    @inertia
</body>
</html>
