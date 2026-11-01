
"use client";

export default function AlamatPengirimanStep({
  data,
  onChange,
}) {
  const update = (field, value) => {
    onChange({ [field]: value });
  };

  const inputClass =
    "mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#3f6a0b] focus:ring-1 focus:ring-[#3f6a0b]";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-circlo-ink">
          Alamat Pengiriman
        </h2>
        <p className="mt-1 text-sm text-circlo-muted">
          Lengkapi informasi penerima dan alamat pengiriman.
        </p>
      </div>

      {data.metodeKirim === "Ambil di tempat" ? (
        <div className="rounded-xl bg-green-50 p-5 text-sm text-green-800">
          Kamu memilih ambil di tempat.
          Alamat pengiriman tidak diperlukan.
        </div>
      ) : (
        <div className="space-y-5">

          <div>
            <label className="text-sm font-medium">
              Nama Penerima
            </label>
            <input
              type="text"
              placeholder="Masukkan nama penerima"
              value={data.namaPenerima || ""}
              onChange={(e) =>
                update("namaPenerima", e.target.value)
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Nomor HP
            </label>
            <input
              type="tel"
              placeholder="08xxxxxxxxxx"
              value={data.nomorHp || ""}
              onChange={(e) =>
                update("nomorHp", e.target.value)
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Alamat Lengkap
            </label>
            <textarea
              rows={3}
              placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan"
              value={data.alamat || ""}
              onChange={(e) =>
                update("alamat", e.target.value)
              }
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">
                Kota/Kabupaten
              </label>
              <input
                type="text"
                placeholder="Contoh: Surabaya"
                value={data.kota || ""}
                onChange={(e) =>
                  update("kota", e.target.value)
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Provinsi
              </label>
              <input
                type="text"
                placeholder="Contoh: Jawa Timur"
                value={data.provinsi || ""}
                onChange={(e) =>
                  update("provinsi", e.target.value)
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Kode Pos
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="Contoh: 60286"
              value={data.kodePos || ""}
              onChange={(e) =>
                update(
                  "kodePos",
                  e.target.value.replace(/\D/g, "")
                )
              }
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}
