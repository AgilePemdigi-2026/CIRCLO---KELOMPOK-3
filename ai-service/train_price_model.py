"""Latih model estimasi harga.

    python train_price_model.py                    # pakai data/materials.csv
    python train_price_model.py --data path.csv

Jika data/materials.csv belum ada, dibuat data CONTOH sintetis hanya agar
pipeline bisa dicoba. Harganya bukan data pasar. Ganti dengan data asli
(mis. ekspor tabel materials dari Supabase) sebelum dipakai sungguhan.
"""

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from price_model import KONDISI_SKOR, train

DATA_DIR = Path(__file__).parent / "data"

# Harga dasar per unit (rupiah). Angka karangan untuk data contoh.
BASE_PRICE = {
    "Kayu": 5000, "Logam": 8000, "Plastik": 3000, "Tekstil": 3500, "Kertas & Kardus": 1500,
    "Kaca": 2000, "Karet": 2500, "Elektronik": 12000, "Organik": 800, "Lainnya": 2000,
}
KATEGORI = ["Struktural", "Dekoratif", "Bahan Baku", "Kemasan", "Komponen", "Lainnya"]


def make_sample_data(n: int = 400, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    jenis = rng.choice(list(BASE_PRICE), n)
    kondisi = rng.choice(list(KONDISI_SKOR), n, p=[0.1, 0.25, 0.4, 0.25])
    qty = rng.integers(1, 500, n)
    factor = np.array([0.5 + 0.25 * KONDISI_SKOR[k] for k in kondisi])
    bulk = np.where(qty > 200, 0.9, 1.0)
    harga = np.array([BASE_PRICE[j] for j in jenis]) * factor * bulk * rng.normal(1, 0.1, n)
    return pd.DataFrame(
        {
            "jenis_material": jenis,
            "kategori": rng.choice(KATEGORI, n),
            "kondisi": kondisi,
            "quantity": qty,
            "harga_per_unit": (np.round(harga, -2)).clip(min=100).astype(int),
        }
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default=str(DATA_DIR / "materials.csv"))
    args = parser.parse_args()

    path = Path(args.data)
    if not path.exists():
        print(f"[PERINGATAN] {path} tidak ditemukan. Membuat data contoh sintetis (bukan data pasar).")
        path.parent.mkdir(parents=True, exist_ok=True)
        make_sample_data().to_csv(path, index=False)

    info = train(path)
    print(f"Model tersimpan di {info['path']} | baris: {info['rows']}")
    print(f"MAE Random Forest: Rp{info['mae_rf']:,.0f} | XGBoost: Rp{info['mae_xgb']:,.0f} | Gabungan: Rp{info['mae_ensemble']:,.0f}")
