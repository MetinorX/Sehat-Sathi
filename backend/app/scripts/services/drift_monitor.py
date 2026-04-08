from collections import deque
from typing import Dict, Any, List


class DriftMonitor:
    def __init__(self, window_size: int = 500):
        self.window_size = window_size
        self.records = deque(maxlen=window_size)

    def record(self, pipeline: str, score: float, metadata: Dict[str, Any] | None = None):
        self.records.append(
            {
                "pipeline": pipeline,
                "score": float(score),
                "metadata": metadata or {},
            }
        )

    def summary(self) -> Dict[str, Any]:
        if not self.records:
            return {
                "count": 0,
                "status": "insufficient_data",
                "score_mean": 0.0,
                "score_min": 0.0,
                "score_max": 0.0,
            }

        scores: List[float] = [r["score"] for r in self.records]
        mean = sum(scores) / len(scores)
        return {
            "count": len(scores),
            "status": "monitoring",
            "score_mean": mean,
            "score_min": min(scores),
            "score_max": max(scores),
        }


drift_monitor = DriftMonitor()
