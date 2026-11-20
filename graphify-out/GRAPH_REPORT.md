# Graph Report - web-BanyuWening  (2026-11-20)

## Corpus Check
- 351 files · ~425,379 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 136 file(s) not represented in the graph (top: .csv 80, .joblib 31, (none) 18)
- WARNING: 136 of 487 files seen (28%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 643 nodes · 1270 edges · 42 communities (19 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 30
- Community 32
- Community 33

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
- `PredictWaterQualityJob` --references--> `SensorReading`  [EXTRACTED]
  laravel-app/app/Jobs/PredictWaterQualityJob.php → laravel-app/app/Models/SensorReading.php
- `AlertsSectionProps` --references--> `AlertItem`  [EXTRACTED]
  laravel-app/resources/js/Components/AlertsSection.tsx → laravel-app/resources/js/Types/index.ts

## Import Cycles
- None detected.

## Communities (42 total, 23 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (81): AeratorControlDialog(), AeratorControlDialogProps, AlertsSection(), AlertsSectionProps, FilterChip, ChartsSection(), ChartsSectionProps, TimeRange (+73 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (11): {closure#1}(), MqttSubscribeCommand, Alert, Device, DispatchLog, NotificationSetting, Prediction, RelayLog (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (28): evaluate_model(), extract_features(), transform_dataframe(), get_action_recommendation(), main(), predict_single(), clean_dataframe(), clean_sensor_reading() (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (40): dependencies, @inertiajs/react@^3.11.0, lucide-react@^1.72.0, motion@^14.12.0, qrcode.react@^4.2.0, react@^19.3.1, react-dom@^19.3.1, recharts@^3.10.1 (+32 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (18): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#1}(), {closure#2}(), {closure#3}() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (23): SubTabId, SuperAdminNotificationConfig(), addDispatchLog(), clearDispatchLogs(), DEFAULT_NOTIFICATION_CONFIG, DispatchLogItem, EmailConfig, EmailEncryption (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (3): AuthController, Controller, LandingController

### Community 11 - "Community 11"
Cohesion: 0.20
Nodes (6): build(), fmt(), footer(), img(), p(), read_inputs()

### Community 12 - "Community 12"
Cohesion: 0.24
Nodes (3): DatabaseSeeder, ExampleTest, TestCase

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (8): description, keywords, license, minimum-stability, name, prefer-stable, $schema, type

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (9): scripts, dev, post-autoload-dump, post-create-project-cmd, post-root-package-install, post-update-cmd, pre-package-uninstall, setup (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.32
Nodes (3): {closure#1}(), {closure#2}(), {closure#3}()

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (8): require-dev, fakerphp/faker, laravel/pail, laravel/pao, laravel/pint, mockery/mockery, nunomaduro/collision, phpunit/phpunit

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (7): pestphp/pest-plugin, php-http/discovery, config, allow-plugins, optimize-autoloader, preferred-install, sort-packages

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (6): require, inertiajs/inertia-laravel, laravel/framework, laravel/tinker, php, php-mqtt/client

### Community 26 - "Community 26"
Cohesion: 0.40
Nodes (5): autoload, psr-4, App\\, Database\\Factories\\, Database\\Seeders\\

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (3): autoload-dev, psr-4, Tests\\

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (3): extra, laravel, dont-discover

## Knowledge Gaps
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Community 5` to `Community 9`, `Community 28`, `Community 12`, `Community 1`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05660377358490566 - nodes in this community are weakly interconnected._
- **Why does `BanyuWeningMigrationTest` connect `Community 7` to `Community 28`, `Community 12`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.053554040895813046 - nodes in this community are weakly interconnected._
- **Why does `SensorReading` connect `Community 1` to `Community 12`, `Community 28`, `Community 13`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0712280701754386 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05990338164251208 - nodes in this community are weakly interconnected._