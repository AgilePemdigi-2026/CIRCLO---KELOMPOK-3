"use client";

import { useState } from "react";
import OrderModal from "@/components/OrderModal";

export default function MaterialOrderPanel({ material }) {
  const [open, setOpen] = useState(false);
  const stock = Number(material?.stok || 0);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={stock <= 0}
        className="w-full rounded-lg bg-[#3f6a0b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#345609] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {stock > 0 ? "Pesan material ini" : "Stok habis"}
      </button>
      {open && (
        <OrderModal material={material} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
