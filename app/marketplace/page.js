
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

export default function MarketplacePage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMaterials() {
      try {
        if (!supabase) {
          throw new Error("Supabase belum dikonfigurasi.");
        }

        const { data, error: fetchError } = await supabase
          .from("material")
          .select(
            "id_material,nama_material,kategori,harga,stok,satuan,lokasi"
          )
          .eq("status_material", true)
          .gt("stok", 0)
          .order("id_material", { ascending: false });

        if (fetchError) throw fetchError;

        if (active) {
          setMaterials(data || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Gagal memuat material.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMaterials();

    return () => {
      active = false;
    };
  }, []);

  const rupiah = (angka) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(angka) || 0);

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-[1100px] px-6 py-10">
        <h1 className="text-3xl font-bold text-[#233328]">
          Material Catalog
        </h1>

        <p className="mt-2 text-gray-600">
          Temukan material sisa yang tersedia di CIRCLO.
        </p>

        {loading && (
          <p className="mt-8 text-gray-600">
            Memuat material...
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-8 rounded-lg bg-red-50 p-4 text-red-600"
          >
            Gagal memuat material: {error}
          </div>
        )}

        {!loading && !error && materials.length === 0 && (
          <p className="mt-8 rounded-lg bg-white p-6 text-center text-gray-600">
            Belum ada material yang tersedia.
          </p>
        )}

        {!loading && !error && materials.length > 0 && (
          <>
            <p className="mt-6 text-sm text-gray-600">
              {materials.length} material tersedia
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {materials.map((material) => (
                <div
                  key={material.id_material}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  {/* Placeholder foto */}
                  <div className="flex h-44 items-center justify-center bg-[#eef5e8]">
                    <div className="text-center">
                      <span className="text-4xl">♻️</span>  
                      <p className="mt-2 text-sm text-gray-500">
                        Foto belum tersedia
                      </p>
                    </div>
                  </div>

                  <div className="p-5">
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      {material.kategori || "Material"}
                    </span>

                    <h2 className="mt-3 min-h-[48px] font-semibold text-[#233328]">
                      {material.nama_material}
                    </h2>

                    <p className="mt-3 text-lg font-bold text-[#3f6a0b]">
                      {rupiah(material.harga)}
                      <span className="text-sm font-normal text-gray-500">
                        /{material.satuan || "unit"}
                      </span>
                    </p>

                    <div className="mt-3 space-y-1 text-sm text-gray-600">
                      <p>
                        Stok: {material.stok}{" "}
                        {material.satuan || "unit"}
                      </p>

                      <p>
                        Lokasi: {material.lokasi || "-"}
                      </p>
                    </div>

                    <Link
                      href={{
                        pathname: "/checkout",
                        query: {
                          id: material.id_material,
                          nama: material.nama_material,
                          harga: material.harga,
                          stok: material.stok,
                          satuan: material.satuan || "unit",
                        },
                      }}
                      className="mt-5 block rounded-lg bg-[#3f6a0b] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#345609]"
                    >
                      Checkout
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
