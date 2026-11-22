// Pemformat dan warna bersama untuk komponen dashboard Government.

export const HIJAU = "#3a6b0d";
export const HIJAU_MUDA = "#bcd98a";

// Warna status wilayah: dipilih agar bisa dibedakan tanpa bergantung pada warna saja (label selalu tampil).
export const WARNA_STATUS = {
  sehat: { titik: "#3a6b0d", badge: "bg-green-100 text-green-800" },
  berkembang: { titik: "#2563eb", badge: "bg-blue-100 text-blue-800" },
  surplus: { titik: "#d97706", badge: "bg-amber-100 text-amber-800" },
  "butuh-pasokan": { titik: "#7c3aed", badge: "bg-violet-100 text-violet-800" },
  "belum-aktif": { titik: "#94a3b8", badge: "bg-slate-100 text-slate-600" },
};

export const URUTAN_STATUS = ["sehat", "berkembang", "butuh-pasokan", "surplus", "belum-aktif"];

// Label dan saran tindak lanjut tiap status (kriteria penentuannya ada di lib/governmentWilayah.js).
export const STATUS_INFO = {
  sehat: { label: "Sehat", saran: "Pertahankan dan jadikan contoh bagi daerah lain." },
  berkembang: { label: "Berkembang", saran: "Dorong promosi agar serapan naik." },
  "butuh-pasokan": { label: "Butuh pasokan", saran: "Permintaan tinggi, pasokan sedikit: ajak lebih banyak seller." },
  surplus: { label: "Pasokan menumpuk", saran: "Pasokan banyak, sedikit terserap: perlu promosi dan pembeli industri." },
  "belum-aktif": { label: "Belum aktif", saran: "Belum ada transaksi: perlu sosialisasi dan pendampingan." },
};

export function angka(n) {
  return Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

// Rupiah ringkas untuk kartu dan grafik: Rp1,2 jt / Rp3,4 M
export function rupiahRingkas(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return `Rp${(v / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (v >= 1e6) return `Rp${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return `Rp${Math.round(v).toLocaleString("id-ID")}`;
}

// Rupiah lengkap untuk tabel dan ekspor
export function rupiah(n) {
  return `Rp${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;
}

export function persen(n) {
  return `${Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

export function BadgeStatus({ status, label }) {
  const w = WARNA_STATUS[status] || WARNA_STATUS["belum-aktif"];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${w.badge}`}>
      <i className="inline-block h-2 w-2 rounded-full" style={{ background: w.titik }} />
      {label}
    </span>
  );
}