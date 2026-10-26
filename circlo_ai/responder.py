"""Penyusun jawaban (mode template). Di Step 5-6 bagian ini digantikan model LoRA:
modelnya menerima data yang sama (resep, material, hasil hitung) dan hanya merangkai kalimat."""
from __future__ import annotations

from .calculator import hitung_kebutuhan, rencana_beli
from .catalog import region_candidates, regional_summary, find_alternative_materials


# ---------- format angka ----------
def fmt_rp(x: float) -> str:
    return "Rp " + f"{int(round(x)):,}".replace(",", ".")


def fmt_num(x: float) -> str:
    s = f"{x:.3f}".rstrip("0").rstrip(".")
    return s.replace(".", ",")


def _persen(x: float) -> str:
    return f"{int(round(x * 100))}%"


def _mat_line(m: dict) -> str:
    alt_flag = " (alternatif)" if m.get("_match_type") == "alternatif" else ""
    return (f"{m['nama_material']} ({fmt_rp(m['harga'])}/{m['satuan']}, "
            f"stok {fmt_num(m['stok'])} {m['satuan']}, {m['kota']}){alt_flag}")


def _resep_detail(resep: dict) -> list[str]:
    """Susun detail resep yang informatif."""
    lines = []
    if resep.get("langkah_singkat"):
        lines.append(f"Langkah: {resep['langkah_singkat']}")
    if resep.get("catatan_k3"):
        lines.append(f"Keselamatan: {resep['catatan_k3']}")
    # Informasi tambahan dari resep
    if resep.get("bahan_per_unit") and resep.get("satuan"):
        lines.append(f"Kebutuhan material per unit: {fmt_num(resep['bahan_per_unit'])} {resep['satuan']}")
    if resep.get("persen_susut"):
        lines.append(f"Estimasi susut bahan: {_persen(resep['persen_susut'])}")
    if resep.get("estimasi_modal"):
        lines.append(f"Estimasi modal awal: {fmt_rp(resep['estimasi_modal'])} (kasar)")
    return lines


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
        # Tampilkan bahan utama
        for m in r.kandidat[:2]:
            lines.append(f"   Bahan: {_mat_line(m)}")
        # Tampilkan detail resep singkat
        for detail in _resep_detail(r.resep):
            lines.append(f"   {detail}")
        # Info jika pakai material alternatif
        if r.level == "alternatif":
            lines.append("   ⚠ Material alternatif (kategori/satuan mirip, bukan pencocokan pasti)")
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
        # Tampilkan alternatif jika ada
        if len(cands) > 1:
            lines.append(f"Alternatif: {_mat_line(cands[1])}")
    # Detail resep lengkap
    for detail in _resep_detail(resep):
        lines.append(f"- {detail}")
    lines.append("Mau aku hitung kebutuhan bahan untuk jumlah produksi tertentu?")
    return "\n".join(lines)


def ask_qty_text(resep) -> str:
    return f"Mau produksi berapa unit {resep['nama_produk']}? (misalnya 100)"


def hitung_text(resep, qty, state, materials) -> tuple[str, list[int]]:
    # Coba pencocokan ketat dulu
    cands, level = region_candidates(resep, materials, state.kota, state.provinsi)
    used_alternative = False
    if not cands:
        # Fallback ke material alternatif
        from .catalog import find_alternative_materials
        cands = find_alternative_materials(resep, materials, state.kota, state.provinsi)
        used_alternative = bool(cands)
    
    sat = resep["satuan"]
    bpu, susut = resep["bahan_per_unit"], resep["persen_susut"]
    need = hitung_kebutuhan(qty, bpu, susut, sat)
    lines = [
        f"Untuk {fmt_num(qty)} unit {resep['nama_produk']}:",
        f"- Kebutuhan bahan: {fmt_num(qty)} x {fmt_num(bpu)} {sat} / (1 - {_persen(susut)} susut) "
        f"= {fmt_num(need)} {sat}",
    ]
    if used_alternative:
        lines.append("⚠ Menggunakan material alternatif (pencocokan kategori/satuan mirip).")
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


# ---------- katalog material ----------
def _scope_label(state, found) -> str:
    if found.get("scope") == "kota" and found.get("kota"):
        return f"di {found['kota']}"
    if found.get("scope") == "provinsi" and found.get("provinsi"):
        return f"di {found['provinsi']}"
    return "di seluruh katalog Circlo"


