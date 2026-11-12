# BanyuWening Machine Learning Engine (Random Forest)

Modul Machine Learning berbasis Scikit-learn (Random Forest) untuk klasifikasi risiko kualitas air kolam akuakultur air tawar (ikan lele - *Clarias batrachus*).

## Struktur Direktori
```
ml/
├── datasets/
│   └── sensor_readings.csv       # Dataset telemetri sensor
├── models/
│   ├── random_forest_water_quality.joblib  # Serialisasi model Joblib
│   └── model_card.json           # Metadata & evaluasi model
├── src/
│   ├── preprocessing.py          # Pembersihan data & batas fisik sensor
│   ├── features.py               # Feature engineering (indeks stres & deviasi)
│   ├── train.py                  # Pipeline pelatihan model
│   ├── predict.py                # Pipeline inference JSON untuk Laravel
│   └── evaluate.py               # Pengujian metrik & confusion matrix
├── requirements.txt
└── README.md
```

## Parameter & Fitur Input
1. **pH Kolam** (Batas aman: 6.5 – 8.5)
2. **Suhu Air (°C)** (Batas aman: 26.0 – 32.0 °C)
3. **Total Dissolved Solids (TDS)** (Batas maksimal: 600 ppm)
4. **Kekeruhan Turbiditas (NTU)** (Batas maksimal: 50 NTU)
5. **Ketinggian Air Kolam** (1 = Normal, 0 = Surut)
6. **Deviasi pH** (`abs(pH - 7.0)`)
7. **Deviasi Suhu** (`abs(Suhu - 28.5)`)
8. **Rasio TDS** (`TDS / 400.0`)
9. **Water Stress Index** (Indeks penalti komposit)

## Target Klasifikasi
- `0` / **AMAN**: Parameter normal, ikan tidak berisiko stres.
- `1` / **WASPADA**: Indikasi awal penurunan mutu air dalam horizon 1–3 jam ke depan.
- `2` / **BAHAYA**: Kondisi kritis mendesak (failsafe mikrokontroler / aerator darurat).

## Cara Menjalankan
### 1. Pelatihan Model
```bash
python ml/src/train.py
```

### 2. Inferensi Prediksi untuk Laravel
```bash
python ml/src/predict.py '{"ph": 6.8, "temperature_c": 31.5, "tds_ppm": 520, "turbidity_ntu": 42, "water_level": "NORMAL"}'
```
Output berupa format JSON:
```json
{
  "success": true,
  "risk": "AMAN",
  "p_aman": 0.9412,
  "p_waspada": 0.0512,
  "p_bahaya": 0.0076,
  "triggers": [],
  "failsafe_active": false,
  "recommended_action": "Seluruh parameter berada dalam ambang batas aman SNI lele.",
  "model_version": "1.0.0-rf"
}
```
