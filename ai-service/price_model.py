"""Estimasi harga material: Random Forest Regressor (Scikit-learn) + XGBoost.

Sesuai SRS 3.3.3: Pandas/NumPy untuk pengolahan data, Scikit-learn untuk
pipeline machine learning, Random Forest Regressor untuk prediksi harga, dan
XGBoost sebagai model pelengkap. Hasil akhir adalah rata-rata kedua model.
"""

from __future__ import annotations

import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor

BASE_DIR = Path(__file__).parent
MODEL_PATH = Path(os.getenv("PRICE_MODEL_PATH", BASE_DIR / "models" / "price_rf.joblib"))

KONDISI_SKOR = {"Perlu Perbaikan": 0, "Cukup": 1, "Baik": 2, "Sangat Baik": 3}
CATEGORICAL = ["jenis_material", "kategori"]
NUMERIC = ["kondisi_skor", "quantity"]
TARGET = "harga_per_unit"


def _features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["kondisi_skor"] = out["kondisi"].map(KONDISI_SKOR)
    out["quantity"] = pd.to_numeric(out["quantity"], errors="coerce")
    return out[CATEGORICAL + NUMERIC]


def train(csv_path: Path, out_path: Path = MODEL_PATH) -> dict:
    """Latih model dari CSV berkolom: jenis_material, kategori, kondisi, quantity, harga_per_unit."""
    df = pd.read_csv(csv_path).dropna(subset=["jenis_material", "kategori", "kondisi", "quantity", TARGET])
    df = df[df["kondisi"].isin(KONDISI_SKOR)]
    if len(df) < 30:
        raise ValueError("Data latih terlalu sedikit (minimal 30 baris).")

    X, y = _features(df), df[TARGET].astype(float)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    def make(model):
        prep = ColumnTransformer(
            [("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL)],
            remainder="passthrough",
        )
        return Pipeline([("prep", prep), ("model", model)])

    rf = make(RandomForestRegressor(n_estimators=200, min_samples_leaf=2, random_state=42, n_jobs=-1))
    xgb = make(XGBRegressor(n_estimators=300, max_depth=4, learning_rate=0.05, random_state=42))
    rf.fit(X_train, y_train)
    xgb.fit(X_train, y_train)

    p_rf, p_xgb = rf.predict(X_test), xgb.predict(X_test)
    metrics = {
        "mae_rf": float(mean_absolute_error(y_test, p_rf)),
        "mae_xgb": float(mean_absolute_error(y_test, p_xgb)),
        "mae_ensemble": float(mean_absolute_error(y_test, (p_rf + p_xgb) / 2)),
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"rf": rf, "xgb": xgb}, out_path)
    return {"rows": int(len(df)), "path": str(out_path), **metrics}


class PriceEstimator:
    def __init__(self, path: Path = MODEL_PATH):
        self.models = joblib.load(path) if Path(path).exists() else None

    @property
    def available(self) -> bool:
        return self.models is not None

    def predict(self, jenis: str, kategori: str, kondisi: str, quantity: float) -> dict | None:
        if not self.available or kondisi not in KONDISI_SKOR:
            return None
        row = pd.DataFrame(
            [{"jenis_material": jenis, "kategori": kategori, "kondisi": kondisi, "quantity": quantity}]
        )
        X = _features(row)
        rf, xgb = self.models["rf"], self.models["xgb"]
        prep, forest = rf.named_steps["prep"], rf.named_steps["model"]
        per_tree = np.array([tree.predict(prep.transform(X))[0] for tree in forest.estimators_])
        ensemble = (per_tree.mean() + float(xgb.predict(X)[0])) / 2
        return {
            "harga_per_unit": int(round(ensemble, -2)),
            "rentang_bawah": int(round(np.percentile(per_tree, 10), -2)),
            "rentang_atas": int(round(np.percentile(per_tree, 90), -2)),
        }
