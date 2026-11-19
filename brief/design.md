# design.md — Sistem Desain Dashboard BanyuWening

Acuan: `Logo_BanyuWening/Panduan_Logo.html` (identitas), `PRD_BanyuWening.md` (fitur), `plan.md` (urutan kerja).

---

## 1. Prinsip

Petambak membuka dashboard dalam dua situasi: **cek rutin** (sehari-hari, santai) dan **panik** (jam 2 pagi setelah notifikasi Telegram). Desainnya dibuat untuk situasi kedua.

1. **Jawab satu pertanyaan dalam 3 detik: "Kolam saya aman?"** Status kolam selalu jadi elemen terbesar di layar pertama. Angka sensor berada di bawahnya.
2. **Tenang saat aman, jelas saat bahaya.** Kondisi normal ditampilkan netral, tanpa hijau yang mencolok di mana-mana. Warna baru dipakai saat ada yang perlu diperhatikan, supaya merah benar-benar terasa sebagai peringatan.
3. **Jujur soal data.** Selalu tampilkan kapan data terakhir masuk. Data basi, perangkat offline, dan prediksi yang belum tervalidasi harus terlihat jelas, tidak boleh disamarkan sebagai kondisi normal.
4. **Mobile dulu.** Sebagian besar petambak memakai Android kelas menengah dengan sinyal 3G/4G di pinggir kolam. Desktop ditujukan untuk Analis dan Admin.
5. **Bahasa petambak, bukan bahasa sistem.** Tulis "Air terlalu asam", bukan "pH out of range". Gunakan istilah teknis hanya di halaman Analis.

---

## 2. Warna

Palet diturunkan dari logo. Hijau, kuning, dan merah **hanya** dipakai untuk status kualitas air, bukan dekorasi.

### 2.1 Token dasar

| Token | Terang | Gelap | Pakai untuk |
|-------|--------|-------|-------------|
| `--bg` | `#F2EFE7` Kapur | `#0F2321` Malam Kolam | Latar halaman |
| `--surface` | `#FBFAF6` | `#16302D` | Kartu, panel |
| `--surface-2` | `#E9E5DA` | `#1D3A36` | Hover, baris tabel selang-seling, input |
| `--line` | `#D9D4C7` | `#2A4743` | Garis pemisah, border kartu |
| `--text` | `#14302D` Lumut Dalam | `#E8ECE9` | Teks utama |
| `--text-muted` | `#55645F` | `#9DB0AB` | Label, keterangan, waktu |
| `--brand` | `#33706A` Banyu | `#8CC2BA` Embun | Link, tombol utama, garis grafik, fokus |
| `--brand-ink` | `#FFFFFF` | `#0F2321` | Teks di atas `--brand` |

### 2.2 Token status

Ada tiga lapis per status: **latar** (badge/banner), **teks** (di atas latar), dan **grafis** (titik, ikon, garis ambang di grafik).

| Status | Latar | Teks | Grafis | Gelap: teks/grafis |
|--------|-------|------|--------|--------------------|
| **Aman** | `#E4F0E7` | `#24663F` | `#267A4B` | `#7FD3A0` |
| **Waspada** | `#FAEFD6` | `#7A4E00` | `#A87000` | `#F2C46B` |
| **Bahaya** | `#FBE3E0` | `#A3221B` | `#C62F25` | `#FF9C92` |
| **Offline / tidak ada data** | `#E8E6E0` | `#4F5A57` | `#7A8481` | `#9DB0AB` |

Di mode gelap, latar status adalah warna grafis dengan opasitas 16% di atas `--surface`.

### 2.3 Kontras terukur (WCAG 2.2)

| Pasangan | Rasio | Syarat |
|----------|-------|--------|
| `--text` di `--surface` | 13,5 : 1 | AA teks ✓ |
| `--text-muted` di `--surface` | 6,0 : 1 | AA teks ✓ |
| `--brand` di `--surface` | 5,5 : 1 | AA teks ✓ |
| Teks Aman / Waspada / Bahaya di latarnya | 5,9 / 6,3 / 6,1 : 1 | AA teks ✓ |
| Grafis Aman / Waspada / Bahaya di `--surface` | 5,1 / 4,0 / 5,2 : 1 | AA non-teks (3:1) ✓ |
| Gelap: teks status di `--surface` | 7,9 / 8,6 / 7,0 : 1 | AAA ✓ |

