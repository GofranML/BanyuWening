# Simulasi Chat Boardroom Multi-Agent — **BanyuWening**

**Peserta Diskusi:** `CEO`, `CTO`, `COO`, `CMO`, `CFO` vs `Managing Partner VC Investor`
**Progres Skor:** Ronde 1 `75/100` (`Ditolak Sementara · 5 Dealbreakers`) → Ronde 2 `89/100` (`DISETUJUI / FUNDED · 0 Dealbreakers`)
**Kesepakatan Akhir:** Pre-Seed **Rp600.000.000** (*Post-Money SAFE, Valuation Cap Rp4.000.000.000, Diskon 20%, Pencairan 3 Tranche*)

---

## Ringkasan Perkembangan Skor Rubrik Investor

| Aspek Rubrik (`soal_UTS.txt`) | Skor Ronde 1 | Skor Ronde 2 (Final) | Delta |
| :--- | :---: | :---: | :---: |
| 1. Analisis Akar Masalah & Validasi | 78/100 | **88/100** | **+10** |
| 2. Sintesis Solusi & Value Proposition | 79/100 | **91/100** | **+12** |
| 3. Evaluasi Lanskap Kompetisi & Unfair Advantage | 80/100 | **90/100** | **+10** |
| 4. Model Bisnis & Unit Economics (CAC vs LTV) | 66/100 | **90/100** | **+24** |
| 5. Strategi Go-To-Market (1.000 Pengguna Pertama) | 72/100 | **87/100** | **+15** |
| 6. The Ask, Roadmap 12 Bulan & Tata Kelola | 74/100 | **90/100** | **+16** |
| **SKOR KOMPOSIT TOTAL** | **75/100** | **89/100 (FUNDED)** | **+14** |

---

## Transkrip Percakapan Antar-Agen (21 Pesan)

### Ronde 1 · Presentasi Awal

#### 💬 [1] **CEO** (*CEO & Co-Founder*) — Ronde 1

> Selamat pagi Bapak/Ibu Komite Investasi. Pasca-skandal eFishery 2024–2026, kami di BanyuWening memilih memulai dengan standar zero-hype: saat ini kami berada di tahap Lab Prototipe dan Desk Research Kuantitatif dengan BOM single-node terverifikasi sekitar Rp1,23 juta, tanpa mengklaim traksi atau wawancara fiktif. Pasar lele nasional lebih dari 1,15 juta ton per tahun terjebak di antara pen ukur manual Rp70 ribu–Rp120 ribu dan alat profesional seperti JALA Baruno Rp38,89 juta atau Banoo Rp9,5–14,5 juta, sementara Tuya Rp785 ribu–Rp2,4 juta hanya untuk satu titik akuarium. BanyuWening menutup celah itu lewat arsitektur 1 Core Hub untuk banyak kolam berbasis Edge Fuzzy Logic, Cloud Random Forest, dan AI Agent Supervisor. Silakan CTO memaparkan arsitektur teknisnya.

**Poin Kunci:**
- Pasca-eFishery 2026: fokus unit economics nyata & tata kelola audit-ready
- Tutup celah pasar antara pen manual Rp70rb–120rb dan JALA Baruno ~Rp38,89jt
- Jujur di tahap Lab Prototipe (~Rp1,23 juta single-node), nol klaim fiktif

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Konteks Industri:** Pasca-skandal laporan keuangan eFishery (2024–2026) & vonis hukum 2026
- **Peta Kompetitor:** Pen manual Rp70rb–Rp120rb | Tuya Rp785rb–Rp2,4jt (1 titik air) | Banoo IoT Rp9,5–14,5jt | JALA Baruno ~Rp38,89jt | Venambak (B2B custom)
- **Tesis Produk:** 1 Core Hub untuk banyak kolam + Edge Fuzzy Logic + Cloud Random Forest + AI Agent Supervisor (*Champion-vs-Challenger* gate)
- **Status Validasi & BOM:** Tahap Lab Prototipe & Desk Research Kuantitatif (~Rp1,23 juta prototipe modular+safety single-node)
- **Prinsip Dek:** *High-Conviction, Zero-Hype, 100% Canonical & Audit-Ready*

</details>

#### 💬 [2] **CTO** (*CTO & Co-Founder*) — Ronde 1

> Menyambung CEO, tantangan kolam terpal terbuka adalah interferensi listrik dan kelembapan ekstrem, sehingga Core Hub IP65 kami memasangkan ESP32 dengan ADC eksternal 16-bit ADS1115 dan Level Shifter 3.3V–5V agar tidak bergantung pada ADC internal yang bentrok saat WiFi aktif. Setiap kolam terhubung melalui konektor GX16 waterproof dengan MOSFET power-switch pada sensor TDS untuk melakukan time-multiplexing, mencegah arus bocor mengacaukan probe kaca pH di air yang sama. Di sisi perangkat lunak, Edge Fuzzy Logic tetap menyalakan aerator lewat Relay 4-Channel ketika koneksi WiFi terputus, sementara Cloud Random Forest memprediksi risiko 1–3 jam sebelum kritis. Pembaruan AI Agent Supervisor juga dijaga oleh gerbang Champion-vs-Challenger dan Dual-Partition OTA dengan rollback 60 detik.

**Poin Kunci:**
- ADS1115 16-bit + Level Shifter atasi kelemahan ADC2 ESP32 saat WiFi aktif
- MOSFET power-switch pada TDS cegah ground-loop yang merusak bacaan pH
- Edge Fuzzy tetap mengontrol aktuator saat WiFi putus + OTA rollback 60 detik

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Core Hub IP65:** ESP32 DevKit V1 + ADC Eksternal 16-bit I2C ADS1115 + Logic Level Shifter I2C (3.3V ↔ 5V)
- **Ekspansi & Daya:** Konektor GX16 waterproof *plug-and-play*, Relay 4-Ch (opsi PCF8574/MCP23017), LCD 16x2 I2C, Adaptor 12V 5A + DC-DC Step-down 5V bersekering
- **Sensor & Anti-Cross-Talk:** pH (PH-4502C), Suhu DS18B20 (4.7k Ohm pull-up), TDS Analog + MOSFET *time-multiplexing*, Turbidity Optik (epoxy-sealed), Float Switch
- **Ketahanan & AI:** Edge Fuzzy Logic (tahan WiFi mati via LittleFS + RTC DS3231), Cloud Random Forest per `pond_id` (prediksi 1–3 jam), *Champion-vs-Challenger* + Dual-Partition OTA 60s rollback

</details>

#### 💬 [3] **COO** (*COO & Co-Founder*) — Ronde 1

> Dari sisi operasional, urgensi masalah ini tercatat jelas di data KKP dengan produksi 1,193 juta ton pada 2025 dan sekitar 677.500 RTP aktif KUSUKA, di mana kualitas air buruk menurunkan Survival Rate lele dari 90–100% menjadi 70–80% bahkan kematian massal 50–100%. Pada simulasi satu kolam dengan profit sekitar Rp2,14 juta per siklus tiga bulan, keterlambatan deteksi langsung menggerus margin petambak. Untuk produksi komersial, saya menghitung COGS konservatif dengan diskon sensor OEM -22% termasuk biaya rakit, potting epoxy, dan burn-in 48 jam menjadi sekitar Rp2,669 juta untuk paket 4-kolam. Kapasitas instalasi yang realistis kami jaga di 75–100 sistem hingga Q4, dimulai dari validasi 15–25 petambak dan pilot 90 hari.

