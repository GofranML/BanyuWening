# plan.md — Rencana Implementasi BanyuWening

Acuan: `PRD_BanyuWening.md` v2.1, `design.md` (tampilan), dan addendum rencana §7 di bawah.
Revisi: **20 November 2026**. Deadline produk saat ini: **15 Januari 2027**.

> **Prioritas dokumen:** §7 adalah re-baseline yang mengikat untuk arsitektur multi-kolam, hardware v2, operasi offline/PLN, Edge Fuzzy, cloud selalu aktif, Random Forest, HITL, OTA, dan WhatsApp-first. Bagian lama tetap menjadi referensi kontrak/dashboard yang belum bertentangan; semua target Telegram-only, free-tier, kontrol cloud tanpa gate, dan asumsi satu kolam per device dinyatakan superseded.

**Prinsip:** setiap subsistem diuji sendiri sebelum diintegrasikan. Kontrak data (payload MQTT, skema DB, API) dikunci lebih dulu supaya web, backend, dan firmware bisa dikerjakan paralel tanpa menunggu hardware.

---

## 0. Keputusan yang harus dikunci minggu ini

Tanpa ini, pekerjaan setelahnya akan diulang.

- [ ] Kunci batas warning/danger bersama ahli budidaya dan catat sumber setiap parameter; jangan memakai label lama sebagai standar tanpa validasi.
- [ ] Verifikasi skema Core Hub, alamat I2C ADS1115, beban relay, isolasi, serta uji noise kabel sensor shielded sampai 35 m.
- [ ] Ukur runtime UPS 2S dan kunci kebijakan saat PLN padam. Aerator/pompa 220 V tidak dijalankan UPS hub.
- [ ] Kunci Sensor Health Watchdog dan graceful degradation: fault/saturation mengeluarkan parameter rusak dari keputusan, bukan memaksakan default palsu.
- [ ] Kunci target data pilot 90 hari, jadwal DO meter/test kit amonia, dan format label untuk risiko 1/2/3 jam.
- [ ] Kunci kontrak MQTT/API/DB dengan `device_id` dan `pond_id` sebelum integrasi.
- [ ] Kunci penyedia WhatsApp Gateway, SLA, opt-in, biaya, dan jalur sekunder Telegram/PWA.
- [ ] **Auth dashboard**: pakai Supabase Auth (disarankan, sudah ada di stack) atau JWT FastAPI sendiri.
- [ ] **Realtime ke dashboard**: Supabase Realtime pada `sensor_readings` (disarankan) atau WebSocket FastAPI. Backend dan broker wajib Always-On; free-tier sleep bukan konfigurasi produksi.

---

## 1. Struktur Repositori

Satu monorepo di GitHub:

```
banyuwening/
├── firmware/            # PlatformIO, ESP32 (C++)
├── backend/             # FastAPI (Python 3.11)
│   ├── app/
│   │   ├── main.py          # FastAPI app, lifespan start MQTT client
│   │   ├── mqtt_worker.py   # subscribe banyuwening/#, validasi, insert
│   │   ├── schemas.py       # Pydantic: Telemetry, Command, Prediction
│   │   ├── rules.py         # ambang batas deterministik (sumber tunggal)
│   │   ├── features.py      # rolling mean, slope
│   │   ├── predict.py       # load model .joblib, inferensi
│   │   ├── notify.py        # Telegram + cooldown
│   │   ├── db.py            # koneksi Supabase/Postgres
│   │   └── routers/         # readings, predictions, alerts, relay, devices
│   └── tests/
├── ml/                  # notebook EDA, training, evaluasi, model/*.joblib
├── web/                 # Next.js 15 (App Router, TypeScript, Tailwind)
├── db/migrations/       # SQL skema Supabase
└── docs/                # PRD, plan, design, logo, laporan
```

---

## 2. Kontrak Data (dikunci lebih dulu)

### 2.1 Topik MQTT

| Topik | Arah | QoS | Isi |
|-------|------|-----|-----|
| `banyuwening/{device_id}/{pond_id}/telemetry` | ESP32 → cloud | 1 | Pembacaan lokal 30 detik; upload dapat diagregasi 5 menit |
| `banyuwening/{device_id}/status` | ESP32 → cloud | 1, retained | `online`/`offline` (LWT), WiFi, PLN/UPS, mode, versi firmware |
| `banyuwening/{device_id}/{pond_id}/control` | cloud → ESP32 | 1 | Usulan/perintah relay tervalidasi dengan `cmd_id`, TTL, dan source |
| `banyuwening/{device_id}/{pond_id}/ack` | ESP32 → cloud | 1 | Hasil terima/tolak safety gate dan state relay aktual |
| `banyuwening/{device_id}/{pond_id}/config/candidate` | cloud → ESP32 | 1 | Konfigurasi Fuzzy bertanda tangan yang telah disetujui Engineer |

