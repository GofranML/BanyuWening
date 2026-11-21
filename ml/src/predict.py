"""
Modul Inference Prediksi Kualitas Air BanyuWening
Menerima payload JSON telemetri sensor dari Laravel (via CLI args atau stdin),
memuat model Joblib Random Forest, dan mengembalikan output JSON terstruktur.
Mendukung mode single reading maupun batch inference.
"""

import sys
import json
import time
import warnings
from pathlib import Path
import pandas as pd
import joblib

warnings.filterwarnings("ignore")

# Pastikan path modul lokal terbaca
sys.path.insert(0, str(Path(__file__).resolve().parent))

from preprocessing import clean_sensor_reading
from features import extract_features, FEATURE_COLUMNS

RISK_MAP = {
    0: "AMAN",
    1: "WASPADA",
    2: "BAHAYA",
}


def get_active_model_version(models_dir: Path) -> str:
    card_path = models_dir / "model_card.json"
    if card_path.exists():
        try:
            with open(card_path, "r", encoding="utf-8") as f:
                card = json.load(f)
            version = str(card.get("version") or "").strip()
            if version:
                return "1.0.0-rf" if version == "1.0.0" else version
        except Exception:
            pass
    return "1.0.0-rf"


def load_active_model(base_dir: Path):
    models_dir = base_dir / "models"
    model_path = models_dir / "random_forest_water_quality.joblib"

    if not model_path.exists():
        from train import train_and_save_model
        train_and_save_model()

    model = joblib.load(model_path)
    version = get_active_model_version(models_dir)
    return model, version


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
    return "Suhu dan pH berada dalam rentang aman SNI 8228.4:2015 (25–30 °C, pH 6.5–8.5); TDS, turbidity, dan ketinggian air tetap dipantau terhadap baseline lokal."


def predict_single(sensor_payload: dict, model=None, model_version: str | None = None) -> dict:
    started = time.perf_counter()
    if model is None or model_version is None:
        base_dir = Path(__file__).resolve().parent.parent
        loaded_model, loaded_version = load_active_model(base_dir)
        model = model or loaded_model
        model_version = model_version or loaded_version

    # 1. Preprocessing & validasi fisik
    cleaned = clean_sensor_reading(sensor_payload)

    # 2. Ekstraksi fitur
    features = extract_features(cleaned)
    X = pd.DataFrame([features], columns=FEATURE_COLUMNS)

    # 3. Inferensi Random Forest
    pred_class = int(model.predict(X)[0])
    probabilities = model.predict_proba(X)[0]

    # Map probabilitas ke 3 kelas (tangani jika model terlatih tidak memuat semua kelas)
    prob_map = {0: 0.0, 1: 0.0, 2: 0.0}
    classes = getattr(model, "classes_", [0, 1, 2])
    for idx, cls in enumerate(classes):
        if int(cls) in prob_map and idx < len(probabilities):
            prob_map[int(cls)] = float(probabilities[idx])

    p_aman = prob_map[0]
    p_waspada = prob_map[1]
    p_bahaya = prob_map[2]

    # 4. Deteksi pemicu anomali deterministik
    triggers = []
    if cleaned["ph"] < 6.0 or cleaned["ph"] > 8.8:
        triggers.append(f"pH kritis ({cleaned['ph']:.2f})")
    elif cleaned["ph"] < 6.5 or cleaned["ph"] > 8.5:
        triggers.append(f"pH mendekati batas ({cleaned['ph']:.2f})")

    if cleaned["temperature_c"] > 33.0 or cleaned["temperature_c"] < 22.0:
        triggers.append(f"Suhu keluar dari rentang ({cleaned['temperature_c']:.1f} °C)")
    elif cleaned["temperature_c"] > 30.0 or cleaned["temperature_c"] < 25.0:
        triggers.append(f"Suhu mendekati batas ({cleaned['temperature_c']:.1f} °C)")

    if cleaned["tds_ppm"] > 800:
        triggers.append(f"TDS menyimpang ekstrem dari baseline sementara ({cleaned['tds_ppm']:.0f} ppm)")
    elif cleaned["tds_ppm"] > 600:
        triggers.append(f"TDS menyimpang dari baseline sementara ({cleaned['tds_ppm']:.0f} ppm)")

    if cleaned["turbidity_ntu"] > 120:
        triggers.append(f"Turbidity meningkat dari baseline sementara ({cleaned['turbidity_ntu']:.1f} NTU)")

    if cleaned["water_level"] < 0.5:
        triggers.append("Level air surut")

    # Failsafe priority: aturan deterministik keselamatan kolam
    failsafe_active = (
        cleaned["ph"] < 6.0
        or cleaned["ph"] > 8.8
        or cleaned["temperature_c"] > 33.0
        or cleaned["temperature_c"] < 22.0
        or cleaned["water_level"] < 0.5
    )
    final_risk = "BAHAYA" if failsafe_active else RISK_MAP.get(pred_class, "AMAN")

    action = get_action_recommendation(final_risk, triggers, cleaned)
    inference_ms = round((time.perf_counter() - started) * 1000.0, 3)

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
        "model_version": model_version,
        "inference_ms": inference_ms,
    }


def predict_batch(items: list) -> dict:
    started = time.perf_counter()
    base_dir = Path(__file__).resolve().parent.parent
    model, model_version = load_active_model(base_dir)

    results = [
        predict_single(item if isinstance(item, dict) else {}, model=model, model_version=model_version)
        for item in items
    ]
    total_ms = round((time.perf_counter() - started) * 1000.0, 3)

    return {
        "success": True,
        "model_version": model_version,
        "count": len(results),
        "total_inference_ms": total_ms,
        "predictions": results,
    }


def main():
    try:
        input_text = ""
        if len(sys.argv) > 1:
            input_text = sys.argv[1]
        else:
            input_text = sys.stdin.read().strip()

        if not input_text:
            payload = {
                "ph": 7.15,
                "temperature_c": 28.6,
                "tds_ppm": 380,
                "turbidity_ntu": 32,
                "water_level": "NORMAL",
            }
        else:
            payload = json.loads(input_text)

        if isinstance(payload, list):
            result = predict_batch(payload)
        elif isinstance(payload, dict) and isinstance(payload.get("batch"), list):
            result = predict_batch(payload["batch"])
        else:
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
