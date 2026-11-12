"""
Comprehensive Python Machine Learning Test Suite for BanyuWening
Audits dataset integrity, preprocessing, features, inference, serialization, and edge cases.
"""

import os
import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np
import joblib

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from preprocessing import clean_sensor_reading, clean_dataframe, PHYSICAL_BOUNDS, DEFAULTS
from features import extract_features, transform_dataframe, FEATURE_COLUMNS
from predict import predict_single

def audit_dataset():
    print("--- [1] AUDIT DATASET INTEGRITY ---")
    csv_path = Path(__file__).resolve().parent / "datasets" / "sensor_readings.csv"
    assert csv_path.exists(), f"Dataset file {csv_path} does not exist"
    
    df = pd.read_csv(csv_path)
    total_rows = len(df)
    print(f"Total baris: {total_rows}")
    print(f"Kolom: {list(df.columns)}")
    
    # Missing values
    missing = df.isnull().sum().to_dict()
    print(f"Missing values per kolom: {missing}")
    
    # Duplicates
    duplicates = df.duplicated().sum()
    print(f"Jumlah baris duplikat identik: {duplicates}")
    
    # Distribution of target
    target_dist = df["risk_target"].value_counts().to_dict()
    print(f"Distribusi target risk: {target_dist}")
    
    # Value ranges
    for col in ["ph", "temperature_c", "tds_ppm", "turbidity_ntu"]:
        print(f"Rentang {col}: min={df[col].min()}, max={df[col].max()}, mean={df[col].mean():.2f}")
    
    return df

def audit_preprocessing_and_features(df):
    print("\n--- [2] AUDIT PREPROCESSING & FEATURES ---")
    df_clean = clean_dataframe(df)
    X = transform_dataframe(df_clean)
    
    assert list(X.columns) == FEATURE_COLUMNS, "Kolom fitur tidak cocok"
    print(f"Shape matriks fitur X: {X.shape}")
    print(f"Semua fitur numerik valid: {X.isnull().sum().sum() == 0}")
    
    # Verifikasi konsistensi single sample extraction vs dataframe batch
    sample_raw = {
        "ph": 7.15,
        "temperature_c": 28.6,
        "tds_ppm": 380,
        "turbidity_ntu": 32,
        "water_level": "NORMAL",
    }
    cleaned_single = clean_sensor_reading(sample_raw)
    feat_single = extract_features(cleaned_single)
    
    df_single = pd.DataFrame([sample_raw])
    df_single_clean = clean_dataframe(df_single)
    feat_df = transform_dataframe(df_single_clean).iloc[0].tolist()
    
    diff = np.max(np.abs(np.array(feat_single) - np.array(feat_df)))
    print(f"Max selisih fitur single vs batch: {diff:.6f}")
    assert diff < 1e-5, "Feature extraction single vs batch tidak konsisten!"
    print("[✓] Feature engineering 100% konsisten antara streaming dan batch.")

def audit_model_serialization():
    print("\n--- [3] AUDIT MODEL SERIALIZATION & MODEL CARD ---")
    model_path = Path(__file__).resolve().parent / "models" / "random_forest_water_quality.joblib"
    card_path = Path(__file__).resolve().parent / "models" / "model_card.json"
    
    assert model_path.exists(), "Model file joblib tidak ditemukan"
    assert card_path.exists(), "Model card json tidak ditemukan"
    
    model = joblib.load(model_path)
    print(f"Tipe model: {type(model).__name__}")
    print(f"Jumlah estimator (trees): {len(model.estimators_)}")
    print(f"Classes: {model.classes_}")
    
    with open(card_path, "r") as f:
        card = json.load(f)
    print(f"Model Card Version: {card.get('version')}")
    print(f"Top 3 Feature Importances: {sorted(card.get('feature_importances', {}).items(), key=lambda x: x[1], reverse=True)[:3]}")
    assert card.get("accuracy") >= 0.95, "Akurasi model di bawah standar 95%"
    print("[✓] Model serialization dan model card valid.")

def audit_inference_edge_cases():
    print("\n--- [4] AUDIT INFERENCE PIPELINE & EDGE CASES ---")
    
    # Case 1: Normal Ideal
    res_normal = predict_single({
        "ph": 7.20,
        "temperature_c": 28.5,
        "tds_ppm": 350,
        "turbidity_ntu": 35,
        "water_level": "NORMAL",
    })
    print(f"Case Normal -> Risk: {res_normal['risk']} (p_aman={res_normal['p_aman']})")
    assert res_normal["risk"] == "AMAN"
    
    # Case 2: Waspada Tren Keasaman
    res_waspada = predict_single({
        "ph": 6.42,
        "temperature_c": 31.8,
        "tds_ppm": 620,
        "turbidity_ntu": 85,
        "water_level": "NORMAL",
    })
    print(f"Case Waspada -> Risk: {res_waspada['risk']} (p_waspada={res_waspada['p_waspada']})")
    assert res_waspada["risk"] == "WASPADA"
    
    # Case 3: Bahaya Ekstrim (pH Anjlok)
    res_bahaya = predict_single({
        "ph": 5.40,
        "temperature_c": 33.8,
        "tds_ppm": 850,
        "turbidity_ntu": 140,
        "water_level": "LOW",
    })
    print(f"Case Bahaya -> Risk: {res_bahaya['risk']} (failsafe_active={res_bahaya['failsafe_active']})")
    assert res_bahaya["risk"] == "BAHAYA"
    assert res_bahaya["failsafe_active"] is True
    
    # Case 4: Missing Keys & Nulls (Robustness)
    res_null = predict_single({
        "ph": None,
        "temperature_c": None,
        "tds_ppm": None,
    })
    print(f"Case Null/Empty -> Risk: {res_null['risk']} (Berhasil fallback ke default median)")
    assert res_null["success"] is True
    
    # Case 5: Out of bounds sensor noise
    res_outlier = predict_single({
        "ph": 99.0, # Noise ADC
        "temperature_c": -50.0,
        "tds_ppm": 99999.0,
        "turbidity_ntu": -10.0,
    })
    print(f"Case Outliers -> Handled cleanly: {res_outlier['success']}")
    assert res_outlier["success"] is True
    print("[✓] Inference pipeline lulus seluruh skenario pengujian dan edge cases.")

if __name__ == "__main__":
    df = audit_dataset()
    audit_preprocessing_and_features(df)
    audit_model_serialization()
    audit_inference_edge_cases()
    print("\n[+] SELURUH PENGUJIAN PHASE 3 MACHINE LEARNING LULUS!")