> Kuning `#C98A06` yang lebih cerah hanya mencapai 2,8 : 1, jadi tidak dipakai. Jangan menggantinya dengan kuning "standar" seperti `#FACC15`.

### 2.4 Aturan

- **Status tidak boleh hanya dibedakan lewat warna.** Setiap status selalu punya ikon dan teks: ✓ Aman, ⚠ Waspada, ⨯ Bahaya. Sekitar 8% pria buta warna merah-hijau.
- Dalam kondisi Aman, kartu parameter tetap netral (`--surface`). Hanya titik status kecil yang hijau.
- Saat Waspada/Bahaya, hanya kartu parameter **pemicu** yang diberi latar status. Kartu lainnya tetap netral.
- Tanpa gradien, glow, atau glassmorphism.

---

## 3. Tipografi

| Peran | Font | Ukuran / tinggi baris | Berat |
|-------|------|----------------------|-------|
| Display (judul status kolam) | Fraunces, opsz 144 | 32/36 mobile, 40/44 desktop | 400 |
| Judul halaman | Fraunces, opsz 72 | 24/30 | 400 |
| Judul kartu | Manrope | 14/20, tracking 0 | 600 |
| Body | Manrope | 15/24 | 400 |
| Label kecil, waktu | Manrope | 13/18 | 500 |
| Angka sensor | Manrope, `tabular-nums` | 36/40 mobile, 44/48 desktop | 600 |
| Satuan sensor | Manrope | 15/20, `--text-muted` | 500 |
| Overline (label seksi) | Manrope | 12/16, tracking 0.08em, KAPITAL | 600 |

- Muat font lewat `next/font/google` (self-hosted otomatis, tanpa layout shift): `Fraunces({ axes: ['opsz'] })` dan `Manrope`.
- Fraunces **hanya** untuk judul. Semua angka dan UI memakai Manrope.
- Selalu pakai `font-variant-numeric: tabular-nums` pada angka yang berubah realtime supaya tata letak tidak bergeser.
- Format angka `id-ID`: `7,12`, `28,4 °C`, `352 ppm`. Pakai `Intl.NumberFormat('id-ID')`.
- Format waktu: relatif untuk < 1 jam ("12 detik lalu", "4 menit lalu"), absolut untuk sisanya ("Selasa, 10 Nov · 02.15 WIB").

---

## 4. Ruang, Bentuk, Elevasi

- **Skala spasi (px):** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Gunakan skala Tailwind default (`1, 2, 3, 4, 6, 8, 12, 16`).
- **Gutter halaman:** 16px mobile, 24px tablet, 32px desktop. Lebar konten maksimum 1280px.
- **Radius:** 6px untuk kartu dan input, 999px untuk badge dan toggle. Satu nilai radius untuk kartu, tidak dicampur.
- **Border:** 1px `--line`. Kartu memakai border, **bukan** bayangan.
- **Bayangan:** hanya untuk elemen melayang (dialog, menu dropdown, toast): `0 8px 24px rgb(15 35 33 / 0.12)`.
- **Target sentuh:** minimal 44×44px. Petambak sering memegang ponsel dengan tangan basah.

---

## 5. Tata Letak

### 5.1 Navigasi

| Lebar | Pola |
|-------|------|
| < 768px | Header atas (logogram + nama kolam + avatar), **tab bar bawah** dengan 4 item: Ringkasan · Grafik · Peringatan · Lainnya |
| ≥ 768px | Sidebar kiri 240px (logo horizontal di atas), konten di kanan |

Item navigasi per peran:

| Item | Pemilik | Operator | Analis | Admin |
|------|:------:|:-------:|:-----:|:----:|
| Ringkasan | ✓ | ✓ | ✓ | ✓ |
| Grafik | ✓ | ✓ | ✓ | ✓ |
| Peringatan | ✓ | ✓ | ✓ | ✓ |
| Aerator (riwayat + kontrol) | lihat | ✓ | lihat | ✓ |
| Prediksi (detail model) | — | — | ✓ | ✓ |
| Ekspor | — | — | ✓ | ✓ |
| Kalibrasi | — | ✓ | — | ✓ |
| Pengguna & Perangkat | — | — | — | ✓ |

### 5.2 Halaman Ringkasan (mobile, 360px)

