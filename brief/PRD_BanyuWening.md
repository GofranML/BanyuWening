# Product Requirements Document — BanyuWening

**Versi:** 2.0 (Smart PLC & Agentic AI Mitigation Edition)  
**Tanggal:** 12 November 2026  
**Tim:** M. Ilham Nandari (PM/Fullstack), Gofran Muttaqi Likhan (IoT/Cloud/DB), Monika Lisbet Lase (Admin/QA)  
**Deadline:** 15 Januari 2027 (95 hari dari 12 Oktober 2026)

---

## 1. Latar Belakang dan Masalah

Pembudidaya ikan lele, patin, nila, dan udang skala kecil-menengah kehilangan puluhan juta rupiah per musim akibat kematian massal ikan yang terjadi tiba-tiba. Penyebabnya adalah penurunan kualitas air yang terjadi dalam hitungan jam — terutama antara tengah malam hingga fajar — sementara metode pemantauan yang ada masih manual dan reaktif: petambak baru menyadari masalah saat ikan sudah mengapung di permukaan.

Selain masalah pemantauan, terdapat **masalah kritis pada eksekusi mitigasi**:
- Petambak sering kali bingung menentukan tindakan korektif yang tepat ketika air memburuk (misal: apakah harus menyalakan aerator, mengalirkan air baru, menyalakan biofilter, atau meneteskan molase/karbon untuk mengontrol amonia dan pH).
- Perangkat kontrol aktuator di pasaran bersifat statis (on/off sederhana), kaku, dan tidak dapat dikonfigurasi secara modular seperti PLC (*Programmable Logic Controller*).
- Setiap tambak memiliki inventaris aktuator yang berbeda-beda tergantung kapasitas kolam.

**Solusi BanyuWening 2.0:**
Sistem terintegrasi **IoT Edge PLC Modular + Machine Learning (Random Forest) + LLM Reasoning Agent** yang:
1. Memantau parameter air (pH, suhu, TDS, turbiditas, level air) secara kontinu tiap 30 detik.
2. Memiliki antarmuka kontrol multi-relay modular (konsep Mini-PLC) yang dapat diinisialisasi dan dipetakan secara dinamis di dashboard (misal: Relay 1: Aerator, Relay 2: Pompa Kuras, Relay 3: Pompa Air Bersih, Relay 4: Pompa Dosing Molase/Probiotik, Relay 5: Filter Bio/UV).
3. Menggunakan **Random Forest / XGBoost** untuk *early warning* dan klasifikasi risiko cepat (Aman / Waspada / Bahaya).
4. Menghubungkan sistem ke **LLM AI Agent (Agentic Reasoning & Tool Calling)** yang membaca kondisi air, tren parameter, dan daftar aktuator terpasang, lalu secara otomatis merumuskan serta mengeksekusi rencana mitigasi terukur (misal: menyalakan pompa molase 3 menit dan aerator 30 menit), disertai penjelasan logis (*Explainable AI*) ke Telegram petambak.

---

## 2. Tujuan Produk

| # | Tujuan | Indikator Berhasil |
|---|--------|-------------------|
| 1 | Pemantauan kontinu 24/7 | Data tersimpan tanpa jeda > 2 menit selama normal |
| 2 | Deteksi dini & klasifikasi risiko | Model Random Forest/XGBoost klasifikasi Aman/Waspada/Bahaya, F1 ≥ 0,80 |
| 3 | Modular PLC Relay Controller | Sistem mendukung konfigurasi dinamis N-channel relay (4/8/16 channel via I2C/SPI/GPIO) |
| 4 | Mitigasi Otonom berbasis AI Agent | LLM Agent memanggil tool aktuator yang tepat < 15 detik setelah status Waspada/Bahaya |
| 5 | Keamanan & Guardrails Aktuator | Interlock deterministik mencegah aksi berbahaya (misal: kuras air saat level LOW) |
| 6 | Notifikasi Edukatif & XAI Telegram | Pesan penjelasan diagnosis + tindakan mitigasi terkirim < 10 detik ke petambak |
| 7 | Dashboard Web & PLC Mapper | Pengguna dapat memetakan fungsi relay, melihat penalaran AI, dan manual override |
| 8 | Keandalan Offline (Failsafe Lokal) | Rule darurat di ESP32 tetap mengaktifkan aerator lokal jika internet/cloud terputus |

---

## 3. Pengguna dan Peran

