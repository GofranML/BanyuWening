"""Warm-start time-series CV to find the smallest stable forest size."""
from __future__ import annotations
import json
import time
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import f1_score
from sklearn.model_selection import TimeSeriesSplit
import run_kaggle_rf as runner

OUT=runner.OUT
TREE_COUNTS=[100,200,300,500,800]
LABELS=[0,1,2]

def main():
    summary=json.loads((OUT/"results"/"run_summary.json").read_text(encoding="utf-8"))
    completed=[r for r in summary["results"] if r.get("status")=="COMPLETED"]
    configs={c["series_id"]:c for c in runner.configs()}
    rows=[]
    for old in completed:
        config=configs[old["series_id"]]
        sensor,audit=(runner.load_bobsis(config) if config["kind"]=="bobsis" else runner.load_catfish(config))
        steps=runner.HORIZONS[old["horizon"]]
        xall=runner.features(sensor,12)
        target=runner.risk_label(sensor).shift(-steps)
        valid=sensor["ph"].notna() & sensor["temperature_c"].notna() & target.notna()
        split=int(.8*len(sensor)); pos=np.arange(len(sensor))
        train_mask=(pos+steps<split)&valid.to_numpy()
        xtrain=xall.iloc[train_mask]; ytrain=target.iloc[train_mask].astype(int)
        if len(xtrain)<1000 or ytrain.nunique()<2:
            continue
        splitter=TimeSeriesSplit(n_splits=3,gap=steps)
        for fold,(itr,iva) in enumerate(splitter.split(xtrain),start=1):
            xf, xv=xtrain.iloc[itr],xtrain.iloc[iva]
            yf, yv=ytrain.iloc[itr],ytrain.iloc[iva]
            imputer=SimpleImputer(strategy="median",add_indicator=True,keep_empty_features=True)
            xf2=imputer.fit_transform(xf); xv2=imputer.transform(xv)
            counts=yf.value_counts(); ratio=counts.max()/counts.min()
            rf=RandomForestClassifier(n_estimators=TREE_COUNTS[0],max_depth=18,min_samples_leaf=2,
                 random_state=42,n_jobs=-1,class_weight="balanced" if ratio>1.5 else None,warm_start=True)
            for ntrees in TREE_COUNTS:
                rf.set_params(n_estimators=ntrees)
                t0=time.perf_counter(); rf.fit(xf2,yf); elapsed=time.perf_counter()-t0
                train_pred=rf.predict(xf2); val_pred=rf.predict(xv2)
                rows.append({"experiment":old["experiment"],"series_id":old["series_id"],"horizon":old["horizon"],
                    "fold":fold,"n_estimators":ntrees,"train_size":len(xf),"validation_size":len(xv),
                    "train_f1_macro":f1_score(yf,train_pred,labels=LABELS,average="macro",zero_division=0),
                    "validation_f1_macro":f1_score(yv,val_pred,labels=LABELS,average="macro",zero_division=0),
                    "generalization_gap":f1_score(yf,train_pred,labels=LABELS,average="macro",zero_division=0)-f1_score(yv,val_pred,labels=LABELS,average="macro",zero_division=0),
                    "fit_seconds_increment":elapsed})
                print(f"TUNE {old['experiment']} fold={fold} trees={ntrees} val_f1={rows[-1]['validation_f1_macro']:.4f} fit_s={elapsed:.2f}",flush=True)
    comp=OUT/"results"/"comparison"; comp.mkdir(parents=True,exist_ok=True)
    raw=pd.DataFrame(rows); raw.to_csv(comp/"forest_size_cv_folds.csv",index=False)
    agg=raw.groupby("n_estimators").agg(mean_validation_macro_f1=("validation_f1_macro","mean"),
        std_validation_macro_f1=("validation_f1_macro","std"),mean_train_macro_f1=("train_f1_macro","mean"),
        mean_generalization_gap=("generalization_gap","mean"),mean_incremental_fit_seconds=("fit_seconds_increment","mean"),
        validation_folds=("validation_f1_macro","size")).reset_index()
    peak=float(agg["mean_validation_macro_f1"].max())
    tol=.005
    chosen=int(agg.loc[agg["mean_validation_macro_f1"]>=peak-tol,"n_estimators"].min())
    agg["within_0_005_of_peak"]=agg["mean_validation_macro_f1"]>=peak-tol
    agg.to_csv(comp/"forest_size_cv_summary.csv",index=False)
    fig,ax=plt.subplots(figsize=(8,4.8))
    ax.errorbar(agg["n_estimators"],agg["mean_validation_macro_f1"],yerr=agg["std_validation_macro_f1"],marker="o",capsize=4,label="TimeSeriesSplit validation")
    ax.axvline(chosen,color="#B74C40",linestyle="--",label=f"Dipilih: {chosen} pohon")
    ax.set_xscale("log"); ax.set_xticks(TREE_COUNTS,TREE_COUNTS); ax.set_xlabel("Jumlah pohon (n_estimators)")
    ax.set_ylabel("Macro-F1 validasi"); ax.set_title("Kurva ukuran forest - chronological CV"); ax.grid(alpha=.25); ax.legend()
    fig.tight_layout(); fig.savefig(comp/"forest_size_cv_curve.png",dpi=180); plt.close(fig)
    payload={"dataset_series_tuned":len(completed),"candidate_tree_counts":TREE_COUNTS,"folds":3,
        "selection_rule":"smallest n_estimators within 0.005 mean macro-F1 of the best chronological validation score",
        "selected_n_estimators":chosen,"peak_validation_macro_f1":peak,"tolerance":tol,
        "limitations":"Selection is for these Kaggle source series and proxy targets only; cannot guarantee new-domain accuracy. The existing chronological holdout has already been used in the earlier 100/300 comparison.",
        "candidates":agg.to_dict(orient="records")}
    (comp/"forest_size_tuning.json").write_text(json.dumps(payload,indent=2,ensure_ascii=False),encoding="utf-8")
    print(json.dumps({"selected_n_estimators":chosen,"peak_cv_macro_f1":peak,"candidates":agg.to_dict(orient="records")},indent=2),flush=True)

if __name__=="__main__": main()