Satu `device_id` adalah Core Hub yang dapat mengelola hingga empat `pond_id` milik satu pemilik. Status hub berada di level device; semua data sensor, keputusan, prediksi, aktuator, dan konfigurasi wajib membawa `pond_id`.

### 2.2 Payload telemetry

```json
{
  "device_id": "BANYUWENING-01",
  "pond_id": "POND-01",
  "ts": "2026-11-10T02:15:30Z",
  "seq": 18234,
  "ph": 7.12,
  "temperature_c": 28.4,
  "tds_ppm": 352,
  "turbidity_ntu": 41.5,
  "water_level": "NORMAL",
  "relay": { "aerator": false, "pump": false },
  "mode": "AUTO",
  "power_source": "MAINS|UPS",
  "wifi_status": "CONNECTED|OFFLINE",
  "sensor_health": {"ph":"OK", "tds":"OK", "turbidity":"SATURATED"},
  "fuzzy_decision": {"risk":"WASPADA", "action":"AERATOR_ON", "config_version":"fuzzy-1.0"},
  "faults": []
}
```

- `ts` dalam UTC (ESP32 sinkron NTP). Dashboard menampilkan WIB.
- `seq` dipakai untuk mendeteksi duplikat dan data hilang.
- `faults` berisi contoh `["ph_out_of_range", "ds18b20_disconnected"]`. Nilai sensor yang gagal dikirim `null`, bukan angka palsu.
- `mode`: `AUTO` | `MANUAL` | `FAILSAFE`.

### 2.3 Payload control

```json
{ "cmd_id": "c-7f3a", "target": "aerator", "state": "ON", "source": "ML|RULE|MANUAL", "ttl_s": 900 }
```

`ttl_s`: setelah waktu habis tanpa perintah baru, ESP32 kembali ke mode AUTO. Ini mencegah relay "tersangkut" ON atau OFF kalau backend mati.

**Prioritas di ESP32 (wajib):** `hard safety bounds/interlock` > `proteksi sensor/perangkat` > `Edge Fuzzy lokal` > `cloud command tervalidasi` > `manual berotorisasi`. Kontrol lokal tetap berjalan ketika WiFi/cloud mati; relay selalu memiliki TTL, maksimum durasi, cooldown, dan duty-cycle clamp.

### 2.4 Skema database (Supabase)

```sql
create table devices (
  id text primary key,                 -- 'BANYUWENING-01'
  name text not null,
  pond_name text,
  firmware_version text,
  last_seen_at timestamptz,
  created_at timestamptz default now()
);

create table ponds (
  device_id text not null references devices(id),
  pond_id text not null,
  pond_name text not null,
  sensor_module_version text,
  fuzzy_config_version text,
  created_at timestamptz default now(),
  primary key (device_id, pond_id)
);

create table sensor_readings (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id),
  pond_id text not null,
  ts timestamptz not null,
  seq int,
  ph numeric(4,2),
  temperature_c numeric(4,1),
  tds_ppm int,
  turbidity_ntu numeric(6,1),
  water_level text check (water_level in ('NORMAL','LOW')),
  aerator_on boolean,
  mode text,
  faults text[] default '{}',
  received_at timestamptz default now(),
  unique (device_id, pond_id, ts)      -- satu hub dapat mengirim beberapa pond pada timestamp sama
);
create index on sensor_readings (device_id, pond_id, ts desc);

create table prediction_results (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id),
  pond_id text not null,
  ts timestamptz not null,             -- waktu prediksi dibuat
  horizon_min int not null check (horizon_min in (60,120,180)),
  risk text not null check (risk in ('AMAN','WASPADA','BAHAYA')),
  p_aman real, p_waspada real, p_bahaya real,
  model_version text not null,
  source_dataset_version text,
  features jsonb                       -- input yang dipakai, untuk audit
);
create index on prediction_results (device_id, pond_id, ts desc);

create table alerts (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id),
  pond_id text not null,
  ts timestamptz not null default now(),
  level text not null check (level in ('WASPADA','BAHAYA','INFO')),
  source text not null check (source in ('RULE','ML','DEVICE')),
  parameter text,                      -- 'ph', 'temperature_c', 'water_level', ...
  value numeric,
  message text not null,
  telegram_sent boolean default false,
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz
);

create table relay_logs (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id),
  pond_id text not null,
  ts timestamptz not null default now(),
  target text not null check (target in ('aerator','pump')),
  state boolean not null,
  source text not null check (source in ('ML','RULE','MANUAL','FAILSAFE')),
  requested_by uuid references auth.users(id),
  cmd_id text,
  confirmed boolean default false      -- diisi saat ESP32 membalas di topik /relay
);

create table calibration_logs (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id),
  pond_id text not null,
  ts timestamptz not null default now(),
  sensor text not null,
  notes text,
  coefficients jsonb,
  performed_by uuid references auth.users(id)
);

create table profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  role text not null check (role in ('ADMIN','OPERATOR','ANALIS','PEMILIK')),
  telegram_chat_id text
);
```

