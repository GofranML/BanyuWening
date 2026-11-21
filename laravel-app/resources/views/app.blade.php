@php
    $appBaseUrl = rtrim((string) config('app.url'), '/');
    if ($appBaseUrl === '' || str_contains($appBaseUrl, 'localhost') || str_contains($appBaseUrl, '127.0.0.1')) {
        $appBaseUrl = request()->getSchemeAndHttpHost();
    }
    if (str_contains($appBaseUrl, 'banyuwening.ciptasol.cloud')) {
        $appBaseUrl = preg_replace('/^http:\/\//i', 'https://', $appBaseUrl);
    }

    $currentPath = '/' . ltrim(request()->path(), '/');
    $isHome = $currentPath === '/' || $currentPath === '';
    $isDemo = str_starts_with($currentPath, '/demo');
    $isPrivate = str_starts_with($currentPath, '/dashboard') || str_starts_with($currentPath, '/login');

    $ua = (string) request()->userAgent();
    $isSocialCrawler = (bool) preg_match('/WhatsApp|facebookexternalhit|Facebot|TelegramBot|Twitterbot|LinkedInBot|Slackbot|Discordbot/i', $ua);

    $canonicalUrl = $appBaseUrl . ($isHome ? '/' : $currentPath);
    $robotsDirective = $isPrivate
        ? 'noindex, nofollow, noarchive'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    $seoTitle = $isDemo
        ? 'Simulasi Demo Kualitas Air & Edge Fuzzy — BanyuWening'
        : ($isPrivate
            ? 'Dashboard Operasional Smart Pond — BanyuWening'
            : 'BanyuWening — Smart Aquaculture IoT Multi-Kolam & AI');

    $seoDescription = $isDemo
        ? 'Simulasi interaktif 24 jam kualitas air kolam lele (pH, suhu, TDS, turbiditas), kendali aerator otomatis Edge Fuzzy, dan prediksi Random Forest BanyuWening.'
        : 'Platform IoT Modular (1 Hub untuk 1-4 kolam) & AI Random Forest untuk pembesaran lele terpal. Respon Edge Fuzzy 15 ms saat WiFi mati, LittleFS 72 jam, & WeningBot WhatsApp.';

    // Gunakan URL statis bersih tanpa query string agar crawler WhatsApp/2.x tidak meng-encode ?v=... menjadi %3Fv=...
    $ogImageUrl = $appBaseUrl . '/brand/og-banyuwening-v6.jpg';
    $ogSquareUrl = $appBaseUrl . '/brand/og-square.jpg';

    $structuredData = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'Organization',
                '@id' => $appBaseUrl . '/#organization',
                'name' => 'BanyuWening Smart Aquaculture',
                'url' => $appBaseUrl . '/',
                'logo' => [
                    '@type' => 'ImageObject',
                    'url' => $ogSquareUrl,
                    'width' => 600,
                    'height' => 600,
                ],
                'contactPoint' => [
                    '@type' => 'ContactPoint',
                    'telephone' => '+62-856-6954-8964',
                    'contactType' => 'customer service',
                    'areaServed' => 'ID',
                    'availableLanguage' => ['Indonesian', 'English'],
                ],
            ],
            [
                '@type' => 'WebSite',
                '@id' => $appBaseUrl . '/#website',
                'url' => $appBaseUrl . '/',
                'name' => 'BanyuWening',
                'description' => $seoDescription,
                'inLanguage' => 'id-ID',
                'publisher' => ['@id' => $appBaseUrl . '/#organization'],
            ],
            [
                '@type' => 'WebPage',
                '@id' => $canonicalUrl . '#webpage',
                'url' => $canonicalUrl,
                'name' => $seoTitle,
                'description' => $seoDescription,
                'isPartOf' => ['@id' => $appBaseUrl . '/#website'],
                'inLanguage' => 'id-ID',
                'primaryImageOfPage' => [
                    '@type' => 'ImageObject',
                    'url' => $ogImageUrl,
                    'width' => 1200,
                    'height' => 630,
                ],
            ],
            [
                '@type' => 'SoftwareApplication',
                'name' => 'BanyuWening Smart Pond & Edge Fuzzy IoT',
                'applicationCategory' => 'BusinessApplication',
                'operatingSystem' => 'Web, ESP32 FreeRTOS',
                'url' => $appBaseUrl . '/',
                'image' => $ogImageUrl,
                'description' => $seoDescription,
                'offers' => [
                    '@type' => 'AggregateOffer',
                    'priceCurrency' => 'IDR',
                    'lowPrice' => 1290000,
                    'highPrice' => 2990000,
                    'offerCount' => 3,
                ],
            ],
        ],
    ];
@endphp
<!DOCTYPE html>
<html lang="id" data-theme="light">
<head prefix="og: http://ogp.me/ns#">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title @if(!$isSocialCrawler) inertia @endif>{{ $seoTitle }}</title>
    <meta name="description" content="{{ $seoDescription }}">
    <link rel="canonical" href="{{ $canonicalUrl }}">
    <meta name="robots" content="{{ $robotsDirective }}">
    <meta name="theme-color" content="#0F2321">
    <meta name="author" content="BanyuWening Smart Aquaculture">
    <meta name="keywords" content="BanyuWening, Smart Aquaculture IoT, Monitoring Kualitas Air Kolam Lele, ESP32 Multi-Kolam, Edge Fuzzy Logic, Prediksi Kualitas Air Random Forest, WeningBot WhatsApp">

    <!-- Open Graph / WhatsApp / Facebook / LinkedIn Link Preview -->
    <meta property="og:title" content="{{ $seoTitle }}">
    <meta property="og:description" content="{{ $seoDescription }}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="BanyuWening">
    <meta property="og:locale" content="id_ID">
    <meta property="og:url" content="{{ $canonicalUrl }}">
    <meta property="og:image" content="{{ $ogImageUrl }}">
    <meta property="og:image:secure_url" content="{{ $ogImageUrl }}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="BanyuWening — Smart Aquaculture IoT Multi-Kolam &amp; AI">
    <link rel="image_src" href="{{ $ogImageUrl }}">

    <!-- Twitter / X Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{ $seoTitle }}">
    <meta name="twitter:description" content="{{ $seoDescription }}">
    <meta name="twitter:image" content="{{ $ogImageUrl }}">
    <meta name="twitter:image:alt" content="BanyuWening — Smart Aquaculture IoT Multi-Kolam &amp; AI">

    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/svg+xml" href="/brand/favicon.svg">
    <link rel="apple-touch-icon" sizes="180x180" href="/brand/apple-touch-icon.png">

    @if (!$isSocialCrawler)
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @if (!$isPrivate)
    <script type="application/ld+json">{!! json_encode($structuredData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) !!}</script>
    @endif
    <script>document.documentElement.classList.add('js')</script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Geist:wght@300..800&family=JetBrains+Mono:wght@400;500;700&family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="/vendor/three.min.js"></script>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
    @endif
</head>
<body class="font-sans antialiased selection:bg-brand selection:text-brand-ink min-h-screen">
    @if ($isSocialCrawler)
    <main>
        <h1>{{ $seoTitle }}</h1>
        <p>{{ $seoDescription }}</p>
        <img src="{{ $ogImageUrl }}" alt="{{ $seoTitle }}" width="1200" height="630">
    </main>
    @else
    @inertia
    @endif
</body>
</html>
