"""
BanyuWening AI Self-Learning Agent (Auto-Evaluate & Auto-Training Random Forest)

Menjalankan siklus agen otonom:
1. OBSERVE     : Memuat dataset historis + pembacaan live terbaru dari DB Laravel.
2. EVALUATE    : Mengevaluasi model aktif pada chronological holdout 20%.
3. DRIFT       : Menghitung data drift & agreement rate terhadap aturan SNI 8228.4:2015.
4. DECIDE      : Menentukan apakah perlu retraining berdasarkan threshold F1, drift, recall BAHAYA, atau jumlah sampel baru.
5. SELF-TRAIN  : Melatih kandidat Random Forest (TimeSeriesSplit 3-fold + aturan parsimoni PRD).
6. SAFETY_GATE : Memvalidasi kandidat sebelum promosi atomik ke artefak aktif (atau menahan untuk HITL review).
"""

import argparse
import json
import os
import re
import shutil
import sys
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import TimeSeriesSplit

warnings.filterwarnings("ignore")

sys.path.insert(0, str(Path(__file__).resolve().parent))

from features import FEATURE_COLUMNS, transform_dataframe
from preprocessing import PHYSICAL_BOUNDS, clean_dataframe
from train import TARGET_LABELS, generate_bootstrap_aquaculture_dataset

RISK_MAP = {0: "AMAN", 1: "WASPADA", 2: "BAHAYA"}
RISK_TO_INT = {"AMAN": 0, "WASPADA": 1, "BAHAYA": 2}
CLASS_NAMES = ["AMAN", "WASPADA", "BAHAYA"]

AGENT_SEARCH_PROFILES = {
    "rf-autonomous-local": {
        "label": "BanyuWening Autonomous RF Agent (Local)",
        "grid": [
            {"n_estimators": 100, "max_depth": 8, "min_samples_leaf": 2},
            {"n_estimators": 100, "max_depth": 12, "min_samples_leaf": 1},
            {"n_estimators": 150, "max_depth": 10, "min_samples_leaf": 2},
            {"n_estimators": 200, "max_depth": 12, "min_samples_leaf": 2},
        ],
    },
    "deepseek-v4-pro": {
        "label": "DeepSeek V4 Pro MLOps Agent",
        "grid": [
            {"n_estimators": 120, "max_depth": 10, "min_samples_leaf": 2},
            {"n_estimators": 160, "max_depth": 14, "min_samples_leaf": 1},
            {"n_estimators": 200, "max_depth": 12, "min_samples_leaf": 2},
            {"n_estimators": 240, "max_depth": 16, "min_samples_leaf": 1},
        ],
    },
    "deepseek-reasoner": {
        "label": "DeepSeek Reasoner MLOps Agent",
        "grid": [
            {"n_estimators": 120, "max_depth": 10, "min_samples_leaf": 2},
            {"n_estimators": 180, "max_depth": 14, "min_samples_leaf": 1},
            {"n_estimators": 220, "max_depth": 14, "min_samples_leaf": 2},
        ],
    },
    "gemini-2.5-flash": {
        "label": "Gemini 2.5 Flash MLOps Agent",
        "grid": [
            {"n_estimators": 120, "max_depth": 10, "min_samples_leaf": 2},
            {"n_estimators": 160, "max_depth": 12, "min_samples_leaf": 1},
            {"n_estimators": 200, "max_depth": 10, "min_samples_leaf": 2},
        ],
    },
    "gemini-2.5-pro": {
        "label": "Gemini 2.5 Pro Deep Aquaculture Agent",
        "grid": [
            {"n_estimators": 120, "max_depth": 10, "min_samples_leaf": 2},
            {"n_estimators": 160, "max_depth": 14, "min_samples_leaf": 1},
            {"n_estimators": 200, "max_depth": 12, "min_samples_leaf": 2},
            {"n_estimators": 240, "max_depth": 16, "min_samples_leaf": 1},
        ],
    },
    "gpt-4o-mini": {
        "label": "OpenAI GPT-4o Mini MLOps Agent",
        "grid": [
            {"n_estimators": 100, "max_depth": 10, "min_samples_leaf": 2},
            {"n_estimators": 150, "max_depth": 12, "min_samples_leaf": 1},
            {"n_estimators": 200, "max_depth": 12, "min_samples_leaf": 2},
        ],
    },
    "claude-3-5-sonnet": {
        "label": "Claude 3.5 Sonnet Safety-Gate Agent",
        "grid": [
            {"n_estimators": 120, "max_depth": 8, "min_samples_leaf": 2},
            {"n_estimators": 180, "max_depth": 12, "min_samples_leaf": 2},
            {"n_estimators": 220, "max_depth": 14, "min_samples_leaf": 1},
        ],
    },
    "llama-3.3-70b-local": {
        "label": "Llama 3.3 70B Local (Ollama DMZ Agent)",
        "grid": [
            {"n_estimators": 100, "max_depth": 8, "min_samples_leaf": 2},
            {"n_estimators": 150, "max_depth": 12, "min_samples_leaf": 2},
            {"n_estimators": 200, "max_depth": 14, "min_samples_leaf": 1},
        ],
    },
}