**Poin Kunci:**
- Data KKP & SNI: penurunan kualitas air memangkas SR lele dari 90–100% ke 70–80%
- COGS batch konservatif (-22% sensor OEM): Starter Rp1,562 jt & 4-kolam ~Rp2,669 jt
- Kapasitas operasional Q2–Q4 realistis pada 75–100 sistem + burn-in test 48 jam

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Data KKP Pembesaran Lele:** 1.157.755,37 ton (2024) | 1.193.006,15 ton (2025p) | 1.065.419,23 ton (2026 est.) di sentra Jabar, Jateng, Jatim
- **Pelaku Usaha & Risiko Air:** 1,3–1,4 juta RTP (~677.500 aktif KUSUKA); SR air optimal 90%–100% merosot ke 70%–80% saat air buruk hingga gagal panen 50%–100%
- **Ekonomi 1 Kolam:** 1.000 ekor, SR 85%, panen 170 kg @Rp22.000/kg = Omzet Rp3.740.000, ops ~Rp1.600.000, profit ~Rp2.140.000/siklus (3 bln)
- **Manufaktur & Kapasitas COO:** Diskon sensor OEM konservatif -22%, COGS 4-kolam ~Rp2.669.000 (Starter Rp1.562.000), burn-in 48 jam, target 75–100 sistem Q4 (10–15 Q2, 40–60 Q3)
- **Rencana Pilot:** Validasi primer awal 15–25 petambak & uji pilot 90 hari memakai DO meter portabel tim

</details>

#### 💬 [4] **CMO** (*CMO & Co-Founder*) — Ronde 1

> Melengkapi data COO, nilai komoditas lele nasional mencapai Rp26,25 triliun per tahun, dengan klaster empat kolam berpotensi kehilangan 136–160 kg panen setiap kali SR turun 20%. Kami menargetkan SAM 200.000 RTP di sentra Jawa senilai sekitar Rp400 miliar, namun menjaga proyeksi SOM Tahun-1 realistis pada 50–100 RTP berbayar senilai Rp100–220 juta. Untuk menjembatani 1.000 pengguna tanpa modal manufaktur besar, kami menjalankan Dual-Funnel lewat WeningBot Telegram Freemium sebelum mengonversi mereka ke Pre-Order DP 50% dengan klaim Rp0 Ad-Spend. Tarif SaaS kami hitung flat Rp50 ribu per bulan per RTP dan add-on modul Rp600 ribu, termasuk opsi patungan kabel antar kolam tetangga dan validasi awal 10–15 petambak.

**Poin Kunci:**
- Ekosistem komoditas ~Rp26,25 T/thn; SAM awal 200rb RTP & SOM 50–100 RTP berbayar
- Dual-Funnel: 1.000 user Telegram Freemium Bot ke Pre-Order DP 50%
- Menawarkan SaaS flat Rp50rb/bln/RTP & klaim Rp0 Ad-Spend untuk GTM awal

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Konteks Ekonomi Komoditas:** 1.193.006,15 ton × Rp22.000/kg = ~Rp26,25 triliun/tahun; klaster 4 kolam kehilangan 136–160 kg jika SR turun ekstra 20%
- **Sizing Pasar Awal CMO:** SAM 200.000 RTP (~30% KUSUKA = ~Rp400 Miliar di Jawa) | SOM Tahun-1: 50–100 RTP berbayar (Rp100–220 juta)
- **Strategi Dual-Funnel:** Akuisisi 1.000 *Activated Users* via WeningBot Telegram Freemium → konversi ke Pre-Order DP 50%
- **Klaim Komersial Awal CMO:** Strategi *"Rp0 Ad-Spend"* & *"Zero Working-Capital Trap"*, tarif SaaS flat Rp50rb/bln/RTP (Rp600rb/thn), add-on modul Rp600rb, COGS 4-kolam ~Rp2,18 jt, sampel validasi 10–15 petambak, serta wacana patungan kabel antar-tetangga

</details>

#### 💬 [5] **CFO** (*CFO & Co-Founder*) — Ronde 1

> Dari sisi finansial, kami mengemas arsitektur modular tadi ke dalam model Hardware-Enabled SaaS yang etis melalui fitur Anti-Bricking Offline-Plus Rp0 agar Edge Fuzzy tetap menyala meski langganan dijeda. Pada model P&L Tahun-1, kami memproyeksikan penjualan 160 paket atau 320 kolam dengan total Revenue Rp353,74 juta, menggunakan harga Core Hub Rp750 ribu, modul Rp650 ribu, serta SaaS Rp35 ribu per kolam atau Rp30 ribu per kolam untuk paket 4-kolam. Dengan asumsi optimasi COGS batch 4-kolam menjadi Rp2,125 juta, kami menganggarkan Blended CAC Rp400 ribu, Marketing Rp120 juta, dan buffer inventory Rp120 juta agar pengiriman lancar. Total kebutuhan Pre-Seed kami adalah Rp600 juta dengan alokasi Legal Rp60 juta dan garansi hardware 12 bulan.

**Poin Kunci:**
- Proyeksi P&L Tahun-1: 160 paket (320 kolam) dengan Revenue Rp353,74 juta
- Model Modular Hardware + SaaS per kolam (Rp120rb/bln untuk 4 kolam) + Anti-Bricking Rp0
- Ask Rp600 juta: Marketing Rp120 jt, Inventory Buffer Rp120 jt, Legal Rp60 jt

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Struktur Harga CFO:** Core Hub Rp750rb | Add-on Modul Rp650rb | SaaS Rp35rb/kolam/bln (1–2 kolam) atau Rp30rb/kolam/bln (4 kolam = Rp120rb/bln; Rp1,44 jt/thn) | *Offline-Plus* Rp0
- **Proyeksi P&L Tahun-1 CFO:** 160 paket terjual (320 kolam), Revenue Rp353,74 juta, COGS 4-kolam Rp2,125 jt (diskon probe pH -40,3% ke Rp145rb & turbidity -42,5% ke Rp75rb), burn-in 24 jam
- **CAC, Stok & Proteksi:** Blended CAC Rp400rb (iklan digital Rp120rb/unit), Marketing Rp120 juta, buffer inventory Rp120 juta (~94 paket tertahan di M12), garansi 12 bln (RMA Rp100rb/paket), Legal Rp60 juta
- **Alokasi & Cloud:** Tech/cloud Rp10rb/kolam/bln, biaya LLM API 1.000 user Freemium Bot = Rp0, Pre-Seed Ask Rp600 juta

</details>

### Ronde 1 · Audit & Penolakan Investor

#### 🔴 [6] **Investor** (*Managing Partner VC*) — Ronde 1

