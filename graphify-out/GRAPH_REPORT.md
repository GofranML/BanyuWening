# Graph Report - web-BanyuWening  (2026-11-12)

## Corpus Check
- 141 files · ~73,276 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: (none) 18, .conf 2, .example 1)

## Summary
- 598 nodes · 1152 edges · 41 communities (18 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- IoT Telemetry & ML Queue
- IoT Telemetry & ML Queue
- Database Schema & Migrations
- Python ML Random Forest Engine
- Database Schema & Migrations
- Bot & Alert Notification System
- Bot & Alert Notification System
- Bot & Alert Notification System
- TypeScript Build Configuration
- Two-Factor Authentication (2FA)
- Two-Factor Authentication (2FA)
- End-to-End & Backend Test Suite
- Two-Factor Authentication (2FA)
- Landing Page CMS & Content
- Database Schema & Migrations
- NPM Package Dependencies
- Subsystem Application
- REST API Telemetry Ingestion
- Subsystem Dev
- End-to-End & Backend Test Suite
- Subsystem Middleware
- NPM Package Dependencies
- Subsystem Serviceprovider
- IoT Telemetry & ML Queue
- Subsystem Autoload
- Subsystem Exampletest
- Subsystem Dev
- Subsystem Extra

## God Nodes (most connected - your core abstractions)
1. `BanyuWeningMigrationTest` - 27 edges
2. `lucide-react` - 25 edges
3. `DashboardController` - 22 edges
4. `SensorReading` - 22 edges
5. `Dashboard()` - 22 edges
6. `react` - 21 edges
7. `User` - 19 edges
8. `compilerOptions` - 18 edges
9. `Prediction` - 16 edges
10. `PredictWaterQualityJob` - 15 edges

## Surprising Connections (you probably didn't know these)
- `audit_inference_edge_cases()` --calls--> `predict_single()`  [INFERRED]
  ml/test_ml_pipeline.py → ml/src/predict.py
- `ApiController` --inherits--> `Controller`  [EXTRACTED]
  laravel-app/app/Http/Controllers/ApiController.php → laravel-app/app/Http/Controllers/Controller.php
- `DashboardController` --inherits--> `Controller`  [EXTRACTED]
  laravel-app/app/Http/Controllers/DashboardController.php → laravel-app/app/Http/Controllers/Controller.php
- `AlertsSectionProps` --references--> `AlertItem`  [EXTRACTED]
  laravel-app/resources/js/Components/AlertsSection.tsx → laravel-app/resources/js/Types/index.ts
- `ChartsSectionProps` --references--> `SensorReading`  [EXTRACTED]
  laravel-app/resources/js/Components/ChartsSection.tsx → laravel-app/resources/js/Types/index.ts

## Import Cycles
- None detected.

## Communities (41 total, 23 thin omitted)

### Community 0 - "IoT Telemetry & ML Queue"
Cohesion: 0.06
Nodes (81): AeratorControlDialog(), AeratorControlDialogProps, AlertsSection(), AlertsSectionProps, FilterChip, ChartsSection(), ChartsSectionProps, TimeRange (+73 more)

### Community 1 - "IoT Telemetry & ML Queue"
Cohesion: 0.06
Nodes (13): {closure#1}(), MqttSubscribeCommand, PredictWaterQualityJob, Alert, Device, DispatchLog, NotificationSetting, Prediction (+5 more)

### Community 2 - "Database Schema & Migrations"
Cohesion: 0.06
Nodes (40): dependencies, @inertiajs/react@^3.11.0, lucide-react@^1.72.0, motion@^14.12.0, qrcode.react@^4.2.0, react@^19.3.1, react-dom@^19.3.1, recharts@^3.10.1 (+32 more)

### Community 3 - "Python ML Random Forest Engine"
Cohesion: 0.11
Nodes (14): evaluate_model(), extract_features(), transform_dataframe(), get_action_recommendation(), main(), predict_single(), clean_dataframe(), clean_sensor_reading() (+6 more)

### Community 4 - "Database Schema & Migrations"
Cohesion: 0.09
Nodes (18): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#1}(), {closure#2}(), {closure#3}() (+10 more)

### Community 6 - "Bot & Alert Notification System"
Cohesion: 0.16
Nodes (23): SubTabId, SuperAdminNotificationConfig(), addDispatchLog(), clearDispatchLogs(), DEFAULT_NOTIFICATION_CONFIG, DispatchLogItem, EmailConfig, EmailEncryption (+15 more)

### Community 8 - "TypeScript Build Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx (+11 more)

### Community 9 - "Two-Factor Authentication (2FA)"
Cohesion: 0.18
Nodes (3): AuthController, Controller, LandingController

### Community 11 - "End-to-End & Backend Test Suite"
Cohesion: 0.23
Nodes (3): EndToEndPipelineTest, ExampleTest, TestCase

### Community 15 - "Database Schema & Migrations"
Cohesion: 0.22
Nodes (8): description, keywords, license, minimum-stability, name, prefer-stable, $schema, type

### Community 16 - "NPM Package Dependencies"
Cohesion: 0.22
Nodes (9): scripts, dev, post-autoload-dump, post-create-project-cmd, post-root-package-install, post-update-cmd, pre-package-uninstall, setup (+1 more)

### Community 17 - "Subsystem Application"
Cohesion: 0.32
Nodes (3): {closure#1}(), {closure#2}(), {closure#3}()

### Community 19 - "Subsystem Dev"
Cohesion: 0.25
Nodes (8): require-dev, fakerphp/faker, laravel/pail, laravel/pao, laravel/pint, mockery/mockery, nunomaduro/collision, phpunit/phpunit

### Community 22 - "NPM Package Dependencies"
Cohesion: 0.29
Nodes (7): pestphp/pest-plugin, php-http/discovery, config, allow-plugins, optimize-autoloader, preferred-install, sort-packages

### Community 24 - "IoT Telemetry & ML Queue"
Cohesion: 0.33
Nodes (6): require, inertiajs/inertia-laravel, laravel/framework, laravel/tinker, php, php-mqtt/client

### Community 25 - "Subsystem Autoload"
Cohesion: 0.40
Nodes (5): autoload, psr-4, App\\, Database\\Factories\\, Database\\Seeders\\

### Community 31 - "Subsystem Dev"
Cohesion: 0.67
Nodes (3): autoload-dev, psr-4, Tests\\

### Community 32 - "Subsystem Extra"
Cohesion: 0.67
Nodes (3): extra, laravel, dont-discover

## Knowledge Gaps
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Bot & Alert Notification System` to `Two-Factor Authentication (2FA)`, `Feature Migration Test Suite`, `Dashboard Controller & Actions`, `IoT Telemetry & ML Queue`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `IoT Telemetry & ML Queue` be split into smaller, more focused modules?**
  _Cohesion score 0.05660377358490566 - nodes in this community are weakly interconnected._
- **Why does `BanyuWeningMigrationTest` connect `Bot & Alert Notification System` to `End-to-End & Backend Test Suite`, `Feature Migration Test Suite`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `IoT Telemetry & ML Queue` be split into smaller, more focused modules?**
  _Cohesion score 0.05809802012333658 - nodes in this community are weakly interconnected._
- **Why does `SensorReading` connect `IoT Telemetry & ML Queue` to `Feature Migration Test Suite`, `Dashboard Controller & Actions`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `Database Schema & Migrations` be split into smaller, more focused modules?**
  _Cohesion score 0.05990338164251208 - nodes in this community are weakly interconnected._
- **Should `Python ML Random Forest Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.1101010101010101 - nodes in this community are weakly interconnected._