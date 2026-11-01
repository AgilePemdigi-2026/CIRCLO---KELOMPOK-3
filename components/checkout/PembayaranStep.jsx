const metode = [
  { value: 'Transfer Bank', hint: 'Transfer manual ke rekening penjual.' },
  { value: 'Virtual Account', hint: 'Nomor VA dibuat saat pesanan dikonfirmasi.' },
  { value: 'COD', hint: 'Bayar tunai saat material diterima atau diambil.' },
];

export default function PembayaranStep({ data, onChange }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-circlo-ink">Pembayaran</h2>
        <p className="mt-1 text-[14px] text-circlo-muted">
          Pilih metode pembayaran yang akan digunakan untuk pesanan ini.
        </p>
      </div>

      <div className="space-y-3">
        {metode.map((item) => {
          const selected = data.metodePembayaran === item.value;
          return (
            <label
              key={item.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition ${
                selected ? 'border-circlo-green bg-circlo-soft/50' : 'border-circlo-line bg-white hover:bg-circlo-bg'
              }`}
            >
              <input
                type="radio"
                name="metodePembayaran"
                value={item.value}
                checked={selected}
                onChange={() => onChange({ metodePembayaran: item.value })}
                className="mt-0.5 h-4 w-4 accent-circlo-green"
              />
              <span>
                <span className="block text-[14px] font-medium text-circlo-ink">{item.value}</span>
                <span className="mt-0.5 block text-[13px] text-circlo-muted">{item.hint}</span>
              </span>
            </label>
          );
        })}
      </div>

      <p className="rounded-lg border border-circlo-line bg-circlo-bg px-4 py-3 text-[13px] text-circlo-muted">
        Integrasi pembayaran belum aktif. Pilihan ini disimpan di state checkout sampai tersambung ke penyedia pembayaran.
      </p>
    </div>
  );
}
