
"use client";

import Link from "next/link";
import { MessageCircle, ShoppingCart, ShoppingBag } from "lucide-react";

export default function MaterialOrderPanel({ material }) {
  const stok = Number(material?.stok || 0);
  const harga = Number(material?.harga);

  const bisaCheckout =
    material?.id_material != null &&
    stok > 0 &&
    Number.isFinite(harga) &&
    harga >= 0;

  const checkoutUrl = {
    pathname: "/checkout",
    query: {
      id: material.id_material,
      nama: material.nama_material || "Material",
      harga,
      stok,
      satuan: material.satuan || "unit",
    },
  };

  return (
    <div className="mt-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* CHAT */}
        <button
          type="button"
          disabled
          title="Fitur chat toko akan segera tersedia"
          className="flex items-center justify-center gap-2 rounded-lg border border-[#3f6a0b] bg-white px-2 py-3 text-xs font-semibold text-[#3f6a0b] opacity-60 sm:text-sm"
        >
          <MessageCircle size={18} />
          Chat
        </button>

        {/* KERANJANG */}
        <button
          type="button"
          disabled
          title="Fitur keranjang akan segera tersedia"
          className="flex items-center justify-center gap-2 rounded-lg border border-[#3f6a0b] bg-white px-2 py-3 text-xs font-semibold text-[#3f6a0b] opacity-60 sm:text-sm"
        >
          <ShoppingCart size={18} />
          Keranjang
        </button>

        {/* CHECKOUT */}
        {bisaCheckout ? (
          <Link
            href={checkoutUrl}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#3f6a0b] px-2 py-3 text-xs font-semibold text-white transition hover:bg-[#345609] sm:text-sm"
          >
            <ShoppingBag size={18} />
            Checkout
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-300 px-2 py-3 text-xs font-semibold text-gray-600 sm:text-sm"
          >
            <ShoppingBag size={18} />
            Stok Habis
          </button>
        )}
      </div>
    </div>
  );
}