```
┌──────────────────────────────────┐
│ [B] Kolam Terpal 1          (MN) │  header 56px
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ ✓  Air kolam aman            │ │  KARTU STATUS
│ │    Diperbarui 12 detik lalu  │ │  (elemen terbesar)
│ │                              │ │
│ │    Perkiraan 1–3 jam: Aman   │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌─────────────┐ ┌─────────────┐  │
│ │ pH          │ │ Suhu        │  │  KARTU PARAMETER
│ │ 7,12        │ │ 28,4 °C     │  │  2 kolom
│ │ ● normal    │ │ ● normal    │  │
│ │ ╱╲_╱‾ 6 jam │ │ ‾╲_╱ 6 jam  │  │  sparkline
│ └─────────────┘ └─────────────┘  │
│ ┌─────────────┐ ┌─────────────┐  │
│ │ TDS         │ │ Kekeruhan   │  │
│ │ 352 ppm     │ │ 41,5 NTU    │  │
│ └─────────────┘ └─────────────┘  │
│ ┌──────────────────────────────┐ │
│ │ Level air        ● Normal    │ │  1 kolom
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Aerator   ○ Mati   [ Atur ]  │ │  KARTU AERATOR
│ │ Otomatis · 3 j 20 m hari ini │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ Perangkat ● Online · v1.2.0  │ │  STATUS PERANGKAT
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ Ringkasan  Grafik  Peringatan  ⋯ │  tab bar 64px
└──────────────────────────────────┘
```

**Desktop (≥ 1024px):** grid 12 kolom. Kartu status 8 kolom + kartu aerator dan perangkat 4 kolom di baris pertama. Lima kartu parameter dalam satu baris di bawahnya. Di bawahnya lagi, grafik 24 jam gabungan dan 5 peringatan terakhir berdampingan.

### 5.3 Saat BAHAYA

```
┌──────────────────────────────────┐
│ ┌──────────────────────────────┐ │  latar --bahaya-bg
│ │ ⨯  Air terlalu asam          │ │  teks --bahaya-text
│ │    pH 5,82 · batas aman 6,5  │ │
│ │    Aerator dinyalakan        │ │
│ │    otomatis 02.14 WIB        │ │
│ │                              │ │
│ │  Yang bisa dilakukan:        │ │  rekomendasi tindakan
│ │  • Cek sumber air masuk      │ │  (PRD: "disertai
│ │  • Tambahkan kapur dolomit   │ │   rekomendasi tindakan
│ │    sesuai arahan penyuluh    │ │   praktis")
│ │                              │ │
│ │  [ Tandai sudah ditangani ]  │ │
│ └──────────────────────────────┘ │
│ ┌─────────────┐ ┌─────────────┐  │
│ │▌pH    ⨯     │ │ Suhu  ●     │  │  hanya kartu pemicu
│ │▌5,82        │ │ 28,4 °C     │  │  yang diwarnai
```

Teks rekomendasi disimpan di `rules.py` di backend (satu sumber) dan wajib ditinjau pakar sebelum rilis.

---

## 6. Komponen

### 6.1 Kartu Status Kolam

Menggabungkan **status rule saat ini** dan **prediksi 1–3 jam**. Diambil level tertinggi:

| Kondisi | Judul | Ikon |
|---------|-------|------|
| Semua parameter dalam rentang ideal, prediksi Aman | "Air kolam aman" | ✓ |
| Ada parameter mendekati batas, atau prediksi Waspada | "Perlu diperhatikan" + parameter | ⚠ |
| Ada parameter melewati batas kritis, atau prediksi Bahaya | Kalimat spesifik: "Air terlalu asam", "Air terlalu panas", "Level air surut" | ⨯ |
| Data terakhir > 2 menit | "Data terlambat" + waktu terakhir | ⏱ |
| Perangkat offline (LWT) | "Perangkat tidak terhubung" + "Aerator tetap dijaga otomatis oleh perangkat" | ⊘ |

Pesan offline penting. Petambak harus tahu bahwa failsafe lokal tetap bekerja walau dashboard tidak bisa melihat kolam.

### 6.2 Kartu Parameter

