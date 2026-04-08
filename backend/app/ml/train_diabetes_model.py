import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier

try:
    from xgboost import XGBClassifier
except Exception:  # pragma: no cover
    XGBClassifier = None

try:
    import shap
except Exception:  # pragma: no cover
    shap = None


NUMERIC_RANGE_RULES: Dict[str, Tuple[float, float]] = {
    "Age": (1, 110),
    "BMI": (10.0, 80.0),
    "Sleep_Hours": (0, 24),
    "Fasting_Glucose": (40, 400),
    "Postprandial_Glucose": (50, 600),
    "HbA1c": (3.0, 20.0),
    "Blood_Pressure": (40, 260),
    "Cholesterol": (80, 500),
    "Insulin": (0, 500),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Responsible AI diabetes training pipeline")
    parser.add_argument("--csv", type=str, default="diabetes_75000.csv")
    parser.add_argument("--target-col", type=str, default="Diabetes_Status")
    parser.add_argument(
        "--drop-cols",
        type=str,
        default="Patient_ID,Risk_Score,Diabetes_Stage",
        help="Columns to drop to avoid leakage/non-feature fields",
    )
    parser.add_argument("--binary-mode", action="store_true", help="Convert target to binary risk prediction")
    parser.add_argument(
        "--binary-positive-min",
        type=int,
        default=1,
        help="In binary mode, target >= this value is positive",
    )
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--target-recall", type=float, default=0.90)
    parser.add_argument("--min-precision", type=float, default=0.70)
    parser.add_argument("--min-threshold", type=float, default=0.05)
    parser.add_argument("--target-accuracy-min", type=float, default=0.78)
    parser.add_argument("--target-accuracy-max", type=float, default=0.82)
    parser.add_argument("--enforce-accuracy-band", action="store_true")
    parser.add_argument(
        "--screening-mode",
        action="store_true",
        help="Drop direct diagnostic lab biomarkers to simulate pre-diagnostic screening conditions",
    )
    parser.add_argument(
        "--exclude-cols",
        type=str,
        default="",
        help="Additional comma-separated feature columns to exclude",
    )
    parser.add_argument("--model-version", type=str, default="1.0.0")
    parser.add_argument("--shap-sample-size", type=int, default=500)
    parser.add_argument(
        "--output-dir",
        type=str,
        default="models/diabetes",
        help="Output root folder for packaged models and metrics",
    )
    parser.add_argument(
        "--primary-metric",
        type=str,
        default="recall",
        choices=["recall", "f1", "accuracy"],
    )
    return parser.parse_args()


def project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def resolve_path(path_str: str) -> Path:
    p = Path(path_str)
    if p.is_absolute():
        return p
    return project_root() / p


def load_dataset(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset not found: {csv_path}")
    return pd.read_csv(csv_path)


def validate_and_clean_data(df: pd.DataFrame, target_col: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    report: Dict[str, Any] = {
        "rows_before": int(len(df)),
        "missing_by_col": df.isna().sum().to_dict(),
        "invalid_range_rows_dropped": 0,
        "target_missing_dropped": 0,
    }

    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found. Available: {list(df.columns)}")

    cleaned = df.copy()

    target_missing = cleaned[target_col].isna().sum()
    if target_missing:
        cleaned = cleaned[~cleaned[target_col].isna()].copy()
        report["target_missing_dropped"] = int(target_missing)

    invalid_mask = pd.Series(False, index=cleaned.index)
    for col, (low, high) in NUMERIC_RANGE_RULES.items():
        if col not in cleaned.columns:
            continue
        values = pd.to_numeric(cleaned[col], errors="coerce")
        col_invalid = (values < low) | (values > high)
        col_invalid = col_invalid.fillna(False)
        invalid_mask = invalid_mask | col_invalid

    invalid_count = int(invalid_mask.sum())
    if invalid_count:
        cleaned = cleaned[~invalid_mask].copy()
        report["invalid_range_rows_dropped"] = invalid_count

    report["rows_after"] = int(len(cleaned))
    return cleaned.reset_index(drop=True), report


def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    if "BMI" in out.columns:
        out["BMI_Category"] = pd.cut(
            out["BMI"],
            bins=[-np.inf, 18.5, 25.0, 30.0, np.inf],
            labels=["underweight", "normal", "overweight", "obese"],
        ).astype(str)

    if "Fasting_Glucose" in out.columns and "Postprandial_Glucose" in out.columns:
        denom = out["Fasting_Glucose"].replace(0, np.nan)
        out["Glucose_Ratio_PP_F"] = (out["Postprandial_Glucose"] / denom).replace([np.inf, -np.inf], np.nan)

    symptom_cols = [
        c
        for c in [
            "Frequent_Urination",
            "Excessive_Thirst",
            "Fatigue",
            "Blurred_Vision",
            "Weight_Loss",
        ]
        if c in out.columns
    ]
    if symptom_cols:
        out["Symptom_Burden"] = out[symptom_cols].fillna(0).sum(axis=1)

    if "Age" in out.columns:
        out["Age_Group"] = pd.cut(
            out["Age"],
            bins=[-np.inf, 30, 45, 60, np.inf],
            labels=["young", "adult", "mid_age", "senior"],
        ).astype(str)

    return out


def apply_feature_policy(df: pd.DataFrame, screening_mode: bool, exclude_cols: List[str]) -> pd.DataFrame:
    out = df.copy()

    if screening_mode:
        # Remove direct diagnostic biomarkers to produce realistic screening performance.
        strong_biomarkers = [
            "Fasting_Glucose",
            "Postprandial_Glucose",
            "HbA1c",
            "Insulin",
            "Glucose_Ratio_PP_F",
        ]
        out = out.drop(columns=[c for c in strong_biomarkers if c in out.columns], errors="ignore")

    if exclude_cols:
        out = out.drop(columns=[c for c in exclude_cols if c in out.columns], errors="ignore")

    return out


def prepare_target(df: pd.DataFrame, target_col: str, binary_mode: bool, positive_min: int) -> pd.Series:
    y = pd.to_numeric(df[target_col], errors="coerce").fillna(0).astype(int)
    if binary_mode:
        y = (y >= int(positive_min)).astype(int)
    return y


def build_preprocessors(x_df: pd.DataFrame) -> Tuple[List[str], List[str], ColumnTransformer, ColumnTransformer]:
    num_cols = x_df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = [c for c in x_df.columns if c not in num_cols]

    base_pre = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median"))]), num_cols),
            (
                "cat",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                cat_cols,
            ),
        ]
    )

    scaled_pre = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                num_cols,
            ),
            (
                "cat",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                cat_cols,
            ),
        ]
    )

    return num_cols, cat_cols, base_pre, scaled_pre