> Terima kasih presentasinya. Saya sangat mengapresiasi integritas tim Anda pasca-eFishery—kalian jujur di tahap lab prototipe tanpa wawancara fiktif dan merancang fitur anti-bricking yang etis. Namun sebagai Managing Partner, saya langsung melihat Dealbreaker pertama: angka kalian saling menabrak hebat! CFO memproyeksikan 160 paket atau Rp353,74 juta, padahal COO hanya menyanggupi instalasi 75–100 sistem dan CMO mematok SOM hanya 50–100 RTP. Jika penjualan riil cuma 85 paket dengan COGS Starter konservatif COO Rp1,562 juta, margin kotor Anda anjlok dari Rp725 ribu menjadi Rp438 ribu—hanya tersisa Rp38 ribu di atas CAC Rp400 ribu—dan kas akhir tahun Anda pasti defisit.

**Poin Kunci:**
- Apresiasi tata kelola pasca-eFishery: nol traksi fiktif & fitur Anti-Bricking
- Dealbreaker 1: Target Tahun-1 bentrok (CFO 160 vs COO 75–100 vs CMO 50–100)
- Pada volume ~85 unit & COGS COO, GP Starter sisa Rp438rb vs CAC Rp400rb

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Apresiasi Integritas:** Jujur di tahap Lab Prototipe tanpa wawancara fiktif, mitigasi absennya sensor DO/Amonia via proxy Random Forest, & kebijakan *Anti-Bricking*
- **Dealbreaker 1 — Konflik Volume & Revenue Tahun-1:**
  - **CFO:** 160 paket (320 kolam) → Revenue Rp353,74 juta
  - **COO:** Kapasitas instalasi 75–100 sistem di Q4 (10–15 Q2, 40–60 Q3)
  - **CMO:** SOM Tahun-1 hanya 50–100 RTP (Rp100–220 juta)
- **Dampak Finansial:** Jika realisasi ~85 paket dengan COGS Starter COO Rp1.562.000 (bukan Rp1.275.000), GP turun dari Rp725rb ke Rp438rb (hanya +Rp38rb di atas CAC Rp400rb) & kas M12 terancam defisit

</details>

#### 🔴 [7] **Investor** (*Managing Partner VC*) — Ronde 1

> Konflik internal ini berlanjut ke Dealbreaker kedua soal strategi modal kerja dan CAC antara CMO dan CFO. Di slide pemasaran, CMO berani mengklaim strategi Rp0 Ad-Spend dan Zero Working-Capital Trap bermodal Pre-Order DP 50%, tetapi di tabel P&L, CFO justru menganggarkan Rp120 juta untuk Marketing termasuk Rp120 ribu iklan digital per unit! Lebih janggal lagi, jika kalian memakai sistem Pre-Order, mengapa CFO mengunci Rp120 juta atau 20% dari seluruh dana VC kami untuk menumpuk inventory hingga sekitar 94 paket tertahan di bulan kedua belas? Kalian bahkan belum sepakat bagaimana cara menjual dan membiayai produksi barang kalian sendiri.

**Poin Kunci:**
- Dealbreaker 2: CMO klaim Rp0 Ad-Spend vs CFO anggarkan Marketing Rp120 juta
- CFO mengunci Rp120 juta (20% dana VC) untuk stok ~94 paket tertahan di M12
- Bertabrakan dengan klaim skema Pre-Order DP 50% Zero Working-Capital Trap CMO

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Dealbreaker 2 — Konflik Working Capital & CAC (CMO vs CFO):**
  - **Posisi CMO:** Klaim GTM *"Rp0 Ad-Spend"* dan Pre-Order DP 50% (*"Zero Working-Capital Trap"*)
  - **Posisi CFO:** Menganggarkan Rp120 juta biaya Marketing (termasuk Rp120rb/unit iklan digital dalam Blended CAC Rp400rb)
  - **Kontradiksi Inventory:** CFO mengunci Rp120 juta (20% dana VC) untuk menimbun buffer stok barang jadi (~94 paket tertahan di akhir M12)
- **Implikasi:** Tim tidak memiliki satu strategi akuisisi dan arus kas operasional yang disepakati bersama

</details>

#### 🔴 [8] **Investor** (*Managing Partner VC*) — Ronde 1

> Dealbreaker ketiga ada pada struktur harga, asumsi COGS, dan bom waktu klaim garansi. CMO menghitung ROI petambak 4-kolam dengan tarif SaaS Rp50 ribu per bulan atau Rp600 ribu setahun, padahal CFO menagih Rp120 ribu per bulan atau Rp1,44 juta setahun—selisih 2,4 kali lipat! Asumsi COGS 4-kolam CFO sebesar Rp2,125 juta juga terlalu agresif karena memangkas harga probe pH hingga 40,3% dan turbidity 42,5% untuk batch sekecil 100–400 unit, bertentangan dengan angka konservatif COO Rp2,669 juta sekaligus durasi burn-in 48 jam vs 24 jam. Yang paling berbahaya, kalian memberi garansi hardware 12 bulan dengan cadangan RMA cuma Rp100 ribu per paket, padahal probe kaca pH murah di lumpur lele biasanya rusak dalam 3–6 bulan.

**Poin Kunci:**
- Tarif SaaS 4-kolam CMO (Rp600rb/thn) vs CFO (Rp1,44 jt/thn) selisih 2,4x lipat
- Diskon OEM CFO (-40,3% pH & -42,5% turbidity) di batch kecil tak realistis vs -22% COO
- Garansi 12 bln jebol: probe pH aus 3–6 bln sementara RMA hanya Rp100rb/paket

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Dealbreaker 3A — Konflik Harga Jual & SaaS (Selisih 2,4×):**
  - **CMO:** SaaS flat Rp50rb/bln/RTP (Rp600rb/thn) & modul add-on Rp600rb
  - **CFO:** SaaS Rp30rb/kolam/bln (4 kolam = Rp120rb/bln atau Rp1,44 jt/thn) & modul Rp650rb
- **Dealbreaker 3B — COGS Batch 4-Kolam & Burn-in Tidak Sinkron:**
  - **COO:** ~Rp2.669.000 (-22% sensor konservatif + rakit/potting/burn-in 48 jam) | **CMO:** ~Rp2.180.000 | **CFO:** Rp2.125.000 (diskon probe pH -40,3% ke Rp145rb & turbidity -42,5% ke Rp75rb di batch 100–400 unit, burn-in 24 jam)
- **Dealbreaker 3C — Bom Waktu Garansi 12 Bulan:** Probe kaca pH murah drift/rusak 3–6 bln di air lele vs RMA CFO hanya Rp100rb/paket

</details>

#### 🔴 [9] **Investor** (*Managing Partner VC*) — Ronde 1

> Di sisi teknis, Dealbreaker keempat menunjukkan adanya lubang arsitektur pada skema multi-kolam kalian, CTO. Satu chip ADS1115 hanya punya empat kanal analog, sehingga empat kolam dengan tiga sensor analog masing-masing butuh dua belas kanal—artinya wajib pakai tiga ADS1115 dan GPIO Expander yang belum masuk di BOM CFO maupun CMO, sementara Relay 4-Channel cuma cukup untuk satu aktuator per kolam. Wacana patungan kabel antar kolam tetangga juga berbahaya karena kabel sinyal analog di atas lima meter sangat rentan drop tegangan dan noise EMI pompa AC, belum lagi sensor turbidity optik yang rawan saturasi di air lele keruh mulai minggu keempat. Terakhir, perjelas di pitch deck bahwa fitur offline saat ini hanya tahan putus WiFi karena kalian belum punya proteksi UPS ketika listrik PLN padam.

