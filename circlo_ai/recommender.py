"""Rekomendasi usaha: cari lewat RESEP -> cek material di wilayah user -> skoring."""
from __future__ import annotations

import math
from dataclasses import dataclass

from .catalog import region_candidates, find_alternative_materials

# Bobot skor (jumlah = 1.0). Ubah di sini untuk tuning.
W_LOKASI, W_STOK, W_MODAL, W_SEM = 0.35, 0.20, 0.20, 0.25
LEVEL_SCORE = {"kota": 1.0, "provinsi": 0.6, "semua": 0.3, "alternatif": 0.15}
MODAL_TOLERANSI = 1.2  # resep masih ditampilkan "mepet" bila modal awal <= 1,2 x modal user


@dataclass
class Rec:
    resep: dict
    kandidat: list
    level: str
    score: float
    modal_status: str  # 'cukup' | 'mepet' | 'kurang' | 'tidak_diketahui'


class Recommender:
    def __init__(self, embedder, resep_list: list[dict]):
        self.embedder = embedder
        self.resep_list = resep_list
        self.by_id = {r["id_resep"]: r for r in resep_list}
        texts = [
            f"{r['nama_produk']}. Bahan: {r['kategori_material']}. {r.get('langkah_singkat') or ''}"
            for r in resep_list
        ]
        self.vecs = embedder.passages(texts) if texts else None

    def similarities(self, text: str) -> dict:
        q = self.embedder.query(text)
        s = self.vecs @ q
        return {r["id_resep"]: float(v) for r, v in zip(self.resep_list, s)}

    @staticmethod
    def _modal_status(resep: dict, modal) -> tuple[str, float]:
        est = resep.get("estimasi_modal")
        if modal is None or est is None:
            return "tidak_diketahui", 0.5
        if est <= modal:
            return "cukup", 1.0
        if est <= modal * MODAL_TOLERANSI:
            return "mepet", 0.4
        return "kurang", 0.0

    def recommend(self, state, materials: list[dict], top_k: int = 3):
        """Return (daftar Rec, info). info['modal_kurang'] = True bila semua resep di atas modal."""
        norm = None
        if state.minat_text:
            sims = self.similarities(state.minat_text)
            lo, hi = min(sims.values()), max(sims.values())
            norm = {k: ((v - lo) / (hi - lo) if hi > lo else 0.5) for k, v in sims.items()}

        rows: list[Rec] = []
        for r in self.resep_list:
            # Coba pencocokan ketat dulu (kategori + satuan + keyword)
            cands, level = region_candidates(r, materials, state.kota, state.provinsi)
            
            # Fallback ke material alternatif jika pencocokan ketat gagal
            used_alternative = False
            if not cands:
                cands = find_alternative_materials(r, materials, state.kota, state.provinsi)
                if cands:
                    level = "alternatif"
                    used_alternative = True
            
            if not cands:
                continue  # tidak ada bahan di katalog -> jangan direkomendasikan
            
            status, modal_fit = self._modal_status(r, state.modal)
            stok_total = sum(m["stok"] for m in cands)
            unit_mungkin = stok_total * (1 - r["persen_susut"]) / r["bahan_per_unit"]
            stok_score = min(1.0, math.log10(max(unit_mungkin, 1)) / 3)  # 1000 unit -> 1.0
            sem = norm[r["id_resep"]] if norm else 0.5
            score = (W_LOKASI * LEVEL_SCORE[level] + W_STOK * stok_score
                     + W_MODAL * modal_fit + W_SEM * sem)
            rows.append(Rec(r, cands, level, score, status))

        affordable = [x for x in rows if x.modal_status != "kurang"]
        info = {"modal_kurang": False}
        if not affordable and rows:
            info["modal_kurang"] = True
            rows.sort(key=lambda x: x.resep.get("estimasi_modal") or 0)
            return rows[:2], info
        return self._pick_diverse(affordable, top_k), info

    @staticmethod
    def _pick_diverse(rows: list[Rec], k: int) -> list[Rec]:
        """Urut skor, utamakan kategori material berbeda agar rekomendasi tidak seragam."""
        rows = sorted(rows, key=lambda x: x.score, reverse=True)
        chosen, seen = [], set()
        for x in rows:
            if x.resep["kategori_material"] not in seen:
                chosen.append(x)
                seen.add(x.resep["kategori_material"])
            if len(chosen) == k:
                return chosen
        for x in rows:
            if x not in chosen:
                chosen.append(x)
            if len(chosen) == k:
                break
        return chosen