def build_model_registry(seed: int, multi_class: bool) -> Dict[str, Any]:
    objective = "multi:softprob" if multi_class else "binary:logistic"
    num_class = 3 if multi_class else None

    if XGBClassifier is None:
        raise RuntimeError("xgboost is required. Install with: pip install xgboost")

    xgb_params = {
        "n_estimators": 600,
        "max_depth": 6,
        "learning_rate": 0.05,
        "subsample": 0.9,
        "colsample_bytree": 0.8,
        "reg_lambda": 1.0,
        "random_state": seed,
        "n_jobs": -1,
        "objective": objective,
        "eval_metric": "mlogloss" if multi_class else "logloss",
    }
    if num_class is not None:
        xgb_params["num_class"] = num_class

    return {
        "xgboost": XGBClassifier(**xgb_params),
        "logistic_regression": LogisticRegression(
            max_iter=1200,
            class_weight="balanced",
            solver="lbfgs",
            n_jobs=-1,
            random_state=seed,
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=500,
            max_depth=14,
            min_samples_leaf=4,
            class_weight="balanced_subsample",
            n_jobs=-1,
            random_state=seed,
        ),
    }


def tune_binary_threshold(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    target_recall: float,
    min_precision: float,
    min_threshold: float,
    target_acc_min: float,
    target_acc_max: float,
    enforce_accuracy_band: bool,
) -> float:
    precision, recall, thresholds = precision_recall_curve(y_true, y_prob)

    best_thr = 0.5
    best_precision = -1.0

    best_in_band = None

    for i, thr in enumerate(thresholds):
        if float(thr) < float(min_threshold):
            continue
        pred_bin = (y_prob >= thr).astype(int)
        acc = accuracy_score(y_true, pred_bin)
        rec = recall_score(y_true, pred_bin, zero_division=0)
        prec = precision_score(y_true, pred_bin, zero_division=0)

        if rec >= target_recall and prec >= min_precision and target_acc_min <= acc <= target_acc_max:
            if best_in_band is None or prec > best_in_band["precision"]:
                best_in_band = {"threshold": float(thr), "precision": float(prec)}

        if rec >= target_recall and prec >= min_precision and precision[i] > best_precision:
            best_precision = precision[i]
            best_thr = float(thr)

    if best_in_band is not None:
        return float(best_in_band["threshold"])

    if enforce_accuracy_band:
        # If strict band requested but no threshold matches, pick closest-to-band threshold among recall-valid points.
        closest = None
        for thr in np.linspace(min_threshold, 1.0, 401):
            pred_bin = (y_prob >= thr).astype(int)
            rec = recall_score(y_true, pred_bin, zero_division=0)
            if rec < target_recall:
                continue
            prec = precision_score(y_true, pred_bin, zero_division=0)
            if prec < min_precision:
                continue
            acc = accuracy_score(y_true, pred_bin)
            dist = 0.0
            if acc < target_acc_min:
                dist = target_acc_min - acc
            elif acc > target_acc_max:
                dist = acc - target_acc_max
            if closest is None or dist < closest["dist"]:
                closest = {"threshold": float(thr), "dist": float(dist)}
        if closest is not None:
            return float(closest["threshold"])

    if best_precision < 0:
        # fallback to best F1
        best_f1 = -1.0
        for i, thr in enumerate(thresholds):
            p = precision[i]
            r = recall[i]
            if p + r <= 0:
                continue
            f1 = (2 * p * r) / (p + r)
            if f1 > best_f1:
                best_f1 = f1
                best_thr = float(thr)

    return best_thr


