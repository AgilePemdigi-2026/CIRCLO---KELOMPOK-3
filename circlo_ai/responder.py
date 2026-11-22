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
    lines.append('Kamu bisa pilih nomor untuk melihat detail. Kalau sudah menemukan yang cocok '
                 'dan ingin membeli, ketik "pesan <nomor> <jumlah>".')
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


# ---------- knowledge graph / potensi pemanfaatan ----------
def potensi_text(kategori: str, pathways: list[dict], cards: list[dict]) -> str:
    lines = [
        f"Potensi pemanfaatan material kategori {kategori} berdasarkan data resep CIRCLO:"
    ]
    for i, p in enumerate(pathways, 1):
        lines.append(f"{i}. {p.get('produk') or 'Produk tanpa nama'}")
        if p.get("bahan_per_unit") is not None and p.get("satuan"):
            lines.append(
                f"   Kebutuhan bahan: {fmt_num(float(p['bahan_per_unit']))} {p['satuan']} per unit."
            )
        if p.get("langkah"):
            lines.append(f"   Langkah: {p['langkah']}")
        if p.get("k3"):
            lines.append(f"   K3: {p['k3']}")
    if cards:
        lines.append("")
        lines.append("Material aktif yang bisa dipakai:")
        for m in cards:
            lines.append(f"- {_mat_line(m)}")
    else:
        lines.append("")
        lines.append("Belum ada listing aktif untuk kategori ini di wilayahmu; coba perluas wilayah.")
    lines.append("")
    lines.append(
        "Catatan: jalur ini berasal dari data resep referensi, bukan jaminan hasil produksi "
        "atau klaim dampak lingkungan."
    )
    return "\n".join(lines)


def potensi_kosong_text(text: str) -> str:
    return (
        "Belum ada data resep pemanfaatan yang cocok untuk permintaan itu. "
        "Coba sebutkan kategori material (misalnya tekstil, plastik, kayu, kertas) "
        "atau pilih satu material dari katalog."
    )

# ---------- knowledge graph reasoning (respons terstruktur Markdown) ----------
# Semua teks di bagian ini hanya memakai data resep_produk yang dikirim dialog.
# Format dirender ReactMarkdown di UI: heading (###), **tebal**, daftar "- " dan "1. ".
import re as _re

_STEP_SPLIT = _re.compile(
    r"(?:,\s+(?=[A-Za-z\u00C0-\u00FF])|;\s*|\.\s+(?=[A-Z])|\s+lalu\s+|\s+kemudian\s+)"
)

KG_SOURCE = "Knowledge Graph CIRCLO (tabel resep_produk)"


def _kg_keywords(p: dict) -> str:
    raw = str(p.get("kata_kunci") or "").strip()
    return raw.replace("|", ", ") if raw else "belum dicatat"


def _kg_steps(langkah) -> list[str]:
    """Pecah langkah_singkat jadi daftar langkah; koma desimal (1,5) tidak dipecah."""
    raw = str(langkah or "").strip()
    if not raw:
        return []
    parts = [s.strip(" .") for s in _STEP_SPLIT.split(raw)]
    return [s[0].upper() + s[1:] for s in parts if s]


def _kg_chain(p: dict) -> str:
    """Jalur KG: Kategori -> kata aksi proses -> Produk."""
    verbs: list[str] = []
    for step in _kg_steps(p.get("langkah")):
        word = step.split()[0].capitalize()
        if word not in verbs:
            verbs.append(word)
        if len(verbs) == 4:
            break
    nodes = [str(p.get("kategori") or "Material")] + verbs
    nodes.append(str(p.get("produk") or "Produk"))
    return " → ".join(nodes)


def _kg_join(lines: list[str]) -> str:
    """Gabung baris; rapikan baris kosong berlebih agar Markdown bersih."""
    return _re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip() + "\n"


def _kg_header(title: str) -> list[str]:
    return [f"### {title}", ""]


def _kg_footer(note: str) -> list[str]:
    return ["", f"*Sumber: {KG_SOURCE}. {note}*"]


def _kg_next(options: list[str]) -> list[str]:
    out = ["", "**Langkah selanjutnya**"]
    out.extend(f"- {o}" for o in options)
    return out