| Peran | Siapa | Kebutuhan Utama |
|-------|-------|-----------------|
| **Pemilik Kolam (Petambak)** | Pemilik/pengelola kolam | Melihat status risiko, menerima laporan mitigasi LLM di Telegram, konfirmasi aksi AI |
| **Operator Kolam** | Petugas teknis lapangan | Mengatur inisiasi/mapping relay PLC (menentukan relay mana terhubung ke alat apa), kendali manual, kalibrasi sensor |
| **Analis Akuakultur** | Pakar data/perikanan | Meninjau log keputusan mitigasi AI Agent, evaluasi efektivitas dosis/tindakan terhadap perbaikan air |
| **Super Administrator** | Tim pengembang/sysadmin | Manajemen akun, konfigurasi prompt agent, fine-tuning model ML, audit log sistem |

---

## 4. Ruang Lingkup

### Termasuk (In-scope)
- **Node Sensor ESP32:** Pembacaan pH, suhu, TDS, turbiditas, float level sensor.
- **Modul Multi-Relay PLC (Modular Actuator Controller):** Papan relay 4–8 channel (dengan isolasi optocoupler, ekspansi I2C PCF8574 / MCP23017) untuk mengontrol aneka perangkat (aerator, pompa sirkulasi, pompa kuras, pompa isi, dosing pump molase/probiotik, biofilter).
- **Inisiasi & Konfigurasi Aktuator Dinamis:** Tabel konfigurasi di Supabase dan antarmuka web untuk mapping: `Relay Port` $\rightarrow$ `Tipe Alat` $\rightarrow$ `Spesifikasi/Kapasitas` $\rightarrow$ `Safety Constraints (Max Duration, Interlock)`.
- **Fast-Layer ML (Random Forest Classifier):** Inferensi cepat untuk penentuan level risiko dan skor anomali berdasarkan fitur lag & slope parameter air.
- **Reasoning Layer (LLM AI Agent via Function Calling):** Agen cerdas (Google Gemini Flash / Claude / OpenAI) yang dilengkapi domain knowledge budidaya akuakultur untuk menyusun sekuens mitigasi sesuai alat yang aktif.
- **Safety Interlock & Execution Engine:** Gatekeeper deterministik yang memvalidasi output tool-call LLM sebelum mengirim perintah fisik ke relay (mencegah over-dosing atau korsleting beban).
- **Backend FastAPI:** Ingestion MQTT, orkestrasi ML + LLM Agent, REST API, Webhook Telegram.
- **Frontend Next.js:** Dashboard monitoring real-time, tab PLC Relay Mapper, visualisasi penalaran agent, manual override.
- **Telegram Interactive Bot:** Notifikasi status, ringkasan penalaran mitigasi AI, dan tombol darurat/approval (Human-in-the-loop).

### Tidak termasuk (Out-of-scope)
- Sensor optical DO industri berharga tinggi (tetap menggunakan proksi korelasi parameter air).
- Pembuatan perangkat keras PLC bersertifikasi industri IEC 61131-3 (menggunakan mikrokontroler ESP32 + optocoupler industrial shield).
- Kontrol aktuator berbasis analog proportional valve (hanya discrete on/off relay dengan modulasi durasi/PWM waktu).
- Model LLM dijalankan lokal di mikrokontroler (LLM berjalan di cloud via API).

---

## 5. Kebutuhan Fungsional

### 5.1 Node Sensor & Edge Controller (ESP32 Mini-PLC)

| ID | Kebutuhan |
|----|-----------|
| F-01 | Membaca sensor pH, suhu DS18B20, TDS, turbiditas, dan float switch setiap 30 detik dengan averaging 10x |
| F-02 | Komunikasi dengan I/O Expander (MCP23017 / PCF8574 via I2C) untuk mengendalikan multi-channel relay (4–8 channel) secara independen |
| F-03 | Format payload telemetri mencakup pembacaan sensor + status aktual seluruh channel relay (`relay_states: {"R1": true, "R2": false, ...}`) |
| F-04 | Menerima instruksi kontrol multi-relay dari topik MQTT `banyuwening/{device_id}/control` dengan schema terstruktur (`relay_id`, `state`, `duration_seconds`) |
| F-05 | **Hardware Watchdog & Relay TTL:** Setiap perintah aktivasi relay wajib memiliki batas durasi maksimum (*safety timeout*). Jika habis tanpa pembaruan, relay otomatis OFF |
| F-06 | **Failsafe Lokal Deterministik:** Jika parameter mencapai batas darurat (misal: pH < 6.0 atau suhu > 33°C) dan koneksi internet putus, ESP32 otomatis menyalakan relay yang terdaftar sebagai aerator |
| F-07 | Proteksi sensor gagal baca (`sensor_fault`): tidak mengeksekusi mitigasi kimiawi/molase jika sensor pH bernilai NaN |