- Isi: label, angka besar + satuan, titik status + kata ("normal", "mendekati batas", "di luar batas"), sparkline 6 jam.
- Sparkline: SVG polos 1,5px, warna `--text-muted`. Pita rentang ideal digambar sebagai area `--surface-2`. Saat di luar batas, garisnya berganti ke warna grafis status.
- Ketuk kartu untuk membuka grafik parameter itu di halaman Grafik.
- Nilai `null` atau sensor fault: tampilkan "—" dan "Sensor tidak terbaca". **Jangan** tampilkan 0.
- Saat nilai berubah, angka melakukan cross-fade 150ms. Tanpa animasi count-up, karena angka sensor bukan skor game.

### 6.3 Grafik (halaman Grafik)

- Library: **Recharts** (sudah disebut di brief).
- Empat grafik bertumpuk, satu per parameter, dengan sumbu-X waktu yang sinkron. Hover/sentuh di satu grafik menampilkan crosshair di semua grafik. **Jangan** gabungkan 4 parameter berbeda satuan dalam satu grafik dua sumbu.
- Pemilih rentang (segmented control): 6 jam · 24 jam · 7 hari · Kustom.
- Pita rentang ideal: area `--surface-2`. Garis ambang kritis: garis putus-putus warna grafis Bahaya dengan label kecil "batas 6,0".
- Garis data: `--brand`, 1,5px, tanpa titik kecuali saat hover. Tanpa animasi masuk.
- Periode aerator ON: pita vertikal tipis di dasar grafik berwarna `--brand` 20%.
- Celah data (> 2 menit tanpa data) digambar sebagai **putus**, tidak disambung (`connectNulls={false}`).
- Tooltip: waktu absolut WIB, nilai `id-ID`, status.
- Alternatif aksesibel: tombol "Lihat sebagai tabel" di setiap grafik.

### 6.4 Panel Prediksi

```
┌──────────────────────────────────────┐
│ PERKIRAAN 1–3 JAM KE DEPAN           │
│ ⚠ Waspada                            │
│                                      │
│ Aman     ▓▓▓▓▓▓░░░░░░░░░░  38%       │
│ Waspada  ▓▓▓▓▓▓▓▓▓▓░░░░░░  54%       │
│ Bahaya   ▓▓░░░░░░░░░░░░░░   8%       │
│                                      │
│ Pemicu utama: suhu naik 1,4 °C       │
│ dalam 1 jam terakhir                 │
│                                      │
│ Model v0.3 · dibuat 02.10 WIB        │
│ ⓘ Perkiraan membantu keputusan,      │
│   bukan kepastian. Aerator tetap     │
│   dijaga oleh aturan di perangkat.   │
└──────────────────────────────────────┘
```

- Bar horizontal statis, tanpa gauge atau donut.
- Kalau model belum tervalidasi lapangan, tambahkan badge abu-abu **"Model uji"** di samping judul. Hapus badge hanya setelah laporan evaluasi (plan.md C2) selesai.
- Pemilik melihat versi ringkas (kelas + pemicu) di Kartu Status. Analis melihat panel lengkap + riwayat prediksi vs aktual.

### 6.5 Kontrol Aerator

Ini aksi fisik yang berisiko, jadi alurnya dibuat eksplisit:

1. Kartu aerator menampilkan state (`Menyala` / `Mati`), mode (`Otomatis` / `Manual` / `Pengaman perangkat`), dan total jam nyala hari ini.
2. Tombol **Atur** membuka bottom sheet (mobile) atau dialog (desktop):
   - Pilihan: `Nyalakan` / `Matikan` / `Kembalikan ke otomatis`
   - Durasi manual: 15 menit · 30 menit · 1 jam · 2 jam (wajib dipilih, sesuai `ttl_s`)
   - Tombol konfirmasi dengan kata kerja eksplisit: **"Nyalakan aerator 30 menit"**
3. Setelah dikirim: state **"Menunggu perangkat…"** dengan spinner kecil. Tombol nonaktif.
4. Saat konfirmasi dari topik `/relay` masuk, tampilkan toast "Aerator menyala · otomatis kembali 02.45 WIB".
5. Jika tidak ada konfirmasi dalam 15 detik: "Perangkat tidak merespons. Periksa koneksi di kolam."
6. Jika ditolak failsafe: "Aerator tidak bisa dimatikan sekarang karena pH di luar batas aman. Perangkat menjaganya tetap menyala."

Tanpa toggle switch langsung. Satu ketukan tidak boleh menyalakan atau mematikan motor di kolam.

### 6.6 Badge Status