def _kg_followups(pathways: list[dict], proses=True, alternatif=True, katalog=True,
                  pemanfaatan=False) -> list[str]:
    """Kalimat contoh yang bisa diketik pengguna; semuanya memuat kata domain
    (limbah/bahan/material) agar diarahkan intent classifier ke KG atau katalog."""
    p = pathways[0] if pathways else {}
    kat = str(p.get("kategori") or "").strip().lower()
    produk = str(p.get("produk") or "").strip().lower()
    terms = [t.strip() for t in str(p.get("kata_kunci") or "").split("|") if t.strip()]
    out: list[str] = []
    if pemanfaatan and kat:
        out.append(f'Jalur lengkap satu kategori: *"potensi pemanfaatan limbah {kat}"*')
    if proses and kat and produk:
        out.append(f'Detail proses: *"cara mengolah limbah {kat} jadi {produk}"*')
    if alternatif and terms:
        out.append(f'Bahan pengganti: *"alternatif bahan pengganti {terms[0]}"*')
    if katalog and kat:
        out.append(f'Cek listing tersedia: *"cari material {kat}"*')
    return out


def _kg_card(i: int, p: dict, detail: str = "full") -> list[str]:
    """Satu kartu jalur. detail: 'ringkas' (jalur+bahan) atau 'full' (+proses, angka, K3)."""
    lines = [f"**{i}. {p.get('produk') or 'Produk tanpa nama'}**"]
    lines.append(f"- Jalur: {_kg_chain(p)}")
    lines.append(f"- Bahan kunci: {_kg_keywords(p)}")
    if p.get("alasan") and detail == "full":
        lines.append(f"- Alasan cocok: {p['alasan']}")
    if detail == "full":
        steps = _kg_steps(p.get("langkah"))
        if steps:
            lines.append("- Proses:")
            lines.extend(f"  {n}. {s}" for n, s in enumerate(steps, 1))
        numbers = []
        if p.get("bahan_per_unit") is not None and p.get("satuan"):
            numbers.append(f"{fmt_num(float(p['bahan_per_unit']))} {p['satuan']} per unit")
        if p.get("persen_susut") is not None:
            numbers.append(f"susut {_persen(float(p['persen_susut']))}")
        if numbers:
            lines.append("- Kebutuhan bahan: " + ", ".join(numbers))
        if p.get("estimasi_modal"):
            lines.append(f"- Estimasi modal awal: {fmt_rp(float(p['estimasi_modal']))} (kasar, dari resep referensi)")
        if p.get("k3"):
            lines.append(f"- K3: {p['k3']}")
    lines.append("")
    return lines


def kg_eksplorasi_text(ide: list[dict]) -> str:
    lines = _kg_header("Ide pemanfaatan limbah (ekonomi sirkular)")
    lines += [
        "**Siklus:** Limbah → Dipilah → Diolah → Produk → Sisa produksi kembali ke siklus",
        "",
        "Resep referensi CIRCLO memuat arah pemanfaatan berikut:",
        "",
    ]
    for i, p in enumerate(ide, 1):
        lines += _kg_card(i, p, "ringkas")
    lines += _kg_next(_kg_followups(ide, pemanfaatan=True, alternatif=False, katalog=False)
                      or ["Sebut kategori material (mis. tekstil, plastik, kayu) untuk melihat jalurnya."])
    lines += _kg_footer("Ini referensi proses, belum mengecek stok atau harga.")
    return _kg_join(lines)


