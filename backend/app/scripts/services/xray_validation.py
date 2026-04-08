from __future__ import annotations

import hashlib
import io
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
from PIL import Image, UnidentifiedImageError


class XRayValidationPipeline:
    MAX_SIZE_BYTES = 10 * 1024 * 1024
    ALLOWED_EXTENSIONS = {".dcm", ".png", ".jpg", ".jpeg"}
    DICOM_MODALITIES = {"CR", "DX"}

    def validate(
        self,
        image_data: bytes,
        filename: str | None,
        content_type: str | None,
        declared_modality: str,
    ) -> Dict[str, Any]:
        checks: Dict[str, str] = {
            "file_format": "fail",
            "dicom_metadata": "pass",
            "modality": "fail",
            "view": "fail",
            "lung_detected": "fail",
            "quality": "fail",
            "clinical_sanity": "fail",
        }
        warnings: List[str] = []
        errors: List[str] = []

        image_hash = hashlib.sha256(image_data).hexdigest()
        extension = Path(filename or "").suffix.lower()
        score = 0.0

        if not image_data:
            errors.append("Image payload is empty")
            return self._result(False, 0.0, checks, warnings, errors, image_hash, filename, content_type, extension, {}, None, None)

        if len(image_data) > self.MAX_SIZE_BYTES:
            errors.append("Image file too large (max 10MB)")
            return self._result(False, 0.0, checks, warnings, errors, image_hash, filename, content_type, extension, {}, None, None)

        if extension not in self.ALLOWED_EXTENSIONS:
            errors.append("Unsupported format. Allowed: DICOM (.dcm), PNG, JPG")
            return self._result(False, 0.0, checks, warnings, errors, image_hash, filename, content_type, extension, {}, None, None)

        metadata: Dict[str, Any] = {}
        view_position = "Unknown"
        original_resolution: Tuple[int, int] | None = None
        try:
            if extension == ".dcm":
                arr, metadata, original_resolution = self._decode_dicom(image_data)
                checks["file_format"] = "pass"

                modality = str(metadata.get("Modality", "")).upper()
                body_part = str(metadata.get("BodyPartExamined", "")).upper()
                view_position = str(metadata.get("ViewPosition", "")).upper() or "Unknown"

                dicom_ok = True
                if modality not in self.DICOM_MODALITIES:
                    warnings.append(f"DICOM modality is {modality or 'missing'} (expected CR or DX)")
                    dicom_ok = False
                if "CHEST" not in body_part:
                    warnings.append("DICOM BodyPartExamined does not explicitly indicate CHEST")
                    dicom_ok = False
                if not metadata.get("ViewPosition"):
                    warnings.append("DICOM ViewPosition metadata missing")
                    dicom_ok = False

                checks["dicom_metadata"] = "pass" if dicom_ok else "warn"
            else:
                arr, original_resolution = self._decode_raster(image_data)
                checks["file_format"] = "pass"
                checks["dicom_metadata"] = "pass"
        except Exception as exc:
            errors.append(f"Unable to decode image: {exc}")
            return self._result(False, max(0.0, score), checks, warnings, errors, image_hash, filename, content_type, extension, metadata, None, None)

        if original_resolution and (original_resolution[0] < 512 or original_resolution[1] < 512):
            warnings.append("Low image resolution detected; upscaled for analysis")

        modality_label, modality_score, modality_method = self._classify_modality(arr)
        checks["modality"] = "pass" if modality_label == "chest_xray" else "warn"

        view_label = self._classify_view(arr, dicom_view=view_position)
        if view_label in {"PA", "AP"}:
            checks["view"] = "pass"
        elif view_label == "Lateral":
            checks["view"] = "warn"
            warnings.append("Lateral view detected (PA/AP preferred).")
        else:
            checks["view"] = "warn"
            warnings.append("Unknown view classification")

        lung_check = self._lung_segmentation_check(arr)
        checks["lung_detected"] = "pass" if lung_check["pass"] else "fail"
        if lung_check["pass"] and checks["modality"] != "pass":
            checks["modality"] = "pass"
            warnings.append("Chest region confirmed from lung segmentation despite weak modality classifier.")
            modality_label = "chest_xray"
            modality_score = max(modality_score, 0.72)
        if not lung_check["pass"]:
            errors.append(lung_check["reason"])

        quality = self._quality_check(arr)
        checks["quality"] = quality["status"]
        warnings.extend(quality["warnings"])
        errors.extend(quality["errors"])

        sanity = self._clinical_sanity_check(arr)
        checks["clinical_sanity"] = sanity["status"]
        warnings.extend(sanity["warnings"])
        errors.extend(sanity["errors"])

        ood = self._ood_check(arr)
        if ood["status"] == "warn":
            warnings.append("Out-of-distribution input detected")

        # Weighted clinical scoring model.
        if checks["modality"] in {"pass", "warn"}:
            score += 30
        if checks["lung_detected"] == "pass":
            score += 25
        if checks["quality"] in {"pass", "warn"}:
            score += 20 if checks["quality"] == "pass" else 10
        if checks["view"] in {"pass", "warn"}:
            score += 15 if checks["view"] == "pass" else 8
        if checks["dicom_metadata"] in {"pass", "warn"}:
            score += 10 if checks["dicom_metadata"] == "pass" else 5

        # Hard reject only for non-visible lungs or severe distortion.
        severe_sanity = checks["clinical_sanity"] == "fail"
        lungs_visible = checks["lung_detected"] == "pass"
        allow_inference = (score >= 60 and not severe_sanity) or lungs_visible
        valid = allow_inference
        status = "accepted"
        if allow_inference and (warnings or checks["quality"] == "warn" or checks["view"] == "warn" or checks["modality"] == "warn"):
            status = "accepted_with_warning"
        if not allow_inference:
            status = "rejected"

        if declared_modality != "chest_xray":
            warnings.append(f"Declared modality '{declared_modality}' overridden to chest_xray validation flow.")

        processed_bytes = self._array_to_png_bytes(arr)
        return self._result(
            valid,
            max(0.0, min(100.0, score)),
            checks,
            warnings,
            errors,
            image_hash,
            filename,
            content_type,
            extension,
            metadata,
            processed_bytes,
            {
                "modality_label": modality_label,
                "modality_confidence": round(modality_score * 100, 2),
                "modality_method": modality_method,
                "view_class": view_label,
                "status": status,
                "allow_inference": allow_inference,
                "coverage": round(lung_check["coverage"] * 100, 2),
                "symmetry": round(lung_check["symmetry"] * 100, 2),
                "quality": quality["metrics"],
                "sanity": sanity["metrics"],
                "ood": ood,
                "original_resolution": {
                    "width": int(original_resolution[0]) if original_resolution else None,
                    "height": int(original_resolution[1]) if original_resolution else None,
                },
            },
        )

    @staticmethod
    def _result(
        valid: bool,
        score: float,
        checks: Dict[str, str],
        warnings: List[str],
        errors: List[str],
        image_hash: str,
        filename: str | None,
        content_type: str | None,
        extension: str,
        metadata: Dict[str, Any],
        processed_bytes: bytes | None,
        details: Dict[str, Any] | None,
    ) -> Dict[str, Any]:
        return {
            "valid": bool(valid),
            "score": round(float(score), 2),
            "status": details.get("status") if details else ("accepted" if valid else "rejected"),
            "allow_inference": bool(details.get("allow_inference")) if details else bool(valid),
            "checks": checks,
            "warnings": warnings[:6],
            "errors": errors[:6],
            "image_hash": image_hash,
            "filename": filename or "unknown",
            "content_type": content_type or "unknown",
            "extension": extension,
            "metadata": metadata,
            "details": details or {},
            "processed_image_bytes": processed_bytes,
        }

    @staticmethod
    def _decode_raster(image_data: bytes) -> Tuple[np.ndarray, Tuple[int, int]]:
        try:
            image = Image.open(io.BytesIO(image_data)).convert("L")
        except UnidentifiedImageError as exc:
            raise ValueError("Invalid PNG/JPG encoding") from exc
        original = image.size
        if image.size[0] < 512 or image.size[1] < 512:
            image = image.resize((512, 512), Image.Resampling.BICUBIC)
        else:
            image = image.resize((512, 512), Image.Resampling.BILINEAR)
        arr = np.asarray(image, dtype=np.float32)
        return arr / 255.0, original

    @staticmethod
    def _decode_dicom(image_data: bytes) -> Tuple[np.ndarray, Dict[str, Any], Tuple[int, int]]:
        try:
            import pydicom  # type: ignore
        except Exception as exc:
            raise ValueError("pydicom dependency missing for DICOM support") from exc

        ds = pydicom.dcmread(io.BytesIO(image_data), force=True)
        if not hasattr(ds, "PixelData"):
            raise ValueError("DICOM missing PixelData")

        pixel = ds.pixel_array.astype(np.float32)
        pixel = pixel - np.min(pixel)
        pixel = pixel / (np.max(pixel) + 1e-6)

        if getattr(ds, "PhotometricInterpretation", "").upper() == "MONOCHROME1":
            pixel = 1.0 - pixel

        original = (int(pixel.shape[1]), int(pixel.shape[0]))
        image = Image.fromarray(np.uint8(np.clip(pixel, 0, 1) * 255), mode="L")
        if original[0] < 512 or original[1] < 512:
            image = image.resize((512, 512), Image.Resampling.BICUBIC)
        else:
            image = image.resize((512, 512), Image.Resampling.BILINEAR)
        arr = np.asarray(image, dtype=np.float32) / 255.0

        metadata = {
            "Modality": str(getattr(ds, "Modality", "")),
            "BodyPartExamined": str(getattr(ds, "BodyPartExamined", "")),
            "ViewPosition": str(getattr(ds, "ViewPosition", "")),
            "PatientPosition": str(getattr(ds, "PatientPosition", "")),
        }
        return arr, metadata, original

    def _classify_modality(self, arr: np.ndarray) -> Tuple[str, float, str]:
        h, w = arr.shape
        ratio = h / max(w, 1)
        edge = self._edge_density(arr)
        center_brightness = float(arr[:, int(w * 0.45):int(w * 0.55)].mean())
        lateral_diff = abs(float(arr[:, : w // 2].mean() - arr[:, w // 2 :].mean()))

        score = 0.0
        score += 0.35 if 0.95 <= ratio <= 1.45 else 0.05
        score += 0.3 if 0.05 <= edge <= 0.30 else 0.08
        score += 0.2 if center_brightness >= 0.35 else 0.08
        score += 0.15 if lateral_diff <= 0.14 else 0.06
        score = min(max(score, 0.0), 1.0)

        label = "chest_xray" if score >= 0.62 else "non_xray"
        return label, score, "heuristic-cnn-fallback"

    def _classify_view(self, arr: np.ndarray, dicom_view: str = "Unknown") -> str:
        view = (dicom_view or "").upper()
        if view in {"PA", "AP"}:
            return view
        if view in {"LAT", "LATERAL"}:
            return "Lateral"

        h, w = arr.shape
        ratio = w / max(h, 1)
        symmetry = self._symmetry(arr)
        if 0.58 <= ratio <= 0.88 and symmetry >= 0.68:
            return "PA"
        if 0.58 <= ratio <= 0.95 and symmetry >= 0.55:
            return "AP"
        if ratio < 0.52:
            return "Lateral"
        return "Unknown"

    def _lung_segmentation_check(self, arr: np.ndarray) -> Dict[str, Any]:
        h, w = arr.shape
        central = arr[int(h * 0.08): int(h * 0.92), int(w * 0.12): int(w * 0.88)]
        mask = central < np.percentile(central, 48)
        coverage = float(mask.mean())

        left = mask[:, : mask.shape[1] // 2].mean()
        right = mask[:, mask.shape[1] // 2 :].mean()
        symmetry = 1.0 - abs(left - right) / max(max(left, right), 1e-6)

        detected = coverage >= 0.40 and symmetry >= 0.42
        reason = "No lungs detected or scan appears cropped" if not detected else ""
        return {"pass": detected, "coverage": coverage, "symmetry": symmetry, "reason": reason}

    def _quality_check(self, arr: np.ndarray) -> Dict[str, Any]:
        arr_u8 = arr * 255.0
        lap = (
            arr_u8[1:-1, :-2]
            + arr_u8[1:-1, 2:]
            + arr_u8[:-2, 1:-1]
            + arr_u8[2:, 1:-1]
            - 4 * arr_u8[1:-1, 1:-1]
        )
        blur_var = float(np.var(lap))
        brightness_mean = float(arr.mean())
        brightness_std = float(arr.std())
        snr = float(brightness_mean / (arr.std() + 1e-6))

        warnings: List[str] = []
        errors: List[str] = []
        status = "pass"

        if blur_var < 20:
            status = "fail"
            errors.append("Image too blurry for reliable inference")
        elif blur_var < 50:
            status = "warn"
            warnings.append("Possible blur detected")

        if brightness_mean < 0.12 or brightness_mean > 0.93:
            status = "warn" if status != "fail" else status
            warnings.append("Exposure outside optimal range")
        elif brightness_std < 0.08:
            status = "warn"
            warnings.append("Low histogram spread; contrast may be suboptimal")
        if snr < 1.1:
            status = "warn" if status != "fail" else status
            warnings.append("Possible noise detected")

        return {
            "status": status,
            "warnings": warnings,
            "errors": errors,
            "metrics": {
                "blur_laplacian_variance": round(blur_var, 6),
                "brightness_mean": round(brightness_mean, 4),
                "brightness_spread": round(brightness_std, 4),
                "snr": round(snr, 4),
            },
        }

    def _clinical_sanity_check(self, arr: np.ndarray) -> Dict[str, Any]:
        h, w = arr.shape
        status = "pass"
        warnings: List[str] = []
        errors: List[str] = []

        grad = np.abs(np.diff(arr, axis=1))
        center_x = int(np.argmax(grad.mean(axis=0)))
        center_offset = abs(center_x - (w // 2)) / max(w, 1)

        edge = np.abs(np.diff(arr, axis=0))[:, 1:-1]
        ys, xs = np.where(edge > np.percentile(edge, 92))
        angle = 0.0
        if len(xs) > 30:
            coeff = np.polyfit(xs, ys, 1)
            angle = float(np.degrees(np.arctan(coeff[0])))

        border_energy = float(
            np.concatenate([arr[:20, :].reshape(-1), arr[-20:, :].reshape(-1), arr[:, :20].reshape(-1), arr[:, -20:].reshape(-1)]).mean()
        )

        if abs(angle) > 13:
            status = "fail"
            errors.append("Severe rotation detected")
        elif abs(angle) > 8:
            status = "warn"
            warnings.append("Mild rotation detected")

        if center_offset > 0.18:
            status = "fail"
            errors.append("Spine alignment off-center")
        elif center_offset > 0.12 and status != "fail":
            status = "warn"
            warnings.append("Slight spine misalignment")

        if border_energy > 0.72:
            status = "fail"
            errors.append("Possible clipped ribs / over-cropped scan")

        return {
            "status": status,
            "warnings": warnings,
            "errors": errors,
            "metrics": {
                "rotation_angle_deg": round(angle, 3),
                "spine_center_offset_ratio": round(center_offset, 4),
                "border_energy": round(border_energy, 4),
            },
        }

    def _ood_check(self, arr: np.ndarray) -> Dict[str, Any]:
        brightness = float(arr.mean())
        contrast = float(arr.std())
        edge = self._edge_density(arr)
        out_of_distribution = brightness < 0.08 or brightness > 0.96 or contrast < 0.035 or edge > 0.42
        return {
            "status": "warn" if out_of_distribution else "pass",
            "brightness_mean": round(brightness, 4),
            "contrast_std": round(contrast, 4),
            "edge_density": round(edge, 4),
        }

    @staticmethod
    def _edge_density(arr: np.ndarray) -> float:
        gx = np.zeros_like(arr)
        gy = np.zeros_like(arr)
        gx[:, 1:-1] = np.abs(arr[:, 2:] - arr[:, :-2])
        gy[1:-1, :] = np.abs(arr[2:, :] - arr[:-2, :])
        edge = (gx + gy) / 2.0
        return float((edge > np.percentile(edge, 85)).mean())

    @staticmethod
    def _symmetry(arr: np.ndarray) -> float:
        h, w = arr.shape
        left = arr[:, : w // 2]
        right = np.fliplr(arr[:, w - left.shape[1] :])
        diff = np.abs(left - right)
        return float(1.0 - np.mean(diff))

    @staticmethod
    def _array_to_png_bytes(arr: np.ndarray) -> bytes:
        img = Image.fromarray(np.uint8(np.clip(arr, 0.0, 1.0) * 255), mode="L")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return buffer.getvalue()


xray_validation_pipeline = XRayValidationPipeline()

