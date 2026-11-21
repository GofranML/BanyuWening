"""
Pengujian unit & integrasi untuk predict.py (single + batch) dan self_learning_agent.py.
Menggunakan direktori temporer terisolasi agar tidak mengotori ml/models/ produksi.
"""

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent
SRC_DIR = ML_DIR / "src"


def run_cli(args: list[str]) -> dict:
    proc = subprocess.run(
        [sys.executable, *args],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    assert proc.returncode == 0, f"Command failed ({proc.returncode}): stdout={proc.stdout}\nstderr={proc.stderr}"
    return json.loads(proc.stdout.strip())


def test_predict_single_and_batch():
    single = run_cli([
        str(SRC_DIR / "predict.py"),
        json.dumps({
            "ph": 7.15,
            "temperature_c": 28.4,
            "tds_ppm": 350,
            "turbidity_ntu": 36,
            "water_level": "NORMAL",
        }),
    ])
    assert single["success"] is True
    assert single["risk"] in {"AMAN", "WASPADA", "BAHAYA"}
    assert "inference_ms" in single and single["inference_ms"] >= 0
    assert single["model_version"]

    batch = run_cli([
        str(SRC_DIR / "predict.py"),
        json.dumps({
            "batch": [
                {"ph": 7.2, "temperature_c": 28.0, "tds_ppm": 340, "turbidity_ntu": 30, "water_level": "NORMAL"},
                {"ph": 5.4, "temperature_c": 34.5, "tds_ppm": 900, "turbidity_ntu": 150, "water_level": "LOW"},
            ]
        }),
    ])
    assert batch["success"] is True
    assert batch["count"] == 2
    assert len(batch["predictions"]) == 2
    assert batch["predictions"][1]["risk"] == "BAHAYA"
    assert batch["predictions"][1]["failsafe_active"] is True


def test_self_learning_agent_evaluate_and_retrain_in_temp_dir():
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        tmp_models = tmp_path / "models"
        tmp_datasets = tmp_path / "datasets"
        shutil.copytree(ML_DIR / "models", tmp_models)
        tmp_datasets.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ML_DIR / "datasets" / "sensor_readings_dummy.csv", tmp_datasets / "sensor_readings_dummy.csv")

        live_readings = [
            {"ph": 7.1, "temperature_c": 28.1, "tds_ppm": 360, "turbidity_ntu": 35, "water_level": "NORMAL"},
            {"ph": 6.3, "temperature_c": 31.2, "tds_ppm": 610, "turbidity_ntu": 85, "water_level": "NORMAL"},
            {"ph": 5.7, "temperature_c": 33.9, "tds_ppm": 850, "turbidity_ntu": 140, "water_level": "LOW"},
            {"ph": 7.3, "temperature_c": 27.8, "tds_ppm": 330, "turbidity_ntu": 32, "water_level": "NORMAL"},
        ]

        # 1. Mode evaluate
        eval_input = tmp_path / "eval_in.json"
        eval_input.write_text(json.dumps({
            "live_readings": live_readings,
            "live_predictions": [{"ph": 7.1, "temperature_c": 28.1, "risk": "AMAN"}],
            "config": {"min_f1_threshold": 0.90, "max_drift_threshold": 0.25, "min_new_samples": 10},
            "current_version": "1.0.0-rf",
            "models_dir": str(tmp_models),
            "datasets_dir": str(tmp_datasets),
        }), encoding="utf-8")

        eval_res = run_cli([str(SRC_DIR / "self_learning_agent.py"), "--mode", "evaluate", "--input", str(eval_input)])
        assert eval_res["success"] is True
        assert eval_res["decision"] == "EVALUATED_ONLY"
        assert eval_res["promoted"] is False
        assert len(eval_res["current_metrics"]["confusion_matrix"]) == 3
        assert len(eval_res["current_metrics"]["feature_importances"]) == 9

        # 2. Mode self_learn (force_retrain=True, AUTO_PROMOTE)
        learn_input = tmp_path / "learn_in.json"
        learn_input.write_text(json.dumps({
            "live_readings": live_readings,
            "live_predictions": [{"ph": 7.1, "temperature_c": 28.1, "risk": "AMAN"}],
            "config": {
                "min_f1_threshold": 0.90,
                "max_drift_threshold": 0.25,
                "min_new_samples": 10,
                "promotion_mode": "AUTO_PROMOTE",
                "force_retrain": True,
            },
            "current_version": "1.0.0-rf",
            "models_dir": str(tmp_models),
            "datasets_dir": str(tmp_datasets),
        }), encoding="utf-8")

        learn_res = run_cli([str(SRC_DIR / "self_learning_agent.py"), "--mode", "self_learn", "--input", str(learn_input)])
        assert learn_res["success"] is True
        assert learn_res["decision"] == "PROMOTED_NEW_MODEL"
        assert learn_res["promoted"] is True
        assert learn_res["candidate_version"] is not None
        assert Path(learn_res["artifact_path"]).exists()
        assert len(learn_res["candidates_compared"]) == 4

        updated_card = json.loads((tmp_models / "model_card.json").read_text(encoding="utf-8"))
        assert updated_card["version"] == learn_res["candidate_version"]


if __name__ == "__main__":
    test_predict_single_and_batch()
    test_self_learning_agent_evaluate_and_retrain_in_temp_dir()
    print("[PASS] Seluruh pengujian Python ML predict & AI Self-Learning Agent berhasil!")