### 5.2 Manajemen Konfigurasi Aktuator (Relay Initiator & Registry)

| ID | Kebutuhan |
|----|-----------|
| F-08 | **Relay Mapping Registry:** Database menyimpan metadata tiap relay per perangkat: `relay_number`, `assigned_device_type` (AERATOR, DRAIN_PUMP, FRESH_WATER_PUMP, MOLASSES_PUMP, PROBIOTIC_DOSER, BIOFILTER, HEATER), `device_name`, `flow_rate_lpm`, `max_runtime_seconds`, `cooldown_seconds`, `is_active` |
| F-09 | **Antarmuka Konfigurasi Web:** Operator dapat memetakan relay port ke fungsi alat, mengaktifkan/menonaktifkan port, dan menetapkan parameter keselamatan |
| F-10 | Sinkronisasi status konfigurasi antara cloud backend dan firmware ESP32 via MQTT retain message |

### 5.3 Backend & Dual-Tier AI Engine (Random Forest + LLM Agent)

| ID | Kebutuhan |
|----|-----------|
| F-11 | **Tier 1 - Fast ML Triage (Random Forest):** Menghitung laju perubahan ($dpH/dt$, $dTemp/dt$, $dTDS/dt$) dan memprediksi status risiko (Aman, Waspada, Bahaya) dalam waktu < 200ms |
| F-12 | **Agent Triggering Condition:** Jika Random Forest mendeteksi status "Waspada" atau "Bahaya", atau terjadi anomali multi-parameter, backend memicu eksekusi LLM AI Agent |
| F-13 | **Agent Context Assembly:** Backend menyusun context prompt: data telemetri terkini, tren 2 jam terakhir, hasil prediksi Random Forest, daftar aktuator terkonfigurasi beserta batas amannya |
| F-14 | **Aquaculture Domain Knowledge Base:** Agent dibekali pedoman mitigasi akuakultur standar (misal: penambahan molase untuk C:N ratio saat amonia/turbiditas naik, penambahan air baru saat TDS pekat, aerasi darurat saat suhu naik drastis) |
| F-15 | **Tool Calling / Function Calling:** AI Agent memanggil function: `execute_actuator_plan(actions=[{relay_id, action, duration_seconds, target_device, reason}])` |
| F-16 | **Deterministic Interlock Gatekeeper:** Sebelum perintah AI diteruskan ke MQTT, sistem backend memverifikasi terhadap aturan keselamatan fisik: (1) Pompa kuras dilarang aktif jika water level LOW, (2) Dosing molase tidak boleh melebihi batas kumulatif harian, (3) Aerator wajib aktif saat sirkulasi berjalan |
| F-17 | **Mitigation Audit Trail:** Menyimpan riwayat penalaran LLM (*thought process*, prompt, output tools, status validasi gatekeeper, hasil eksekusi) ke tabel `agent_mitigation_logs` |

### 5.4 Dashboard Web (Next.js)

| ID | Kebutuhan |
|----|-----------|
| F-18 | **Panel PLC Relay Configurator:** Grid antarmuka untuk inisiasi relay port, mapping jenis alat, status switch live, dan pengujian manual |
| F-19 | **Monitoring Real-time & Telemetri:** Grafik tren sensor interaktif dengan polling/realtime WebSocket |
| F-20 | **Live Agent Thought Box:** Menampilkan kartu analisis AI terkini yang menjelaskan mengapa AI memilih mengaktifkan alat tertentu dalam bahasa manusia yang mudah dipahami |
| F-21 | **Emergency Kill Switch:** Tombol darurat di dashboard untuk mematikan seluruh relay seketika (*All-OFF*) dan menonaktifkan kontrol otonom AI |
| F-22 | Riwayat log mitigasi: tabel interaktif berisi waktu kejadian, parameter pemicu, tindakan yang diambil AI, dan respons parameter air setelah mitigasi |

### 5.5 Notifikasi Interaktif Telegram