Kebijakan:
- **RLS** aktif di semua tabel. Web hanya membaca. Penulisan telemetri lewat backend memakai service role.
- **Retensi:** 30 detik × 2.880/hari ≈ 1 juta baris/tahun per perangkat. Masih aman di Supabase free tier (500 MB) untuk durasi proyek. Untuk grafik > 7 hari, buat view agregat per 5 menit dan per jam.

### 2.5 REST API (FastAPI)

| Method | Endpoint | Peran | Keterangan |
|--------|----------|-------|-----------|
| GET | `/health` | publik | dipakai cron ping agar Render tidak tidur |
| GET | `/devices` | semua | daftar perangkat + `last_seen_at` + online/offline |
| GET | `/devices/{id}/latest` | semua | pembacaan terakhir + status rule |
| GET | `/devices/{id}/readings?from&to&bucket` | semua | histori, `bucket` = `raw` / `5m` / `1h` |
| GET | `/devices/{id}/prediction/latest` | semua | prediksi terakhir |
| GET | `/devices/{id}/alerts?status` | semua | riwayat alert |
| POST | `/alerts/{id}/ack` | OPERATOR, ADMIN | tandai alert sudah ditangani |
| POST | `/devices/{id}/relay` | OPERATOR, ADMIN | `{target, state, duration_min}` → publish control |
| GET | `/devices/{id}/relay/logs` | semua | riwayat nyala aerator |
| GET | `/devices/{id}/export.csv?from&to` | ANALIS, ADMIN | ekspor |
| POST | `/devices/{id}/calibrations` | OPERATOR, ADMIN | catat kalibrasi |

Auth: dashboard mengirim JWT Supabase di header `Authorization`. FastAPI memverifikasi JWT dengan JWT secret Supabase, lalu membaca `profiles.role`.

---

## 3. Tahapan Kerja

Durasi mengikuti milestone di Project Charter. Tugas web (mata kuliah ini) ditandai **[WEB]**.

### Tahap A — Fondasi (10–23 Nov 2026), paralel dengan logging lapangan

| # | Tugas | Pemilik | Selesai bila |
|---|-------|---------|-------------|
| A1 | Kunci kontrak bagian 2, commit ke `docs/` | Gofran + Ilham | Disetujui ketiga anggota |
| A2 | Buat project Supabase, jalankan `db/migrations/001_init.sql`, aktifkan RLS | Gofran | Tabel terbentuk, uji insert via SQL editor |
| A3 | Firmware publish ke topik baru + LWT + `seq` | Gofran | MQTTX menerima payload sesuai kontrak |
| A4 | FastAPI: `mqtt_worker` → validasi Pydantic → insert. Data invalid dicatat dan dibuang | Ilham | 24 jam data masuk tanpa error |
| A5 | **[WEB]** Scaffold Next.js + Tailwind + token dari `design.md` + font + logo | Ilham | `npm run build` lolos, halaman kosong dengan header logo |
| A6 | **[WEB]** Supabase Auth + halaman login + middleware proteksi route + tabel `profiles` | Ilham | 4 akun uji (satu per peran) bisa login, route terlindungi |
| A7 | Generator data dummy (`scripts/seed_fake.py`) yang mempublish payload valid ke MQTT | Ilham | Web bisa dikembangkan tanpa hardware. **Data dummy diberi `device_id` `SIM-01`, tidak boleh tercampur dengan data lapangan** |

**Logging lapangan tetap jalan terus.** Dataset ML bergantung pada tahap ini. Setiap hari, catat kejadian (pemberian pakan, hujan, ganti air) di spreadsheet log kejadian.

### Tahap B — Dashboard inti (24 Nov – 14 Des 2026)