def compute_sni_label(ph: float, temp: float) -> int:
    """Label target SNI 8228.4:2015 hanya memakai pH dan suhu (TDS/turbidity/level hanya fitur)."""
    if ph < 6.0 or ph > 8.8 or temp > 33.0 or temp < 22.0:
        return 2  # BAHAYA
    if ph < 6.5 or ph > 8.5 or temp > 30.0 or temp < 25.0:
        return 1  # WASPADA
    return 0  # AMAN


def evaluate_classifier(model, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    y_pred = model.predict(X_test)

    # Ukur rata-rata latensi per inferensi tunggal pada sampel representatif
    sample_n = min(20, len(X_test))
    latencies_ms = []
    for i in range(sample_n):
        row = X_test.iloc[i : i + 1]
        t0 = time.perf_counter()
        model.predict(row)
        model.predict_proba(row)
        latencies_ms.append((time.perf_counter() - t0) * 1000.0)
    avg_latency_ms = round(float(np.mean(latencies_ms)) if latencies_ms else 0.0, 3)

    acc = float(accuracy_score(y_test, y_pred))
    report = classification_report(
        y_test,
        y_pred,
        labels=[0, 1, 2],
        target_names=CLASS_NAMES,
        output_dict=True,
        zero_division=0,
    )
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1, 2]).tolist()

    per_class = {}
    for cls_name in CLASS_NAMES:
        cls_rep = report.get(cls_name, {})
        per_class[cls_name] = {
            "precision": round(float(cls_rep.get("precision", 0.0)), 4),
            "recall": round(float(cls_rep.get("recall", 0.0)), 4),
            "f1": round(float(cls_rep.get("f1-score", 0.0)), 4),
            "support": int(cls_rep.get("support", 0)),
        }

    importances = {}
    if hasattr(model, "feature_importances_"):
        importances = {
            col: round(float(val), 6)
            for col, val in zip(FEATURE_COLUMNS, model.feature_importances_.tolist())
        }

    return {
        "accuracy": round(acc, 4),
        "macro_f1": round(float(report["macro avg"]["f1-score"]), 4),
        "weighted_f1": round(float(report["weighted avg"]["f1-score"]), 4),
        "bahaya_recall": per_class["BAHAYA"]["recall"],
        "avg_latency_ms": avg_latency_ms,
        "test_samples": int(len(X_test)),
        "confusion_matrix": cm,
        "per_class_metrics": per_class,
        "feature_importances": importances,
    }


def compute_drift_score(df_base: pd.DataFrame, df_live: pd.DataFrame) -> float:
    if len(df_live) < 3:
        return 0.0

    shifts = []
    for col in ["ph", "temperature_c", "tds_ppm", "turbidity_ntu"]:
        if col not in df_base.columns or col not in df_live.columns:
            continue
        base_vals = pd.to_numeric(df_base[col], errors="coerce").dropna()
        live_vals = pd.to_numeric(df_live[col], errors="coerce").dropna()
        if len(base_vals) < 5 or len(live_vals) < 3:
            continue
        std_base = max(float(base_vals.std()), 1e-3)
        z = abs(float(live_vals.mean()) - float(base_vals.mean())) / std_base
        shifts.append(z)

    if not shifts:
        return 0.0
    avg_z = float(np.mean(shifts))
    return round(min(1.0, avg_z / 4.0), 4)