| ID | Kebutuhan |
|----|-----------|
| F-23 | Pesan terstruktur mencakup: Level Risiko (dari Random Forest), Anomali Terdeteksi, Keputusan Mitigasi AI, Daftar Alat yang Dinyalakan (beserta estimasi durasi) |
| F-24 | Mode Operasi: (A) *Autonomous Execution* (AI mengeksekusi langsung dan memberi tahu petambak), atau (B) *Human-in-the-Loop Approval* (AI merekomendasikan tombol inline Telegram: `[Setujui & Jalankan]` / `[Tolak]`) |
| F-25 | Notifikasi penyelesaian: Telegram mengirim pesan saat durasi kerja relay selesai, melaporkan kondisi akhir kualitas air |

---

## 6. Kebutuhan Non-Fungsional

| Kategori | Spesifikasi |
|----------|-------------|
| **Keamanan Listrik & Isolasi** | Modul relay wajib dilengkapi isolasi optocoupler; flyback diode/snubber untuk beban induktif pompa 12V DC guna mencegah induksi balik (*back-EMF*) yang dapat me-reset ESP32 |
| **Separasi Catu Daya** | Jalur daya 12V untuk koil relay dan motor pompa dipisahkan dari jalur daya 3.3V/5V logika mikrokontroler (menggunakan step-down independen) |
| **Batas Waktu Inferensi AI** | Total siklus (Sensor $\rightarrow$ Ingestion $\rightarrow$ Random Forest $\rightarrow$ LLM Agent Reasoning $\rightarrow$ Validasi Gatekeeper $\rightarrow$ MQTT Command) selesai dalam $\le 15$ detik |
| **Efisiensi Token LLM** | Format prompt agent dibuat ringkas berbasis skema JSON terkompresi; cooldown pemanggilan LLM minimal 10 menit untuk kondisi anomali yang sama guna menghemat biaya API |
| **Fail-Safe Fallback** | Jika API LLM timeout/gagal (HTTP 5xx / kuota habis), sistem otomatis beralih ke aturan deterministik (*Rule-based Fallback Matrix*) tanpa interupsi |
| **Enclosure Proteksi** | Box panel modular IP65 dengan terminal block untuk perkabelan relay yang rapi dan aman dari kelembapan kolam |

---

## 7. Matriks Pengetahuan Mitigasi Akuakultur (Basis Aturan AI Agent)

Tabel berikut menjadi pedoman domain (*System Knowledge*) yang digunakan oleh LLM Agent dan Deterministic Gatekeeper:

| Kondisi Parameter | Analisis Masalah Akuakultur | Tindakan Mitigasi AI (Aktuator yang Dipilih) | Catatan & Batasan Keamanan |
|-------------------|-----------------------------|---------------------------------------------|-----------------------------|
| **pH Anjlok (< 6.2)** secara cepat, TDS stabil | Akumulasi asam organik atau hujan asam | 1. Nyalakan Pompa Dosing Buffer/Kapur (durasi bertahap)<br>2. Nyalakan Aerator untuk pelepasan $CO_2$ | Jangan dosing kapur jika level air surut |
| **pH Melonjak (> 8.8)** pada siang/sore | Blooming alga (fotosintesis intensif menyerap $CO_2$) | 1. Nyalakan Pompa Sirkulasi/Filter<br>2. Tambahkan air baru dari sumur (Relay Pompa Air Bersih) | Pastikan float switch tidak mentok atas (anti-luber) |
| **Turbiditas Tinggi (> 120 NTU)** & bau amonia | Feses ikan dan sisa pakan membusuk di dasar kolam | 1. Nyalakan Pompa Dosing Molase (sumber karbon untuk menstimulasi bakteri heterotrof)<br>2. Nyalakan Aerator maksimal (bakteri butuh oksigen tinggi) | Dosing molase wajib dibatasi kuota volume per 24 jam |
| **Suhu Air Tinggi (> 32°C)** pada siang terik | Penurunan kelarutan oksigen & stres metabolik ikan | 1. Nyalakan Pompa Sirkulasi air bawah<br>2. Aktifkan Sprinkler/Aerator kabut permukaan | Pantau ketersediaan air pasokan |
| **TDS Terlalu Tinggi (> 800 ppm)** | Penumpukan zat terlarut pekat dan mineral limbah | 1. Buka Pompa Kuras (*Drain*) selama $t$ detik<br>2. Nyalakan Pompa Air Bersih (*Fresh Water Intake*) | **Interlock:** Kuras dan Isi tidak boleh berbenturan tanpa monitoring level |

