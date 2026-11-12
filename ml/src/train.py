"""
Modul Pelatihan Model Random Forest BanyuWening
Melatih model klasifikasi risiko kualitas air kolam lele (AMAN, WASPADA, BAHAYA)
menggunakan Scikit-learn Random Forest dan menyimpannya via Joblib.
"""

import os
import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib

from preprocessing import clean_dataframe
from features import transform_dataframe, FEATURE_COLUMNS

TARGET_LABELS = {
    0: "AMAN",
    1: "WASPADA",
    2: "BAHAYA",
}

def generate_bootstrap_aquaculture_dataset(n_samples: int = 2500) -> pd.DataFrame:
    """
    Membuat dataset awal berbasis ambang batas operasional PRD BanyuWening & SNI Lele
    jika data telemetri historis lapangan belum diekspor secara utuh.
    """
    np.random.seed(42)
    timestamps = pd.date_range("2026-08-01 00:00:00", periods=n_samples, freq="15min")

    # Pola alami harian kolam
    hour = np.array(timestamps.hour, dtype=float)
    ph_base = 7.3 + 0.4 * np.sin(2 * np.pi * (hour - 6) / 24)
    temp_base = 28.5 + 2.5 * np.sin(2 * np.pi * (hour - 9) / 24)

    ph = np.array(ph_base + np.random.normal(0, 0.25, n_samples), dtype=float)
    temperature_c = np.array(temp_base + np.random.normal(0, 0.4, n_samples), dtype=float)
    tds_ppm = np.array(np.random.normal(380, 70, n_samples), dtype=float)
    turbidity_ntu = np.array(np.random.normal(35, 15, n_samples), dtype=float)
    water_level = np.random.choice(["NORMAL", "LOW"], size=n_samples, p=[0.97, 0.03])

    # Injeksi anomali (hujan lebat / pakan berlebih / aerator mati)
    # 8% anomali waspada, 4% anomali bahaya
    anomaly_indices = np.random.choice(n_samples, size=int(0.12 * n_samples), replace=False)
    for idx in anomaly_indices[:len(anomaly_indices)//2]:
        # Anomali waspada
        ph[idx] = np.random.choice([6.4, 8.6])
        temperature_c[idx] = np.random.choice([32.4, 25.4])
        tds_ppm[idx] = np.random.uniform(610, 750)
        turbidity_ntu[idx] = np.random.uniform(85, 115)

    for idx in anomaly_indices[len(anomaly_indices)//2:]:
        # Anomali bahaya
        ph[idx] = np.random.uniform(5.2, 5.95)
        temperature_c[idx] = np.random.uniform(33.2, 35.5)
        tds_ppm[idx] = np.random.uniform(820, 1100)
        turbidity_ntu[idx] = np.random.uniform(125, 200)

    # Label target deterministik PRD
    target = []
    for p, t, tds_val, turb_val, wl in zip(ph, temperature_c, tds_ppm, turbidity_ntu, water_level):
        is_bahaya = (p < 6.0 or p > 8.8 or t > 33.0 or t < 22.0 or tds_val > 800 or turb_val > 120 or wl == "LOW")
        is_waspada = (p < 6.5 or p > 8.5 or t > 32.0 or t < 26.0 or tds_val > 600 or turb_val > 80)
        
        if is_bahaya:
            target.append(2)  # BAHAYA
        elif is_waspada:
            target.append(1)  # WASPADA
        else:
            target.append(0)  # AMAN

    df = pd.DataFrame({
        "timestamp": timestamps,
        "ph": np.clip(ph, 4.0, 10.0),
        "temperature_c": np.clip(temperature_c, 18.0, 40.0),
        "tds_ppm": np.clip(tds_ppm, 100.0, 1500.0),
        "turbidity_ntu": np.clip(turbidity_ntu, 5.0, 300.0),
        "water_level": water_level,
        "risk_target": target,
    })
    return df

def train_and_save_model():
    base_dir = Path(__file__).resolve().parent.parent
    datasets_dir = base_dir / "datasets"
    models_dir = base_dir / "models"
    datasets_dir.mkdir(parents=True, exist_ok=True)
    models_dir.mkdir(parents=True, exist_ok=True)

    csv_path = datasets_dir / "sensor_readings.csv"
    if csv_path.exists():
        print(f"[*] Memuat dataset aktual dari: {csv_path}")
        df_raw = pd.read_csv(csv_path)
    else:
        print("[*] Dataset CSV belum tersedia, menggenerasikan data bootstrap akuakultur...")
        df_raw = generate_bootstrap_aquaculture_dataset(n_samples=2500)
        df_raw.to_csv(csv_path, index=False)
        print(f"[+] Dataset awal disimpan ke: {csv_path}")

    # 1. Preprocessing
    df_clean = clean_dataframe(df_raw)

    # 2. Feature engineering
    X = transform_dataframe(df_clean)
    y = df_raw["risk_target"].astype(int)

    # 3. Chronological Time-Series Split (80% train, 20% test)
    split_idx = int(0.8 * len(X))
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    print(f"[*] Total Sampel: {len(X)} | Training: {len(X_train)} | Testing: {len(X_test)}")
    print(f"[*] Distribusi Kelas Target: {y.value_counts().to_dict()}")

    # 4. Training Random Forest
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    rf_model.fit(X_train, y_train)

    # 5. Evaluasi
    y_pred = rf_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, target_names=["AMAN", "WASPADA", "BAHAYA"], output_dict=True)
    conf_mat = confusion_matrix(y_test, y_pred).tolist()

    print(f"[+] Model Accuracy: {acc * 100:.2f}%")
    print(f"[+] Macro F1-Score: {report['macro avg']['f1-score']:.4f}")

    # 6. Serialisasi Model Joblib
    model_path = models_dir / "random_forest_water_quality.joblib"
    joblib.dump(rf_model, model_path)
    print(f"[+] Model Random Forest berhasil disimpan ke: {model_path}")

    # 7. Metadata / Model Card
    feature_importances = dict(zip(FEATURE_COLUMNS, rf_model.feature_importances_.tolist()))
    metadata = {
        "model_name": "BanyuWening Random Forest Water Quality Classifier",
        "algorithm": "RandomForestClassifier",
        "version": "1.0.0",
        "accuracy": float(acc),
        "macro_f1": float(report["macro avg"]["f1-score"]),
        "feature_columns": FEATURE_COLUMNS,
        "feature_importances": feature_importances,
        "classes": TARGET_LABELS,
        "confusion_matrix": conf_mat,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
    }

    with open(models_dir / "model_card.json", "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[+] Metadata evaluasi model disimpan ke: {models_dir / 'model_card.json'}")

if __name__ == "__main__":
    train_and_save_model()
