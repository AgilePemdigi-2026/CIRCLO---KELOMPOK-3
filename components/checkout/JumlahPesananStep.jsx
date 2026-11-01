
export default function JumlahPesananStep({
  data,
  onChange,
  material,
}) {
  const stok = Number(material?.stok || 0);
  const jumlah = Number(data.jumlah) || 0;

  const ubahJumlah = (nilai) => {
    onChange({
      jumlah: Math.max(1, Math.min(stok, nilai)),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-circlo-ink">
          Tentukan Jumlah Pesanan
        </h2>
        <p className="mt-1 text-sm text-circlo-muted">
          Pilih jumlah material yang ingin dibeli.
        </p>
      </div>

      <div className="rounded-xl border border-circlo-line p-5">
        <p className="font-semibold text-circlo-ink">
          {material?.nama_material || "Material"}
        </p>
        <p className="mt-1 text-sm text-circlo-muted">
          Stok tersedia: {stok} {material?.satuan || "unit"}
        </p>

        <div className="mt-5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => ubahJumlah(jumlah - 1)}
            disabled={jumlah <= 1}
            className="h-10 w-10 rounded-lg border text-xl disabled:opacity-40"
          >
            -
          </button>

          <input
            type="number"
            min="1"
            max={stok}
            step="any"
            value={data.jumlah}
            onChange={(e) =>
              onChange({ jumlah: e.target.value })
            }
            className="h-10 w-24 rounded-lg border text-center"
          />

          <button
            type="button"
            onClick={() => ubahJumlah(jumlah + 1)}
            disabled={jumlah >= stok}
            className="h-10 w-10 rounded-lg border text-xl disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="metodeKirim"
          className="mb-2 block text-sm font-medium"
        >
          Metode Pengiriman
        </label>

        <select
          id="metodeKirim"
          value={data.metodeKirim}
          onChange={(e) =>
            onChange({ metodeKirim: e.target.value })
          }
          className="w-full rounded-lg border p-3"
        >
          <option value="Dikirim">Dikirim</option>
          <option value="Ambil di tempat">
            Ambil di tempat
          </option>
        </select>
      </div>
    </div>
  );
}
