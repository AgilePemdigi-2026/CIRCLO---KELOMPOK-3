
"use client";

import { useState } from "react";
import Link from "next/link";
import OrderModal from "@/components/OrderModal";

export default function MaterialOrderPanel({ material }) {
  const [open, setOpen] = useState(false);

  const stok = Number(material?.stok || 0);
  const harga = Number(material?.harga);

  const bisaCheckout =
    material?.id_material != null &&
    stok > 0 &&
    Number.isFinite(harga) &&
    harga >= 0;

  return (
    <div className="mt-6 space-y-3">

      {/* Pemesanan lama - tetap dipertahankan */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={stok <= 0}
        className="rounded-lg bg-[#3f6a0b] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {stok > 0 ? "Pesan material ini" : "Stok habis"}
      </button>

      {/* Tombol menuju Checkout Sprint 2 */}
      {bisaCheckout && (
        <div>
          <Link
            href={{
              pathname: "/checkout",
              query: {
                id: material.id_material,
                nama: material.nama_material || "Material",
                harga: harga,
                stok: stok,
                satuan: material.satuan || "unit",
              },
            }}
            className="inline-block rounded-lg border border-[#3f6a0b] px-5 py-3 text-sm font-semibold text-[#3f6a0b] hover:bg-green-50"
          >
            Checkout 3 Langkah
          </Link>
        </div>
      )}

      {open && (
        <OrderModal
          material={material}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
