from typing import List, Dict, Any, Optional
from collections import defaultdict
import numpy as np


class FairnessGuardian:
    def __init__(self, bias_threshold: float = 0.15):
        self.bias_threshold = bias_threshold
        self.prediction_history: List[Dict[str, Any]] = []
        self.group_metrics: Dict[str, Dict[str, float]] = defaultdict(dict)

    def check_demographic_parity(
        self, predictions: List[Dict[str, Any]], demographics: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        if not predictions or not demographics:
            return {
                "metric": "demographic_parity",
                "value": 1.0,
                "status": "insufficient_data",
                "details": {},
            }

        group_positive_rates = defaultdict(list)

        for pred, demo in zip(predictions, demographics):
            group_key = self._get_group_key(demo)
            positive_rate = pred.get("probability", 0)
            group_positive_rates[group_key].append(positive_rate)

        avg_rates = {
            group: np.mean(rates) for group, rates in group_positive_rates.items()
        }

        if len(avg_rates) < 2:
            return {
                "metric": "demographic_parity",
                "value": 1.0,
                "status": "acceptable",
                "details": {"message": "Only one demographic group represented"},
            }

        rates = list(avg_rates.values())
        max_diff = max(rates) - min(rates)

        self.group_metrics["demographic_parity"] = {
            "value": 1.0 - max_diff,
            "by_group": avg_rates,
            "max_difference": max_diff,
        }

        return {
            "metric": "demographic_parity",
            "value": 1.0 - max_diff,
            "status": "acceptable" if max_diff <= self.bias_threshold else "biased",
            "details": {
                "by_group": avg_rates,
                "max_difference": max_diff,
                "threshold": self.bias_threshold,
            },
        }

    def check_equalized_odds(
        self,
        predictions: List[Dict[str, Any]],
        demographics: List[Dict[str, str]],
        outcomes: List[bool],
    ) -> Dict[str, Any]:
        if not predictions or not demographics or not outcomes:
            return {
                "metric": "equalized_odds",
                "value": 1.0,
                "status": "insufficient_data",
                "details": {},
            }

        group_tpr = defaultdict(list)
        group_fpr = defaultdict(list)

        for pred, demo, outcome in zip(predictions, demographics, outcomes):
            group_key = self._get_group_key(demo)
            prob = pred.get("probability", 0)
            threshold = 0.6
            predicted_positive = prob >= threshold

            if outcome:
                group_tpr[group_key].append(1.0 if predicted_positive else 0.0)
            else:
                group_fpr[group_key].append(1.0 if predicted_positive else 0.0)

        tpr_by_group = {g: np.mean(rates) for g, rates in group_tpr.items()}
        fpr_by_group = {g: np.mean(rates) for g, rates in group_fpr.items()}

        all_tpr = list(tpr_by_group.values())
        all_fpr = list(fpr_by_group.values())

        tpr_diff = max(all_tpr) - min(all_tpr) if all_tpr else 0
        fpr_diff = max(all_fpr) - min(all_fpr) if all_fpr else 0

        combined_diff = (tpr_diff + fpr_diff) / 2

        self.group_metrics["equalized_odds"] = {
            "value": 1.0 - combined_diff,
            "tpr_by_group": tpr_by_group,
            "fpr_by_group": fpr_by_group,
        }

        return {
            "metric": "equalized_odds",
            "value": 1.0 - combined_diff,
            "status": "acceptable" if combined_diff <= self.bias_threshold else "biased",
            "details": {
                "tpr_by_group": tpr_by_group,
                "fpr_by_group": fpr_by_group,
                "tpr_difference": tpr_diff,
                "fpr_difference": fpr_diff,
                "threshold": self.bias_threshold,
            },
        }

    def detect_bias(
        self,
        predictions: Optional[List[Dict[str, Any]]] = None,
        demographics: Optional[List[Dict[str, str]]] = None,
        threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        threshold = threshold or self.bias_threshold

        alerts = []
        metrics = {}

        if predictions and demographics:
            demographic_parity = self.check_demographic_parity(
                predictions, demographics
            )
            metrics["demographic_parity"] = demographic_parity

            if demographic_parity.get("max_difference", 0) > threshold:
                alerts.append(
                    {
                        "type": "demographic_parity",
                        "severity": "high"
                        if demographic_parity["max_difference"] > threshold * 1.5
                        else "medium",
                        "message": f"Demographic disparity of {demographic_parity['max_difference']:.2f} exceeds threshold",
                        "threshold": threshold,
                    }
                )

        calibration = self._check_calibration()
        metrics["calibration"] = calibration

        if calibration.get("error", 1.0) > threshold:
            alerts.append(
                {
                    "type": "calibration",
                    "severity": "medium",
                    "message": f"Calibration error of {calibration['error']:.2f} detected",
                    "threshold": threshold,
                }
            )

        overall_status = "acceptable" if len(alerts) == 0 else "biased"
        disparity_score = max(
            [
                metrics.get("demographic_parity", {}).get("max_difference", 0),
                metrics.get("calibration", {}).get("error", 0),
            ]
        )

        return {
            "overall_status": overall_status,
            "disparity_score": disparity_score,
            "threshold": threshold,
            "alerts": alerts,
            "metrics": metrics,
        }

    def _check_calibration(self) -> Dict[str, Any]:
        if len(self.prediction_history) < 10:
            return {"error": 0.0, "status": "insufficient_data"}

        bins = defaultdict(list)

        for record in self.prediction_history[-100:]:
            prob = record.get("predicted_probability", 0.5)
            actual = record.get("actual_outcome", False)
            bin_key = int(prob * 10) / 10
            bins[bin_key].append((prob, actual))

        calibration_errors = []

        for bin_prob, values in bins.items():
            if len(values) >= 3:
                avg_predicted = np.mean([v[0] for v in values])
                observed_rate = np.mean([1.0 if v[1] else 0.0 for v in values])
                error = abs(avg_predicted - observed_rate)
                calibration_errors.append(error)

        mean_error = np.mean(calibration_errors) if calibration_errors else 0.0

        return {
            "error": mean_error,
            "status": "acceptable" if mean_error <= self.bias_threshold else "miscalibrated",
            "by_bin": {
                f"{k:.1f}": np.mean([1.0 if v[1] else 0.0 for v in vals])
                for k, vals in bins.items()
                if len(vals) >= 3
            },
        }

    def _get_group_key(self, demographics: Dict[str, str]) -> str:
        age = demographics.get("age_group", "unknown")
        sex = demographics.get("sex", "unknown")
        ethnicity = demographics.get("ethnicity", "unknown")
        return f"{age}_{sex}_{ethnicity}"

    def record_prediction(
        self,
        prediction: Dict[str, Any],
        demographics: Dict[str, str],
        actual_outcome: Optional[bool] = None,
    ):
        record = {
            "predicted_probability": prediction.get("probability", 0.5),
            "demographics": demographics,
            "actual_outcome": actual_outcome,
        }
        self.prediction_history.append(record)

        if len(self.prediction_history) > 1000:
            self.prediction_history = self.prediction_history[-1000:]

    def get_dashboard_data(self) -> Dict[str, Any]:
        bias_report = self.detect_bias()

        distribution = defaultdict(lambda: defaultdict(int))
        for record in self.prediction_history:
            group = self._get_group_key(record.get("demographics", {}))
            pred_prob = record.get("predicted_probability", 0.5)
            prob_bin = (
                "high" if pred_prob >= 0.7 else "medium" if pred_prob >= 0.4 else "low"
            )
            distribution[group][prob_bin] += 1

        return {
            "overall_metrics": {
                "demographic_parity": self.group_metrics.get(
                    "demographic_parity", {}
                ).get("value", 1.0),
                "equalized_odds": self.group_metrics.get("equalized_odds", {}).get(
                    "value", 1.0
                ),
                "calibration": 1.0
                - self.group_metrics.get("calibration", {}).get("error", 0.0),
            },
            "disparity_alerts": bias_report.get("alerts", []),
            "prediction_distribution": dict(distribution),
        }


fairness_guardian = FairnessGuardian()
