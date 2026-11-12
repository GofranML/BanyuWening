"""
Modul Evaluasi Model Machine Learning BanyuWening
Menguji akurasi, matriks konfusi, dan kurva prediksi terhadap data uji.
"""

import json
from pathlib import Path
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib

from preprocessing import clean_dataframe
from features import transform_dataframe

def evaluate_model():
    base_dir = Path(__file__).resolve().parent.parent
    model_path = base_dir / "models" / "random_forest_water_quality.joblib"
    csv_path = base_dir / "datasets" / "sensor_readings.csv"

    if not model_path.exists() or not csv_path.exists():
        print("[-] Model atau dataset belum tersedia. Jalankan train.py terlebih dahulu.")
        return

    model = joblib.load(model_path)
    df_raw = pd.read_csv(csv_path)
    df_clean = clean_dataframe(df_raw)
    X = transform_dataframe(df_clean)
    y = df_raw["risk_target"].astype(int)

    # 20% data uji akhir (chronological)
    split_idx = int(0.8 * len(X))
    X_test = X.iloc[split_idx:]
    y_test = y.iloc[split_idx:]

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    target_names = ["AMAN", "WASPADA", "BAHAYA"]
    report = classification_report(y_test, y_pred, target_names=target_names)
    cm = confusion_matrix(y_test, y_pred)

    print("=" * 60)
    print("LAPORAN EVALUASI MODEL RANDOM FOREST - BANYUWENING")
    print("=" * 60)
    print(f"Jumlah Sampel Pengujian: {len(X_test)}")
    print(f"Akurasi Keseluruhan: {acc * 100:.2f}%\n")
    print("Classification Report:")
    print(report)
    print("Confusion Matrix (Baris: Aktual, Kolom: Prediksi):")
    print(pd.DataFrame(cm, index=target_names, columns=target_names))
    print("=" * 60)

if __name__ == "__main__":
    evaluate_model()
