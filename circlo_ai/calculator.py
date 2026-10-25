"""Kalkulator kebutuhan bahan. Dihitung di kode (bukan oleh LLM) supaya angkanya konsisten."""
from __future__ import annotations

import math


def _round_up(x: float, satuan: str) -> float:
    if satuan == "pcs":
        return float(math.ceil(x - 1e-9))
    return math.ceil(x * 10 - 1e-9) / 10  # bulatkan ke atas 1 desimal


def hitung_kebutuhan(qty: float, bahan_per_unit: float, persen_susut: float, satuan: str) -> float:
    """kebutuhan = qty x bahan_per_unit / (1 - susut)."""
    if not 0 <= persen_susut < 1:
        raise ValueError("persen_susut harus 0 <= x < 1")
    return _round_up(qty * bahan_per_unit / (1 - persen_susut), satuan)


def rencana_beli(kebutuhan: float, kandidat: list[dict]):
    """Beli dari yang termurah dulu sampai kebutuhan terpenuhi / stok habis.
    Return (items, total_biaya, kekurangan)."""
    sisa = kebutuhan
    items = []
    for m in sorted(kandidat, key=lambda x: x["harga"]):
        if sisa <= 1e-9:
            break
        ambil = min(sisa, m["stok"])
        if ambil > 0:
            items.append({"material": m, "jumlah": ambil, "biaya": ambil * m["harga"]})
            sisa -= ambil
    total = sum(i["biaya"] for i in items)
    return items, total, max(0.0, sisa)