def apply_threshold_binary(y_prob: np.ndarray, threshold: float) -> np.ndarray:
    return (y_prob >= threshold).astype(int)


def evaluate_fairness_binary(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    groups: pd.Series,
) -> Dict[str, Any]:
    rows = []
    for g in sorted(groups.astype(str).unique()):
        mask = groups.astype(str) == g
        if mask.sum() == 0:
            continue

        yt = y_true[mask]
        yp = y_pred[mask]

        rows.append(
            {
                "group": g,
                "size": int(mask.sum()),
                "positive_rate": float((yp == 1).mean()),
                "recall_positive": float(recall_score(yt, yp, zero_division=0)),
                "precision_positive": float(precision_score(yt, yp, zero_division=0)),
            }
        )

    if not rows:
        return {"group_metrics": [], "demographic_parity_diff": 0.0, "recall_diff": 0.0, "fairness_flag": "unknown"}

    parity_values = [r["positive_rate"] for r in rows]
    recall_values = [r["recall_positive"] for r in rows]

    parity_diff = float(max(parity_values) - min(parity_values))
    recall_diff = float(max(recall_values) - min(recall_values))
    fairness_flag = "ok" if parity_diff <= 0.15 and recall_diff <= 0.15 else "review"

    return {
        "group_metrics": rows,
        "demographic_parity_diff": parity_diff,
        "recall_diff": recall_diff,
        "fairness_flag": fairness_flag,
    }


