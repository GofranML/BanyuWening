"""
Modul Preprocessing Data Sensor Kualitas Air BanyuWening
Menangani pembersihan data, penanganan missing values, dan standardisasi tipe data.
"""

from typing import Dict, Any, Union
import numpy as np
import pandas as pd

# Batas valid fisik sensor akuakultur air tawar (SNI & Sensor Datasheet)
PHYSICAL_BOUNDS = {
    "ph": (0.0, 14.0),
    "temperature_c": (10.0, 50.0),
    "tds_ppm": (0.0, 3000.0),
    "turbidity_ntu": (0.0, 1000.0),
}

# Nilai default median jika sensor mengembalikan null atau error
DEFAULTS = {
    "ph": 7.20,
    "temperature_c": 28.5,
    "tds_ppm": 350.0,
    "turbidity_ntu": 35.0,
    "water_level": 1.0,  # 1.0 = NORMAL, 0.0 = LOW
}

def clean_sensor_reading(raw_data: Dict[str, Any]) -> Dict[str, float]:
    """
    Membersihkan dan memvalidasi satu baris data pembacaan sensor.
    """
    cleaned = {}
    
    # pH
    ph = raw_data.get("ph")
    if ph is None or not (PHYSICAL_BOUNDS["ph"][0] <= float(ph) <= PHYSICAL_BOUNDS["ph"][1]):
        ph = DEFAULTS["ph"]
    cleaned["ph"] = float(ph)

    # Suhu (°C)
    temp = raw_data.get("temperature_c") or raw_data.get("temperature")
    if temp is None or not (PHYSICAL_BOUNDS["temperature_c"][0] <= float(temp) <= PHYSICAL_BOUNDS["temperature_c"][1]):
        temp = DEFAULTS["temperature_c"]
    cleaned["temperature_c"] = float(temp)

    # TDS (ppm)
    tds = raw_data.get("tds_ppm") or raw_data.get("tds")
    if tds is None or not (PHYSICAL_BOUNDS["tds_ppm"][0] <= float(tds) <= PHYSICAL_BOUNDS["tds_ppm"][1]):
        tds = DEFAULTS["tds_ppm"]
    cleaned["tds_ppm"] = float(tds)

    # Kekeruhan (NTU)
    turb = raw_data.get("turbidity_ntu") or raw_data.get("turbidity")
    if turb is None or not (PHYSICAL_BOUNDS["turbidity_ntu"][0] <= float(turb) <= PHYSICAL_BOUNDS["turbidity_ntu"][1]):
        turb = DEFAULTS["turbidity_ntu"]
    cleaned["turbidity_ntu"] = float(turb)

    # Level Air (NORMAL -> 1.0, LOW -> 0.0)
    w_level = raw_data.get("water_level")
    if isinstance(w_level, str):
        cleaned["water_level"] = 1.0 if w_level.upper() == "NORMAL" else 0.0
    elif w_level is not None:
        cleaned["water_level"] = 1.0 if float(w_level) >= 0.5 else 0.0
    else:
        cleaned["water_level"] = DEFAULTS["water_level"]

    return cleaned

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Membersihkan dataframe telemetri sensor.
    """
    df_clean = df.copy()
    
    # Normalisasi nama kolom
    col_mapping = {
        "temperature": "temperature_c",
        "temp": "temperature_c",
        "tds": "tds_ppm",
        "turbidity": "turbidity_ntu",
    }
    df_clean.rename(columns=col_mapping, inplace=True)

    for col, (min_v, max_v) in PHYSICAL_BOUNDS.items():
        if col in df_clean.columns:
            # Ganti nilai di luar batas fisik dengan NaN lalu interpolasi / fillna
            df_clean.loc[(df_clean[col] < min_v) | (df_clean[col] > max_v), col] = np.nan
            df_clean[col] = df_clean[col].ffill().bfill().fillna(DEFAULTS[col])
        else:
            df_clean[col] = DEFAULTS[col]

    if "water_level" in df_clean.columns:
        df_clean["water_level"] = df_clean["water_level"].apply(
            lambda x: 1.0 if str(x).upper() in ["NORMAL", "1", "1.0", "TRUE"] else 0.0
        )
    else:
        df_clean["water_level"] = DEFAULTS["water_level"]

    return df_clean
