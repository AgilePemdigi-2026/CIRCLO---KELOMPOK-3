
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  Store,
  MapPin,
  Package,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import MaterialImage from "@/components/MaterialImage";

export const dynamic = "force-dynamic";

const rupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function adminClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase belum dikonfigurasi di server.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export default async function TokoPage({ params, searchParams }) {
  // Mendukung Next.js terbaru yang menggunakan async params
  const { id } = await params;
const { from } = await searchParams;
const materialAsal = Number(from);

const kembaliKe = Number.isSafeInteger(materialAsal) && materialAsal > 0
  ? `/katalog/${materialAsal}`
  : "/marketplace";
  const idSeller = Number(id);

  if (!Number.isInteger(idSeller) || idSeller <= 0) {
    notFound();
  }

  const admin = adminClient();

  // Mengambil profil toko
  const { data: seller, error: sellerError } = await admin
    .from("penjual")
    .select(
      "id_seller, nama_seller, status_seller"
    )
    .eq("id_seller", idSeller)
    .maybeSingle();

  if (sellerError) {
    throw new Error(
      `Gagal memuat toko: ${sellerError.message}`
    );
  }

  if (!seller) {
    notFound();
  }

  // Mengambil material berdasarkan ID toko
  const { data: materials, error: materialError } = await admin
    .from("material")
    .select(
      "id_material, id_seller, nama_material, kategori, harga, stok, satuan, lokasi, kota, status_material, foto_url"
    )
    .eq("id_seller", idSeller)
    .eq("status_material", true)
    .gt("stok", 0)
    .order("id_material", { ascending: false });

  if (materialError) {
    throw new Error(
      `Gagal memuat produk toko: ${materialError.message}`
    );
  }

  const produk = materials || [];

  const lokasiToko =
    produk.find((item) => item.lokasi || item.kota);

  const lokasi =
    lokasiToko?.lokasi ||
    lokasiToko?.kota ||
    "Lokasi belum tersedia";

  const kategoriToko = [
    ...new Set(
      produk.map((item) => item.kategori).filter(Boolean)
    ),
  ];

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#f5f8f2] pb-16">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* KEMBALI */}
       <Link
  href={kembaliKe}
  className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-[#3f6a0b]"
>
  <ArrowLeft size={17} />
  Kembali ke Detail Material
</Link>

          {/* HEADER TOKO */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="h-28 bg-gradient-to-r from-[#244b20] via-[#3f6a0b] to-[#78a83b] sm:h-36" />

            <div className="px-6 pb-7 sm:px-8">
              <div className="-mt-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-[#e9f7df] text-[#3f6a0b] shadow-sm sm:h-24 sm:w-24">
                    <Store size={38} />
                  </div>

                  <div className="pb-1">
                    <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                      {seller.nama_seller}
                    </h1>

                    <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <MapPin size={15} />
                      {lokasi}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${
                    seller.status_seller
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <CheckCircle2 size={15} />
                  {seller.status_seller
                    ? "Toko Aktif"
                    : "Toko Tidak Aktif"}
                </span>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-5">
                <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
                  Selamat datang di toko{" "}
                  <strong>{seller.nama_seller}</strong>.
                  Jelajahi berbagai material yang tersedia
                  dan temukan kebutuhan materialmu melalui
                  marketplace CIRCLO.
                </p>
              </div>
            </div>
          </section>

          {/* INFORMASI TOKO */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-50 p-3 text-[#3f6a0b]">
                  <Package size={22} />
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Produk Tersedia
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {produk.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-50 p-3 text-[#3f6a0b]">
                  <Store size={22} />
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Kategori Material
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {kategoriToko.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-50 p-3 text-[#3f6a0b]">
                  <MapPin size={22} />
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Lokasi Material
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {lokasi}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PRODUK TOKO */}
          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Produk dari Toko Ini
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Jelajahi material yang tersedia dari{" "}
                  {seller.nama_seller}.
                </p>
              </div>

              <span className="rounded-full bg-green-100 px-4 py-2 text-xs font-semibold text-green-800">
                {produk.length} Produk
              </span>
            </div>

            {produk.length === 0 ? (
              <div className="mt-6 rounded-xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
                <Package
                  size={40}
                  className="mx-auto text-gray-400"
                />

                <h3 className="mt-4 font-semibold text-gray-800">
                  Belum Ada Produk Tersedia
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Toko ini belum memiliki material yang
                  tersedia untuk dibeli.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {produk.map((item) => (
                  <Link
                    key={item.id_material}
                    href={`/katalog/${item.id_material}`}
                    className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    {/* GAMBAR PRODUK */}
                    <div className="relative h-48 overflow-hidden bg-[#f5f8f2]">
                      <MaterialImage
                        materialId={item.id_material}
                        materialName={item.nama_material}
                        category={item.kategori}
                        imageUrl={item.foto_url || undefined}
                        imageAlt={item.nama_material}
                        className="h-full w-full"
                      />

                      <span className="absolute left-3 top-3 rounded-full bg-[#e5f7c0] px-3 py-1 text-xs font-semibold text-[#3f6a0b]">
                        {item.kategori || "Material"}
                      </span>
                    </div>

                    {/* INFORMASI PRODUK */}
                    <div className="p-5">
                      <h3 className="font-bold text-gray-900 transition group-hover:text-[#3f6a0b]">
                        {item.nama_material}
                      </h3>

                      <p className="mt-3 text-lg font-bold text-[#3f6a0b]">
                        {rupiah(item.harga)}
                        <span className="text-xs font-normal text-gray-500">
                          /{item.satuan || "unit"}
                        </span>
                      </p>

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          Stok: {item.stok}{" "}
                          {item.satuan || "unit"}
                        </span>

                        <span className="flex items-center gap-1">
                          <MapPin size={13} />
                          {item.lokasi ||
                            item.kota ||
                            "-"}
                        </span>
                      </div>

                      <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-[#3f6a0b] px-4 py-3 text-sm font-semibold text-white transition group-hover:bg-[#345609]">
                        Lihat Detail
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
