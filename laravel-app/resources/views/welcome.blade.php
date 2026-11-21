<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="BanyuWening: Platform IoT Modular Multi-Kolam (1 Core Hub : 1-4 Modul Kolam) dan AI Decision Support untuk UMKM pembesaran lele terpal.">
    <title>BanyuWening : Smart Aquaculture IoT Multi-Kolam & AI Decision Support</title>
    <script>document.documentElement.classList.add('js')</script>

    <link rel="icon" type="image/svg+xml" href="/brand/favicon.svg?v=4">
    <link rel="alternate icon" type="image/x-icon" href="/favicon.ico?v=4">
    <link rel="shortcut icon" href="/favicon.ico?v=4">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">

    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @endif
</head>
<body class="bg-[#F2EFE7] text-[#14302D] font-sans antialiased min-h-screen flex flex-col justify-between">
    <header class="border-b border-[#D9D4C7] bg-[#FBFAF6] px-6 py-4 flex items-center justify-between">
        <a href="{{ url('/') }}" class="inline-flex items-center gap-2.5 text-[#14302D] font-semibold tracking-wide">
            <img src="/brand/logogram.svg" alt="Logo BanyuWening" width="24" height="30">
            <span>BanyuWening</span>
        </a>
        <nav class="flex items-center gap-3 text-sm">
            <a href="{{ url('/demo') }}" class="min-h-[44px] inline-flex items-center px-4 py-2 rounded-[6px] border border-[#D9D4C7] text-[#14302D] hover:bg-[#E9E5DA] font-medium">
                Demo Interaktif
            </a>
            @if (Route::has('login'))
                @auth
                    <a href="{{ url('/dashboard') }}" class="min-h-[44px] inline-flex items-center px-4 py-2 rounded-[6px] bg-[#33706A] text-white font-semibold hover:opacity-90">
                        Buka Dashboard
                    </a>
                @else
                    <a href="{{ route('login') }}" class="min-h-[44px] inline-flex items-center px-4 py-2 rounded-[6px] bg-[#33706A] text-white font-semibold hover:opacity-90">
                        Masuk
                    </a>
                @endauth
            @endif
        </nav>
    </header>

    <main class="max-w-4xl mx-auto px-6 py-16 space-y-8">
        <div class="space-y-4">
            <h1 class="font-display text-[clamp(28px,4vw,44px)] text-[#14302D] leading-[1.12] max-w-[18ch]">
                Satu Core Hub, empat kolam lele
            </h1>
            <p class="text-base md:text-lg text-[#55645F] max-w-2xl leading-relaxed">
                Satu Core Hub memantau hingga 4 kolam berdempetan secara bersamaan, menjaga otomasi aerator atau pompa saat WiFi mati melalui Edge Fuzzy dan LittleFS Store-and-Forward, mengisolasi pembacaan sensor lewat Sensor Health Watchdog, dan menyampaikan prediksi kualitas air 1-3 jam ke depan ke WhatsApp petambak.
            </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div class="bg-[#FBFAF6] border border-[#D9D4C7] rounded-[6px] p-5 space-y-1.5">
                <h2 class="font-semibold text-[#14302D]">1 Core Hub : 1-4 Kolam</h2>
                <p class="text-[#55645F]">Starter 2K Rp2.450.000 dan Juragan 4K Rp4.150.000 dengan skema PO DP 50% + Pelunasan 50%.</p>
            </div>
            <div class="bg-[#FBFAF6] border border-[#D9D4C7] rounded-[6px] p-5 space-y-1.5">
                <h2 class="font-semibold text-[#14302D]">Offline-Plus Rp0 Permanen</h2>
                <p class="text-[#55645F]">Kebijakan Anti-Bricking menjaga fungsi inti Edge Fuzzy tetap berjalan walau langganan SaaS Smart Guard dijeda.</p>
            </div>
            <div class="bg-[#FBFAF6] border border-[#D9D4C7] rounded-[6px] p-5 space-y-1.5">
                <h2 class="font-semibold text-[#14302D]">WeningBot WhatsApp-First</h2>
                <p class="text-[#55645F]">Lebih dari 90% interaksi memakai Rule-Based Engine Rp0 LLM serta pengingat bilas Sensor Health Watchdog.</p>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-2">
            <a href="{{ url('/') }}" class="inline-flex items-center justify-center min-h-[44px] px-6 rounded-[6px] bg-[#33706A] text-white font-semibold text-sm hover:opacity-90">
                Buka Halaman Utama
            </a>
            <a href="{{ url('/demo') }}" class="inline-flex items-center justify-center min-h-[44px] px-6 rounded-[6px] border border-[#D9D4C7] bg-[#FBFAF6] text-[#14302D] font-semibold text-sm hover:bg-[#E9E5DA]">
                Uji Simulasi Dashboard
            </a>
        </div>
    </main>

    <footer class="border-t border-[#D9D4C7] bg-[#FBFAF6] px-6 py-4 text-xs text-[#55645F] flex flex-col sm:flex-row justify-between gap-2">
        <span>BanyuWening : Smart Aquaculture for a Sustainable Future</span>
        <span>Sistem Monitoring &amp; Otomasi Kolam Ikan Terpadu</span>
    </footer>
</body>
</html>