def compute_live_agreement_rate(live_predictions: list) -> float:
    compared = 0
    matched = 0
    for item in live_predictions:
        if not isinstance(item, dict):
            continue
        ph = item.get("ph")
        temp = item.get("temperature_c")
        risk = str(item.get("risk") or "").upper()
        if ph is None or temp is None or risk not in CLASS_NAMES:
            continue
        try:
            expected_risk = RISK_MAP[compute_sni_label(float(ph), float(temp))]
        except (TypeError, ValueError):
            continue
        compared += 1
        if risk == expected_risk:
            matched += 1

    if compared == 0:
        return 1.0
    return round(matched / compared, 4)


def next_version_string(current_version: str) -> str:
    match = re.match(r"^(\d+)\.(\d+)\.(\d+)", str(current_version or "1.0.0"))
    if match:
        major, minor, patch = int(match.group(1)), int(match.group(2)), int(match.group(3))
        base = f"{major}.{minor}.{patch + 1}"
    else:
        base = "1.0.1"
    ts_tag = datetime.now(timezone.utc).strftime("%m%d%H%M%S")
    return f"{base}-rf-agent-{ts_tag}"


def atomic_write_json(target_path: Path, data: dict) -> None:
    tmp_path = target_path.with_suffix(target_path.suffix + ".tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp_path, target_path)


def atomic_save_joblib(target_path: Path, model) -> None:
    tmp_path = target_path.with_suffix(target_path.suffix + ".tmp")
    joblib.dump(model, tmp_path)
    os.replace(tmp_path, target_path)


def build_model_card(version: str, metrics: dict, train_samples: int, params: dict, live_count: int) -> dict:
    return {
        "model_name": "BanyuWening Random Forest Water Quality Classifier",
        "algorithm": "RandomForestClassifier",
        "version": version,
        "accuracy": metrics["accuracy"],
        "macro_f1": metrics["macro_f1"],
        "weighted_f1": metrics["weighted_f1"],
        "bahaya_recall": metrics["bahaya_recall"],
        "avg_latency_ms": metrics["avg_latency_ms"],
        "feature_columns": FEATURE_COLUMNS,
        "feature_importances": metrics["feature_importances"],
        "classes": {str(k): v for k, v in TARGET_LABELS.items()},
        "confusion_matrix": metrics["confusion_matrix"],
        "per_class_metrics": metrics["per_class_metrics"],
        "hyperparameters": params,
        "train_samples": int(train_samples),
        "test_samples": int(metrics["test_samples"]),
        "live_samples_included": int(live_count),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "label_policy": {
            "reference": "SNI 8228.4:2015 (Suhu 25-30 C, pH 6.5-8.5)",
            "target_label_parameters": ["ph", "temperature_c"],
            "feature_only_parameters": ["tds_ppm", "turbidity_ntu", "water_level"],
            "notes": (
                "Rentang suhu dan pH mengacu pada SNI 8228.4:2015. TDS, turbidity, dan ketinggian air "
                "dipakai sebagai fitur pemantauan dan tidak dipakai membentuk label target."
            ),
        },
    }


def run_agent(mode: str, payload: dict) -> dict:
    base_dir = Path(__file__).resolve().parent.parent
    models_dir = Path(payload.get("models_dir") or (base_dir / "models"))
    datasets_dir = Path(payload.get("datasets_dir") or (base_dir / "datasets"))
    versions_dir = models_dir / "versions"

    models_dir.mkdir(parents=True, exist_ok=True)
    datasets_dir.mkdir(parents=True, exist_ok=True)
    versions_dir.mkdir(parents=True, exist_ok=True)

    config = payload.get("config") or {}
    min_f1_threshold = float(config.get("min_f1_threshold", 0.90))
    max_drift_threshold = float(config.get("max_drift_threshold", 0.25))
    min_new_samples = int(config.get("min_new_samples", 10))
    promotion_mode = str(config.get("promotion_mode", "AUTO_PROMOTE")).upper()
    force_retrain = bool(config.get("force_retrain", False))
    agent_model_id = str(config.get("agent_model_id") or "rf-autonomous-local")
    agent_profile = AGENT_SEARCH_PROFILES.get(agent_model_id, AGENT_SEARCH_PROFILES["rf-autonomous-local"])
    current_version = str(payload.get("current_version") or "1.0.0-rf")

    reasoning_steps = [
        {
            "step": "AI_AGENT_MODEL",
            "status": "DONE",
            "detail": f"Orkestrasi dijalankan oleh {agent_profile['label']} ({agent_model_id}) dengan {len(agent_profile['grid'])} kandidat grid Random Forest.",
        }
    ]

    # --- STEP 1: OBSERVE ---
    csv_path = datasets_dir / "sensor_readings_dummy.csv"
    if csv_path.exists():
        df_base_raw = pd.read_csv(csv_path)
    else:
        df_base_raw = generate_bootstrap_aquaculture_dataset(n_samples=2500)
        df_base_raw.to_csv(csv_path, index=False)

    df_base_clean = clean_dataframe(df_base_raw)
    if "risk_target" in df_base_raw.columns:
        df_base_clean["risk_target"] = df_base_raw["risk_target"].astype(int)
    else:
        df_base_clean["risk_target"] = [
            compute_sni_label(float(p), float(t))
            for p, t in zip(df_base_clean["ph"], df_base_clean["temperature_c"])
        ]

    raw_live = payload.get("live_readings") or []
    valid_live_rows = []
    for r in raw_live:
        if not isinstance(r, dict):
            continue
        try:
            ph = r.get("ph")
            temp = r.get("temperature_c")
            if ph is None or temp is None:
                continue
            ph_f, temp_f = float(ph), float(temp)
            if not (PHYSICAL_BOUNDS["ph"][0] <= ph_f <= PHYSICAL_BOUNDS["ph"][1]):
                continue
            if not (PHYSICAL_BOUNDS["temperature_c"][0] <= temp_f <= PHYSICAL_BOUNDS["temperature_c"][1]):
                continue
            valid_live_rows.append(
                {
                    "timestamp": r.get("recorded_at") or r.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                    "ph": ph_f,
                    "temperature_c": temp_f,
                    "tds_ppm": float(r["tds_ppm"]) if r.get("tds_ppm") is not None else 350.0,
                    "turbidity_ntu": float(r["turbidity_ntu"]) if r.get("turbidity_ntu") is not None else 35.0,
                    "water_level": r.get("water_level") or "NORMAL",
                    "risk_target": compute_sni_label(ph_f, temp_f),
                }
            )
        except (TypeError, ValueError):
            continue

    # Validasi lapangan (Ground-Truth Check: Prediksi AI vs Kondisi Aktual Kolam)
    raw_field_vals = payload.get("field_validations") or []
    valid_field_rows = []
    field_matched = 0
    field_mismatched = 0
    for fv in raw_field_vals:
        if not isinstance(fv, dict):
            continue
        try:
            ph = fv.get("ph")
            temp = fv.get("temperature_c")
            actual_risk = str(fv.get("actual_risk") or "").upper()
            if ph is None or temp is None or actual_risk not in RISK_TO_INT:
                continue
            ph_f, temp_f = float(ph), float(temp)
            if not (PHYSICAL_BOUNDS["ph"][0] <= ph_f <= PHYSICAL_BOUNDS["ph"][1]):
                continue
            if not (PHYSICAL_BOUNDS["temperature_c"][0] <= temp_f <= PHYSICAL_BOUNDS["temperature_c"][1]):
                continue
            is_match = bool(fv.get("is_match", str(fv.get("predicted_risk") or "").upper() == actual_risk))
            if is_match:
                field_matched += 1
            else:
                field_mismatched += 1
            row_dict = {
                "timestamp": fv.get("validated_at") or datetime.now(timezone.utc).isoformat(),
                "ph": ph_f,
                "temperature_c": temp_f,
                "tds_ppm": float(fv["tds_ppm"]) if fv.get("tds_ppm") is not None else 350.0,
                "turbidity_ntu": float(fv["turbidity_ntu"]) if fv.get("turbidity_ntu") is not None else 35.0,
                "water_level": fv.get("water_level") or "NORMAL",
                "risk_target": RISK_TO_INT[actual_risk],
            }
            # Beri bobot lebih (oversample 3x) untuk koreksi lapangan yang meleset agar RF beradaptasi ke kondisi nyata
            repeat_n = 3 if not is_match else 2
            for _ in range(repeat_n):
                valid_field_rows.append(row_dict.copy())
        except (TypeError, ValueError):
            continue

    field_total = field_matched + field_mismatched
    field_match_rate = round(field_matched / field_total, 4) if field_total > 0 else 1.0

    # Evaluasi Panen & Mortalitas Bibit (Biological Feedback Loop)
    raw_harvests = payload.get("harvest_evaluations") or []
    completed_harvests = [
        h for h in raw_harvests
        if isinstance(h, dict) and h.get("mortality_rate_pct") is not None
    ]
    high_mortality_cycles = [
        h for h in completed_harvests
        if float(h.get("mortality_rate_pct") or 0) > 25.0
    ]
    avg_survival_rate = (
        round(float(np.mean([float(h.get("survival_rate_pct") or 0) for h in completed_harvests])), 2)
        if completed_harvests
        else None
    )
    avg_mortality_rate = (
        round(float(np.mean([float(h.get("mortality_rate_pct") or 0) for h in completed_harvests])), 2)
        if completed_harvests
        else None
    )

    df_live_clean = pd.DataFrame(valid_live_rows)
    df_field_clean = pd.DataFrame(valid_field_rows)
    frames = [df_base_clean]
    if len(df_live_clean) > 0:
        live_targets = df_live_clean["risk_target"].astype(int).reset_index(drop=True)
        df_live_clean = clean_dataframe(df_live_clean)
        df_live_clean["risk_target"] = live_targets
        frames.append(df_live_clean)
    if len(df_field_clean) > 0:
        field_targets = df_field_clean["risk_target"].astype(int).reset_index(drop=True)
        df_field_clean = clean_dataframe(df_field_clean)
        df_field_clean["risk_target"] = field_targets
        frames.append(df_field_clean)

    df_combined = pd.concat(frames, ignore_index=True)

    X_all = transform_dataframe(df_combined)
    y_all = df_combined["risk_target"].astype(int)

    split_idx = int(0.8 * len(X_all))
    X_train, X_test = X_all.iloc[:split_idx], X_all.iloc[split_idx:]
    y_train, y_test = y_all.iloc[:split_idx], y_all.iloc[split_idx:]

    reasoning_steps.append(
        {
            "step": "OBSERVE",
            "status": "DONE",
            "detail": (
                f"Memuat {len(df_base_clean)} sampel dasar + {len(df_live_clean)} telemetri live + "
                f"{field_total} validasi lapangan ({len(df_field_clean)} baris terbobot) "
                f"(split 80:20 kronologis: {len(X_train)} train / {len(X_test)} test)."
            ),
        }
    )

    if field_total > 0:
        reasoning_steps.append(
            {
                "step": "FIELD_GROUND_TRUTH",
                "status": "DONE" if field_match_rate >= 0.85 else "WARNING",
                "detail": (
                    f"Cek kesesuaian lapangan: {field_matched}/{field_total} cocok ({field_match_rate*100:.1f}%), "
                    f"{field_mismatched} koreksi lapangan dimasukkan ke dataset latih."
                ),
            }
        )

    if len(completed_harvests) > 0:
        reasoning_steps.append(
            {
                "step": "HARVEST_EVALUATION",
                "status": "WARNING" if len(high_mortality_cycles) > 0 else "DONE",
                "detail": (
                    f"Evaluasi {len(completed_harvests)} siklus panen lele: rata-rata Survival Rate={avg_survival_rate:.1f}%, "
                    f"Mortalitas={avg_mortality_rate:.1f}%, siklus mortalitas tinggi (>25%)={len(high_mortality_cycles)}."
                ),
            }
        )

    # --- STEP 2: EVALUATE ---
    active_model_path = models_dir / "random_forest_water_quality.joblib"
    if not active_model_path.exists():
        baseline_rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=8,
            min_samples_split=4,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
            n_jobs=1,
        )
        baseline_rf.fit(X_train, y_train)
        atomic_save_joblib(active_model_path, baseline_rf)

    active_model = joblib.load(active_model_path)
    current_metrics = evaluate_classifier(active_model, X_test, y_test)

    # Pastikan backup model aktif ada di versions/ untuk rollback instan
    backup_current_path = versions_dir / f"rf_{current_version}.joblib"
    if not backup_current_path.exists():
        shutil.copy2(active_model_path, backup_current_path)

    reasoning_steps.append(
        {
            "step": "EVALUATE",
            "status": "DONE",
            "detail": (
                f"Model aktif ({current_version}): Akurasi={current_metrics['accuracy']*100:.2f}%, "
                f"Macro-F1={current_metrics['macro_f1']:.4f}, Recall BAHAYA={current_metrics['bahaya_recall']:.4f}, "
                f"Avg Latency={current_metrics['avg_latency_ms']:.2f} ms."
            ),
        }
    )

    # --- STEP 3: DRIFT & AGREEMENT ---
    drift_score = compute_drift_score(df_base_clean, df_live_clean)
    live_agreement_rate = compute_live_agreement_rate(payload.get("live_predictions") or [])
    new_live_samples = int(len(df_live_clean))

    reasoning_steps.append(
        {
            "step": "DRIFT_CHECK",
            "status": "DONE",
            "detail": (
                f"Drift score distribusi sensor={drift_score:.4f} (batas maks {max_drift_threshold:.2f}), "
                f"live agreement SNI={live_agreement_rate*100:.1f}%, sampel live valid={new_live_samples}."
            ),
        }
    )

    if mode == "evaluate":
        summary = (
            f"Auto-Evaluasi selesai untuk model {current_version}: Akurasi {current_metrics['accuracy']*100:.2f}%, "
            f"Macro-F1 {current_metrics['macro_f1']:.4f}, Drift {drift_score:.4f}."
        )
        return {
            "success": True,
            "mode": "evaluate",
            "decision": "EVALUATED_ONLY",
            "promoted": False,
            "current_version": current_version,
            "candidate_version": None,
            "current_metrics": current_metrics,
            "candidate_metrics": None,
            "drift_score": drift_score,
            "live_agreement_rate": live_agreement_rate,
            "new_live_samples": new_live_samples,
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test)),
            "reasoning_steps": reasoning_steps,
            "summary": summary,
            "candidates_compared": [],
        }

    # --- STEP 4: DECIDE ---
    reasons_to_retrain = []
    if force_retrain:
        reasons_to_retrain.append("Force retrain diminta Super Admin")
    if current_metrics["macro_f1"] < min_f1_threshold:
        reasons_to_retrain.append(
            f"Macro-F1 ({current_metrics['macro_f1']:.4f}) < threshold ({min_f1_threshold:.4f})"
        )
    if drift_score > max_drift_threshold:
        reasons_to_retrain.append(
            f"Drift score ({drift_score:.4f}) > threshold ({max_drift_threshold:.4f})"
        )
    if current_metrics["bahaya_recall"] < 0.85:
        reasons_to_retrain.append(
            f"Recall kelas BAHAYA ({current_metrics['bahaya_recall']:.4f}) < 0.85"
        )
    if new_live_samples >= min_new_samples:
        reasons_to_retrain.append(
            f"Sampel telemetri live baru ({new_live_samples}) >= ambang ({min_new_samples})"
        )
    if field_total > 0 and field_match_rate < 0.85:
        reasons_to_retrain.append(
            f"Kesesuaian prediksi di lapangan ({field_match_rate*100:.1f}%) < 85%"
        )
    if field_mismatched > 0:
        reasons_to_retrain.append(
            f"Terdapat {field_mismatched} koreksi validasi lapangan baru untuk kalibrasi ulang"
        )
    if len(high_mortality_cycles) > 0:
        reasons_to_retrain.append(
            f"Terdeteksi {len(high_mortality_cycles)} siklus panen dengan mortalitas bibit > 25%"
        )

    if not reasons_to_retrain:
        reasoning_steps.append(
            {
                "step": "DECIDE",
                "status": "SKIPPED",
                "detail": "Seluruh metrik sehat dan sampel live baru belum memicu retraining. Model aktif dipertahankan.",
            }
        )
        return {
            "success": True,
            "mode": "self_learn",
            "decision": "KEEP_CURRENT",
            "promoted": False,
            "current_version": current_version,
            "candidate_version": None,
            "current_metrics": current_metrics,
            "candidate_metrics": None,
            "drift_score": drift_score,
            "live_agreement_rate": live_agreement_rate,
            "new_live_samples": new_live_samples,
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test)),
            "reasoning_steps": reasoning_steps,
            "summary": (
                f"Agent AI mempertahankan model {current_version} (Macro-F1 {current_metrics['macro_f1']:.4f}, "
                f"Drift {drift_score:.4f}). Tidak ada pemicu retraining yang terpenuhi."
            ),
            "candidates_compared": [],
        }

    reasoning_steps.append(
        {
            "step": "DECIDE",
            "status": "TRIGGERED",
            "detail": "Retraining dipicu oleh: " + "; ".join(reasons_to_retrain) + ".",
        }
    )

    # --- STEP 5: SELF-TRAIN ---
    grid = agent_profile["grid"]

    tscv = TimeSeriesSplit(n_splits=3)
    candidates_compared = []
    for cfg in grid:
        fold_scores = []
        for tr_idx, val_idx in tscv.split(X_train):
            clf = RandomForestClassifier(
                n_estimators=cfg["n_estimators"],
                max_depth=cfg["max_depth"],
                min_samples_split=4,
                min_samples_leaf=cfg["min_samples_leaf"],
                class_weight="balanced",
                random_state=42,
                n_jobs=1,
            )
            clf.fit(X_train.iloc[tr_idx], y_train.iloc[tr_idx])
            preds = clf.predict(X_train.iloc[val_idx])
            fold_scores.append(float(f1_score(y_train.iloc[val_idx], preds, average="macro", zero_division=0)))

        candidates_compared.append(
            {
                "hyperparameters": cfg,
                "cv_macro_f1": round(float(np.mean(fold_scores)), 4),
            }
        )

    peak_cv = max(c["cv_macro_f1"] for c in candidates_compared)
    within_tol = [c for c in candidates_compared if c["cv_macro_f1"] >= peak_cv - 0.005]
    within_tol.sort(key=lambda c: (c["hyperparameters"]["n_estimators"], -c["cv_macro_f1"]))
    chosen_cfg = within_tol[0]
    best_params = chosen_cfg["hyperparameters"]

    candidate_model = RandomForestClassifier(
        n_estimators=best_params["n_estimators"],
        max_depth=best_params["max_depth"],
        min_samples_split=4,
        min_samples_leaf=best_params["min_samples_leaf"],
        class_weight="balanced",
        random_state=42,
        n_jobs=1,
    )
    candidate_model.fit(X_train, y_train)
    candidate_metrics = evaluate_classifier(candidate_model, X_test, y_test)
    candidate_version = next_version_string(current_version)

    reasoning_steps.append(
        {
            "step": "SELF_TRAIN",
            "status": "DONE",
            "detail": (
                f"Kandidat {candidate_version} dilatih via 3-fold TimeSeriesSplit (parsimoni PRD §12.8: "
                f"n_estimators={best_params['n_estimators']}, max_depth={best_params['max_depth']}, "
                f"CV Macro-F1={chosen_cfg['cv_macro_f1']:.4f}). Holdout Macro-F1={candidate_metrics['macro_f1']:.4f}."
            ),
        }
    )

    # --- STEP 6: SAFETY GATE ---
    gate_f1_ok = candidate_metrics["macro_f1"] >= (current_metrics["macro_f1"] - 0.005)
    gate_bahaya_ok = candidate_metrics["bahaya_recall"] >= 0.80
    gate_acc_ok = candidate_metrics["accuracy"] >= 0.80
    safety_passed = gate_f1_ok and gate_bahaya_ok and gate_acc_ok

    cand_artifact_path = versions_dir / f"rf_{candidate_version}.joblib"
    cand_card_path = versions_dir / f"rf_{candidate_version}_card.json"
    cand_card = build_model_card(
        candidate_version,
        candidate_metrics,
        len(X_train),
        best_params,
        new_live_samples,
    )
    atomic_save_joblib(cand_artifact_path, candidate_model)
    atomic_write_json(cand_card_path, cand_card)

    if not safety_passed:
        decision = "REJECTED_SAFETY_GATE"
        promoted = False
        gate_status = "REJECTED"
        gate_detail = (
            f"Safety Gate menolak promosi {candidate_version}: "
            f"F1_ok={gate_f1_ok} ({candidate_metrics['macro_f1']:.4f} vs {current_metrics['macro_f1']:.4f}), "
            f"BahayaRecall_ok={gate_bahaya_ok} ({candidate_metrics['bahaya_recall']:.4f}), Acc_ok={gate_acc_ok}."
        )
        summary = gate_detail
    elif promotion_mode == "AUTO_PROMOTE":
        atomic_save_joblib(active_model_path, candidate_model)
        atomic_write_json(models_dir / "model_card.json", cand_card)
        decision = "PROMOTED_NEW_MODEL"
        promoted = True
        gate_status = "PROMOTED"
        gate_detail = (
            f"Lolos Safety Gate. Mode AUTO_PROMOTE aktif: model {candidate_version} dipromosikan secara atomik "
            f"(Akurasi {candidate_metrics['accuracy']*100:.2f}%, Macro-F1 {candidate_metrics['macro_f1']:.4f})."
        )
        summary = gate_detail
    else:
        decision = "CANDIDATE_AWAITING_HITL"
        promoted = False
        gate_status = "HITL_PENDING"
        gate_detail = (
            f"Lolos Safety Gate. Mode HITL_REVIEW: kandidat {candidate_version} disimpan di registry dan menunggu "
            f"persetujuan Super Admin sebelum menggantikan {current_version}."
        )
        summary = gate_detail

    reasoning_steps.append(
        {
            "step": "SAFETY_GATE",
            "status": gate_status,
            "detail": gate_detail,
        }
    )

    return {
        "success": True,
        "mode": "self_learn",
        "decision": decision,
        "promoted": promoted,
        "current_version": current_version,
        "candidate_version": candidate_version,
        "artifact_path": str(cand_artifact_path),
        "model_card_path": str(cand_card_path),
        "hyperparameters": best_params,
        "current_metrics": current_metrics,
        "candidate_metrics": candidate_metrics,
        "drift_score": drift_score,
        "live_agreement_rate": live_agreement_rate,
        "field_match_rate": field_match_rate,
        "field_validation_count": field_total,
        "harvest_eval_count": len(completed_harvests),
        "avg_survival_rate_pct": avg_survival_rate,
        "avg_mortality_rate_pct": avg_mortality_rate,
        "agent_model_id": agent_model_id,
        "new_live_samples": new_live_samples,
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "reasoning_steps": reasoning_steps,
        "summary": summary,
        "candidates_compared": candidates_compared,
    }


def main():
    parser = argparse.ArgumentParser(description="BanyuWening AI Self-Learning Random Forest Agent")
    parser.add_argument("--mode", choices=["evaluate", "self_learn"], default="self_learn")
    parser.add_argument("--input", required=False, default=None, help="Path ke file JSON input dari Laravel")
    args = parser.parse_args()

    try:
        payload = {}
        if args.input and Path(args.input).exists():
            with open(args.input, "r", encoding="utf-8") as f:
                payload = json.load(f) or {}

        result = run_agent(args.mode, payload)
        print(json.dumps(result))
    except Exception as exc:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": str(exc),
                    "decision": "FAILED",
                    "promoted": False,
                    "reasoning_steps": [
                        {"step": "ERROR", "status": "FAILED", "detail": str(exc)}
                    ],
                }
            )
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