**Poin Kunci:**
- 4 kolam butuh 12 kanal analog (3x ADS1115 + GPIO Expander), bukan 1 ADS1115
- Relay 4-Ch tak cukup untuk aerator + pompa; kabel >5 m lintas tetangga kena EMI
- Klaim offline baru tahan WiFi putus, Core Hub tetap mati saat listrik PLN padam

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Dealbreaker 4A — Kekurangan Kanal ADC & Relay Multi-Kolam:**
  - 1 chip ADS1115 hanya 4 kanal, padahal 4 kolam × 3 sensor analog (pH, TDS, Turbidity) butuh **12 kanal** (3× ADS1115 + PCF8574/MCP23017) yang belum dihitung di BOM CFO/CMO
  - Relay 4-Channel hanya cukup 1 aktuator/kolam (tidak cukup jika 4 kolam butuh aerator + pompa kuras/isi sekaligus)
- **Dealbreaker 4B — Fisika Sensor & Kabel Tetangga:** Biofouling/saturasi turbidity di minggu ke-4–12 membuat *slope* flat; kabel analog >5 m lintas kolam tetangga rentan *voltage drop* & noise EMI pompa AC 220V
- **Dealbreaker 4C — Listrik PLN Padam:** Mode *offline* baru tahan putus WiFi, belum ada proteksi UPS/baterai untuk Core Hub saat PLN padam

</details>

#### 🔴 [10] **Investor** (*Managing Partner VC*) — Ronde 1

> Dealbreaker kelima menyangkut ketiadaan validasi lapangan dan biaya tersembunyi. Target responden Bulan-1 kalian masih tidak kompak antara 10 hingga 30 petambak, belum ada anggaran DO meter maupun test kit amonia untuk mengatasi bias organ pernapasan labirin lele pada cold-start ML, serta biaya API LLM 1.000 pengguna bot freemium ditulis Rp0 sementara Mayoritas petambak memakai WhatsApp, bukan Telegram. Anggaran legal Rp60 juta juga terlalu sempit untuk sertifikasi SDPPI/DJID Komdigi, dan Level 1 AI update wajib dikunci persetujuan insinyur agar relay tidak menyala nonstop. Dengan skor komposit 75/100, pendanaan Rp600 juta kami TOLAK SEMENTARA pada Ronde 1; silakan kembali di Ronde 2 membawa satu Single Source of Truth, profil vesting pendiri, dan skema pencairan berbasis tranche.

**Poin Kunci:**
- Skor Komposit Ronde 1: 75/100 — DITOLAK SEMENTARA / HOLD ON ROUND 1
- Nihil uji lumpur lele, tanpa DO Meter/Amonia, Rp0 biaya LLM 1.000 user, friksi Telegram
- Syarat Ronde 2: 1 Single Source of Truth, perbaikan teknis-GTM, & skema Tranche

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Dealbreaker 5 — Validasi, Cold-Start ML, Bot & Legal:**
  - Sampel Bulan-1 tidak sinkron (CEO 15–30, COO 15–25, CMO 10–15) & nihil uji fisik di air lele berlumpur
  - Cold-start ML belum menganggarkan DO meter portabel & test kit Amonia (organ labirin lele membiaskan tombol feedback Ya/Tidak); AI Level 1 wajib ada *human-in-the-loop approval*
  - Biaya LLM API 1.000 user Telegram Freemium = Rp0 di P&L (padahal trafik 320 kolam = ~2,76 jt baris/bln) + friksi adopsi Telegram vs WhatsApp di pedesaan + Legal Rp60 jt sempit untuk SDPPI/DJID
- **Keputusan Resmi Ronde 1:** **DITOLAK SEMENTARA / HOLD** (`funded: false`, **Skor 75/100**: Market 80, Solution 79, Problem 78, Ask/Gov 74, GTM 72, Business Model 66). Wajib bawa *Single Source of Truth* & skema *Tranche* di Ronde 2.

</details>

### Ronde 2 · Revisi & Sinkronisasi Tim

#### 💬 [11] **CEO** (*CEO & Co-Founder*) — Ronde 2

> Terima kasih atas audit keras dan objektif di Ronde 1. Sebagai CEO, saya bertanggung jawab penuh atas benturan angka antar-direksi dan hari ini saya mengunci satu Single Canonical Operating Plan yang mengikat kami berlima pada target tepat 85 sistem komersial atau 220 kolam dengan jadwal Q1 empat pilot, Q2 15 unit, Q3 40 unit, dan Q4 30 unit. Kami juga menyeragamkan sampel validasi Bulan 1 menjadi tepat 24 responden di dua Pokdakan, mengklasifikasikan probe kaca pH sebagai barang habis pakai di luar garansi 12 bulan Hub, serta meluruskan klaim daya bahwa Mini UPS hanya menopang Core Hub 6–12 jam tanpa menggerakkan aerator AC 220V. Sekarang CFO akan mengunci angka finansial resminya.

**Poin Kunci:**
- Seluruh C-Level dikunci ke target 85 sistem (220 kolam) & Revenue Rp271,23 juta
- Sampel validasi Bulan 1 diseragamkan tepat 24 responden di 2 Pokdakan
- Koreksi jujur: Mini UPS tak menyalakan aerator AC 220V; probe pH jadi consumable

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Penguncian Single Canonical Operating Plan (FY1):**
  - **Volume & Jadwal:** Tepat **85 Sistem Komersial** (60 Starter 2K + 25 Juragan 4K = **220 Kolam**): Q1=0 komersial (4 unit pilot 90 hari), Q2=15 (36 kolam), Q3=40 (104 kolam), Q4=30 (80 kolam)
  - **Validasi Seragam:** Tepat **24 responden di 2 Pokdakan** pada Bulan 1
  - **Status Lab Awal:** 1 prototipe Rp1.203.500 + ongkir Rp200.000 = Rp1.403.500 (<Rp1,5 jt; COGS terpasang murni Rp1.138.500)
- **Kejujuran Teknis Daya & Consumable:** Mini UPS hanya jaga Core Hub & alert 6–12 jam (bukan aerator AC 220V); probe kaca pH diklasifikasi sebagai *consumable* Rp195rb/4–6 bulan

</details>

#### 💬 [12] **CFO** (*CFO & Co-Founder*) — Ronde 2

> Menyusul penguncian CEO, seluruh model P&L 12 bulan kini terkunci pada 85 sistem yang terdiri dari 60 Starter 2K dan 25 Juragan 4K dengan Revenue Rp271,23 juta, COGS Rp178,025 juta, dan Gross Margin 34,36% atau Rp93,205 juta. Harga kami satukan: Starter 2K Rp2,45 juta dengan SaaS Rp150 ribu per siklus tiga bulan, Juragan 4K Rp4,15 juta dengan SaaS Rp225 ribu per siklus, serta probe pH consumable Rp195 ribu dengan COGS Rp135 ribu. Timbunan stok Rp120 juta telah kami hapus dan diganti PO DP 50% plus Rolling Buffer Rp50 juta, Legal dan SDPPI kami naikkan ke Rp90 juta, serta biaya bot freemium kami masukkan eksplisit Rp1,5 juta per bulan sehingga kas akhir M12 aman di plus Rp147,205 juta. Silakan CTO memaparkan perbaikan arsitekturnya.