def _material_item_line(i: int, m: dict) -> str:
    lokasi = m.get("kota") or "-"
    prov = f", {m['provinsi']}" if m.get("provinsi") and m.get("provinsi") != lokasi else ""
    desc = (m.get("deskripsi_material") or "").strip()
    if len(desc) > 90:
        desc = desc[:87].rstrip() + "..."
    line = (f"{i}. {m['nama_material']} - {fmt_rp(m['harga'])}/{m.get('satuan') or 'unit'}, "
            f"stok {fmt_num(m['stok'])} {m.get('satuan') or 'unit'}, {lokasi}{prov}")
    if desc:
        line += f". {desc}"
    return line


def katalog_text(state, found: dict, cards: list[dict]) -> str:
    scope = _scope_label(state, found)
    query = found.get("query")
    filters = []
    if found.get("kategori"):
        filters.append("kategori " + ", ".join(found["kategori"]))
    if found.get("max_harga"):
        filters.append(f"harga maksimal {fmt_rp(found['max_harga'])}")
    filter_txt = f" dengan filter {' dan '.join(filters)}" if filters else ""
    if query:
        head = (f"Aku menemukan {found['total']} material{filter_txt} untuk "
                f'"{query}" {scope}.')
    else:
        head = f"Ada {found['total']} material aktif dan siap dibeli {scope}{filter_txt}."
    lines = [head]
    if found["total"] > len(cards):
        lines.append(f"Menampilkan {len(cards)} teratas:")
    else:
        lines.append("Ini daftarnya:")
    lines.append("")
    for i, m in enumerate(cards, 1):
        lines.append(_material_item_line(i, m))
    lines.append("")
    if found["total"] > len(cards):
        lines.append(f"Masih ada {found['total'] - len(cards)} material lain. "
                     'Ketik "tampilkan semua" atau sebut kategori/kota untuk mempersempit.')
    lines.append('Pilih nomor material untuk melihat detail, atau ketik "pesan <nomor> <jumlah>" '
                 "kalau sudah cocok.")
    return "\n".join(lines)


def katalog_alternatif_text(state, found: dict, cards: list[dict]) -> str:
    scope = _scope_label(state, found)
    query = found.get("query")
    lines = []
    if query:
        lines.append(f'Belum ada material yang persis cocok untuk "{query}" {scope}.')
    else:
        lines.append(f"Belum ada material yang cocok dengan filter itu {scope}.")
    lines.append("Tapi ada beberapa alternatif yang masih relevan dan stoknya tersedia:")
    lines.append("")
    for i, m in enumerate(cards, 1):
        lines.append(_material_item_line(i, m))
    lines.append("")
    lines.append('Ketik nomor untuk detail, atau sebut "semua wilayah" untuk mencari di luar kota ini.')
    return "\n".join(lines)


def katalog_luar_kota_text(state, found: dict, elsewhere: dict, cards: list[dict]) -> str:
    query = found.get("query")
    local = found.get("kota") or found.get("provinsi") or "wilayah ini"
    if query:
        head = f'Di {local} belum ada material yang cocok untuk "{query}".'
    else:
        head = f"Di {local} belum ada material yang cocok dengan filter itu."
    lines = [head,
             f"Tapi di kota lain ada {elsewhere['total']} material yang cocok. Ini beberapa:",
             ""]
    for i, m in enumerate(cards, 1):
        lines.append(_material_item_line(i, m))
    lines.append("")
    lines.append('Ketik "semua wilayah" untuk mencari seluruh katalog, atau sebut kota lain.')
    return "\n".join(lines)


def katalog_kosong_text(state, found: dict) -> str:
    scope = _scope_label(state, found)
    query = found.get("query")
    if query:
        head = f'Belum ada material aktif yang cocok untuk "{query}" {scope}.'
    else:
        head = f"Belum ada material aktif yang cocok dengan filter itu {scope}."
    tips = ["coba kategori lain (kayu, tekstil, plastik, kertas, logam, organik)",
            "naikkan batas anggaran",
            'ketik "semua wilayah" untuk melihat katalog di luar kotamu']
    return head + " Kamu bisa " + "; ".join(tips) + "."


def katalog_stats_text(state, found: dict, cards: list[dict]) -> str:
    scope = _scope_label(state, found)
    query = found.get("query")
    filters = []
    if found.get("kategori"):
        filters.append("kategori " + ", ".join(found["kategori"]))
    if found.get("max_harga"):
        filters.append(f"harga maksimal {fmt_rp(found['max_harga'])}")
    filter_txt = f" dengan filter {' dan '.join(filters)}" if filters else ""
    if query:
        head = f'Ada {found["total"]} material{filter_txt} yang cocok untuk "{query}" {scope}.'
    else:
        head = f"Ada {found['total']} material aktif dan tersedia {scope}{filter_txt}."
    lines = [head]
    stats = found.get("_katalog_stats") or {}
    if not query and not filters and found.get("scope") == "all" and stats:
        top_city = sorted(stats.get("kota", {}).items(), key=lambda x: -x[1])[:4]
        if top_city:
            lines.append("Sebaran kota terbesar: " +
                         ", ".join(f"{k} {v}" for k, v in top_city) + " material.")
        top_cat = sorted(stats.get("kategori", {}).items(), key=lambda x: -x[1])[:4]
        if top_cat:
            lines.append("Kategori terbanyak: " +
                         ", ".join(f"{k} {v}" for k, v in top_cat) + ".")
    if cards:
        lines.append("")
        lines.append("Contoh yang tersedia:")
        for i, m in enumerate(cards[:4], 1):
            lines.append(_material_item_line(i, m))
        lines.append("")
        lines.append('Ketik "tampilkan katalog" untuk melihat daftar lengkap, '
                     "atau sebut kategori/kota untuk mempersempit.")
    return "\n".join(lines)