- Bentuk pill, tinggi 24px, padding 0 10px, ikon 14px + teks 13/18 berat 600.
- Selalu menampilkan ikon + teks, tidak pernah hanya titik warna.

### 6.7 Daftar Peringatan

- Item: ikon level, judul manusiawi, parameter + nilai, waktu relatif, sumber (`Aturan` / `Prediksi` / `Perangkat`), status Telegram (terkirim / gagal).
- Filter chip: Semua · Belum ditangani · Bahaya · Waspada.
- Ack: tombol sekunder "Sudah ditangani". Setelah ditekan, item meredup dan menampilkan "Ditangani oleh Ilham · 02.20".
- Kosong: "Belum ada peringatan. Kolam berjalan normal sejak 3 hari lalu."

### 6.8 Tombol

| Varian | Tampilan | Pakai |
|--------|----------|-------|
| Utama | latar `--brand`, teks `--brand-ink` | 1 per layar: aksi utama |
| Sekunder | border `--line`, teks `--text` | aksi lain |
| Bahaya | latar Bahaya-grafis, teks putih | hanya di dialog konfirmasi destruktif (hapus pengguna) |
| Teks | teks `--brand`, tanpa border | aksi tersier, link |

Tinggi 44px, radius 6px, teks 15/20 berat 600. Fokus: `outline: 2px solid var(--brand); outline-offset: 2px`.

---

## 7. State Data

Semua tampilan data wajib menangani kelima state ini:

| State | Tampilan |
|-------|----------|
| **Memuat** | Skeleton sesuai bentuk kartu (blok `--surface-2`, tanpa shimmer). Maksimal 300ms sebelum skeleton muncul |
| **Kosong** | Kalimat penjelasan + langkah berikutnya. Contoh: "Belum ada data dari perangkat. Pastikan perangkat menyala dan terhubung WiFi." |
| **Error** | "Data gagal dimuat." + tombol "Coba lagi". Jangan tampilkan stack trace |
| **Basi** (> 2 menit) | Angka tetap tampil dengan opasitas 60% + banner "Data terakhir 7 menit lalu" |
| **Offline** (LWT) | Seperti basi + Kartu Status berubah ke state offline (6.1) |

---

## 8. Telegram

Gaya pesan mengikuti dashboard. Contoh:

```
⨯ BAHAYA · Kolam Terpal 1
Air terlalu asam — pH 5,82 (aman 6,5–8,5)
Aerator dinyalakan otomatis 02.14 WIB.

Yang bisa dilakukan:
• Cek sumber air masuk
• Tambahkan kapur dolomit sesuai arahan penyuluh

Lihat dashboard: https://banyuwening.vercel.app/
```

- Baris pertama: level + nama kolam, supaya terbaca di pop-up notifikasi.
- Avatar bot: `Logo_BanyuWening/png/logogram.png` di atas latar Kapur.
- Pemulihan juga dikirim: "✓ Kembali aman · pH 6,9 · 03.05 WIB". Petambak perlu tahu kapan boleh tidur lagi.

---

## 9. Gerak

- Durasi 150–200ms, easing `cubic-bezier(0.2, 0, 0, 1)`.
- Yang dianimasikan hanya: cross-fade angka, masuk/keluar dialog dan toast, pergantian status Kartu Status (warna latar 200ms).
- Tidak ada animasi pada grafik, parallax, atau animasi saat scroll.
- Hormati `prefers-reduced-motion: reduce` dengan menonaktifkan semua transisi.

---

## 10. Aksesibilitas

- Target WCAG 2.2 AA.
- Kartu Status memakai `role="status"` + `aria-live="polite"`. Saat berubah ke Bahaya, gunakan `aria-live="assertive"`, satu kali per perubahan, bukan setiap 30 detik.
- Pembaruan angka realtime **tidak** diumumkan ke screen reader setiap 30 detik.
- Grafik punya `aria-label` ringkasan ("pH 24 jam terakhir, rentang 6,8 sampai 7,4, saat ini 7,12") dan alternatif tabel.
- Semua kontrol bisa dioperasikan dengan keyboard. Dialog menjebak fokus dan menutup dengan `Esc`.
- Zoom 200% tidak memotong konten. Teks memakai `rem`.
- `lang="id"` di `<html>`.

---

## 11. Copy (kosakata)