def evaluate_model(
    model: Pipeline,
    x_test: pd.DataFrame,
    y_test: np.ndarray,
    threshold: Optional[float],
    binary_mode: bool,
) -> Dict[str, Any]:
    y_proba_full = model.predict_proba(x_test)
    classes = np.array(model.classes_)

    if binary_mode:
        pos_idx = int(np.where(classes == 1)[0][0]) if 1 in classes else 1
        y_prob = y_proba_full[:, pos_idx]
        use_thr = 0.5 if threshold is None else float(threshold)
        y_pred = apply_threshold_binary(y_prob, use_thr)
    else:
        y_prob = None
        use_thr = None
        y_pred = classes[np.argmax(y_proba_full, axis=1)]

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision_macro": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_test, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "classification_report": classification_report(y_test, y_pred, output_dict=True, zero_division=0),
        "classes": classes.astype(int).tolist(),
        "threshold": use_thr,
    }

    if binary_mode:
        metrics["roc_auc"] = float(roc_auc_score(y_test, y_prob))
        metrics["recall_positive"] = float(recall_score(y_test, y_pred, pos_label=1, zero_division=0))
        metrics["precision_positive"] = float(precision_score(y_test, y_pred, pos_label=1, zero_division=0))
    else:
        try:
            metrics["roc_auc_ovr_weighted"] = float(
                roc_auc_score(y_test, y_proba_full, multi_class="ovr", average="weighted")
            )
        except Exception:
            metrics["roc_auc_ovr_weighted"] = None

    return metrics


def compute_shap_summary(
    model_name: str,
    pipeline: Pipeline,
    x_sample: pd.DataFrame,
    max_features: int = 20,
) -> Dict[str, Any]:
    if shap is None:
        return {"available": False, "reason": "shap_not_installed"}

    try:
        pre = pipeline.named_steps["preprocessor"]
        est = pipeline.named_steps["model"]

        x_trans = pre.transform(x_sample)
        feature_names = pre.get_feature_names_out().tolist()

        if model_name in {"xgboost", "random_forest"}:
            explainer = shap.TreeExplainer(est)
            sv = explainer.shap_values(x_trans)
        else:
            explainer = shap.Explainer(est, x_trans)
            sv = explainer(x_trans).values

        if isinstance(sv, list):
            # Multi-class list per class; use positive/last class for summary.
            sv_used = sv[-1]
        else:
            sv_used = sv

        if hasattr(sv_used, "ndim") and sv_used.ndim == 3:
            sv_used = sv_used[:, :, -1]

        mean_abs = np.abs(sv_used).mean(axis=0)
        order = np.argsort(mean_abs)[::-1][:max_features]

        top = [
            {
                "feature": feature_names[i],
                "mean_abs_shap": float(mean_abs[i]),
            }
            for i in order
        ]
        return {"available": True, "top_features": top}
    except Exception as exc:  # pragma: no cover
        return {"available": False, "reason": f"shap_failed: {exc}"}


def model_selection_score(metrics: Dict[str, Any], fairness: Dict[str, Any], primary_metric: str) -> float:
    primary = float(metrics.get("recall_positive", metrics.get("recall_macro", 0.0)))
    if primary_metric == "f1":
        primary = float(metrics.get("f1_macro", 0.0))
    elif primary_metric == "accuracy":
        primary = float(metrics.get("accuracy", 0.0))

    fairness_penalty = 0.5 * float(fairness.get("demographic_parity_diff", 0.0))
    fairness_penalty += 0.5 * float(fairness.get("recall_diff", 0.0))

    return primary - fairness_penalty


def apply_accuracy_band_penalty(score: float, accuracy: float, acc_min: float, acc_max: float, enforce: bool) -> float:
    if not enforce:
        return score
    if acc_min <= accuracy <= acc_max:
        return score + 0.15
    dist = acc_min - accuracy if accuracy < acc_min else accuracy - acc_max
    return score - 2.0 * dist


