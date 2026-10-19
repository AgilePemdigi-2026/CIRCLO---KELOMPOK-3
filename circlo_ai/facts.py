"""Ubah hasil keputusan dialog manager menjadi FAKTA terstruktur (JSON).
FAKTA inilah yang dibaca LLM saat menulis jawaban, baik saat training (Step 4-5)
maupun saat aplikasi berjalan (Step 6) -> tidak ada selisih antara data latih dan pemakaian nyata."""
from __future__ import annotations

from .calculator import hitung_kebutuhan, rencana_beli
from .catalog import region_candidates, regional_summary


def _bahan(m: dict) -> dict:
    return {"nama": m["nama_material"], "harga": m["harga"], "satuan": m["satuan"],
            "stok": m["stok"], "kota": m["kota"]}


def resep_ringkas(resep: dict | None, cands: list | None = None) -> dict | None:
    if not resep:
        return None
    d = {"produk": resep["nama_produk"], "langkah": resep.get("langkah_singkat"),
         "k3": resep.get("catatan_k3"), "modal_awal": resep.get("estimasi_modal")}
    if cands:
        d["bahan"] = [_bahan(m) for m in cands[:2]]
    return d


def tanya_slot(state, need_kota: bool, need_modal: bool, first: bool) -> dict:
    return {"kurang": [s for s, n in (("kota", need_kota), ("modal", need_modal)) if n],
            "kota": state.kota, "modal": state.modal, "pertama_kali": first}


def rekomendasi(state, recs, info, materials) -> dict:
    label, level, top = regional_summary(materials, state.kota, state.provinsi)
    return {
        "wilayah": {"kota_user": state.kota, "dipakai": label, "level": level,
                    "kategori_terbanyak": [{"kategori": k, "listing": n} for k, n in top]},
        "modal_user": state.modal, "modal_asumsi": state.modal_asumsi,
        "modal_kurang": bool(info.get("modal_kurang")), "minat": state.minat_text or None,
        "rekomendasi": [
            {"no": i, "produk": r.resep["nama_produk"], "modal_awal": r.resep.get("estimasi_modal"),
             "status_modal": r.modal_status, "bahan": [_bahan(m) for m in r.kandidat[:2]]}
            for i, r in enumerate(recs, 1)],
    }


def cara(resep, cands, dipilih: bool) -> dict:
    d = resep_ringkas(resep, cands)
    d["baru_dipilih"] = dipilih
    return d


def tanya_jumlah(resep) -> dict:
    return {"produk": resep["nama_produk"]}


def tanya_produk(recs: list[dict]) -> dict:
    return {"opsi": [{"no": i, "produk": r["nama_produk"]} for i, r in enumerate(recs, 1)]}


def hitung(resep, qty, state, materials) -> dict:
    cands, _ = region_candidates(resep, materials, state.kota, state.provinsi)
    sat, bpu, susut = resep["satuan"], resep["bahan_per_unit"], resep["persen_susut"]
    need = hitung_kebutuhan(qty, bpu, susut, sat)
    d = {"produk": resep["nama_produk"], "jumlah_unit": qty, "bahan_per_unit": bpu,
         "satuan": sat, "susut_persen": round(susut * 100), "kebutuhan": need,
         "ada_bahan": bool(cands), "modal_user": state.modal}
    if cands:
        items, total, kurang = rencana_beli(need, cands)
        d.update({
            "rencana_beli": [{"nama": i["material"]["nama_material"], "jumlah": i["jumlah"],
                              "harga": i["material"]["harga"], "biaya": i["biaya"],
                              "kota": i["material"]["kota"]} for i in items],
            "total_biaya": total, "kekurangan": kurang,
            "melebihi_modal": bool(state.modal and total > state.modal)})
    return d


def modal(resep, state) -> dict:
    est, m = resep.get("estimasi_modal"), state.modal
    d = {"produk": resep["nama_produk"], "estimasi_modal": est, "modal_user": m}
    if est and m:
        d["selisih"] = abs(m - est)
        d["cukup"] = est <= m
    return d


MULAI_POIN = [
    "Buat prototipe kecil dan uji pasar (pre-order atau titip jual) sebelum produksi besar.",
    "Hitung HPP: bahan + tenaga + alat + kemasan + ongkir, lalu tentukan harga jual dan margin.",
    "Urus NIB lewat OSS (oss.go.id) agar legal; produk pangan atau kosmetik butuh izin tambahan.",
    "Bangun cerita brand hijau: tonjolkan asal material sisa dan dampaknya.",
    "Jual lewat marketplace dan media sosial, lalu perbesar produksi bertahap.",
]


def mulai(resep) -> dict:
    return {"produk": resep["nama_produk"] if resep else None,
            "k3": resep.get("catatan_k3") if resep else None, "poin_umum": MULAI_POIN}


def bebas(state, resep, cands, by_id) -> dict:
    return {"kota": state.kota, "modal_user": state.modal,
            "produk_terpilih": resep_ringkas(resep, cands),
            "rekomendasi_terakhir": [by_id[i]["nama_produk"] for i in state.last_recs if i in by_id]}
