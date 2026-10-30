export default function JumlahPesananStep({ data, onChange }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-circlo-ink">Tentukan jumlah pesanan</h2>
        <p className="mt-1 text-[14px] text-circlo-muted">
          Masukkan jumlah material yang ingin dibeli sesuai stok yang tersedia.
        </p>
      </div>

      <label className="block text-[14px]">
        <span className="mb-2 block font-medium text-circlo-ink">Jumlah</span>
        <input
          type="number"
          min="1"
          value={data.jumlah}
          onChange={(event) => onChange({ jumlah: event.target.value })}
          className="h-[46px] w-full rounded-lg border border-circlo-fieldline bg-circlo-field px-4 text-[15px] outline-none transition focus:border-circlo-green focus:bg-white"
        />
      </label>

      <label className="block text-[14px]">
        <span className="mb-2 block font-medium text-circlo-ink">Metode pengiriman</span>
        <select
          value={data.metodeKirim}
          onChange={(event) => onChange({ metodeKirim: event.target.value })}
          className="h-[46px] w-full rounded-lg border border-circlo-fieldline bg-circlo-field px-4 text-[15px] outline-none transition focus:border-circlo-green focus:bg-white"
        >
          <option>Dikirim</option>
          <option>Ambil di tempat</option>
        </select>
      </label>
    </div>
  );
}
