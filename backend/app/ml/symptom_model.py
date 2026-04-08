from typing import List, Dict, Any, Optional
import os
import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline


class SymptomAnalyzer:
    def __init__(self):
        self.model_name = "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"
        self.tokenizer = None
        self.model = None
        self.ner_pipeline = None
        self._loaded = False

    def _ensure_loaded(self):
        if self._loaded:
            return
        cache_dir = os.getenv("MODEL_CACHE_DIR", "/tmp/models")
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_name, cache_dir=cache_dir
        )
        self.model = AutoModelForTokenClassification.from_pretrained(
            self.model_name, cache_dir=cache_dir
        )
        self.ner_pipeline = pipeline(
            "ner",
            model=self.model,
            tokenizer=self.tokenizer,
            device=-1,
        )
        self._loaded = True

    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        self._ensure_loaded()
        entities = self.ner_pipeline(text)
        return [
            {
                "entity": e["entity"],
                "word": e["word"],
                "score": e["score"],
                "start": e["start"],
                "end": e["end"],
            }
            for e in entities
        ]

    def classify_disease(
        self, symptoms: List[str], body_system: str
    ) -> List[Dict[str, Any]]:
        self._ensure_loaded()
        symptom_text = " ".join(symptoms)
        input_text = f"Body system: {body_system}. Symptoms: {symptom_text}"
        
        disease_mapping = self._get_disease_mapping()
        body_system_diseases = disease_mapping.get(body_system.lower(), {})
        
        predictions = []
        for disease, base_symptoms in body_system_diseases.items():
            match_score = sum(
                1 for s in symptoms if any(s.lower() in bs.lower() or bs.lower() in s.lower() for bs in base_symptoms)
            ) / max(len(symptoms), 1)
            
            if match_score > 0:
                predictions.append({
                    "condition": disease,
                    "probability": min(match_score * 0.9 + 0.1, 0.99),
                    "confidence_interval": [
                        max(0.0, match_score * 0.9 - 0.1),
                        min(1.0, match_score * 0.9 + 0.1),
                    ],
                    "confidence_level": self._get_confidence_level(match_score),
                    "matching_symptoms": [
                        s for s in symptoms
                        if any(s.lower() in bs.lower() or bs.lower() in s.lower() for bs in base_symptoms)
                    ],
                })
        
        predictions.sort(key=lambda x: x["probability"], reverse=True)
        return predictions[:5]

    def _get_disease_mapping(self) -> Dict[str, Dict[str, List[str]]]:
        return {
            "cardiovascular": {
                "Angina Pectoris": ["chest_pain", "shortness_of_breath", "fatigue"],
                "Myocardial Infarction": ["chest_pain", "shortness_of_breath", "sweating", "nausea"],
                "Heart Failure": ["fatigue", "shortness_of_breath", "swelling", "cough"],
                "Arrhythmia": ["palpitations", "dizziness", "fatigue", "shortness_of_breath"],
                "Hypertension": ["headache", "dizziness", "blurred_vision", "fatigue"],
            },
            "respiratory": {
                "Pneumonia": ["cough", "fever", "shortness_of_breath", "chest_pain"],
                "COPD": ["cough", "shortness_of_breath", "wheezing", "fatigue"],
                "Asthma": ["wheezing", "shortness_of_breath", "cough", "chest_tightness"],
                "Bronchitis": ["cough", "fatigue", "shortness_of_breath", "sputum"],
                "Tuberculosis": ["cough", "fever", "night_sweats", "weight_loss"],
            },
            "neurological": {
                "Migraine": ["headache", "nausea", "sensitivity_to_light", "visual_disturbance"],
                "Stroke": ["headache", "numbness", "confusion", "difficulty_speaking"],
                "Epilepsy": ["seizures", "confusion", "muscle_jerking", "loss_of_consciousness"],
                "Meningitis": ["headache", "fever", "stiff_neck", "sensitivity_to_light"],
                "Parkinson's Disease": ["tremor", "stiffness", "slow_movement", "balance_issues"],
            },
            "gastrointestinal": {
                "Gastritis": ["stomach_pain", "nausea", "vomiting", "bloating"],
                "GERD": ["heartburn", "difficulty_swallowing", "chronic_cough", "chest_pain"],
                "Ulcer": ["stomach_pain", "nausea", "bloating", "loss_of_appetite"],
                "Appendicitis": ["abdominal_pain", "fever", "nausea", "loss_of_appetite"],
                "IBD": ["abdominal_pain", "diarrhea", "bloody_stool", "weight_loss"],
            },
            "endocrine": {
                "Diabetes Type 2": ["increased_thirst", "frequent_urination", "fatigue", "blurred_vision"],
                "Hypothyroidism": ["fatigue", "weight_gain", "cold_intolerance", "constipation"],
                "Hyperthyroidism": ["weight_loss", "rapid_heartbeat", "heat_intolerance", "anxiety"],
                "Cushing's Syndrome": ["weight_gain", "moon_face", "high_blood_pressure", "muscle_weakness"],
            },
            "musculoskeletal": {
                "Arthritis": ["joint_pain", "stiffness", "swelling", "reduced_mobility"],
                "Osteoporosis": ["bone_pain", "fractures", "stooped_posture", "back_pain"],
                "Fibromyalgia": ["widespread_pain", "fatigue", "sleep_issues", "cognitive_issues"],
                "Gout": ["joint_pain", "swelling", "redness", "warmth"],
            },
            "general": {
                "Viral Infection": ["fever", "fatigue", "headache", "muscle_aches"],
                "Bacterial Infection": ["fever", "fatigue", "localized_pain", "swelling"],
                "Allergic Reaction": ["rash", "itching", "swelling", "difficulty_breathing"],
                "Anemia": ["fatigue", "pallor", "shortness_of_breath", "dizziness"],
                "Dehydration": ["dry_mouth", "dizziness", "fatigue", "headache"],
            },
        }

    def _get_confidence_level(self, score: float) -> str:
        if score >= 0.8:
            return "high"
        elif score >= 0.5:
            return "medium"
        else:
            return "low"


symptom_analyzer = SymptomAnalyzer()
