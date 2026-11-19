# Graph Report - web-BanyuWening  (2026-11-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 696 nodes · 1242 edges · 48 communities (26 shown, 22 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fc009dba`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Dashboard.tsx
- DashboardController.php
- package.json
- predict.py
- Illuminate\Database\Schema\Blueprint
- User
- notification-config.ts
- BanyuWeningMigrationTest
- compilerOptions
- AuthController.php
- Illuminate\Http\Request
- TestCase
- TwoFactorService
- design.md — Sistem Desain Dashboard BanyuWening
- LandingContent
- composer.json
- scripts
- bootstrap/app.php
- web.php
- require-dev
- ComprehensiveBackendTest
- HandleInertiaRequests.php
- config
- AppServiceProvider
- require
- psr-4
- ExampleTest
- autoload-dev
- extra
- Product Requirements Document — BanyuWening
- plan.md — Rencana Implementasi BanyuWening
- laravel-app/README.md
- ml/README.md
- Laravel Application
- Laravel Application
- BanyuWening Production Deployment Guide

## God Nodes (most connected - your core abstractions)
1. `BanyuWeningMigrationTest` - 27 edges
2. `lucide-react` - 25 edges
3. `SensorReading` - 22 edges
4. `DashboardController` - 22 edges
5. `Dashboard()` - 22 edges
6. `react` - 21 edges
7. `User` - 19 edges
8. `compilerOptions` - 18 edges
9. `Prediction` - 16 edges
10. `PredictWaterQualityJob` - 15 edges

## Surprising Connections (you probably didn't know these)
- `audit_inference_edge_cases()` --calls--> `predict_single()`  [INFERRED]
  ml/test_ml_pipeline.py → ml/src/predict.py
- `AlertsSectionProps` --references--> `AlertItem`  [EXTRACTED]
  laravel-app/resources/js/Components/AlertsSection.tsx → laravel-app/resources/js/Types/index.ts
- `ChartsSectionProps` --references--> `SensorReading`  [EXTRACTED]
  laravel-app/resources/js/Components/ChartsSection.tsx → laravel-app/resources/js/Types/index.ts
- `PredictionPanelProps` --references--> `PredictionResult`  [EXTRACTED]
  laravel-app/resources/js/Components/PredictionPanel.tsx → laravel-app/resources/js/Types/index.ts
- `AnalisDetailedDataProps` --references--> `SensorReading`  [EXTRACTED]
  laravel-app/resources/js/Components/roles/AnalisDetailedData.tsx → laravel-app/resources/js/Types/index.ts

## Import Cycles
- None detected.

## Communities (48 total, 22 thin omitted)

### Community 0 - "Dashboard.tsx"
Cohesion: 0.06
Nodes (81): AeratorControlDialog(), AeratorControlDialogProps, AlertsSection(), AlertsSectionProps, FilterChip, ChartsSection(), ChartsSectionProps, TimeRange (+73 more)