def pilih_material_text(cards: list[dict]) -> str:
    if not cards:
        return "Sebutkan nama atau kategori material yang kamu maksud, ya."
    lines = ["Material yang mana? Ini pilihan terakhir:"]
    for i, m in enumerate(cards, 1):
        lines.append(_material_item_line(i, m))
    return "\n".join(lines)


def material_detail_text(m: dict) -> str:
    satuan = m.get("satuan") or "unit"
    lines = [
        f"Detail material: {m['nama_material']}",
        f"- Kategori: {m.get('kategori') or '-'}",
        f"- Harga: {fmt_rp(m['harga'])}/{satuan}",
        f"- Stok tersedia: {fmt_num(m['stok'])} {satuan}",
        f"- Lokasi: {m.get('kota') or '-'}"
        + (f", {m['provinsi']}" if m.get("provinsi") else "")
        + (f" ({m['lokasi']})" if m.get("lokasi") else ""),
    ]
    if m.get("deskripsi_material"):
        lines.append(f"- Deskripsi: {m['deskripsi_material']}")
    if m.get("id_seller"):
        lines.append(f"- ID penjual: {m['id_seller']}")
    lines.append("")
    lines.append(f'Mau pesan? Ketik "pesan 1 {satuan}" atau tekan tombol Pesan pada kartu. '
                 "Jumlah dan ongkir bisa dikonfirmasi sebelum checkout.")
    return "\n".join(lines)


def material_order_text(m: dict, qty: float, total: float) -> str:
    satuan = m.get("satuan") or "unit"
    lines = [
        f"Baik, aku siapkan pesanan untuk {m['nama_material']}.",
        f"- Jumlah: {fmt_num(qty)} {satuan}",
        f"- Harga: {fmt_rp(m['harga'])}/{satuan}",
        f"- Total estimasi: {fmt_rp(total)}",
        f"- Penjual: {m.get('kota') or '-'} (ID {m.get('id_seller') or '-'})",
        "",
        "Total belum termasuk ongkir. Tekan tombol Pesan pada kartu untuk mengisi alamat "
        "dan metode pengiriman, lalu konfirmasi.",
    ]
    if qty >= float(m.get("stok") or 0):
        lines.append("Catatan: jumlah ini mengambil seluruh stok yang tersedia.")
    return "\n".join(lines)


def material_budget_text(m: dict) -> str:
    satuan = m.get("satuan") or "unit"
    return (f"Untuk {m['nama_material']} ({fmt_rp(m['harga'])}/{satuan}), "
            'sebutkan anggaranmu, misalnya "budget 500rb", biar aku hitung jumlah yang bisa dibeli.')


def material_hitung_text(m: dict, budget: float, affordable: int,
                         qty: int, total: float) -> str:
    satuan = m.get("satuan") or "unit"
    lines = [f"Dengan anggaran {fmt_rp(budget)}:"]
    if affordable <= 0:
        lines.append(f"- Harga {m['nama_material']} {fmt_rp(m['harga'])}/{satuan}, "
                     "jadi anggaran ini belum cukup untuk 1 unit.")
        lines.append("Coba naikkan anggaran atau pilih material yang lebih murah.")
        return "\n".join(lines)
    lines.append(f"- Secara anggaran bisa membeli sekitar {affordable} {satuan}.")
    if qty < affordable:
        lines.append(f"- Namun stok yang tersedia hanya {fmt_num(m['stok'])} {satuan}, "
                     f"jadi maksimal {qty} {satuan}.")
    lines.append(f"- Total untuk {qty} {satuan}: {fmt_rp(total)}.")
    lines.append(f"- Lokasi: {m.get('kota') or '-'}.")
    lines.append("")
    lines.append(f'Ketik "pesan {qty} {satuan}" kalau mau lanjut, atau tekan tombol Pesan pada kartu.')
    return "\n".join(lines)