**Poin Kunci:**
- P&L sinkron 100%: Revenue Rp271,23 jt, GP 34,36%, Kas Akhir M12 +Rp147,21 jt
- Tarif tunggal SaaS siklus 3 bulan (Rp150rb/Rp225rb) & Legal/SDPPI naik ke Rp90 juta
- Pos biaya WeningBot Freemium & WA Gateway masuk eksplisit Rp1,5 juta/bulan

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **P&L FY1 Terkunci (Single Source of Truth):**
  - **Revenue:** Rp271.230.000 | **COGS:** Rp178.025.000 (HW Rp170.650rb + Cloud IoT Rp4.135rb + Probe Rp3.240rb) | **Gross Profit:** Rp93.205.000 (**34,36%**)
  - **OPEX:** Rp496.000.000 | **Net Burn:** -Rp402.795.000 | **Kas Akhir M12:** **+Rp147.205.000** (pasca-Rolling Buffer Rp50 juta; *runway* 18+ bulan)
  - **Exit M12:** 70 Sistem Berbayar (49 Starter + 21 Juragan = 182 kolam; Exit MRR Rp4.025.000/bln; ARR Rp48.300.000/thn; churn 5 unit di M8–M12)
- **Harga & COGS v2:** Starter 2K Rp2,45 jt (COGS Rp1,665 jt; SaaS Rp150rb/siklus 3 bln) | Juragan 4K Rp4,15 jt (COGS Rp2,83 jt; SaaS Rp225rb/siklus) | Probe pH Rp195rb (COGS Rp135rb) | Legal/SDPPI Rp90 jt (15%) | Bot/Tech Rp1,5 jt/bln

</details>

#### 💬 [13] **CTO** (*CTO & Co-Founder*) — Ronde 2

> Menindaklanjuti audit teknis Ronde 1, arsitektur Core Hub v2 kami rombak total: kini kami memakai 2× ADS1115 delapan kanal untuk paket 2-kolam dan 3× ADS1115 dua belas kanal untuk paket 4-kolam lengkap dengan GPIO Expander MCP23017 serta Relay 8-Channel pada Juragan 4K. Kami menghentikan ide kabel antar-tetangga dan membatasi kabel shielded berfilter EMI maksimal 3–5 meter dalam satu lokasi, sekaligus menambahkan Mini UPS untuk menjaga logging dan alert padam PLN selama 6–12 jam. Untuk mengatasi lumpur lele dan keamanan AI, kami menanam Sensor Health Watchdog agar sensor yang jenuh otomatis diisolasi, serta mengunci pembaruan parameter WiFi melalui gerbang persetujuan insinyur HITL tanpa autonomous push. Terakhir, kami menambahkan WhatsApp-First Gateway sesuai masukan investor.

**Poin Kunci:**
- Koreksi 2–3x ADS1115 (8–12 kanal), MCP23017, Relay 8-Ch, & kabel shielded <=3–5m
- Sensor Health Watchdog isolasi sensor drift/saturasi + Mini UPS 6–12 jam logging
- HITL Engineer Approval Gate & Safety Bounds mencegah AI menyalakan relay nonstop

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Topologi Multi-Kolam Terkoreksi:** ESP32-WROOM (pre-certified SDPPI), **2× ADS1115 (8 ch) untuk 2K / 3× ADS1115 (12 ch) untuk 4K** + MCP23017 + Level Shifter + **Relay 8-Ch** pada Juragan 4K
- **Batas Kabel & Daya:** Kabel *shielded* + filter EMI maks. **≤ 3–5 meter** di 1 lokasi petambak; Mini UPS DC (logging & alert *"Listrik PLN Padam"* 6–12 jam; aerator AC jujur tetap mati tanpa genset)
- **Ketahanan Lumpur & AI Safety:** **Sensor Health Watchdog** (*graceful degradation* saat turbidity saturasi/drift) + **HITL Engineer Approval Gate** + *Hard Safety Bounds & Duty-Cycle Clamp* (nol *autonomous push*) + **WhatsApp-First Gateway**

</details>

#### 💬 [14] **COO** (*COO & Co-Founder*) — Ronde 2

> Dari sisi manufaktur dan lapangan, saya telah menyelaraskan 100% BOM v2 dan jadwal produksi lima hingga lima belas unit per bulan bersama CFO dan CTO untuk mengejar total 85 sistem tersebut. Kami tetap memakai diskon sensor konservatif -22% sambil memasukkan tambahan biaya Mini UPS Rp50 ribu, ADC kedua dan MCP23017 Rp25 ribu, kabel shielded Rp14 ribu per modul, serta menyeragamkan QC Burn-in Test menjadi 48 jam. Garansi 12 bulan kini khusus untuk elektronik kering Core Hub sementara probe pH menjadi consumable berumur 4–6 bulan dengan garansi DOA 30 hari. Untuk menutup kritik ground-truthing ML, kami sudah menganggarkan Rp14 juta di bulan pertama untuk dua DO meter, test kit amonia/nitrit, dan empat unit pilot v2, ditambah Rp4 juta uji lab di Q1.

**Poin Kunci:**
- BOM v2 sinkron: diskon sensor -22% + biaya Mini UPS, ADC, kabel shielded & QC 48 jam
- Probe pH dipisah jadi consumable (umur 4–6 bulan) di luar garansi Core Hub 12 bulan
- Alat ground-truthing DO Meter & Test Kit Amonia resmi masuk anggaran Q1 Rp18 juta

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Penyelarasan BOM v2 & QC:** Tetap diskon sensor OEM konservatif **-22%**, ditambah biaya mitigasi (Mini UPS Rp50rb, 2nd ADC+MCP23017 Rp25rb, kabel shielded+EMI Rp14rb/modul, Expansion Kit Rp95rb); **QC Burn-in Test 48 Jam** seragam
- **Modal Kerja & Consumable:** Skema PO DP 50% + Pelunasan 50% + **Rolling Component Buffer Rp50 juta** (~30 paket bahan baku *long-lead*); Probe pH berstatus *consumable* (umur 4–6 bln, DOA 30 hari, di luar garansi Hub 12 bln)
- **Anggaran Validasi Fisik Q1 (Rp18 Juta):** M1 Rp14 juta (2 DO Meter Rp5,2 jt + Test Kit Amonia/Nitrit Rp1,8 jt + 4 Unit Sistem Pilot v2 Rp7,0 jt) + Rp4 juta uji lab Q1

</details>

#### 💬 [15] **CMO** (*CMO & Co-Founder*) — Ronde 2

