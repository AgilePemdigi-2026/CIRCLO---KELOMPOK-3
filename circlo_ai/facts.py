"""Ubah hasil keputusan dialog manager menjadi FAKTA terstruktur (JSON).
FAKTA inilah yang dibaca LLM saat menulis jawaban, baik saat training (Step 4-5)
maupun saat aplikasi berjalan (Step 6) -> tidak ada selisih antara data latih dan pemakaian nyata."""
from __future__ import annotations

from .calculator import hitung_kebutuhan, rencana_beli
from .catalog import region_candidates, regional_summary, find_alternative_materials


def _bahan(m: dict) -> dict:
    return {"nama": m["nama_material"], "harga": m["harga"], "satuan": m["satuan"],
            "stok": m["stok"], "kota": m["kota"],
            "alternatif": m.get("_match_type") == "alternatif"}


def resep_ringkas(resep: dict | None, cands: list | None = None) -> dict | None:
    if not resep:
        return None
    d = {"produk": resep["nama_produk"], "langkah": resep.get("langkah_singkat"),
         "k3": resep.get("catatan_k3"), "modal_awal": resep.get("estimasi_modal"),
         "bahan_per_unit": resep.get("bahan_per_unit"),
         "satuan": resep.get("satuan"),
         "persen_susut": resep.get("persen_susut"),
         "kategori_material": resep.get("kategori_material")}
    if cands:
        d["bahan"] = [_bahan(m) for m in cands[:2]]
        d["material_alternatif"] = any(m.get("_match_type") == "alternatif" for m in cands)
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
             "status_modal": r.modal_status, "level_pencocokan": r.level,
             "bahan": [_bahan(m) for m in r.kandidat[:2]]}
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
    used_alternative = False
    if not cands:
        cands = find_alternative_materials(resep, materials, state.kota, state.provinsi)
        used_alternative = bool(cands)
    sat, bpu, susut = resep["satuan"], resep["bahan_per_unit"], resep["persen_susut"]
    need = hitung_kebutuhan(qty, bpu, susut, sat)
    d = {"produk": resep["nama_produk"], "jumlah_unit": qty, "bahan_per_unit": bpu,
         "satuan": sat, "susut_persen": round(susut * 100), "kebutuhan": need,
         "ada_bahan": bool(cands), "modal_user": state.modal,
         "material_alternatif": used_alternative}
    if cands:
        items, total, kurang = rencana_beli(need, cands)
        d.update({
            "rencana_beli": [{"nama": i["material"]["nama_material"], "jumlah": i["jumlah"],
                              "harga": i["material"]["harga"], "biaya": i["biaya"],
                              "kota": i["material"]["kota"],
                              "alternatif": i["material"].get("_match_type") == "alternatif"} for i in items],
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


def _material_fact(m: dict) -> dict:
    return {
        "id_material": m.get("id_material"),
        "nama": m.get("nama_material"),
        "kategori": m.get("kategori"),
        "harga": m.get("harga"),
        "satuan": m.get("satuan"),
        "stok": m.get("stok"),
        "kota": m.get("kota"),
        "provinsi": m.get("provinsi"),
        "lokasi": m.get("lokasi"),
        "deskripsi": m.get("deskripsi_material"),
        "id_seller": m.get("id_seller"),
    }


def katalog(state, found: dict, cards: list[dict], alternatif: bool = False) -> dict:
    stats = found.get("_katalog_stats") or {}
    return {
        "jenis": "katalog_material",
        "sumber_pengetahuan": "katalog",
        "intent_percakapan": "marketplace_search",
        "wilayah": {
            "kota_user": state.kota,
            "provinsi_user": state.provinsi,
            "scope": found.get("scope"),
            "scope_all": bool(state.scope_all),
        },
        "query": found.get("query") or None,
        "filter": {
            "kategori": found.get("kategori") or [],
            "max_harga": found.get("max_harga"),
            "kota": found.get("kota"),
        },
        "total_cocok": found.get("total"),
        "ditampilkan": len(cards),
        "total_katalog": stats.get("total_katalog"),
        "total_tersedia": stats.get("total_tersedia"),
        "sebaran_kota": stats.get("kota"),
        "sebaran_kategori": stats.get("kategori"),
        "material": [_material_fact(m) for m in cards],
        "memakai_alternatif": alternatif,
        "konteks_kg": {
            "kategori": getattr(state, "fokus_kategori", None),
            "produk": getattr(state, "fokus_produk", None),
            "jalur": (getattr(state, "kg_terakhir", {}) or {}).get("jalur", []),
        },
        "catatan": "Hanya material aktif dan stok > 0 yang dihitung.",
    }


def tanya_material(cards: list[dict]) -> dict:
    return {"opsi": [{"no": i, "material": _material_fact(m)} for i, m in enumerate(cards, 1)]}


def detail_material(m: dict) -> dict:
    return {"jenis": "detail_material", "material": _material_fact(m)}


def order_material(m: dict, qty: float, total: float) -> dict:
    return {
        "jenis": "persiapan_pesanan",
        "material": _material_fact(m),
        "kuantitas": qty,
        "total_estimasi": total,
        "belum_termasuk": ["ongkir", "biaya pengemasan"],
        "perlu_konfirmasi_user": True,
    }


def hitung_material(m: dict, budget: float | None, affordable: int | None,
                    qty: int | None = None, total: float | None = None) -> dict:
    return {
        "jenis": "hitung_material_dari_anggaran",
        "material": _material_fact(m),
        "anggaran": budget,
        "bisa_dibeli": affordable,
        "kuantitas_disarankan": qty,
        "total_biaya": total,
        "dibatasi_stok": bool(qty is not None and affordable is not None and qty < affordable),
    }


def potensi(kategori: str, pathways: list[dict], cards: list[dict], state) -> dict:
    return {
        "jenis": "potensi_pemanfaatan",
        "kategori": kategori,
        "wilayah": {
            "kota": state.kota,
            "provinsi": state.provinsi,
            "scope": "all" if state.scope_all else ("kota" if state.kota else "provinsi" if state.provinsi else "all"),
        },
        "jalur": [
            {
                "produk": p.get("produk"),
                "langkah": p.get("langkah"),
                "k3": p.get("k3"),
                "bahan_per_unit": p.get("bahan_per_unit"),
                "satuan": p.get("satuan"),
                "persen_susut": p.get("persen_susut"),
                "estimasi_modal": p.get("estimasi_modal"),
            }
            for p in pathways
        ],
        "material_tersedia": [_material_fact(m) for m in cards],
        "catatan": (
            "Jalur berasal dari data resep referensi. Bukan jaminan hasil produksi "
            "atau klaim dampak lingkungan."
        ),
    }

def _kg_pathway(p: dict) -> dict:
    from .responder import _kg_chain, _kg_steps  # impor lokal: hindari impor melingkar

    return {
        "produk": p.get("produk"),
        "kategori": p.get("kategori"),
        "rantai": _kg_chain(p),
        "kata_kunci_material": p.get("kata_kunci"),
        "langkah": p.get("langkah"),
        "langkah_terurut": _kg_steps(p.get("langkah")),
        "k3": p.get("k3"),
        "bahan_per_unit": p.get("bahan_per_unit"),
        "satuan": p.get("satuan"),
        "persen_susut": p.get("persen_susut"),
        "estimasi_modal": p.get("estimasi_modal"),
        "alasan": p.get("alasan"),
        "sumber": p.get("sumber") or "resep_produk",
    }


def _kg_base(state, jenis: str, **extra) -> dict:
    data = {
        "jenis": jenis,
        "sumber_pengetahuan": "knowledge_graph",
        "basis_data": "resep_produk",
        "wilayah": {
            "kota": state.kota,
            "provinsi": state.provinsi,
            "scope": "all" if state.scope_all else (
                "kota" if state.kota else "provinsi" if state.provinsi else "all"
            ),
        },
        "butuh_katalog": False,
        "catatan": (
            "Jalur berasal dari data resep referensi. Bukan data stok, bukan jaminan "
            "hasil produksi, dan bukan klaim dampak lingkungan."
        ),
    }
    data.update(extra)
    return data


def kg_eksplorasi(ide: list[dict], state) -> dict:
    return _kg_base(
        state,
        "eksplorasi_ide",
        ide=[_kg_pathway(p) for p in ide],
        inferensi=(
            "Daftar ide diambil dari resep yang tersedia dan dipilih lintas kategori; "
            "bukan rekomendasi stok aktual."
        ),
    )


def kg_sirkular(kategori: list[str], ide: list[dict], state) -> dict:
    return _kg_base(
        state,
        "ekonomi_sirkular",
        siklus=["kumpulkan", "pilah dan bersihkan", "olah menjadi produk", "pakai atau jual", "sisa kembali ke siklus"],
        kategori_tersedia=list(kategori or []),
        contoh_jalur=[_kg_pathway(p) for p in (ide or [])[:4]],
        inferensi=(
            "Penjelasan konsep ekonomi sirkular; contoh jalur diambil dari resep "
            "referensi, bukan stok aktual."
        ),
    )


def kg_pemanfaatan(kategori: str, pathways: list[dict], state) -> dict:
    return _kg_base(
        state,
        "pemanfaatan_material",
        kategori=kategori,
        jalur=[_kg_pathway(p) for p in pathways],
        inferensi="Jalur ditelusuri dari kategori material ke proses dan produk di resep.",
    )


def kg_produk(permintaan: str, pathways: list[dict], state) -> dict:
    return _kg_base(
        state,
        "pengembangan_produk",
        permintaan=permintaan,
        jalur=[_kg_pathway(p) for p in pathways],
        kandidat_bahan=[
            {
                "kategori": p.get("kategori"),
                "kata_kunci": [
                    part.strip()
                    for part in str(p.get("kata_kunci") or "").split("|")
                    if part.strip()
                ],
            }
            for p in pathways
        ],
        inferensi=(
            "Produk dicocokkan dari nama produk dan kata kunci material di resep. "
            "Kata kunci bukan stok aktual."
        ),
    )


def kg_proses(permintaan: str, pathways: list[dict], state) -> dict:
    return _kg_base(
        state,
        "penjelasan_proses",
        permintaan=permintaan,
        jalur=[_kg_pathway(p) for p in pathways],
        inferensi=(
            "Langkah dan K3 diambil dari resep referensi; hasil aktual bisa berbeda "
            "tergantung bahan dan alat."
        ),
    )


def kg_alternatif(sumber: str, kategori: str, alternatif: list[dict], state) -> dict:
    return _kg_base(
        state,
        "alternatif_material",
        sumber_material=sumber,
        kategori=kategori,
        alternatif=alternatif,
        inferensi=(
            "Alternatif diambil dari kata kunci material pada resep kategori yang sama, "
            "bukan dari stok atau relasi yang dikarang."
        ),
    )


def kg_tidak_ditemukan(jenis: str, query: str, state) -> dict:
    return _kg_base(
        state,
        "kg_tidak_ditemukan",
        jenis_yang_dicari=jenis,
        query=query,
        jalur=[],
        inferensi="Knowledge Graph tidak memiliki relasi yang cocok untuk permintaan ini.",
    )