def kg_sirkular_text(kategori: list[str], ide: list[dict]) -> str:
    lines = _kg_header("Ekonomi sirkular: limbah sebagai bahan baku")
    lines += [
        "Ekonomi sirkular memandang limbah sebagai bahan yang terus berputar, "
        "bukan sampah yang berakhir di TPA.",
        "",
        "**Perjalanan material**",
        "1. **Kumpulkan** limbah atau sisa material dari rumah, toko, atau industri.",
        "2. **Pilah & bersihkan** agar layak dipakai kembali.",
        "3. **Olah** menjadi produk bernilai (lihat resep referensi CIRCLO).",
        "4. **Pakai atau jual** produknya; sisa produksi kembali ke langkah 1.",
    ]
    if kategori:
        lines += ["", "**Kategori yang bisa masuk siklus ini:** " + ", ".join(kategori[:8]) + "."]
    if ide:
        lines += ["", "**Contoh jalur dari resep referensi**", ""]
        for i, p in enumerate(ide[:4], 1):
            lines.append(f"{i}. {_kg_chain(p)}")
    lines += _kg_next(_kg_followups(ide, pemanfaatan=True, alternatif=False, katalog=False)
                      or ["Sebut kategori material untuk melihat jalur pemanfaatannya."])
    lines += _kg_footer("Intinya: nilai material dipertahankan selama mungkin.")
    return _kg_join(lines)


def kg_pemanfaatan_text(kategori: str, pathways: list[dict]) -> str:
    lines = _kg_header(f"Jalur pemanfaatan limbah {kategori}")
    lines += [
        f"**Siklus:** {kategori} → Dikumpulkan → Dipilah → Diolah → Produk → Sisa kembali ke siklus",
        "",
        f"Resep referensi mencatat **{len(pathways)} jalur** untuk kategori ini:",
        "",
    ]
    for i, p in enumerate(pathways, 1):
        lines += _kg_card(i, p, "full")
    lines += _kg_next(_kg_followups(pathways))
    lines += _kg_footer("Stok belum ditampilkan karena belum diminta.")
    return _kg_join(lines)


def kg_produk_text(permintaan: str, pathways: list[dict]) -> str:
    lines = _kg_header(f"Produk yang cocok untuk: {permintaan}")
    if pathways:
        best = pathways[0]
        lines += [
            f"**Paling relevan:** {best.get('produk') or 'Produk tanpa nama'} "
            f"(kategori {best.get('kategori') or 'belum dicatat'})",
            "",
        ]
    for i, p in enumerate(pathways, 1):
        lines += _kg_card(i, p, "full")
    lines += _kg_next(_kg_followups(pathways))
    lines += _kg_footer("Bahan di atas adalah kata kunci resep, bukan stok aktual.")
    return _kg_join(lines)


def kg_proses_text(permintaan: str, pathways: list[dict]) -> str:
    lines = _kg_header(f"Proses pengolahan: {permintaan}")
    lines += ["**Siklus:** Limbah → Dipilah → Diolah → Produk → Sisa kembali", ""]
    for i, p in enumerate(pathways, 1):
        lines += _kg_card(i, p, "full")
    lines += _kg_next(_kg_followups(pathways, proses=False))
    lines += _kg_footer("Ini langkah resep referensi, bukan jaminan hasil produksi.")
    return _kg_join(lines)


def kg_alternatif_text(sumber: str, kategori: str, alternatif: list[dict]) -> str:
    lines = _kg_header(f"Alternatif pengganti {sumber}")
    lines += [
        f"Resep kategori **{kategori}** menyebut kata kunci material berikut:",
        "",
    ]
    for i, item in enumerate(alternatif, 1):
        used = item.get("jumlah_resep") or 1
        lines.append(
            f"{i}. **{item.get('istilah')}** — dipakai di {used} resep "
            f"(contoh produk: {item.get('contoh_produk') or 'belum dicatat'})"
        )
    lines += _kg_next([
        f'Cek listing tersedia: *"cari material {str(kategori).lower()}"*',
    ])
    lines += _kg_footer("Alternatif berasal dari kata kunci resep, bukan jaminan stok.")
    return _kg_join(lines)


def kg_tidak_ditemukan_text(jenis: str, query: str) -> str:
    lines = _kg_header("Belum ada di Knowledge Graph")
    lines += [
        f"Relasi **{jenis}** untuk \"{query}\" belum tercatat di data resep, "
        "dan aku tidak mengarang relasi yang tidak ada.",
        "",
        "**Coba salah satu cara ini**",
        "- Sebut kategori material: tekstil, plastik, kayu, kertas, logam, kaca, karet, organik.",
        "- Atau sebut produk yang lebih spesifik, mis. *tote bag*, *paving*, *pot tanaman*.",
    ]
    return _kg_join(lines)
