# plan.md — Rencana Implementasi BanyuWening

Acuan: `PRD_BanyuWening.md` (kebutuhan), `design.md` (tampilan), `BanyuWening_Master_Workflow.txt` (urutan kerja).
Hari ini: **10 November 2026**. Hardware dan logging lapangan sedang berjalan (fase 09/11–06/12). Deadline: **15 Januari 2027**.

**Prinsip:** setiap subsistem diuji sendiri sebelum diintegrasikan. Kontrak data (payload MQTT, skema DB, API) dikunci lebih dulu supaya web, backend, dan firmware bisa dikerjakan paralel tanpa menunggu hardware.

---

## 0. Keputusan yang harus dikunci minggu ini

Tanpa ini, pekerjaan setelahnya akan diulang.

- [ ] **Kontrak payload MQTT** (bagian 2), disetujui firmware + backend.
- [ ] **Inkonsistensi brief** (PRD §12): catu daya, relay DC, sensor final, ambang pH failsafe.
- [ ] **Perilaku saat sensor gagal**: aerator ON default atau tetap pada state terakhir.
- [ ] **Auth dashboard**: pakai Supabase Auth (disarankan, sudah ada di stack) atau JWT FastAPI sendiri.
- [ ] **Realtime ke dashboard**: Supabase Realtime pada `sensor_readings` (disarankan) atau WebSocket FastAPI. Catatan: Render free tier tidur setelah idle, jadi WebSocket bisa putus.

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
| `banyuwening/{device_id}/telemetry` | ESP32 → cloud | 1 | Pembacaan sensor tiap 30 detik |
| `banyuwening/{device_id}/status` | ESP32 → cloud | 1, retained | `online`/`offline` (LWT), mode, versi firmware |
| `banyuwening/{device_id}/control` | cloud → ESP32 | 1 | Perintah relay |
| `banyuwening/{device_id}/relay` | ESP32 → cloud | 1 | Konfirmasi state relay sesudah dieksekusi |

> Flowchart memakai `banyuwening/telemetry` dan `banyuwening/control`. Menambahkan `{device_id}` membuat sistem siap untuk unit ke-2 (charter menganggarkan 2 unit) tanpa mengubah kontrak.

### 2.2 Payload telemetry

```json
{
  "device_id": "BANYUWENING-01",
  "ts": "2026-11-10T02:15:30Z",
  "seq": 18234,
  "ph": 7.12,
  "temperature_c": 28.4,
  "tds_ppm": 352,
  "turbidity_ntu": 41.5,
  "water_level": "NORMAL",
  "relay": { "aerator": false, "pump": false },
  "mode": "AUTO",
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

**Prioritas di ESP32 (wajib):** `FAILSAFE lokal` > `MANUAL` > `ML/RULE cloud`. Perintah OFF dari cloud ditolak selama rule lokal masih memicu ON.

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

create table sensor_readings (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id),
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
  unique (device_id, ts)               -- tolak duplikat
);
create index on sensor_readings (device_id, ts desc);

create table prediction_results (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id),
  ts timestamptz not null,             -- waktu prediksi dibuat
  horizon_min int not null,            -- 60..180
  risk text not null check (risk in ('AMAN','WASPADA','BAHAYA')),
  p_aman real, p_waspada real, p_bahaya real,
  model_version text not null,
  features jsonb                       -- input yang dipakai, untuk audit
);
create index on prediction_results (device_id, ts desc);

create table alerts (
  id bigint generated always as identity primary key,
  device_id text not null references devices(id),
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
| C2 | Baseline rule-based vs XGBoost, **split berdasarkan waktu** | Laporan precision/recall/F1 per kelas + confusion matrix |
| C3 | `features.py` + `predict.py`, model dimuat sekali saat startup | Inferensi < 200 ms, versi model tercatat di setiap baris prediksi |
| C4 | Pemicu prediksi setiap 5 menit (bukan setiap 30 detik), simpan ke `prediction_results` | Baris prediksi muncul berkala |
| C5 | Logika kontrol: prediksi/rule → command dengan `ttl_s` → tunggu konfirmasi `/relay` → `relay_logs.confirmed` | Uji: backend mati saat relay ON → ESP32 kembali AUTO setelah TTL |
| C6 | `notify.py`: Telegram + cooldown 15 menit per (device, parameter, level) | Uji: 10 anomali beruntun → 1 pesan |

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
| Backend | Render (Web Service) | Env: `MQTT_HOST/USER/PASS`, `SUPABASE_DB_URL`, `SUPABASE_JWT_SECRET`, `TELEGRAM_BOT_TOKEN`. Cron ping `/health` tiap 10 menit (cron-job.org). Free tier tidur setelah 15 menit idle, dan **MQTT worker ikut berhenti** saat tidur |
| DB | Supabase | Backup: ekspor mingguan `pg_dump` ke Google Drive |
| Broker | HiveMQ Cloud Serverless | Kredensial berbeda untuk ESP32 dan backend |
| Bot | Telegram | Token hanya di Render |

**Risiko Render free tier:** kalau worker tidur, data tidak tersimpan, meski failsafe di ESP32 tetap aman. Ada dua mitigasi: (a) cron ping, atau (b) jalankan MQTT worker sebagai *Background Worker* berbayar (sekitar $7/bulan, masuk anggaran "Biaya Cloud" Rp 750.000). Putuskan di Tahap A.

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