| Hindari | Gunakan |
|---------|---------|
| Telemetry | Data kolam |
| Out of range | Di luar batas aman |
| Device offline | Perangkat tidak terhubung |
| Relay ON | Aerator menyala |
| Failsafe mode | Pengaman perangkat aktif |
| Prediction confidence 54% | Kemungkinan 54% |
| Acknowledge | Sudah ditangani |
| Turbidity | Kekeruhan |
| TDS | TDS (zat terlarut) — tampilkan keterangan saat pertama kali muncul |

- Kalimat aktif, singkat, tanpa tanda seru.
- Waktu memakai WIB dan format 24 jam dengan titik: `02.14 WIB`.

---

## 12. Implementasi (Tailwind v4)

```css
/* web/app/globals.css */
@import "tailwindcss";

:root {
  --bg: #F2EFE7; --surface: #FBFAF6; --surface-2: #E9E5DA; --line: #D9D4C7;
  --text: #14302D; --text-muted: #55645F; --brand: #33706A; --brand-ink: #FFFFFF;
  --aman-bg: #E4F0E7; --aman-text: #24663F; --aman: #267A4B;
  --waspada-bg: #FAEFD6; --waspada-text: #7A4E00; --waspada: #A87000;
  --bahaya-bg: #FBE3E0; --bahaya-text: #A3221B; --bahaya: #C62F25;
  --offline-bg: #E8E6E0; --offline-text: #4F5A57; --offline: #7A8481;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0F2321; --surface: #16302D; --surface-2: #1D3A36; --line: #2A4743;
    --text: #E8ECE9; --text-muted: #9DB0AB; --brand: #8CC2BA; --brand-ink: #0F2321;
    --aman-text: #7FD3A0; --aman: #7FD3A0; --aman-bg: color-mix(in srgb, #7FD3A0 16%, #16302D);
    --waspada-text: #F2C46B; --waspada: #F2C46B; --waspada-bg: color-mix(in srgb, #F2C46B 16%, #16302D);
    --bahaya-text: #FF9C92; --bahaya: #FF9C92; --bahaya-bg: color-mix(in srgb, #FF9C92 16%, #16302D);
    --offline-text: #9DB0AB; --offline: #9DB0AB; --offline-bg: color-mix(in srgb, #9DB0AB 16%, #16302D);
    color-scheme: dark;
  }
}
/* ulangi blok gelap di bawah :root[data-theme="dark"] untuk toggle manual */

@theme inline {
  --color-bg: var(--bg); --color-surface: var(--surface); --color-surface-2: var(--surface-2);
  --color-line: var(--line); --color-ink: var(--text); --color-muted: var(--text-muted);
  --color-brand: var(--brand); --color-brand-ink: var(--brand-ink);
  --color-aman: var(--aman); --color-aman-bg: var(--aman-bg); --color-aman-text: var(--aman-text);
  --color-waspada: var(--waspada); --color-waspada-bg: var(--waspada-bg); --color-waspada-text: var(--waspada-text);
  --color-bahaya: var(--bahaya); --color-bahaya-bg: var(--bahaya-bg); --color-bahaya-text: var(--bahaya-text);
  --color-offline: var(--offline); --color-offline-bg: var(--offline-bg); --color-offline-text: var(--offline-text);
  --font-display: var(--font-fraunces), Georgia, serif;
  --font-sans: var(--font-manrope), system-ui, sans-serif;
  --radius-card: 6px;
}

body { background: var(--bg); color: var(--text); font-family: var(--font-sans); }
```

```tsx
// web/app/layout.tsx
import { Fraunces, Manrope } from "next/font/google";
const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--font-fraunces" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
// <html lang="id" className={`${fraunces.variable} ${manrope.variable}`}>
```

**Aset logo:** salin `Logo_BanyuWening/svg/` ke `web/public/brand/`, lalu `ikon-aplikasi.svg` ke `web/app/icon.svg`, dan `png/ikon-aplikasi-192.png` serta `-512.png` ke manifest PWA. Pakai `horizontal.svg` di sidebar, `logogram.svg` di header mobile, dan versi `-gelap` untuk mode gelap.

**Ikon UI:** Lucide (`lucide-react`), stroke 1,75, ukuran 16/20/24. Status: `CircleCheck` (Aman), `TriangleAlert` (Waspada), `OctagonX` (Bahaya), `WifiOff` (Offline), `Clock` (Basi).