| # | Tugas | Selesai bila |
|---|-------|-------------|
| B1 | **[WEB]** Layout app shell: header, pemilih kolam, navigasi (sidebar desktop / tab bar mobile) | Lolos uji di 360px dan 1440px |
| B2 | **[WEB]** Halaman **Ringkasan**: kartu status kolam, 5 kartu parameter, status perangkat, status aerator | Nilai sama persis dengan baris terakhir di DB |
| B3 | **[WEB]** Realtime: subscribe Supabase Realtime `sensor_readings` (filter `device_id`). Fallback polling 30 detik | Nilai baru muncul ≤ 5 detik setelah insert |
| B4 | **[WEB]** State kosong, loading, error, **data basi** (> 2 menit), perangkat offline (LWT) | Kelima state bisa didemokan memakai data dummy |
| B5 | **[WEB]** Halaman **Grafik**: 4 grafik parameter, rentang 6 jam / 24 jam / 7 hari / custom, pita ambang aman | Grafik 7 hari memuat < 1 detik (pakai agregat 1 jam) |
| B6 | Backend: endpoint `readings` dengan `bucket` + view agregat | Dokumentasi `/docs` lengkap |
| B7 | Backend: `rules.py` ambang batas sebagai satu-satunya sumber; status rule ikut dikembalikan di `/latest` | Uji unit tiap ambang (tepat di batas, di bawah, di atas) |

### Tahap C — Backend ML & kontrol (7–20 Des 2026)

| # | Tugas | Selesai bila |
|---|-------|-------------|
| C1 | EDA dataset lapangan, data dictionary, definisi label bersama pakar | Notebook + dokumen label |
| C2 | Baseline Edge Fuzzy vs Cloud Random Forest per pond_id, horizon 1/2/3 jam, **split berdasarkan waktu** | Laporan precision/recall/F1 per kelas + confusion matrix; model shadow sampai ada label pilot tervalidasi |
| C3 | `features.py` + `predict.py`, model dimuat sekali saat startup | Inferensi < 200 ms, versi model tercatat di setiap baris prediksi |
| C4 | Pemicu prediksi setiap 5 menit (bukan setiap 30 detik), simpan ke `prediction_results` | Baris prediksi muncul berkala |
| C5 | Logika kontrol: prediksi/rule → command dengan `ttl_s` → tunggu konfirmasi `/relay` → `relay_logs.confirmed` | Uji: backend mati saat relay ON → ESP32 kembali AUTO setelah TTL |
| C6 | Channel Adapter WhatsApp-first + cooldown per (device, pond, parameter, level); Telegram/PWA sekunder | Uji: anomali beruntun tidak mengirim spam dan menyertakan pond_id |

> Bila dataset lapangan belum cukup pada 7 Des, **jangan klaim akurasi**. Tampilkan prediksi dengan label "model uji, belum tervalidasi" (lihat design.md §6.4), dan otomasi tetap memakai rule saja.

### Tahap D — Fitur dashboard lanjutan (21 Des 2026 – 3 Jan 2027)

| # | Tugas | Selesai bila |
|---|-------|-------------|
| D1 | **[WEB]** Panel **Prediksi**: kelas risiko 1–3 jam, probabilitas, parameter pemicu, versi model, disclaimer | Sesuai design.md §6.4 |
| D2 | **[WEB]** **Kontrol aerator**: toggle dengan dialog konfirmasi, pilihan durasi, status "menunggu konfirmasi perangkat", tampilkan alasan jika ditolak failsafe | Hanya OPERATOR/ADMIN yang melihat tombol. Setiap aksi tercatat di `relay_logs` |
| D3 | **[WEB]** Halaman **Peringatan**: daftar, filter level, tombol "Sudah ditangani" | Ack tersimpan beserta nama dan waktu |
| D4 | **[WEB]** Halaman **Riwayat aerator**: jam nyala per hari, sumber pemicu | Total jam nyala sesuai `relay_logs` |
| D5 | **[WEB]** **Ekspor CSV** (ANALIS/ADMIN) | File terbuka benar di Excel (UTF-8 BOM, pemisah `;` untuk locale ID) |
| D6 | **[WEB]** **Pengaturan**: profil, chat ID Telegram, kelola pengguna (ADMIN), log kalibrasi (OPERATOR) | CRUD berjalan sesuai peran |
| D7 | **[WEB]** Mode gelap, PWA manifest + ikon dari `Logo_BanyuWening/png/ikon-aplikasi-*.png` | Bisa "Add to Home Screen" di Android |

### Tahap E — Integrasi, QA, serah terima (4–15 Jan 2027)