### Community 1 - "DashboardController.php"
Cohesion: 0.05
Nodes (13): {closure#1}(), MqttSubscribeCommand, PredictWaterQualityJob, Alert, Device, DispatchLog, NotificationSetting, Prediction (+5 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, @inertiajs/react@^3.11.0, lucide-react@^1.72.0, motion@^14.12.0, qrcode.react@^4.2.0, react@^19.3.1, react-dom@^19.3.1, recharts@^3.10.1 (+32 more)

### Community 3 - "predict.py"
Cohesion: 0.11
Nodes (14): evaluate_model(), extract_features(), transform_dataframe(), get_action_recommendation(), main(), predict_single(), clean_dataframe(), clean_sensor_reading() (+6 more)

### Community 4 - "Illuminate\Database\Schema\Blueprint"
Cohesion: 0.09
Nodes (18): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#1}(), {closure#2}(), {closure#3}() (+10 more)

### Community 6 - "notification-config.ts"
Cohesion: 0.16
Nodes (23): SubTabId, SuperAdminNotificationConfig(), addDispatchLog(), clearDispatchLogs(), DEFAULT_NOTIFICATION_CONFIG, DispatchLogItem, EmailConfig, EmailEncryption (+15 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx (+11 more)

### Community 9 - "AuthController.php"
Cohesion: 0.18
Nodes (3): AuthController, Controller, LandingController

### Community 11 - "TestCase"
Cohesion: 0.23
Nodes (3): EndToEndPipelineTest, ExampleTest, TestCase

### Community 13 - "design.md — Sistem Desain Dashboard BanyuWening"
Cohesion: 0.07
Nodes (28): 10. Aksesibilitas, 11. Copy (kosakata), 12. Implementasi (Tailwind v4), 1. Prinsip, 2.1 Token dasar, 2.2 Token status, 2.3 Kontras terukur (WCAG 2.2), 2.4 Aturan (+20 more)

### Community 15 - "composer.json"
Cohesion: 0.22
Nodes (8): description, keywords, license, minimum-stability, name, prefer-stable, $schema, type

### Community 16 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, dev, post-autoload-dump, post-create-project-cmd, post-root-package-install, post-update-cmd, pre-package-uninstall, setup (+1 more)

### Community 17 - "bootstrap/app.php"
Cohesion: 0.32
Nodes (3): {closure#1}(), {closure#2}(), {closure#3}()

### Community 19 - "require-dev"
Cohesion: 0.25
Nodes (8): require-dev, fakerphp/faker, laravel/pail, laravel/pao, laravel/pint, mockery/mockery, nunomaduro/collision, phpunit/phpunit

### Community 22 - "config"
Cohesion: 0.29
Nodes (7): pestphp/pest-plugin, php-http/discovery, config, allow-plugins, optimize-autoloader, preferred-install, sort-packages

### Community 24 - "require"
Cohesion: 0.33
Nodes (6): require, inertiajs/inertia-laravel, laravel/framework, laravel/tinker, php, php-mqtt/client

### Community 25 - "psr-4"
Cohesion: 0.40
Nodes (5): autoload, psr-4, App\\, Database\\Factories\\, Database\\Seeders\\

### Community 31 - "autoload-dev"
Cohesion: 0.67
Nodes (3): autoload-dev, psr-4, Tests\\

### Community 32 - "extra"
Cohesion: 0.67
Nodes (3): extra, laravel, dont-discover

### Community 41 - "Product Requirements Document — BanyuWening"
Cohesion: 0.09
Nodes (22): 10. Milestone dan Penyesuaian Jadwal Proyek, 11. Risiko Khusus & Mitigasi Tambahan BanyuWening 2.0, 1. Latar Belakang dan Masalah, 2. Tujuan Produk, 3. Pengguna dan Peran, 4. Ruang Lingkup, 5.1 Node Sensor & Edge Controller (ESP32 Mini-PLC), 5.2 Manajemen Konfigurasi Aktuator (Relay Initiator & Registry) (+14 more)

### Community 42 - "plan.md — Rencana Implementasi BanyuWening"
Cohesion: 0.11
Nodes (18): 0. Keputusan yang harus dikunci minggu ini, 1. Struktur Repositori, 2.1 Topik MQTT, 2.2 Payload telemetry, 2.3 Payload control, 2.4 Skema database (Supabase), 2.5 REST API (FastAPI), 2. Kontrak Data (dikunci lebih dulu) (+10 more)

### Community 43 - "laravel-app/README.md"
Cohesion: 0.25
Nodes (7): About Laravel, Agentic Development, Code of Conduct, Contributing, Learning Laravel, License, Security Vulnerabilities

### Community 44 - "ml/README.md"
Cohesion: 0.29
Nodes (6): 1. Pelatihan Model, 2. Inferensi Prediksi untuk Laravel, Cara Menjalankan, Parameter & Fitur Input, Struktur Direktori, Target Klasifikasi

### Community 45 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 46 - "Laravel Application"
Cohesion: 0.50
Nodes (3): Agent Setup, Laravel Application, Prerequisites

### Community 47 - "BanyuWening Production Deployment Guide"
Cohesion: 0.50
Nodes (3): 1. Supervisor Configuration (Queue & MQTT), 2. Environment Variables Production Checklist (`.env`), BanyuWening Production Deployment Guide

## Knowledge Gaps
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `AuthController.php`, `BanyuWeningMigrationTest.php`, `DashboardController.php`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `Dashboard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05660377358490566 - nodes in this community are weakly interconnected._
- **Why does `BanyuWeningMigrationTest` connect `BanyuWeningMigrationTest` to `TestCase`, `BanyuWeningMigrationTest.php`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `DashboardController.php` be split into smaller, more focused modules?**
  _Cohesion score 0.050940438871473356 - nodes in this community are weakly interconnected._
- **Why does `SensorReading` connect `DashboardController.php` to `BanyuWeningMigrationTest.php`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05990338164251208 - nodes in this community are weakly interconnected._
- **Should `predict.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1101010101010101 - nodes in this community are weakly interconnected._