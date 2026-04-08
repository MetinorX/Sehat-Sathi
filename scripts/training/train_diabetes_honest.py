import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, classification_report, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier

CSV_PATH = Path("diabetes_75000.csv")
TARGET = "Diabetes_Status"

df = pd.read_csv(CSV_PATH)
X = df.drop(columns=[TARGET])
y = df[TARGET].astype(int)
y_bin = (y >= 1).astype(int)

num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
cat_cols = [c for c in X.columns if c not in num_cols]

pre = ColumnTransformer(
    transformers=[
        ("num", Pipeline([("imp", SimpleImputer(strategy="median"))]), num_cols),
        ("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent")), ("ohe", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
    ]
)

model = XGBClassifier(
    n_estimators=500,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.9,
    colsample_bytree=0.8,
    objective="binary:logistic",
    eval_metric="logloss",
    random_state=42,
    n_jobs=-1,
)

pipe = Pipeline([("pre", pre), ("model", model)])
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
proba_cv = cross_val_predict(pipe, X, y_bin, cv=cv, method="predict_proba", n_jobs=1)[:, 1]
pred_cv = (proba_cv >= 0.5).astype(int)

metrics = {
    "accuracy": float(accuracy_score(y_bin, pred_cv)),
    "precision": float(precision_score(y_bin, pred_cv, zero_division=0)),
    "recall": float(recall_score(y_bin, pred_cv, zero_division=0)),
    "f1": float(f1_score(y_bin, pred_cv, zero_division=0)),
    "roc_auc": float(roc_auc_score(y_bin, proba_cv)),
    "report": classification_report(y_bin, pred_cv, output_dict=True, zero_division=0),
}

risk_cols = [c for c in ["Risk_Score", "Diabetes_Stage", "Patient_ID"] if c in X.columns]
leakage_notes = {}
for c in risk_cols:
    s = X[c]
    if pd.api.types.is_numeric_dtype(s):
        corr = np.corrcoef(pd.to_numeric(s, errors="coerce").fillna(0), y_bin)[0, 1]
        leakage_notes[c] = {"pearson_corr_with_target": float(corr)}
    else:
        leakage_notes[c] = {"unique_values": int(s.nunique())}

out = {
    "dataset": str(CSV_PATH),
    "rows": int(len(df)),
    "features": list(X.columns),
    "metrics_cv": metrics,
    "leakage_risk_diagnostics": leakage_notes,
}

out_path = Path("models/diabetes/honest_eval_report.json")
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")

print("Done.")
print(f"Accuracy: {metrics['accuracy']:.4f}")
print(f"Recall  : {metrics['recall']:.4f}")
print(f"ROC-AUC : {metrics['roc_auc']:.4f}")
print(f"Report  : {out_path}")
