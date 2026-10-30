export default function AlamatPengirimanStep({ data, onChange }) {
  const perluAlamat = data.metodeKirim === 'Dikirim';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-circlo-ink">Alamat pengiriman</h2>
        <p className="mt-1 text-[14px] text-circlo-muted">
          Lengkapi alamat penerima. Bagian ini wajib diisi jika material dikirim.
        </p>
      </div>

      <label className="block text-[14px]">
        <span className="mb-2 block font-medium text-circlo-ink">
          Alamat lengkap {perluAlamat ? '' : '(opsional)'}
        </span>
        <textarea
          rows={5}
          value={data.alamat}
          onChange={(event) => onChange({ alamat: event.target.value })}
          placeholder="Nama penerima, alamat lengkap, kota, kode pos"
          className="w-full rounded-lg border border-circlo-fieldline bg-circlo-field px-4 py-3 text-[15px] outline-none transition focus:border-circlo-green focus:bg-white"
        />
      </label>

      <p className="rounded-lg border border-circlo-line bg-circlo-bg px-4 py-3 text-[13px] text-circlo-muted">
        Metode saat ini: <span className="font-medium text-circlo-ink">{data.metodeKirim}</span>. Alamat akan disimpan ke data pembeli saat pesanan dibuat.
      </p>
    </div>
  );
}