---

## 8. Arsitektur Sistem BanyuWening 2.0

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             AREA KOLAM & HARDWARE                           │
│                                                                             │
│  [Sensors: pH, Temp, TDS, Turbidity, Float]                                │
│                     │                                                       │
│                     ▼ (ADC 10x Avg)                                         │
│            ┌─────────────────┐                                              │
│            │   ESP32 MCU     │ ◄─── Fail-safe Rule Engine (Offline Backup)  │
│            └────────┬────────┘                                              │
│                     │ I2C Bus                                               │
│                     ▼                                                       │
│            ┌─────────────────┐                                              │
│            │ MCP23017 / I2C  │                                              │
│            │ 8-Channel Relay │                                              │
│            └────────┬────────┘                                              │
│                     │ Optocoupler Isolated Relays                           │
│        ┌────────────┼─────────────┬─────────────┬─────────────┐             │
│        ▼            ▼             ▼             ▼             ▼             │
│   [Aerator]   [Pompa Kuras]  [Pompa Isi]  [Pompa Molase]  [Biofilter]       │
└────────┬──────────────────────────────────────────────────────▲─────────────┘
         │ MQTT TLS (Telemetri 30s)                             │ MQTT TLS (Commands)
         ▼                                                      │
┌───────────────────────────────────────────────────────────────┴─────────────┐
│                           CLOUD BACKEND (FastAPI)                           │
│                                                                             │
│  1. Ingestion & Validation ──► Simpan ke Supabase PostgreSQL               │
│                                                                             │
│  2. [TIER 1] Fast Risk Triage:                                              │
│     └── Random Forest / XGBoost Model                                       │
│         ├── Status: Aman (Keep Monitoring)                                  │
│         └── Status: Waspada / Bahaya ──┐                                    │
│                                        ▼                                    │
│  3. [TIER 2] LLM Autonomous Agent Orchestration:                            │
│     ├── Query Actuator Registry (Relay mana saja yang aktif & terhubung)    │
│     ├── Inject Aquaculture Mitigation System Prompt                         │
│     ├── LLM Tool Calling (Pilih aktuator, urutan, & durasi)                │
│     └── Deterministic Safety Gatekeeper (Validasi batas interlock fisik)    │
│               │                                                             │
│               ├────────► Terbitkan Perintah Eksekusi Relay via MQTT        │
│               └────────► Kirim Laporan XAI ke Telegram Bot Petambak         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST / Supabase Realtime
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DASHBOARD WEB (Next.js 15)                          │
│                                                                             │
│  - Monitoring Grafik Sensor Real-Time                                       │
│  - Tab Inisiasi & Konfigurasi PLC Relay (Actuator Mapping Matrix)           │
│  - Live AI Reasoning Log (Penjelasan transparansi aksi mitigasi)            │
│  - Manual Override & Emergency Emergency All-OFF                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Skema Data & Kontrak Integrasi Tambahan

### 9.1 Tabel Konfigurasi Relay (`actuator_configs`)
```sql
create table actuator_configs (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references devices(id),
  relay_channel int not null,                 -- 1 sampai 8
  actuator_type text not null,                -- 'AERATOR', 'MOLASSES_PUMP', 'DRAIN_PUMP', 'FRESH_PUMP', 'BIOFILTER'
  custom_label text not null,                 -- 'Pompa Dosing Molase Kolam A'
  flow_rate_lpm numeric default 0,            -- Kapasitas liter/menit (opsional)
  max_runtime_seconds int not null default 300, -- Batas aman sekali jalan (default 5 menit)
  cooldown_seconds int not null default 600,  -- Jeda minimum sebelum boleh jalan lagi
  is_active boolean not null default true,
  updated_at timestamptz default now(),
  unique (device_id, relay_channel)
);
```

