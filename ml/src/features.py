"""
Modul Rekayasa Fitur (Feature Engineering) untuk Model Random Forest BanyuWening
Membuat fitur turunan berdasarkan karakteristik biologis budidaya lele (Clarias batrachus).
"""

from typing import Dict, Any, List
import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "ph",
    "temperature_c",
    "tds_ppm",
    "turbidity_ntu",
    "water_level",
    "ph_deviation",
    "temp_deviation",
    "tds_ratio",
    "water_stress_index",
]

def extract_features(data: Dict[str, float]) -> List[float]:
    """
    Mengekstraksi vektor fitur numerik untuk satu sampel inference.
    """
    ph = data["ph"]
    temp = data["temperature_c"]
    tds = data["tds_ppm"]
    turb = data["turbidity_ntu"]
    water_level = data["water_level"]

    # Deviasi dari nilai netral ideal (pH 7.0, Suhu 28.5 °C)
    ph_deviation = abs(ph - 7.0)
    temp_deviation = abs(temp - 28.5)

    # Rasio TDS terhadap referensi nominal pengujian (400 ppm).
    # Catatan: TDS belum memiliki ambang universal SNI 8228.4:2015; batasnya harus divalidasi lokal per kolam.
    tds_ratio = tds / 400.0

    # Indeks komposit stres air kolam (fitur bantu pengujian).
    # Suhu (25–30 °C) & pH (6.5–8.5) mengacu SNI 8228.4:2015;
    # penalti TDS, turbidity, dan water_level bersifat heuristik sementara dan TIDAK dipakai membentuk label target.
    ph_penalty = 2.0 if (ph < 6.5 or ph > 8.5) else (5.0 if (ph < 6.0 or ph > 8.8) else 0.0)
    temp_penalty = 2.0 if (temp > 30.0 or temp < 25.0) else (4.0 if (temp > 33.0 or temp < 22.0) else 0.0)
    tds_penalty = 2.0 if tds > 600 else (5.0 if tds > 800 else 0.0)
    turb_penalty = 1.5 if turb > 80 else (3.0 if turb > 120 else 0.0)
    level_penalty = 5.0 if water_level < 0.5 else 0.0

    water_stress_index = ph_penalty + temp_penalty + tds_penalty + turb_penalty + level_penalty

    return [
        ph,
        temp,
        tds,
        turb,
        water_level,
        ph_deviation,
        temp_deviation,
        tds_ratio,
        water_stress_index,
    ]

def transform_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Menghasilkan fitur turunan untuk keseluruhan DataFrame training.
    """
    res = df.copy()
    res["ph_deviation"] = (res["ph"] - 7.0).abs()
    res["temp_deviation"] = (res["temperature_c"] - 28.5).abs()
    res["tds_ratio"] = res["tds_ppm"] / 400.0

    # Hitung komposit stres (Suhu 25-30 C & pH 6.5-8.5 sesuai SNI 8228.4:2015; TDS/turb/level heuristik fitur saja)
    ph_penalty = np.where((res["ph"] < 6.0) | (res["ph"] > 8.8), 5.0,
                 np.where((res["ph"] < 6.5) | (res["ph"] > 8.5), 2.0, 0.0))
    temp_penalty = np.where((res["temperature_c"] > 33.0) | (res["temperature_c"] < 22.0), 4.0,
                   np.where((res["temperature_c"] > 30.0) | (res["temperature_c"] < 25.0), 2.0, 0.0))
    tds_penalty = np.where(res["tds_ppm"] > 800, 5.0,
                  np.where(res["tds_ppm"] > 600, 2.0, 0.0))
    turb_penalty = np.where(res["turbidity_ntu"] > 120, 3.0,
                   np.where(res["turbidity_ntu"] > 80, 1.5, 0.0))
    level_penalty = np.where(res["water_level"] < 0.5, 5.0, 0.0)

    res["water_stress_index"] = ph_penalty + temp_penalty + tds_penalty + turb_penalty + level_penalty

    return res[FEATURE_COLUMNS]