> Saya juga telah merapikan seluruh strategi komersial agar selaras dengan angka CFO dan COO. Klaim Rp0 Ad-Spend dan patungan kabel tetangga resmi kami cabut; SAM kami persempit menjadi 40.000–60.000 RTP berklistrik dan bersinyal dengan SOM 85 sistem pada Blended CAC Rp300 ribu—terdiri dari Rp150 ribu komisi Pokdakan, Rp100 ribu demo, dan Rp50 ribu iklan WhatsApp atau Facebook lokal. Kanal WeningBot AI kini beralih ke WhatsApp-First Gateway dengan lebih dari 90% respons rule-based dan batas tiga kueri AI per hari agar biaya bot tetap Rp1,5 juta sebulan untuk 1.000 user. Meski biaya penggantian probe pH Rp195 ribu dan tarif SaaS siklus CFO sudah kami masukkan ke hitungan ROI all-in petambak, hasilnya tetap sangat menarik di kisaran 74,4%–140,1%.

**Poin Kunci:**
- SAM diperketat ke 40–60rb RTP & klaim Rp0 Ad-Spend maupun patungan tetangga dihapus
- GTM beralih ke WhatsApp-First Gateway + Blended CAC Rp300rb (total OPEX Mkt Rp95,5 jt)
- ROI all-in petambak tetap 74,4%–140,1% meski sudah memotong biaya ganti probe pH Rp195rb

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Pengetatan Pasar & Pencabutan Klaim:** SAM dipersempit ke **40.000–60.000 RTP** (≥2 kolam terpal + listrik 220V + sinyal); SOM FY1 **85 sistem** (0,14%–0,21% SAM); klaim *"Rp0 Ad-Spend"* & patungan tetangga dicabut total
- **Akuisisi & WA-First:** **Blended CAC Rp300rb/sistem** (Rp150rb komisi Pokdakan + Rp100rb demo/transport + Rp50rb iklan WA/FB lokal dalam OPEX Marketing Rp95,5 jt); **WhatsApp-First Gateway** + *rule-based* >90% & limit 3 kueri AI/hari untuk 1.000 user freemium
- **ROI All-In Petambak (Termasuk Ganti Probe Rp195rb):** Juragan 4K **105,8%–140,1%** | Starter 2K **74,4%–103,5%** (tetap positif di skenario sensitivitas 75%)

</details>

#### 💬 [16] **CEO** (*CEO & Co-Founder*) — Ronde 2

> Untuk melengkapi penyelarasan angka tersebut, Bapak Managing Partner, kami juga mengunci empat pilar tata kelola pasca-eFishery guna melindungi modal Pre-Seed Rp600 juta. Pertama, Single-Book Accounting memastikan uang muka PO 50% tidak pernah diakui sebagai pendapatan sebelum instalasi selesai, lolos QC 48 jam, dan pelunasan diterima penuh. Kedua, kebijakan anti-bricking Offline-Plus Rp0 kami jadikan komitmen permanen bersama audit lapangan zero-hype dan gerbang keamanan AI. Terakhir, seluruh pendiri menyepakati ESOP 10%, skema vesting 4 tahun dengan cliff 1 tahun serta pengalihan IP penuh, konversi full-time bertahap, dan pencairan dana melalui tiga tranche berbasis pembuktian lapangan.

**Poin Kunci:**
- Terapkan Single-Book Accounting: DP 50% tidak diakui sebagai revenue sebelum lunas
- Vesting 4 tahun (1-year cliff), ESOP 10%, IP Assignment & komitmen konversi full-time
- Tim siap menjalankan skema Pre-Seed Rp600 juta berbasis 3 milestone tranche

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **4 Pilar Tata Kelola Pasca-eFishery:**
  1. *Single-Book Accounting:* DP/PO 50% tidak diakui sebagai *revenue* hingga instalasi selesai, lolos QC, & lunas 100%
  2. *Anti-Bricking:* Tier *Offline-Plus* Rp0 tetap berjalan permanen
  3. *Zero-Hype Field Audit:* Bukti survei 24 responden & log pilot 90 hari bertanda tangan + foto + DO Meter
  4. *AI Safety Gate:* HITL Engineer Approval + *Hard Safety Bounds*
- **Struktur Tim & Vesting:** 10% ESOP pool; 90% saham pendiri tunduk pada *4-year vesting, 1-year cliff*, *Good/Bad Leaver*, & *IP Assignment* + siap konversi full-time & pencairan 3 tranche

</details>

### Ronde 2 · Audit Ulang & Keputusan Term Sheet

#### 🟢 [17] **Investor** (*Managing Partner VC*) — Ronde 2

> Saya dan komite telah mengaudit ulang seluruh dokumen revisi Ronde 2 kalian hingga ke digit rupiah terakhir. Rekonsiliasi CFO sangat impresif: target 85 sistem atau 220 kolam, Revenue Rp271,23 juta, COGS v2 Rp178,025 juta, Gross Profit 34,36%, OPEX Rp496 juta, hingga kas akhir M12 plus Rp147,205 juta seluruhnya konsisten secara aritmatika di kelima dokumen direksi. Pencabutan timbunan stok Rp120 juta ke model PO DP 50%, kenaikan alokasi Legal/SDPPI menjadi Rp90 juta, pemasukan pos Rp1,5 juta per bulan untuk bot freemium, serta perhitungan LTV:CAC 6,81:1 inti dengan pemisahan probe pH consumable telah menutup Dealbreaker 1, 2, dan 3 secara tuntas.

**Poin Kunci:**
- Audit Keuangan: seluruh P&L, COGS v2, akrual SaaS & kas M12 (+Rp147,2 jt) akurat 100%
- Unit economics sehat (LTV:CAC 6,81:1 inti; 8,05:1 +consumables) & ROI petambak all-in positif
- Dealbreaker 1, 2, dan 3 Ronde 1 resmi ditutup tanpa konflik angka baru

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Verifikasi Rekonsiliasi P&L & Arus Kas:**
  - Volume: 85 sistem (60 Starter 2K + 25 Juragan 4K = 220 kolam) | Exit M12: 70 Paid SaaS (182 kolam; MRR Rp4,025 jt)
  - Revenue Rp271.230.000 | COGS Rp178.025.000 | GP Rp93.205.000 (34,36%) | OPEX Rp496.000.000 | Net Burn -Rp402.795.000 | Kas M12 +Rp147.205.000
- **Unit Economics & Anggaran:** LTV:CAC **6,81:1** (inti) atau **8,05:1** (+consumables); pencabutan stok Rp120 jt → PO DP 50% + Rolling Buffer Rp50 jt; Legal/SDPPI naik ke **Rp90 juta**; Freemium Bot **Rp1,5 jt/bln**
- **Status Audit:** **Dealbreaker 1, 2, dan 3 DINYATAKAN SELESAI**

</details>

#### 🟢 [18] **Investor** (*Managing Partner VC*) — Ronde 2

> Pada aspek teknis, operasional, dan pemasaran, seluruh lubang Ronde 1 juga sudah tertambal dengan rekayasa yang jujur dan matang. Penggunaan 2–3× ADS1115 bersama MCP23017 dan Relay 8-Channel, pembatasan kabel shielded maksimal lima meter, penambahan Mini UPS beserta pengakuan jujur soal aerator AC, Sensor Health Watchdog, serta HITL Engineer Gate membuktikan kedewasaan tim CTO dan COO. Ditambah keseragaman 24 responden Pokdakan, pengadaan DO meter dan test kit amonia Rp18 juta di Q1, serta pergeseran GTM ke WhatsApp-First pada SAM 40–60 ribu RTP, Dealbreaker 4 dan 5 resmi kami nyatakan selesai. Namun, sebelum Tranche 1 dicairkan, ada empat catatan minor sebagai Conditions Precedent yang wajib dibereskan.