### 9.2 Tabel Audit Log Mitigasi AI (`agent_mitigation_logs`)
```sql
create table agent_mitigation_logs (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references devices(id),
  triggered_by text not null,                  -- 'RANDOM_FOREST_WASPADA', 'RANDOM_FOREST_BAHAYA', 'MANUAL_TEST'
  telemetry_snapshot jsonb not null,           -- {ph: 5.9, temp: 31.2, tds: 420, turbidity: 145}
  llm_reasoning_thought text not null,         -- Penjelasan mengapa agent memilih tindakan tsb
  proposed_actions jsonb not null,             -- Array aksi yang diusulkan oleh LLM
  gatekeeper_approved boolean not null,        -- Apakah lolos verifikasi keselamatan?
  gatekeeper_rejection_reason text,           -- Jika ditolak, apa alasannya?
  executed_commands jsonb,                    -- Perintah final yang dikirim ke MQTT
  created_at timestamptz default now()
);
```

### 9.3 Kontrak Payload Kontrol PLC via MQTT
```json
{
  "cmd_id": "act-9a2c",
  "device_id": "BANYUWENING-01",
  "source": "AI_AGENT",
  "actions": [
    {
      "channel": 1,
      "actuator": "AERATOR",
      "state": "ON",
      "duration_s": 1800
    },
    {
      "channel": 4,
      "actuator": "MOLASSES_PUMP",
      "state": "ON",
      "duration_s": 180
    }
  ],
  "reason": "pH drop tajam ke 5.9 dan turbiditas 145 NTU. Dosing molase 3 menit + aerasi 30 menit untuk aktivasi bio-remediasi."
}
```

---

## 10. Milestone dan Penyesuaian Jadwal Proyek

| Fase | Deliverable Utama | Mulai | Selesai | Catatan Khusus |
|------|-------------------|-------|---------|----------------|
| **Fase 1: Hardware & PLC Board** | Integrasi ESP32 + I2C Relay Module 4–8 Ch, uji isolasi beban, firmware basic MQTT | 26/10/2026 | 15/11/2026 | Uji snubber / diode pada motor pompa |
| **Fase 2: Logging & Training ML** | Pengumpulan data sensor, training model Random Forest & evaluasi metrik | 09/11/2026 | 06/12/2026 | Pelabelan status Aman/Waspada/Bahaya |
| **Fase 3: Agentic Reasoning & Backend** | FastAPI + Random Forest + Integrasi LLM Tool Calling + Deterministic Safety Gatekeeper | 07/12/2026 | 22/12/2026 | Pengujian skenario mitigasi molase & pompa |
| **Fase 4: Dashboard PLC & Telegram** | UI Mapper Konfigurasi Relay di Next.js, log XAI, Telegram Bot approval/interactive | 23/12/2026 | 05/01/2027 | Integrasi Supabase Realtime |
| **Fase 5: Uji Lapangan & Serah Terima** | End-to-end stress test di kolam nyata, simulasi sensor fault, dokumentasi final | 06/01/2027 | 15/01/2027 | Validasi keamanan kelistrikan |

---

## 11. Risiko Khusus & Mitigasi Tambahan BanyuWening 2.0

| Risiko | Dampak | Strategi Mitigasi |
|--------|--------|-------------------|
| **Halusinasi LLM pada Dosis/Durasi** | Pompa molase atau pengurasan berjalan terlalu lama | **Deterministic Gatekeeper:** LLM dilarang menulis angka durasi mentah ke pin. Kode backend membatasi durasi maksimal sesuai batas aman `max_runtime_seconds` di tabel konfigurasi. |
| **Noise Listrik (Back-EMF) dari Pompa** | ESP32 mendadak hang / restart (*brownout*) saat relay pompa menyala | Pasang kapasitor decoupling, flyback diode (1N4007) paralel pada motor DC, dan pisahkan ground koil relay dari ground ESP32 melalui optocoupler. |
| **Biaya Token & Latensi LLM** | Tagihan API membengkak, respons lambat | Hanya panggil LLM saat status berubah menjadi Waspada/Bahaya (tidak dipanggil setiap 30 detik). Gunakan model kencang dan hemat seperti Gemini 2.0 Flash atau GPT-4o-mini. |
| **Internet Kolam Putus Saat Mitigasi** | Cloud tidak bisa mematikan relay yang sedang ON | Firmware ESP32 memiliki timer internal (*Hardware Watchdog*). Relay otomatis OFF setelah `duration_s` habis meskipun koneksi cloud putus. |
| **Relay Port Salah Colok oleh Operator** | Pompa molase tercolok ke port aerator | Fitur "Test Pulse 3 Detik" di dashboard saat inisiasi alat agar operator dapat memastikan alat fisik yang bereaksi sudah sesuai sebelum dioperasikan secara otomatis. |