| # | Skenario uji end-to-end (Workflow Phase 12) | Hasil yang diharapkan |
|---|---------------------------------------------|----------------------|
| E1 | Sensor → dashboard | Nilai di LCD = DB = dashboard; latensi ≤ 5 detik |
| E2 | Celup probe ke buffer pH 4 | Rule BAHAYA → relay ON → Telegram → alert di dashboard |
| E3 | Cabut router WiFi | ESP32 masuk FAILSAFE, LCD "MODE OFFLINE", dashboard "Perangkat offline" dalam ≤ 90 detik |
| E4 | Sambungkan kembali | Reconnect, status online, data berlanjut |
| E5 | Matikan backend saat relay ON manual | Relay kembali AUTO setelah TTL |
| E6 | Kirim payload rusak via MQTTX | Ditolak, tercatat, tidak ada perintah relay |
| E7 | Operator klik OFF saat failsafe aktif | Ditolak perangkat, dashboard menampilkan alasan |
| E8 | Login sebagai PEMILIK | Tombol kontrol dan ekspor tidak tampil, API mengembalikan 403 |
| E9 | Lighthouse mobile | Performance ≥ 85, Accessibility ≥ 95 |
| E10 | Pilot di kolam 3–7 hari | Laporan pilot: data hilang %, jumlah notifikasi, umpan balik petambak |

---

## 4. Deployment

