"""Kaggle benchmark for BanyuWening v2.2; labels are source-health or proxy only."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.metrics import (accuracy_score, classification_report, confusion_matrix,
                             f1_score, precision_score, recall_score)
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "ml" / "datasets"
OUT = Path(__file__).resolve().parents[1]
SEED = 42
FREQ = "5min"
HORIZONS = {"1h": 12, "2h": 24, "3h": 36}
PARAMS = {"n_estimators": 100, "max_depth": 18, "min_samples_leaf": 2,
          "random_state": SEED, "n_jobs": -1}
LABEL_NAMES = {0: "AMAN", 1: "WASPADA", 2: "BAHAYA"}
LABEL_VERSION = "prd-v2.3-sni-ph-temperature-local-baseline-pending"


def jwrite(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, default=str), encoding="utf-8")


def find_col(columns, pattern):
    return next((c for c in columns if re.search(pattern, str(c), flags=re.I)), None)


def normalize_sensor(df: pd.DataFrame, config: dict):
    time_col = config.get("time") or find_col(df.columns, r"created_at|datetime|timestamp|^unnamed: ?0$")
    if time_col is None:
        time_col = find_col(df.columns, r"^date$")
    if time_col is None:
        raise ValueError("timestamp/date column not found")
    raw_ts = df[time_col].astype(str).str.replace(r"\s+CET$", "", regex=True)
    ts = pd.to_datetime(raw_ts, errors="coerce", utc=True, format="mixed", dayfirst=True)
    raw = pd.DataFrame(index=ts)
    aliases = {
        "ph": config.get("ph") or find_col(df.columns, r"^ph$|^water_ph$"),
        "temperature_c": config.get("temperature") or find_col(df.columns, r"^temp(?:erature)?\s*(?:\(c\))?$|water_temp"),
        "tds_ppm": config.get("tds") or find_col(df.columns, r"^tds$"),
        "turbidity_ntu": config.get("turbidity") or find_col(df.columns, r"^turbidity"),
    }
    if not aliases["ph"] or not aliases["temperature_c"]:
        raise ValueError(f"pH and temperature are required, got {aliases}")
    for name, col in aliases.items():
        if col:
            raw[name] = pd.to_numeric(df[col], errors="coerce").replace([np.inf, -np.inf], np.nan).to_numpy()
    raw = raw.loc[~raw.index.isna()].sort_index(kind="stable")
    duplicates = int(raw.index.duplicated(keep=False).sum())
    rows_before = len(raw)
    # Physical-range guard approximates the device watchdog and rejects sentinel/rail values.
    raw.loc[~raw["ph"].between(0, 14), "ph"] = np.nan
    raw.loc[~raw["temperature_c"].between(0, 40), "temperature_c"] = np.nan
    if "tds_ppm" in raw:
        raw.loc[~raw["tds_ppm"].between(0, 10000), "tds_ppm"] = np.nan
    if "turbidity_ntu" in raw:
        raw.loc[~raw["turbidity_ntu"].between(0, 100), "turbidity_ntu"] = np.nan
        # Datasource notes saturating rails; max-rail observations are treated as unhealthy.
        raw.loc[raw["turbidity_ntu"] >= 100, "turbidity_ntu"] = np.nan
    data = raw.resample(FREQ).median()
    data.index.name = "timestamp"
    audit = {"source_file": config["file"], "series_id": config["series_id"],
             "source_rows": len(df), "rows_with_valid_time": rows_before,
             "duplicate_timestamp_rows": duplicates, "resampled_bins": len(data),
             "observed_bins": int(data.notna().any(axis=1).sum()),
             "timestamp_start": str(data.index.min()), "timestamp_end": str(data.index.max()),
             "feature_columns": list(data.columns), "frequency": FREQ,
             "range_rules": "pH 0..14; temperature 0..40 C; TDS 0..10000 ppm; turbidity 0..100 NTU with 100 rail isolated"}
    return data, audit


def load_catfish(config):
    df = pd.read_csv(DATA / config["file"], low_memory=False)
    return normalize_sensor(df, config)


def load_bobsis(config):
    df = pd.read_csv(DATA / config["file"], low_memory=False)
    data, audit = normalize_sensor(df, {**config, "time": "created_date", "ph": "water_pH",
                                        "temperature": "water_temp", "tds": "TDS"})
    audit["lineage"] = "same Kaggle source as filtered/raw paired files; variants are not independent datasets"
    return data, audit


def load_tilapia(config):
    df = pd.read_excel(DATA / config["file"])
    ph_col = find_col(df.columns, r"^ph$")
    temp_col = find_col(df.columns, r"temperature")
    turb_col = find_col(df.columns, r"turbidity")
    target_col = find_col(df.columns, r"^health status$")
    ts_col = find_col(df.columns, r"^datetime$")
    if not all([ph_col, temp_col, turb_col, target_col, ts_col]):
        raise ValueError(f"Required health series fields missing: {list(df.columns)}")
    ts = pd.to_datetime(df[ts_col], errors="coerce", utc=True)
    sensor = pd.DataFrame(index=ts)
    sensor["ph"] = pd.to_numeric(df[ph_col], errors="coerce").to_numpy()
    sensor["temperature_c"] = pd.to_numeric(df[temp_col], errors="coerce").to_numpy()
    sensor["turbidity_ntu"] = pd.to_numeric(df[turb_col], errors="coerce").to_numpy()
    sensor = sensor.loc[~sensor.index.isna()].sort_index(kind="stable")
    status = pd.Series(df.loc[~pd.to_datetime(df[ts_col], errors="coerce", utc=True).isna(), target_col].astype(str).values,
                       index=sensor.index)
    sensor.loc[~sensor["ph"].between(0, 14), "ph"] = np.nan
    sensor.loc[~sensor["temperature_c"].between(0, 40), "temperature_c"] = np.nan
    sensor.loc[~sensor["turbidity_ntu"].between(0, 10000), "turbidity_ntu"] = np.nan
    if sensor.index.has_duplicates:
        sensor = sensor.groupby(level=0).median()
        status = status.groupby(level=0).last()
    # Source readings are hourly. Keep hourly resolution for a true 60/120/180m target.
    sensor = sensor.resample("1h").median()
    status = status.reindex(sensor.index)
    audit = {"source_file": config["file"], "series_id": config["series_id"],
             "source_rows": len(df), "observed_bins": int(sensor.notna().any(axis=1).sum()),
             "resampled_bins": len(sensor), "timestamp_start": str(sensor.index.min()),
             "timestamp_end": str(sensor.index.max()), "feature_columns": list(sensor.columns),
             "frequency": "1h", "available_health_labels": status.value_counts(dropna=False).to_dict(),
             "source_target": "Health Status; source-defined, tilapia, not catfish biological ground truth"}
    return sensor, status, audit


def features(df: pd.DataFrame, steps_per_hour: int):
    x = pd.DataFrame(index=df.index)
    for c in df.columns:
        s = df[c]
        x[f"{c}_now"] = s
        min_periods = 1 if steps_per_hour == 1 else max(2, steps_per_hour // 4)
        x[f"{c}_mean_1h"] = s.rolling(steps_per_hour, min_periods=min_periods).mean()
        x[f"{c}_std_1h"] = s.rolling(steps_per_hour, min_periods=min_periods).std()
        x[f"{c}_delta_1h"] = s - s.shift(steps_per_hour)
        x[f"{c}_delta_3h"] = s - s.shift(3 * steps_per_hour)
        x[f"{c}_missing"] = s.isna().astype(float)
    h = x.index.hour + x.index.minute / 60
    x["hour_sin"] = np.sin(2*np.pi*h/24)
    x["hour_cos"] = np.cos(2*np.pi*h/24)
    x["day_sin"] = np.sin(2*np.pi*x.index.dayofweek/7)
    x["day_cos"] = np.cos(2*np.pi*x.index.dayofweek/7)
    return x.replace([np.inf, -np.inf], np.nan)


def risk_label(df):
    """Future proxy status under the PRD v2.3 status policy.

    pH and temperature have declared operating bands.  TDS, turbidity and
    water level deliberately do not enter this public-data proxy label: their
    local baselines/operating limits have not yet been calibrated per pond.
    """
    ph, temp = df["ph"], df["temperature_c"]
    # AMAN: pH 6.5..8.5 and temperature 25..30 C.
    # WASPADA: the buffer immediately outside those operating bands.
    # BAHAYA: pH <6 or >8.8, temperature <22 or >33 C.
    danger = (ph < 6.0) | (ph > 8.8) | (temp < 22) | (temp > 33)
    warning = (ph < 6.5) | (ph > 8.5) | (temp < 25) | (temp > 30)
    out = pd.Series(np.nan, index=df.index, dtype=float)
    valid = ph.notna() & temp.notna()
    out.loc[valid] = 0
    out.loc[valid & warning] = 1
    out.loc[valid & danger] = 2
    return out


def model_pipeline(x, y):
    counts = y.value_counts()
    ratio = counts.max() / counts.min() if len(counts) > 1 else 1
    params = {**PARAMS, "class_weight": "balanced" if ratio > 1.5 else None}
    prep = ColumnTransformer([("numeric", SimpleImputer(strategy="median", add_indicator=True,
                                                        keep_empty_features=True), x.columns.tolist())],
                             remainder="drop", verbose_feature_names_out=False)
    return Pipeline([("preprocess", prep), ("model", RandomForestClassifier(**params))])


def make_plots(folder, labels, ytr, yte, pred, importance, metrics):
    folder.mkdir(parents=True, exist_ok=True)
    sns.set_theme(style="whitegrid")
    names = [LABEL_NAMES[x] if isinstance(x, (int, np.integer)) else str(x) for x in labels]
    cm = confusion_matrix(yte, pred, labels=labels)
    fig, ax = plt.subplots(figsize=(6.2, 5.2))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=names, yticklabels=names, ax=ax)
    ax.set(title="Confusion matrix", xlabel="Prediksi", ylabel="Aktual")
    fig.tight_layout(); fig.savefig(folder / "confusion_matrix.png", dpi=160); plt.close(fig)
    top = importance.head(10).sort_values("importance")
    fig, ax = plt.subplots(figsize=(8, max(4.2, .32*len(top))))
    ax.barh(top.feature, top.importance, color="#287c78"); ax.set(title="Top 10 feature importance", xlabel="Impurity importance")
    fig.tight_layout(); fig.savefig(folder / "feature_importance.png", dpi=160); plt.close(fig)
    fig, ax = plt.subplots(figsize=(7, 4.5)); ix = np.arange(len(labels)); w = .36
    ax.bar(ix-w/2, ytr.value_counts().reindex(labels, fill_value=0), w, label="Train", color="#287c78")
    ax.bar(ix+w/2, yte.value_counts().reindex(labels, fill_value=0), w, label="Test", color="#e2a452")
    ax.set_xticks(ix, names); ax.set(title="Distribusi target", ylabel="Observasi"); ax.legend()
    fig.tight_layout(); fig.savefig(folder / "class_distribution.png", dpi=160); plt.close(fig)
    fig, ax = plt.subplots(figsize=(6.2, 4.2))
    ax.bar(["Train", "Test"], [metrics["train_f1_macro"], metrics["f1_macro"]], color=["#287c78", "#e2a452"])
    ax.set_ylim(0, 1.05); ax.set(title="Macro F1: train vs test", ylabel="Macro F1")
    fig.tight_layout(); fig.savefig(folder / "train_test_macro_f1.png", dpi=160); plt.close(fig)


def run_model(config, sensor, target, audit, horizon, steps, task_note, class_labels):
    xall = features(sensor, 12 if audit["frequency"] == FREQ else 1)
    yfuture = target.shift(-steps)
    valid = sensor["ph"].notna() & sensor["temperature_c"].notna() & yfuture.notna()
    # Chronological holdout on the original time axis; horizon targets cannot cross the boundary.
    split_at = int(.8 * len(sensor)); pos = np.arange(len(sensor))
    tr = (pos + steps < split_at) & valid.to_numpy()
    te = (pos >= split_at) & valid.to_numpy()
    xtr, ytr = xall.iloc[tr], yfuture.iloc[tr]
    xte, yte = xall.iloc[te], yfuture.iloc[te]
    name = f"{config['series_id']}_{horizon}"
    folder = OUT / "results" / name
    out = {"experiment": name, "series_id": config["series_id"], "dataset": config["file"],
           "horizon": horizon, "horizon_minutes": (steps * 5 if audit["frequency"] == FREQ else steps * 60),
           "task_note": task_note, "source_audit": audit}
    counts = ytr.value_counts()
    labels = class_labels
    if len(xtr) < 100 or ytr.nunique() < 2 or len(xte) < 100 or yte.nunique() < 2:
        reasons = []
        if len(xtr) < 100: reasons.append("train rows <100")
        if ytr.nunique() < 2: reasons.append("train has <2 classes")
        if len(xte) < 100: reasons.append("test rows <100")
        if yte.nunique() < 2: reasons.append("test has <2 classes")
        out.update({"status":"NOT_TRAINABLE","reason":"; ".join(reasons),"train_size":len(xtr),"test_size":len(xte),
                    "train_class_counts":counts.to_dict(),"test_class_counts":yte.value_counts().to_dict()})
        return out
    pipe = model_pipeline(xtr, ytr)
    t0=time.perf_counter(); pipe.fit(xtr, ytr); train_seconds=time.perf_counter()-t0
    t0=time.perf_counter(); train_pred=pipe.predict(xtr); pred=pipe.predict(xte); eval_seconds=time.perf_counter()-t0
    train_f1=f1_score(ytr, train_pred, labels=labels, average="macro", zero_division=0)
    test_f1=f1_score(yte, pred, labels=labels, average="macro", zero_division=0)
    cv=[]
    if len(xtr) >= 1000:
        tscv=TimeSeriesSplit(n_splits=3, gap=steps)
        for a,b in tscv.split(xtr):
            if ytr.iloc[a].nunique()<2: continue
            cv_pipe=model_pipeline(xtr.iloc[a],ytr.iloc[a]); cv_pipe.fit(xtr.iloc[a],ytr.iloc[a])
            cv.append(float(f1_score(ytr.iloc[b],cv_pipe.predict(xtr.iloc[b]),labels=labels,average="macro",zero_division=0)))
    metrics={**out,"status":"COMPLETED","target":"future_health_status" if config["kind"]=="tilapia" else "future_proxy_risk",
             "label_version":LABEL_VERSION,"model_variant":f"rf_{PARAMS['n_estimators']}trees",
             "train_size":len(xtr),"test_size":len(xte),"eligible_windows":int(valid.sum()),
             "accuracy":float(accuracy_score(yte,pred)),
             "precision_macro":float(precision_score(yte,pred,labels=labels,average="macro",zero_division=0)),
             "recall_macro":float(recall_score(yte,pred,labels=labels,average="macro",zero_division=0)),
             "f1_macro":float(test_f1),
             "precision_weighted":float(precision_score(yte,pred,labels=labels,average="weighted",zero_division=0)),
             "recall_weighted":float(recall_score(yte,pred,labels=labels,average="weighted",zero_division=0)),
             "f1_weighted":float(f1_score(yte,pred,labels=labels,average="weighted",zero_division=0)),
             "train_f1_macro":float(train_f1),"generalization_gap_f1":float(train_f1-test_f1),
             "train_seconds":train_seconds,"evaluation_seconds":eval_seconds,
             "class_distribution_train":ytr.value_counts().to_dict(),"class_distribution_test":yte.value_counts().to_dict(),
             "cross_validation":{"method":"3-fold chronological TimeSeriesSplit; gap=horizon steps" if cv else "skipped: insufficient training windows",
                                 "scoring":"macro F1","fold_scores":cv,"mean":float(np.mean(cv)) if cv else None,"std":float(np.std(cv)) if cv else None},
             "parameters":pipe.named_steps["model"].get_params(),"label_note":task_note}
    feature_names=pipe.named_steps["preprocess"].get_feature_names_out()
    imp=pd.DataFrame({"feature":feature_names,"importance":pipe.named_steps["model"].feature_importances_}).sort_values("importance",ascending=False)
    folder.mkdir(parents=True,exist_ok=True); imp.to_csv(folder/"feature_importance.csv",index=False)
    sample=min(2000,len(xte)); sample_idx=np.random.default_rng(SEED).choice(len(xte),sample,replace=False)
    perm=permutation_importance(pipe,xte.iloc[sample_idx],yte.iloc[sample_idx],n_repeats=3,random_state=SEED,scoring="f1_macro",n_jobs=1)
    pd.DataFrame({"feature":xtr.columns,"importance_mean":perm.importances_mean,"importance_std":perm.importances_std}).sort_values("importance_mean",ascending=False).to_csv(folder/"permutation_importance.csv",index=False)
    label_names=[LABEL_NAMES.get(x,str(x)) if isinstance(x,(int,np.integer)) else str(x) for x in labels]
    (folder/"classification_report.txt").write_text(classification_report(yte,pred,labels=labels,target_names=label_names,zero_division=0),encoding="utf-8")
    make_plots(folder,labels,ytr,yte,pred,imp,metrics)
    model_dir=OUT/"models"/config["series_id"]; model_dir.mkdir(parents=True,exist_ok=True)
    model_path=model_dir/f"rf_{horizon}.joblib"; joblib.dump(pipe,model_path)
    loaded=joblib.load(model_path)
    metrics["model_path"]=str(model_path.relative_to(OUT))
    metrics["model_reload_verified"]=bool(np.array_equal(loaded.predict(xte.head(25)),pipe.predict(xte.head(25))))
    if not metrics["model_reload_verified"]: raise RuntimeError("Joblib reload prediction mismatch")
    jwrite(folder/"metrics.json",metrics)
    print(f"OK {name}: macro_f1={test_f1:.4f}; n={len(xtr)}/{len(xte)}; {train_seconds:.1f}s",flush=True)
    return metrics


def configs():
    items=[]
    for p in sorted(DATA.glob("kaggle_catfish_pond*.csv")):
        sid="catfish_"+p.stem.replace("kaggle_catfish_pond", "pond")
        items.append({"file":p.name,"series_id":sid,"kind":"catfish"})
    for p,sid in [("kaggle_aquaponic_iot_filtered.csv","bobsis_filtered"),("kaggle_aquaponic_iot_raw.csv","bobsis_raw")]:
        items.append({"file":p,"series_id":sid,"kind":"bobsis"})
    items.append({"file":"kaggle_tilapia_iot_health_2024.xlsx","series_id":"tilapia_health_2024","kind":"tilapia"})
    return items


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    results=[]; failures=[]; audits=[]; exclusions=[]
    for config in configs():
        try:
            if config["kind"]=="tilapia":
                sensor,status,audit=load_tilapia(config); steps_by_horizon={k:int(k[0]) for k in HORIZONS}
                task="Sumber target Health Status (Stable/At Risk) pada waktu target. Fitur hanya pH, suhu, turbidity saat ini; spesies tilapia; bukan ground truth lele."
                target=status; labels=sorted(pd.unique(status.dropna()))
            else:
                sensor,audit=(load_bobsis(config) if config["kind"]=="bobsis" else load_catfish(config))
                steps_by_horizon=HORIZONS
                target=risk_label(sensor)
                task="Label proxy masa depan mengikuti matriks PRD v2.3: AMAN pH 6.5-8.5 & suhu 25-30 C; WASPADA pada buffer mendekati batas (pH 6.0-<6.5 atau >8.5-8.8; suhu 22-<25 atau >30-33); BAHAYA di luar buffer. TDS/turbidity/level tidak menentukan label sebelum baseline dan batas lokal tervalidasi."
                labels=[0,1,2]
            audits.append(audit)
            for horizon,steps in steps_by_horizon.items():
                try:
                    cached_path = OUT/"results"/f"{config['series_id']}_{horizon}"/"metrics.json"
                    if cached_path.exists():
                        cached = json.loads(cached_path.read_text(encoding="utf-8"))
                        if (cached.get("status") == "COMPLETED" and cached.get("model_reload_verified")
                                and cached.get("label_version") == LABEL_VERSION
                                and cached.get("parameters", {}).get("n_estimators") == PARAMS["n_estimators"]
                                and cached.get("label_version") == LABEL_VERSION):
                            results.append(cached)
                            print(f"CACHED {cached['experiment']}", flush=True)
                            continue
                    r=run_model(config,sensor,target,audit,horizon,steps,task,labels); results.append(r)
                    if r["status"]!="COMPLETED": exclusions.append({"experiment":r["experiment"],"reason":r["reason"]})
                except Exception as exc:
                    fail={"experiment":f"{config['series_id']}_{horizon}","reason":repr(exc)}
                    failures.append(fail); print("FAIL",fail,flush=True)
        except Exception as exc:
            failures.append({"dataset":config["file"],"reason":repr(exc)}); print("FAIL DATASET",config["file"],repr(exc),flush=True)
    comp=OUT/"results"/"comparison"; comp.mkdir(parents=True,exist_ok=True)
    complete=[r for r in results if r["status"]=="COMPLETED"]
    pd.DataFrame([{k:v for k,v in r.items() if k not in {"parameters","source_audit","cross_validation","class_distribution_train","class_distribution_test"}} for r in complete]).to_csv(comp/"comparison.csv",index=False)
    if complete:
        df=pd.DataFrame(complete); fig,ax=plt.subplots(figsize=(12,6))
        for sid,g in df.groupby("series_id"):
            g=g.set_index("horizon").reindex(["1h","2h","3h"])
            ax.plot(g.index,g["f1_macro"],marker="o",label=sid)
        ax.set_ylim(0,1.05); ax.set(title="Macro-F1 test per series and horizon",xlabel="Horizon",ylabel="Macro-F1")
        ax.legend(fontsize=7,ncol=2); fig.tight_layout(); fig.savefig(comp/"horizon_macro_f1.png",dpi=180); plt.close(fig)
    baseline_path=comp/"baseline_100"/"run_summary.json"
    tree_comparison=[]
    if baseline_path.exists():
        baseline=json.loads(baseline_path.read_text(encoding="utf-8"))
        baseline_by_name={r["experiment"]:r for r in baseline["results"] if r.get("status")=="COMPLETED"}
        for current in complete:
            old=baseline_by_name.get(current["experiment"])
            if not old: continue
            tree_comparison.append({"experiment":current["experiment"],"series_id":current["series_id"],"horizon":current["horizon"],
                "n_estimators_baseline":old["parameters"]["n_estimators"],"n_estimators_candidate":current["parameters"]["n_estimators"],
                "macro_f1_baseline":old["f1_macro"],"macro_f1_candidate":current["f1_macro"],
                "macro_f1_delta":current["f1_macro"]-old["f1_macro"],
                "accuracy_baseline":old["accuracy"],"accuracy_candidate":current["accuracy"],
                "train_seconds_baseline":old["train_seconds"],"train_seconds_candidate":current["train_seconds"],
                "train_seconds_ratio":current["train_seconds"]/old["train_seconds"] if old["train_seconds"] else None})
        pd.DataFrame(tree_comparison).to_csv(comp/"tree_count_comparison.csv",index=False)
        if tree_comparison:
            cdf=pd.DataFrame(tree_comparison)
            mean_by_h=cdf.groupby("horizon")[["macro_f1_baseline","macro_f1_candidate"]].mean().reindex(["1h","2h","3h"])
            fig,axes=plt.subplots(1,2,figsize=(11,4.5))
            ix=np.arange(3); width=.36
            axes[0].bar(ix-width/2,mean_by_h["macro_f1_baseline"],width,label="100 pohon",color="#7EAAA4")
            axes[0].bar(ix+width/2,mean_by_h["macro_f1_candidate"],width,label="300 pohon",color="#287C78")
            axes[0].set_xticks(ix,["1h","2h","3h"]); axes[0].set_ylim(0,1); axes[0].set_ylabel("Rata-rata macro-F1 test")
            axes[0].set_title("Kinerja per horizon"); axes[0].legend()
            axes[1].bar(cdf["experiment"],cdf["macro_f1_delta"],color=["#287C78" if x>=0 else "#B74C40" for x in cdf["macro_f1_delta"]])
            axes[1].axhline(0,color="#555555",linewidth=.7); axes[1].set_ylabel("Delta macro-F1 (300 - 100)")
            axes[1].set_title("Perubahan per model"); axes[1].tick_params(axis="x",rotation=90,labelsize=6)
            fig.tight_layout(); fig.savefig(comp/"tree_count_comparison.png",dpi=180); plt.close(fig)
    comparison_summary={}
    if tree_comparison:
        vals=[x["macro_f1_delta"] for x in tree_comparison]
        ratios=[x["train_seconds_ratio"] for x in tree_comparison if x["train_seconds_ratio"] is not None]
        comparison_summary={"baseline_trees":100,"candidate_trees":PARAMS["n_estimators"],"paired_models":len(tree_comparison),
            "mean_macro_f1_delta":float(np.mean(vals)),"median_macro_f1_delta":float(np.median(vals)),
            "improved_models":sum(x>0 for x in vals),"unchanged_models":sum(x==0 for x in vals),"worse_models":sum(x<0 for x in vals),
            "mean_train_seconds_ratio":float(np.mean(ratios)) if ratios else None}
    jwrite(OUT/"inventory"/"series_inventory.json",{"sources_examined":audits,"dummy_excluded":"ml/datasets/sensor_readings_dummy.csv","exact_five_sensor_match_found":False,"excluded_series":exclusions,"failures":failures})
    jwrite(OUT/"results"/"run_summary.json",{"objective":"Kaggle benchmark of 1/2/3-hour future risk or health-status prediction per source series","completed":len(complete),"not_trainable":exclusions,"failures":failures,"random_state":SEED,"resample_frequency":FREQ,"base_parameters":PARAMS,"baseline_comparison":comparison_summary,"results":results,"limitations":["No Kaggle source matched all five standard channels and the exact catfish future-risk objective.","Catfish labels are pH/temperature proxy classes; the Tilapia health target is a different species and source-defined.","No result is pilot ground truth or suitable for automatic relay control."]})
    print(f"DONE completed={len(complete)} not_trainable={len(exclusions)} failures={len(failures)}",flush=True)


if __name__=="__main__":
    main()