def main() -> None:
    args = parse_args()

    csv_path = resolve_path(args.csv)
    out_root = resolve_path(args.output_dir)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    run_dir = out_root / f"run_{timestamp}_v{args.model_version.replace('.', '_')}"
    run_dir.mkdir(parents=True, exist_ok=True)

    raw_df = load_dataset(csv_path)
    cleaned_df, validation_report = validate_and_clean_data(raw_df, target_col=args.target_col)
    fe_df = feature_engineering(cleaned_df)
    extra_excludes = [c.strip() for c in args.exclude_cols.split(",") if c.strip()]
    fe_df = apply_feature_policy(fe_df, screening_mode=args.screening_mode, exclude_cols=extra_excludes)

    y = prepare_target(
        fe_df,
        target_col=args.target_col,
        binary_mode=args.binary_mode,
        positive_min=args.binary_positive_min,
    )

    drop_cols = [c.strip() for c in args.drop_cols.split(",") if c.strip()]
    x = fe_df.drop(columns=[c for c in drop_cols if c in fe_df.columns], errors="ignore")
    x = x.drop(columns=[args.target_col], errors="ignore")

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y.to_numpy(),
        test_size=args.test_size,
        random_state=args.seed,
        stratify=y.to_numpy(),
    )

    num_cols, cat_cols, base_pre, scaled_pre = build_preprocessors(x_train)
    binary_mode = bool(args.binary_mode)

    model_registry = build_model_registry(seed=args.seed, multi_class=not binary_mode)

    pipelines: Dict[str, Pipeline] = {
        "xgboost": Pipeline([("preprocessor", base_pre), ("model", model_registry["xgboost"])]),
        "random_forest": Pipeline([("preprocessor", base_pre), ("model", model_registry["random_forest"])]),
        "logistic_regression": Pipeline([("preprocessor", scaled_pre), ("model", model_registry["logistic_regression"])]),
    }

    # Use a calibration subset from train for safety-threshold tuning.
    x_fit, x_calib, y_fit, y_calib = train_test_split(
        x_train,
        y_train,
        test_size=0.15,
        random_state=args.seed,
        stratify=y_train,
    )

    benchmark: Dict[str, Any] = {}
    fairness_report: Dict[str, Any] = {}
    threshold_report: Dict[str, float] = {}
    trained_models: Dict[str, Pipeline] = {}

    for name, pipe in pipelines.items():
        pipe.fit(x_fit, y_fit)
        trained_models[name] = pipe

        threshold = None
        if binary_mode:
            calib_proba = pipe.predict_proba(x_calib)
            classes = np.array(pipe.classes_)
            pos_idx = int(np.where(classes == 1)[0][0]) if 1 in classes else 1
            threshold = tune_binary_threshold(
                y_true=y_calib,
                y_prob=calib_proba[:, pos_idx],
                target_recall=args.target_recall,
                min_precision=args.min_precision,
                min_threshold=args.min_threshold,
                target_acc_min=args.target_accuracy_min,
                target_acc_max=args.target_accuracy_max,
                enforce_accuracy_band=args.enforce_accuracy_band,
            )
            threshold_report[name] = float(threshold)

        metrics = evaluate_model(
            model=pipe,
            x_test=x_test,
            y_test=y_test,
            threshold=threshold,
            binary_mode=binary_mode,
        )
        benchmark[name] = metrics

        if binary_mode:
            y_pred_bin = apply_threshold_binary(
                pipe.predict_proba(x_test)[:, int(np.where(np.array(pipe.classes_) == 1)[0][0])],
                threshold if threshold is not None else 0.5,
            )
            gender_groups = x_test["Gender"] if "Gender" in x_test.columns else pd.Series(["unknown"] * len(x_test))
            age_groups = (
                pd.cut(x_test["Age"], bins=[-np.inf, 30, 45, 60, np.inf], labels=["young", "adult", "mid_age", "senior"]).astype(str)
                if "Age" in x_test.columns
                else pd.Series(["unknown"] * len(x_test))
            )

            fairness_report[name] = {
                "gender": evaluate_fairness_binary(y_test, y_pred_bin, gender_groups),
                "age": evaluate_fairness_binary(y_test, y_pred_bin, age_groups),
            }
        else:
            fairness_report[name] = {"gender": {"fairness_flag": "not_applicable_multiclass"}, "age": {"fairness_flag": "not_applicable_multiclass"}}

    selection_rows = []
    for name in trained_models.keys():
        fair_gender = fairness_report[name].get("gender", {})
        score = model_selection_score(benchmark[name], fair_gender, args.primary_metric)
        score = apply_accuracy_band_penalty(
            score=score,
            accuracy=float(benchmark[name].get("accuracy", 0.0)),
            acc_min=args.target_accuracy_min,
            acc_max=args.target_accuracy_max,
            enforce=args.enforce_accuracy_band,
        )
        selection_rows.append((name, score))

    selection_rows.sort(key=lambda x: x[1], reverse=True)
    selected_name = selection_rows[0][0]
    selected_model = trained_models[selected_name]

    shap_sample_n = min(args.shap_sample_size, len(x_train))
    x_shap = x_train.sample(n=shap_sample_n, random_state=args.seed) if shap_sample_n > 0 else x_train.head(1)
    shap_summary = compute_shap_summary(
        model_name=selected_name,
        pipeline=selected_model,
        x_sample=x_shap,
    )

    selected_threshold = threshold_report.get(selected_name, 0.5)

    artifact = {
        "pipeline": selected_model,
        "feature_columns": x.columns.tolist(),
        "classes": np.array(selected_model.classes_).astype(int).tolist(),
        "threshold": float(selected_threshold),
        "positive_class": 1,
        "target_col": args.target_col,
        "binary_mode": binary_mode,
        "selection": {
            "selected_model": selected_name,
            "scores": [{"model": m, "score": float(s)} for m, s in selection_rows],
            "primary_metric": args.primary_metric,
            "target_accuracy_band": [args.target_accuracy_min, args.target_accuracy_max],
            "enforce_accuracy_band": bool(args.enforce_accuracy_band),
        },
        "validation_report": validation_report,
        "feature_engineering": [
            "BMI_Category",
            "Glucose_Ratio_PP_F",
            "Symptom_Burden",
            "Age_Group",
        ],
        "feature_policy": {
            "screening_mode": bool(args.screening_mode),
            "exclude_cols": extra_excludes,
        },
        "version": {
            "model_version": args.model_version,
            "trained_at_utc": datetime.now(timezone.utc).isoformat(),
            "dataset": str(csv_path),
        },
    }

    latest_model_path = out_root / "diabetes_status_model.joblib"
    versioned_model_path = run_dir / "diabetes_status_model.joblib"
    joblib.dump(artifact, latest_model_path)
    joblib.dump(artifact, versioned_model_path)

    full_report = {
        "data_ingestion": {
            "dataset": str(csv_path),
            "rows": int(len(raw_df)),
            "columns": list(raw_df.columns),
        },
        "data_validation": validation_report,
        "preprocessing": {
            "numeric_features": num_cols,
            "categorical_features": cat_cols,
            "missing_handling": "median for numeric, mode for categorical",
        },
        "feature_engineering": {
            "derived_features": ["BMI_Category", "Glucose_Ratio_PP_F", "Symptom_Burden", "Age_Group"],
        },
        "split": {
            "train_rows": int(len(x_train)),
            "test_rows": int(len(x_test)),
            "test_size": args.test_size,
            "stratified": True,
        },
        "models": benchmark,
        "fairness": fairness_report,
        "safety_calibration": {
            "target_recall": args.target_recall,
            "min_precision": args.min_precision,
            "min_threshold": args.min_threshold,
            "thresholds": threshold_report,
            "selected_threshold": float(selected_threshold),
            "target_accuracy_band": [args.target_accuracy_min, args.target_accuracy_max],
        },
        "explainability": shap_summary,
        "selection": artifact["selection"],
        "packaging": {
            "latest_model": str(latest_model_path),
            "versioned_model": str(versioned_model_path),
            "run_dir": str(run_dir),
        },
    }

    (run_dir / "benchmark.json").write_text(json.dumps(full_report, indent=2), encoding="utf-8")
    (out_root / "diabetes_metrics.json").write_text(json.dumps(full_report, indent=2), encoding="utf-8")

    print("=== Responsible Diabetes Training Complete ===")
    print(f"Selected model: {selected_name}")
    print(f"Selected threshold: {selected_threshold:.3f}")
    print(f"Latest model artifact: {latest_model_path}")
    print(f"Run report: {run_dir / 'benchmark.json'}")


if __name__ == "__main__":
    main()