**Poin Kunci:**
- Celah multi-kolam, kabel, Mini UPS, Watchdog & HITL Gate tertutup matang
- Validasi Q1 seragam (24 responden + Rp18 jt alat DO/Amonia) & WhatsApp-First realistis
- Dealbreaker 4 dan 5 resmi ditutup; skor melonjak dari 75 menjadi 89/100

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **Verifikasi Teknis & Operasional:**
  - Multi-kolam: 2–3× ADS1115 + MCP23017 + Relay 8-Ch Juragan 4K + kabel *shielded* ≤3–5m (klaim patungan tetangga dihapus)
  - Daya & AI: Mini UPS (kejujuran aerator AC mati saat PLN padam) + Sensor Health Watchdog + HITL Engineer Approval Gate + Cold-Start 4-Fase
  - Manufaktur & Validasi: Diskon OEM -22%, QC Burn-in 48 jam, 24 responden di 2 Pokdakan + Rp18 jt DO Meter/Amonia/4 Pilot Q1
- **Verifikasi GTM:** WhatsApp-First Gateway (3 kueri AI/hari, >90% *rule-based*) + SAM 40.000–60.000 RTP
- **Status Audit:** **Dealbreaker 4 dan 5 DINYATAKAN SELESAI**

</details>

#### 🟢 [19] **Investor** (*Managing Partner VC*) — Ronde 2

> Untuk CTO dan COO, ini dua catatan minor teknis yang masuk ke syarat Conditions Precedent. Pertama, seragamkan desain Mini UPS antara dokumen CTO yang menyebut 12V atau Li-Ion 3S dengan dokumen CEO, COO, dan CFO yang menyebut 2×18650 atau 2S 7,4V, lalu uji beban nyatanya agar tahan 6–12 jam tetap masuk anggaran Rp50 ribu. Kedua, tegaskan di spesifikasi CTO bahwa Relay 8-Channel sudah terintegrasi default pada Juragan 4K, dan samakan keterangan jumlah soket GX16 Core Hub v2 antara BOM COO dengan daftar harga satuan CFO. Selain itu, jadwalkan penarikan penuh Rolling Buffer Rp50 juta di Tranche 2 bulan keempat supaya kas Q1 aman untuk uji pilot dan pengurusan sertifikasi SDPPI perangkat jadi Core Hub v2.

**Poin Kunci:**
- CP Teknis 1: Seragamkan Mini UPS 2S vs 3S + uji beban 6–12 jam sesuai bujet Rp50rb
- CP Teknis 2: Selaraskan keterangan default Relay 8-Ch & soket GX16 (2-slot vs 4-slot)
- CP Ops: Rolling Buffer Rp50 jt di M4 & konfirmasi SDPPI untuk perangkat jadi Core Hub v2

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **CP Teknis & Operasional Sebelum Pencairan Tranche 1 / Produksi:**
  1. **Mini UPS 2S vs 3S:** Seragamkan desain dokumen CTO (*"12V / Li-Ion 3S"*) dengan CEO/COO/CFO (*"2×18650"* = 2S 7,4V), lalu uji beban daya nyata 6–12 jam (matikan *backlight* LCD & *duty-cycling* TDS/turbidity) dalam anggaran Rp50rb
  2. **Spesifikasi Juragan 4K & GX16:** Pastikan dokumen CTO menyebut Relay 8-Ch sebagai *default* Juragan 4K, dan samakan keterangan soket GX16 antara BOM COO (2-slot terpasang + ekspansi) dan daftar harga CFO (*"4 soket GX16"*)
  3. **Jadwal Rolling Buffer & SDPPI:** Pengadaan penuh Rolling Buffer Rp50 juta dijadwalkan di Tranche 2 (M4) agar kas Q1 lega; pastikan sertifikasi SDPPI/DJID mencakup produk jadi Core Hub v2 bermerek BanyuWening

</details>

#### 🟢 [20] **Investor** (*Managing Partner VC*) — Ronde 2

> Sementara untuk CFO, CEO, dan CMO, ada dua catatan administratif yang harus dibereskan sebelum penandatanganan pencairan pertama. Pertama, CFO wajib melampirkan rincian lengkap OPEX Rp496 juta—memperlihatkan pos cadangan RMA Rp8,5 juta, rincian gaji pendiri, pemecahan Marketing Rp95,5 juta, serta pemisahan biaya Fixed Cloud Always-On dan LLM—dibarengi kuotasi resmi Balai Uji SDPPI untuk memastikan bujet Rp90 juta cukup. Kedua, perbaiki redaksional di Slide 2 dan 11 CEO serta Slide 5 CMO agar tidak terkesan dua DO meter berharga Rp14 juta, melainkan mencakup test kit dan empat unit pilot v2. Terakhir, ganti seluruh placeholder identitas pendiri dengan nama resmi, CV, background check, dan selesaikan pendirian PT beserta rekening perusahaan.

**Poin Kunci:**
- CP Keuangan: Serahkan rincian OPEX Rp496 juta (RMA Rp8,5 jt, gaji, cloud) & kuotasi SDPPI
- CP Dek: Perbaiki redaksional Rp14 juta M1 di Slide 2/11 CEO & Slide 5 CMO
- CP Legal: Lengkapi identitas resmi, CV & background check 5 pendiri + akta PT

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **CP Finansial, Dek, & Legal Sebelum Pencairan Tranche 1:**
  1. **Lampiran Rincian OPEX Rp496 Juta:** Tampilkan pos cadangan RMA Rp100rb/sistem (Rp8,5 juta untuk 85 sistem), rincian gaji pendiri (*part-time* vs *full-time*), Marketing Rp95,5 jt (CAC Rp25,5 jt + aktivasi Rp70 jt), & pemisahan *Fixed Cloud Always-On* dengan LLM Freemium di pos Rp1,5 jt/bln
  2. **Penawaran Resmi Balai Uji SDPPI/DJID:** Mengonfirmasi kecukupan anggaran Legal/SDPPI Rp90 juta
  3. **Koreksi Redaksional Dek CEO (Slide 2/11) & CMO (Slide 5):** Perjelas bahwa Rp14 juta di M1 mencakup 2 DO Meter (Rp5,2 jt) + Test Kit (Rp1,8 jt) + 4 Pilot v2 (Rp7,0 jt), bukan alat ukur saja
  4. **Identitas Resmi Pendiri:** Isi nama lengkap, CV, *background check*, kontrak kerja, & pendirian badan hukum PT + rekening perusahaan

</details>

#### 🟢 [21] **Investor** (*Managing Partner VC*) — Ronde 2