| Komponen | Layanan | Catatan |
|----------|---------|---------|
| Web | Vercel | Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` |
| Backend | FastAPI Always-On | Seluruh ingestion, inferensi, evaluasi, dan alert tetap aktif; environment secrets dikelola terpisah dari firmware |
| DB | Supabase Pro | RLS, backup terjadwal, retensi/partisi 90 hari, load test target 320 pond dan sekitar 2,76 juta record/bulan pada agregasi 5 menit |
| Broker | EMQX atau Mosquitto TLS | Kredensial berbeda untuk hub dan backend; topic/ACL dibatasi per device_id dan pond_id |
| Bot | WeningBot WhatsApp-first | Channel Adapter; Telegram/PWA sekunder; gateway dan biaya operasional diuji sebelum pilot |

**Ketentuan Cloud Always-On:** jangan memakai free-tier yang menghentikan worker sebagai konfigurasi produksi. Jika cloud atau SaaS berhenti, Edge Fuzzy, relay lokal, RTC dan Store-and-Forward tetap berfungsi; tidak ada fungsi keselamatan yang bergantung pada LLM/AI Agent.

---

## 5. Definition of Done (per fitur web)

- [ ] Berfungsi di 360px dan 1440px, mode terang dan gelap
- [ ] State loading, kosong, error, dan data basi tersedia
- [ ] Bisa dioperasikan penuh dengan keyboard, fokus terlihat, label untuk screen reader
- [ ] Status risiko tidak hanya dibedakan lewat warna (ada ikon dan teks)
- [ ] Endpoint yang dipanggil memeriksa peran di server, tidak hanya disembunyikan di UI
- [ ] Tidak ada secret di kode klien
- [ ] Teks UI dalam Bahasa Indonesia, angka dengan format `id-ID` (koma desimal)

---

## 6. Pembagian Kerja

| Area | Penanggung jawab | Pendamping |
|------|------------------|-----------|
| Firmware, hardware, kalibrasi | Gofran | Monika (dokumentasi) |
| DB, MQTT, backend ingest | Gofran | Ilham |
| ML (EDA, training, evaluasi) | Gofran | Ilham |
| Backend API, kontrol, Telegram | Ilham | Gofran |
| Web dashboard **[WEB]** | Ilham | Monika (QA) |
| Test plan, QA, laporan | Monika | semua |

Rapat mingguan: review checklist tahap yang sedang berjalan + blocker. Tugas dilacak di GitHub Projects (satu issue per baris tabel di atas).

---

## 7. Re-baseline Implementasi v2.1 (mengikat)

Bagian ini menjadi urutan kerja terbaru dan menggantikan target lama yang bertentangan di §0–6. Tanggal di bawah adalah usulan re-baseline dari 20 November 2026 sampai deadline 15 Januari 2027. Durasi pengumpulan data 90 hari akan melewati deadline; karena itu serah terima Januari hanya boleh mencakup Fuzzy lokal dan RF shadow/prototipe jika label memadai, bukan klaim model cohort terverifikasi.

### 7.1 Arsitektur, perangkat, dan kontrak

| Urutan | Tugas | Penanggung jawab | Selesai bila |
|---|---|---|---|
| A1 | Bekukan definisi `device_id` = Core Hub dan `pond_id` = kolam; satu pemilik, maksimal 4 pond per hub; hapus konsep patungan tetangga | PM + IoT + Backend | Payload, SQL, RLS, API, dan UI konsisten dengan multi-pond |
| A2 | Finalisasi skematik v2: ADS1115 2/3 unit, alamat unik 0x48/0x49/0x4A, MCP23017/PCF8574, level shifter, empat port GX16, relay 4/8 channel, fuse/isolasi | IoT | BOM dan pin-map lulus review listrik dan kapasitas channel |
| A3 | Uji sensor-module: TDS MOSFET power-switch, epoxy turbidity + stilling well, float, DS18B20, filter RC/ferrite | IoT + QA | Nilai terkalibrasi; sensor fault dan recovery tercatat |
| A4 | Uji panjang kabel shielded sampai 35 m, noise, offset ADC, kelembapan, jarak aman dari kabel AC 220 V | IoT + QA | Hasil per sensor, batas pemasangan, dan rekomendasi shielding terdokumentasi |
| A5 | Uji Mini UPS 2S dua sel 18650+BMS dalam mode LCD backlight off/duty-cycle sensor | IoT + QA | Runtime terukur; klaim 6–12 jam hanya dipakai jika terkonfirmasi. Uji PLN padam memastikan beban AC aktuator mati |
| A6 | Burn-in Core Hub 48 jam, verifikasi IP65 modul kering, label garansi elektronik 12 bulan dan probe consumable/DOA 30 hari | QA + Admin | Checklist serial, hasil uji, serta materi harga/garansi disetujui |

### 7.2 Firmware Edge dan mode offline

1. Sampling sensor lokal 30 detik, RTC DS3231, sequence monotonic, log append-only LittleFS. Saat WiFi pulih, kirim backlog berurutan dengan idempotency key `(device_id, pond_id, seq)`.
2. Edge Fuzzy deterministik memutuskan aktuator lokal. Hard safety bounds/interlock dan duty-cycle clamp tidak dapat diubah oleh output model atau LLM. Local rule tetap tersedia tanpa internet/SaaS.
3. Store per `pond_id`: telemetry, sensor-health state, keputusan Fuzzy, alasan, relay command/ack, power source, WiFi state, config version, dan jam lokal/UTC.
4. Health watchdog mengklasifikasikan `OK/SATURATED/FAULT` dari flatline, stuck-at-rail, out-of-range, dan disconnected; isolasi fitur rusak serta kirim alarm setelah uplink pulih. Jangan menyebut notifikasi cloud terkirim ketika WiFi dan gateway sama-sama mati.
5. Implementasi self-tuning hanya untuk baseline dan membership normal melalui rolling median/MAD + fitur diurnal, setelah kalibrasi dan warm-up tujuh hari. Batasi perubahan per hari dan rentang fisik; bekukan saat fault, alarm, relay action, atau kalibrasi. Aturan bahaya, arah aktuator, dan output safety tidak belajar otomatis.
6. Simpan config dengan versioning dan atomic write; signed JSON config candidate wajib lolos Engineer HITL dan validasi firmware. Dual-OTA hanya manual oleh Engineer, dengan rollback bila health check gagal dalam 60 detik.

### 7.3 Data, Cloud RF, dan AI Supervisor

| Tahap | Tugas | Kriteria selesai |
|---|---|---|
| Data contract | Tambahkan tabel `ponds`; semua sensor/prediction/alert/relay/calibration/config memiliki `pond_id`; unique key menghindari tabrakan antar-kolam | Migrasi diuji untuk 1, 2, dan 4 pond pada satu device |
| Cloud | Deploy broker EMQX/Mosquitto TLS + FastAPI Always-On + Supabase Pro | Tidak ada worker tidur; TLS/ACL, retry/backlog, RLS dan backup lolos uji |
| Capacity | Sampling lokal 30 detik, upload agregat 5 menit; load test 320 pond dan retensi/aggregasi 90 hari | Throughput, biaya storage/index, dan recovery backlog terukur; target volume sekitar 2,76 juta baris per bulan |
| Calibration | Jalankan pilot 90 hari dan catat pakan, hujan, pergantian air, gejala ikan; kalibrasi DO meter dan test kit amonia sebagai label pembanding | Data dictionary, log kejadian, alat referensi, dan label diverifikasi Analis/Ahli |
| RF baseline | Model Random Forest terpisah per pond_id untuk horizon 60/120/180 menit; fitur proxy multivariat, lag/slope, perubahan, diurnal, sensor health dan missingness | Chronological train/validation/test, macro/weighted metrics, confusion matrix, calibration, model card, versi dan data window |
| Cold start | Sebelum cukup label, Edge Fuzzy + Relative Local Anomaly Detection saja; RF cloud berstatus shadow/unvalidated | Tidak ada RF command ke relay; UI menyatakan keterbatasan data dan confidence |
| Agent Supervisor | Evaluasi backlog/log, drift, model card, fuzzy proposal; buat laporan kandidat saja | Agent tidak memanggil fungsi retrain/deploy/OTA; seluruh proposal punya audit trail dan HITL Engineer |
| Candidate train | Pipeline offline terpisah menjalankan tuning/ANFIS pada data berlabel; validasi split waktu dan safety constraints | Kandidat tidak mengganti baseline sampai engineer approve dan perangkat menerima signed config |

Model prediksi risiko memerlukan target risiko pada masa depan; label tidak boleh dibuat dari data `sensor_readings_dummy.csv`. Nilai ambang ditinjau bersama ahli. Suhu 25–30 °C dan pH 6,5–8,5 dapat menjadi rentang dasar budidaya air tawar dari dokumen teknis BSIP yang mengutip SNI; warning/danger, TDS, dan turbiditas harus punya sumber/rasional yang terdokumentasi sebelum dipakai untuk label produksi. [Rujukan BSIP Kementerian Pertanian](https://lahanrawa.bsip.pertanian.go.id/storage/assets/uploads/publikasi/VxKAveS8lfXXnD6UEhW77QANsI0KkTfyKn13DCQP.pdf).

### 7.4 Channel, dashboard, dan keselamatan operasi

- WeningBot WhatsApp-first melalui Channel Adapter; Telegram dan PWA sekunder. Pesan selalu menyebut kolam, sumber keputusan, fault, dan tindakan yang disarankan.
- Perbedaan state `WiFi OFFLINE` dan `PLN OUTAGE` terlihat di dashboard/log; status PLN dapat diinferensikan dari power-path monitor yang disetujui pada desain hardware.
- Dashboard memiliki pemilih kolam; status sensor health, mode Offline-Plus, prediksi per horizon, model version, alert, dan log relay per `pond_id`.
- Kontrol AI hanya rekomendasi/shadow. Operator manual tetap tunduk pada interlock lokal; cloud tidak bisa meniadakan Fuzzy/safety.
- Setiap akurasi ML diberi dataset window, label version, pond_id, horizon, split waktu, dan indikator data label proxy/ground truth.

### 7.5 Jadwal re-baseline

| Periode usulan | Fokus | Hasil |
|---|---|---|
| 20–27 Nov 2026 | Revisi PRD, data contract, target/ambang, review alamat I2C dan keselamatan | Skema v2 dan protokol disetujui |
| 28 Nov–13 Des 2026 | Carrier/sensor module, firmware Fuzzy + watchdog + LittleFS, UPS/EMI tests | Prototype offline-first; laporan bench test |
| 7–27 Des 2026 | MQTT TLS/FastAPI/Supabase Pro, multi-pond schema, ingest dan backlog | Cloud always-on menerima pond_id dan idempotent replay |
| 14 Des 2026–4 Jan 2027 | Pilot labeling, WhatsApp adapter, dashboard multi-pond, RF shadow baseline | Dashboard/bot dan evaluasi awal; RF tetap unvalidated bila ground truth kurang |
| 5–15 Jan 2027 | Integrasi, QA WiFi/PLN/sensor fault/OTA, dokumen biaya dan handover | Release gate; RF production hanya bila 90 hari label dan evaluasi independen tersedia |

### 7.6 Definition of Done v2.1

- [ ] Uji 1 dan 4 pond membuktikan routing `pond_id` benar untuk telemetry, log, control, model, alert, dan UI.
- [ ] WiFi mati: Fuzzy lokal + relay + LittleFS tetap berfungsi; replay saat reconnect tidak kehilangan/duplikasi data.
- [ ] PLN mati: core tetap logging selama runtime yang diukur; aerator AC tidak diklaim aktif.
- [ ] Sensor stuck/fault terdeteksi, fitur diisolasi, dan tidak membuat relay aktif tanpa batas.
- [ ] Config self-tuning hanya bergerak dalam batas, tercatat, dapat rollback, dan tidak menyentuh emergency limits.
- [ ] AI Agent tidak dapat melakukan self-training atau OTA; config candidate melewati Engineer HITL dan validasi ESP32.
- [ ] RF untuk risiko memiliki labels yang disetujui, horizon 60/120/180 menit, split waktu, laporan per kelas, dan status validasi jelas.
- [ ] 48 jam burn-in, panjang kabel 35 m, UPS runtime, dan load test 320 pond didokumentasikan sebelum klaim produk.

### 7.7 Pemetaan lima kanal sensor dan dataset publik untuk benchmark

Satu modul kolam membawa **5 kanal sensor**: analog pH, analog TDS ber-MOSFET, analog turbidity, digital suhu DS18B20, dan digital float switch. DO/NH3 adalah instrumen ground-truthing pilot, bukan sensor standar. Pencarian Kaggle CLI 20 Nov 2026 menemukan bahwa tidak ada dataset yang terverifikasi cocok dengan kelima kanal dan tujuan prediksi risiko lele 1-3 jam sekaligus.

| Sumber | Cakupan yang cocok | Keputusan implementasi |
|---|---|---|
| `ogbuokiriblessing/sensor-based-aquaponics-fish-pond-datasets` | Time series catfish multi-kolam; suhu, pH, turbidity; dataset juga memuat DO/NH3/nitrat dan pertumbuhan ikan | Dataset benchmark utama. Gunakan hanya kanal paket standar yang tersedia, lakukan watchdog/rentang fisik, label proxy masa depan dari pH+suhu, horizon 60/120/180 menit, split kronologis per file/pond. Tidak menyebut hasil sebagai ground truth biologis. |
| `jocelyndumlao/iot-monitoring-of-water-quality-and-tilapia` | Data hourly aquaculture dan `Health Status` masa depan; pH/suhu/turbidity plus DO; spesies tilapia | Benchmark tujuan kesehatan eksternal; latih fitur pH/suhu/turbidity saja, target `Health Status` masa depan 1/2/3 jam. Sajikan terpisah karena beda spesies dan label sumber. |
| `bobsis/small-aquaculture-fishpond` | pH, TDS, suhu (3/5 sensor) | Referensi coverage sensor; tidak berlabel risiko, jadi tidak masuk metrik klasifikasi risiko. |
| `apgopi/fish-pond-water-contamination-dataset` | Kontaminasi kolam dengan pH/suhu/turbidity dan parameter tambahan | Tidak dipakai; lisensi Kaggle unknown. |

Unduh sumber terpilih melalui Kaggle CLI dengan provenance/versi dan pertahankan file `sensor_readings_dummy.csv` hanya untuk fixture software—jangan gunakan dummy untuk EDA ilmiah, fit, validasi, atau metrik. Sebelum penggantian dataset, inventaris/hash file lama; ganti hanya isi `ml/datasets/` selain fixture tersebut. Catat file sumber, lisensi, kelengkapan kanal, rentang sensor invalid, target, dan horizon di artefak eksperimen.

Kriteria RF benchmark: dataset catfish dan tilapia diproses independen; tidak ada penggabungan pond/spesies untuk training. Ambang kelas catfish menggunakan pH/suhu masa depan sebagai proxy engineering; kanal rusak di luar rentang fisik ditandai dan diisolasi. Benchmark tilapia memakai label `Health Status` yang tersedia pada waktu target. Masing-masing horizon 60/120/180 menit menggunakan split waktu (80:20 chronological holdout), laporan precision/recall/F1 macro/weighted dan confusion matrix. Kegagalan dataset yang terlalu sparse/korup dicatat, tidak disamarkan. Semua hasil Kaggle berstatus exploratory/shadow; model produksi menunggu label pilot lele 90 hari tervalidasi dan persetujuan engineer.


### 7.8 Hasil tuning jumlah pohon baseline RF (20 November 2026)

Uji 100/200/300/500/800 pohon dengan 3-fold chronological TimeSeriesSplit pada 15 kombinasi yang trainable menghasilkan mean CV macro-F1 berturut-turut 0,554153; 0,551867; 0,554355; 0,553540; 0,554714. Dengan aturan smallest-within-0.005-of-peak, baseline dipilih **100 pohon**. Selisihnya dari puncak hanya 0,000561. Holdout 100 vs 300 memberi perubahan mean macro-F1 -0,000561 dan waktu fit sekitar 2,71x. Gap train-validasi rata-rata sekitar 0,349 tetap besar di semua ukuran; penambahan pohon bukan mitigasi overfitting. Model masih shadow-only; lanjutkan dengan pilot berlabel independen, split pond/time, kalibrasi probabilitas, dan evaluasi eksternal sebelum keputusan produksi. Artefak: `random_forest_prd_update_experiment/results/comparison/forest_size_cv_summary.csv`, `forest_size_cv_curve.png`, `holdout_100_vs_300.csv`.
