"""Penyusun jawaban (mode template). Di Step 5-6 bagian ini digantikan model LoRA:
modelnya menerima data yang sama (resep, material, hasil hitung) dan hanya merangkai kalimat."""
from __future__ import annotations

from .calculator import hitung_kebutuhan, rencana_beli
from .catalog import region_candidates, regional_summary


# ---------- format angka ----------
def fmt_rp(x: float) -> str:
    return "Rp " + f"{int(round(x)):,}".replace(",", ".")


def fmt_num(x: float) -> str:
    s = f"{x:.3f}".rstrip("0").rstrip(".")
    return s.replace(".", ",")


def _persen(x: float) -> str:
    return f"{int(round(x * 100))}%"


def _mat_line(m: dict) -> str:
    return (f"{m['nama_material']} ({fmt_rp(m['harga'])}/{m['satuan']}, "
            f"stok {fmt_num(m['stok'])} {m['satuan']}, {m['kota']})")


# ---------- discovery ----------
def ask_slots(state, need_kota: bool, need_modal: bool, first: bool) -> str:
    if need_kota and need_modal:
        intro = "Seru, usaha dari material sisa punya potensi besar. " if first else ""
        return (intro + "Biar rekomendasinya pas, boleh tahu: kamu di kota mana, "
                "dan kira-kira modal awalnya berapa?")
    if need_kota:
        return "Oke, noted. Kamu berada di kota mana?"
    return (f"Oke, di {state.kota}. Kira-kira modal awal yang disiapkan berapa? "
            "(perkiraan juga boleh, misalnya 5 juta)")


# ---------- rekomendasi ----------
def recommend_text(state, recs, info, materials) -> str:
    label, level, top = regional_summary(materials, state.kota, state.provinsi)
    top_txt = " dan ".join(f"{k} ({n} listing)" for k, n in top)
    lines = []
    if level == "kota":
        lines.append(f"Di {label}, material yang paling banyak tersedia: {top_txt}.")
    elif level == "provinsi":
        lines.append(f"Belum ada penjual di {state.kota}, jadi aku pakai stok se-{label}. "
                     f"Yang paling banyak: {top_txt}.")
    elif state.kota:
        lines.append(f"Belum ada stok di sekitar {state.kota}; aku pakai seluruh katalog Circlo "
                     f"(terbanyak: {top_txt}).")

    if state.modal:
        asumsi = " (asumsiku)" if state.modal_asumsi else ""
        if info.get("modal_kurang"):
            lines.append(f"Dengan modal sekitar {fmt_rp(state.modal)}{asumsi}, semua resep kami "
                         "masih di atas modalmu. Ini dua opsi paling terjangkau:")
        else:
            lines.append(f"Dengan modal sekitar {fmt_rp(state.modal)}{asumsi}, "
                         f"ini {len(recs)} ide usaha yang cocok:")
    else:
        lines.append(f"Ini {len(recs)} ide usaha yang cocok:")

    lines.append("")
    for i, r in enumerate(recs, 1):
        est = r.resep.get("estimasi_modal")
        modal_txt = f"modal awal sekitar {fmt_rp(est)}" if est else "modal awal belum diestimasi"
        flag = {"mepet": " (agak mepet)", "kurang": " (di atas modalmu)"}.get(r.modal_status, "")
        lines.append(f"{i}. {r.resep['nama_produk']}: {modal_txt}{flag}")
        for m in r.kandidat[:2]:
            lines.append(f"   Bahan: {_mat_line(m)}")
    lines.append("")
    tail = ("Mau lanjut ke yang mana? Aku bisa jelaskan cara membuatnya, hitung kebutuhan bahan, "
            "atau bahas modal dan langkah memulainya.")
    if not state.minat_text:
        tail += " Kalau ada minat tertentu (fashion, furnitur, pertanian, dll.), kasih tahu ya."
    lines.append(tail)
    return "\n".join(lines)


# ---------- pendampingan ----------
def cara_text(resep, cands, intro: bool) -> str:
    lines = []
    langkah = resep.get("langkah_singkat") or "belum ada panduan."
    if intro:
        lines.append(f"Oke, {resep['nama_produk']}.")
        lines.append(f"Cara membuatnya: {langkah}")
    else:
        lines.append(f"Cara membuat {resep['nama_produk']}: {langkah}")
    if resep.get("catatan_k3"):
        lines.append(f"Keselamatan: {resep['catatan_k3']}")
    if cands:
        lines.append(f"Bahan di katalog: {_mat_line(cands[0])}")
    lines.append("Mau aku hitung kebutuhan bahan untuk jumlah produksi tertentu?")
    return "\n".join(lines)