> Dengan seluruh lima dealbreaker Ronde 1 berhasil ditutup secara jujur dan akurat, Komite Investasi memutuskan MENYETUJUI pendanaan Pre-Seed Rp600 juta untuk BanyuWening dengan skor komposit 89/100! Investasi ini menggunakan instrumen Post-Money SAFE dengan Valuation Cap Rp4 miliar atau diskon konversi 20%, mengunci ESOP 10%, vesting 4 tahun pada porsi 90% saham pendiri, Single-Book Accounting permanen, serta hak Board Observer Seat bagi kami. Pencairan dilakukan bertahap dalam tiga tranche: Rp200 juta di Bulan 1 untuk pendirian PT, SDPPI, dan Pilot 90 Hari bersama konversi full-time CEO, CTO, dan COO; Rp250 juta di Bulan 4 setelah berita acara pilot dan uji Mini UPS tuntas serta CFO dan CMO bergabung full-time; lalu Rp150 juta di Bulan 8 setelah minimal 40 sistem lunas terpasang dengan retensi SaaS minimal 75% dan deviasi COGS atau CAC maksimal 10%. Selamat kepada tim BanyuWening, mari kita eksekusi Condition Precedent secepatnya.

**Poin Kunci:**
- APPROVED! Skor melonjak 75 → 89/100; Pre-Seed Rp600 juta via Post-Money SAFE Cap Rp4 Miliar
- Cap table: ESOP 10%, Pendiri 90% (4-year vesting, 1-year cliff) + Board Observer Seat
- Pencairan 3 Tranche: Rp200 jt (M1), Rp250 jt (M4), dan Rp150 jt (M8) berbasis gate ketat

<details>
<summary>Lihat Bukti Teknis & Angka Pendukung</summary>

- **KEPUTUSAN RESMI:** **APPROVED (`funded: true`) — Skor Komposit 89/100** (Solution 91, Market 90, Business Model 90, Ask/Gov 90, Problem 88, GTM 87)
- **TERM SHEET:** **Pre-Seed Rp600.000.000** via **Post-Money SAFE** (Valuation Cap Rp4.000.000.000, ~15% kepemilikan atau Diskon 20%)
- **Cap Table & Tata Kelola:** ESOP 10% | Pendiri 90% (CEO 20%, CTO 20%, COO 17%, CFO 17%, CMO 16%) dengan *4-Year Vesting, 1-Year Cliff*, *Single-Book Accounting*, & *Board Observer Seat*
- **Jadwal 3 Tranche:**
  - **Tranche 1 (Rp200 jt · M1):** PT, DJKI/SDPPI, alat validasi Rp14 jt M1 (Q1 Rp18 jt), survei 24 responden, Pilot 90 Hari, full-time CEO/CTO/COO
  - **Tranche 2 (Rp250 jt · M4):** Berita acara Pilot 90 Hari & uji Mini UPS 6–12 jam, SDPPI aman, full-time CFO/CMO, Rolling Buffer Rp50 jt & produksi Q2–Q3
  - **Tranche 3 (Rp150 jt · M8):** Min. 40 sistem terpasang & lunas 100%, retensi SaaS ≥75%, nol insiden *bricking/runaway*, deviasi COGS & CAC maks. ±10%

</details>

---

## Term Sheet Final Investor (Ronde 2 — Disetujui)

INSTRUMEN & VALUASI: Investasi Pre-Seed sebesar Rp600.000.000 menggunakan instrumen Post-Money SAFE (Simple Agreement for Future Equity) dengan Valuation Cap Rp4.000.000.000 (~15% implikasi kepemilikan saat konversi pada putaran Seed berikutnya, atau Diskon Konversi 20% — mana yang memberikan harga per saham lebih rendah bagi investor).

TATA KELOLA & PERLINDUNGAN INVESTOR:
1. Cap Table & Vesting: ESOP Pool 10% terkunci sebelum konversi; seluruh porsi saham pendiri (90%: CEO 20%, CTO 20%, COO 17%, CFO 17%, CMO 16%) tunduk pada 4-Year Vesting, 1-Year Cliff, klausul Good/Bad Leaver, dan pengalihan hak kekayaan intelektual (IP Assignment) penuh ke PT BanyuWening.
2. Akuntansi & Anti-Channel Stuffing: Penerapan wajib Single-Book Accounting; pengakuan pendapatan hardware hanya dilakukan setelah instalasi di kolam selesai, teruji QC, dan pelunasan 50% diterima (DP/PO tidak diakui sebagai revenue). Kebijakan Anti-Bricking (Offline-Plus Rp0) wajib dipertahankan secara permanen.
3. Hak Informasi: Pelaporan bulanan (P&L, mutasi rekening koran, jumlah sistem aktif di server, dan metrik retensi/churn SaaS) serta hak pengamatan dewan (Board Observer Seat).

CONDITIONS PRECEDENT (CP) SEBELUM PENCAIRAN TRANCHE 1:
1. Melengkapi identitas resmi, CV, background check, dan kontrak kerja ke-5 pendiri (konversi Full-Time 40+ jam/mg bagi CEO, CTO, dan COO efektif saat Tranche 1 cair).
2. Menyerahkan rincian penuh tabel OPEX Rp496.000.000 (termasuk pos RMA Rp8,5 juta dan pemisahan Fixed Cloud Always-On + WA Gateway), menyelaraskan redaksional biaya validasi M1 Rp14 juta di dek CEO/CMO, serta mengunci spesifikasi akhir Mini UPS (2S vs 3S) dan jumlah soket GX16 Core Hub v2 di BOM PCB.
3. Penetapan struktur badan hukum PT dan rekening bank perusahaan.

SYARAT PENCAIRAN TRANCHE (MILESTONE-BASED):
- TRANCHE 1 — Rp200.000.000 (Bulan 1 / Closing): Pendirian PT, pengajuan DJKI & sertifikasi perangkat jadi SDPPI/DJID Komdigi, pengadaan 2 DO Meter + Test Kit Amonia/Nitrit + 4 Unit Pilot v2 (Rp14 jt M1; total uji lab Q1 Rp18 jt), eksekusi survei primer seragam 24 responden di 2 Pokdakan, dan mulai Pilot Lapangan 90 Hari (Rolling Buffer Rp50 jt ditahan ke Tranche 2 agar likuiditas Q1 terjaga).
- TRANCHE 2 — Rp250.000.000 (Bulan 4 / Awal Q2): Gate Wajib: (a) Berita acara bertanda tangan hasil Pilot 90 Hari & survei 24 responden (termasuk data ground-truthing DO/Amonia, uji sensor di lumpur lele, dan bukti uji daya Mini UPS 6–12 jam); (b) Kepastian kepatuhan sertifikasi radio SDPPI/DJID aman sebelum distribusi komersial; (c) Konversi resmi CFO dan CMO menjadi Full-Time 40+ jam/mg. Dana dialokasikan untuk Rolling Component Buffer Rp50 juta dan produksi Q2–Q3 (target 55 sistem komersial).
- TRANCHE 3 — Rp150.000.000 (Bulan 8 / Pertengahan Q3): Gate Wajib: (a) Minimal 40 sistem komersial terpasang dan terlunasi 100% sesuai rekening koran & berita acara instalasi; (b) Retensi SaaS panen >=75% serta nol insiden bricking maupun runaway actuator; (c) Realisasi COGS batch dan Blended CAC aktual berada dalam batas deviasi maksimal +/-10% dari rencana. Dana membiayai penyelesaian target FY1 85 sistem dan menjaga proyeksi kas akhir M12 >= Rp147 juta (runway 18+ bulan).
