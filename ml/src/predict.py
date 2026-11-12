"""
Modul Inference Prediksi Kualitas Air BanyuWening
Menerima payload JSON telemetri sensor dari Laravel (via CLI args atau stdin),
memuat model Joblib Random Forest, dan mengembalikan output JSON terstruktur.
"""

import sys
import json
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

# Pastikan path modul lokal terbaca
sys.path.insert(0, str(Path(__file__).resolve().parent))

from preprocessing import clean_sensor_reading
from features import extract_features, FEATURE_COLUMNS

RISK_MAP = {
    0: "AMAN",
    1: "WASPADA",
    2: "BAHAYA",
}

def get_action_recommendation(risk: str, triggers: list, reading: dict) -> str:
    if risk == "BAHAYA":
        if reading["ph"] < 6.0:
            return "Segera lakukan pengapuran bertahap dengan dolomit (50–100 g/m³), nyalakan aerator darurat, dan tambahkan air bersih."
        if reading["temperature_c"] > 33.0:
            return "Nyalakan aerator untuk sirkulasi pendinginan dan pasang peneduh darurat di atas kolam terpal."
        if reading["water_level"] < 0.5:
            return "Level air kolam surut! Periksa pipa pembuangan dan segera isi ulang air kolam."
        return "Parameter kritis melanggar ambang batas bahaya SNI. Lakukan penggantian air 30% dan hidupkan aerator."
    elif risk == "WASPADA":
        if reading["ph"] < 6.5:
            return "Kualitas air menunjukkan tren keasaman. Kurangi porsi pakan 30% dan amati pergerakan benih lele."
        if reading["tds_ppm"] > 600:
            return "Endapan bahan organik (pakan/feses) menumpuk. Siapkan sifon kolam dan ganti sebagian air."
        return "Model memproyeksikan potensi penurunan kualitas air 1–3 jam ke depan. Periksa aerasi dan filter."
    return "Seluruh parameter berada dalam ambang batas aman SNI lele. Lanjutkan jadwal pemberian pakan normal."

def predict_single(sensor_payload: dict) -> dict:
    base_dir = Path(__file__).resolve().parent.parent
    model_path = base_dir / "models" / "random_forest_water_quality.joblib"

    if not model_path.exists():
        # Fallback: jika model belum dilatih, jalankan modul train
        from train import train_and_save_model
        train_and_save_model()

    model = joblib.load(model_path)

    # 1. Preprocessing & validasi fisik
    cleaned = clean_sensor_reading(sensor_payload)

    # 2. Ekstraksi fitur
    features = extract_features(cleaned)
    X = pd.DataFrame([features], columns=FEATURE_COLUMNS)

    # 3. Inferensi Random Forest
    pred_class = int(model.predict(X)[0])
    probabilities = model.predict_proba(X)[0]

    # Map probabilitas ke 3 kelas
    p_aman = float(probabilities[0]) if len(probabilities) > 0 else 0.0
    p_waspada = float(probabilities[1]) if len(probabilities) > 1 else 0.0
    p_bahaya = float(probabilities[2]) if len(probabilities) > 2 else 0.0

    # 4. Deteksi pemicu anomali deterministik
    triggers = []
    if cleaned["ph"] < 6.0 or cleaned["ph"] > 8.8:
        triggers.append(f"pH kritis ({cleaned['ph']:.2f})")
    elif cleaned["ph"] < 6.5 or cleaned["ph"] > 8.5:
        triggers.append(f"pH mendekati batas ({cleaned['ph']:.2f})")

    if cleaned["temperature_c"] > 33.0 or cleaned["temperature_c"] < 22.0:
        triggers.append(f"Suhu ekstrim ({cleaned['temperature_c']:.1f} °C)")
    elif cleaned["temperature_c"] > 32.0 or cleaned["temperature_c"] < 26.0:
        triggers.append(f"Suhu tidak ideal ({cleaned['temperature_c']:.1f} °C)")

    if cleaned["tds_ppm"] > 800:
        triggers.append(f"TDS pekat ({cleaned['tds_ppm']:.0f} ppm)")
    elif cleaned["tds_ppm"] > 600:
        triggers.append(f"TDS mendekati batas ({cleaned['tds_ppm']:.0f} ppm)")

    if cleaned["turbidity_ntu"] > 120:
        triggers.append(f"Kekeruhan tinggi ({cleaned['turbidity_ntu']:.1f} NTU)")

    if cleaned["water_level"] < 0.5:
        triggers.append("Level air surut")

    # Failsafe priority: aturan deterministik keselamatan kolam
    failsafe_active = (cleaned["ph"] < 6.0 or cleaned["ph"] > 8.8 or cleaned["temperature_c"] > 33.0 or cleaned["water_level"] < 0.5)
    final_risk = "BAHAYA" if failsafe_active else RISK_MAP.get(pred_class, "AMAN")

    action = get_action_recommendation(final_risk, triggers, cleaned)

    return {
        "success": True,
        "risk": final_risk,
        "p_aman": round(p_aman, 4),
        "p_waspada": round(p_waspada, 4),
        "p_bahaya": round(p_bahaya, 4),
        "cleaned_data": cleaned,
        "triggers": triggers,
        "failsafe_active": failsafe_active,
        "recommended_action": action,
        "model_version": "1.0.0-rf",
    }

def main():
    try:
        input_text = ""
        if len(sys.argv) > 1:
            input_text = sys.argv[1]
        else:
            input_text = sys.stdin.read().strip()

        if not input_text:
            # Default payload testing
            payload = {
                "ph": 7.15,
                "temperature_c": 28.6,
                "tds_ppm": 380,
                "turbidity_ntu": 32,
                "water_level": "NORMAL",
            }
        else:
            payload = json.loads(input_text)

        result = predict_single(payload)
        print(json.dumps(result))
    except Exception as e:
        error_output = {
            "success": False,
            "error": str(e),
            "risk": "WASPADA",
            "p_aman": 0.33,
            "p_waspada": 0.34,
            "p_bahaya": 0.33,
            "triggers": ["Gagal inferensi model Machine Learning"],
            "failsafe_active": False,
            "recommended_action": "Periksa koneksi sensor dan jalankan ulang script ML.",
        }
        print(json.dumps(error_output))
        sys.exit(1)

if __name__ == "__main__":
    main()