def ask_qty_text(resep) -> str:
    return f"Mau produksi berapa unit {resep['nama_produk']}? (misalnya 100)"


def hitung_text(resep, qty, state, materials) -> tuple[str, list[int]]:
    cands, level = region_candidates(resep, materials, state.kota, state.provinsi)
    sat = resep["satuan"]
    bpu, susut = resep["bahan_per_unit"], resep["persen_susut"]
    need = hitung_kebutuhan(qty, bpu, susut, sat)
    lines = [
        f"Untuk {fmt_num(qty)} unit {resep['nama_produk']}:",
        f"- Kebutuhan bahan: {fmt_num(qty)} x {fmt_num(bpu)} {sat} / (1 - {_persen(susut)} susut) "
        f"= {fmt_num(need)} {sat}",
    ]
    if not cands:
        lines.append("Belum ada bahan yang cocok di katalog Circlo untuk produk ini.")
        return "\n".join(lines), []

    items, total, kurang = rencana_beli(need, cands)
    for it in items:
        m = it["material"]
        lines.append(f"- Beli: {m['nama_material']} {fmt_num(it['jumlah'])} {sat} x "
                     f"{fmt_rp(m['harga'])} = {fmt_rp(it['biaya'])} ({m['kota']})")
    lines.append(f"Total bahan sekitar {fmt_rp(total)} (estimasi; belum termasuk alat, tenaga, "
                 "kemasan, dan ongkir).")
    if kurang > 1e-9:
        lines.append(f"Catatan: stok di katalog baru cukup {fmt_num(need - kurang)} {sat}, "
                     f"kurang {fmt_num(kurang)} {sat}. Coba kurangi target atau tunggu restock.")
    if state.modal and total > state.modal:
        lines.append(f"Biaya bahan ini sudah melebihi modalmu ({fmt_rp(state.modal)}). "
                     "Mau kita hitung untuk jumlah yang lebih kecil?")
    return "\n".join(lines), [it["material"]["id_material"] for it in items]


def modal_text(resep, state) -> str:
    est = resep.get("estimasi_modal")
    if not est:
        return f"Untuk {resep['nama_produk']}, estimasi modal belum tersedia."
    txt = (f"Estimasi modal awal {resep['nama_produk']}: sekitar {fmt_rp(est)} "
           "(alat dan bahan awal; angka kasar).")
    if state.modal:
        if est <= state.modal:
            txt += f" Modalmu {fmt_rp(state.modal)} cukup, sisa sekitar {fmt_rp(state.modal - est)}."
        else:
            txt += (f" Modalmu {fmt_rp(state.modal)} masih kurang sekitar "
                    f"{fmt_rp(est - state.modal)}. Bisa mulai dari skala kecil atau alat bekas/sewa.")
    return txt


def mulai_text(resep=None) -> str:
    lines = [
        "Langkah umum memulai usaha dari material daur ulang (panduan umum):",
        "1. Buat prototipe kecil dan uji pasar (pre-order atau titip jual) sebelum produksi besar.",
        "2. Hitung HPP: bahan + tenaga + alat + kemasan + ongkir, lalu tentukan harga jual dan margin.",
        "3. Urus NIB lewat OSS (oss.go.id) agar usahamu legal; produk pangan atau kosmetik "
        "butuh izin tambahan.",
        "4. Bangun cerita brand hijau: tonjolkan asal material sisa dan dampaknya.",
        "5. Jual lewat marketplace dan media sosial, lalu perbesar produksi bertahap.",
    ]
    if resep and resep.get("catatan_k3"):
        lines.append(f"Catatan khusus {resep['nama_produk']}: {resep['catatan_k3']}")
    lines.append("Mau aku bantu hitung kebutuhan bahan atau modal untuk produk tertentu?")
    return "\n".join(lines)


def ask_which_text(recs: list[dict]) -> str:
    opsi = "; ".join(f"{i}. {r['nama_produk']}" for i, r in enumerate(recs, 1))
    return f"Yang kamu maksud produk yang mana? {opsi}"


def fallback_text() -> str:
    return ("Untuk saat ini aku fokus bantu usaha dari material daur ulang. Kamu bisa tanya: "
            "cara membuat produk, hitung kebutuhan bahan, estimasi modal, atau langkah memulai usaha. "
            "Atau ubah kota/modal kalau mau rekomendasi baru.")
