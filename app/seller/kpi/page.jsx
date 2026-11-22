'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  Loader2,
  Package,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import { useSellerOrders } from '@/components/seller/useSellerOrders';
import { statusKey, statusLabel } from '@/components/seller/orderStatus';
import { getAccessToken } from '@/lib/auth';

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const angka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

function Kartu({ label, value, hint, icon: Icon }) {
  return (
    <article className="rounded-2xl bg-white p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13.5px] font-medium text-circlo-muted">{label}</p>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-circlo-soft">
          <Icon className="h-5 w-5 text-circlo-green" />
        </span>
      </div>
      <p className="mt-4 font-display text-[28px] font-semibold text-circlo-ink">{value}</p>
      <p className="mt-1 text-[13px] text-circlo-muted">{hint}</p>
    </article>
  );
}

function tanggal(value) {
  const time = Date.parse(value || '');
  if (Number.isNaN(time)) return '-';
  return new Date(time).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function SellerKpiPage() {
  const { loading, error, needsLogin, orders, seller } = useSellerOrders();
  const [materials, setMaterials] = useState([]);
  const [materialLoading, setMaterialLoading] = useState(true);
  const [materialError, setMaterialError] = useState('');

  useEffect(() => {
    let aktif = true;

    (async () => {
      const token = await getAccessToken();
      if (!token) {
        if (aktif) setMaterialLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/materials', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Gagal memuat material.');
        if (aktif) setMaterials(Array.isArray(data.rows) ? data.rows : []);
      } catch (err) {
        if (aktif) setMaterialError(err?.message || 'Gagal memuat material.');
      } finally {
        if (aktif) setMaterialLoading(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, []);

  const ringkas = useMemo(() => {
    const selesai = orders.filter((order) => statusKey(order.status_pesanan) === 'completed');
    const totalPenjualan = selesai.reduce(
      (sum, order) => sum + Number(order.seller_total || 0),
      0,
    );
    const rataRata = selesai.length ? totalPenjualan / selesai.length : 0;

    const aktif = materials.filter(
      (material) =>
        material.status_material !== false && Number(material.stok) > 0,
    );

    const terlaris = new Map();
    for (const order of orders) {
      if (statusKey(order.status_pesanan) === 'rejected') continue;
      for (const item of order.items || []) {
        const key = item.id_material;
        const row = terlaris.get(key) || {
          id_material: key,
          nama: item.nama_material || `Material #${key}`,
          satuan: item.satuan || 'unit',
          qty: 0,
          omzet: 0,
        };
        row.qty += Number(item.kuantitas_pesan || 0);
        row.omzet += Number(item.subtotal || 0);
        terlaris.set(key, row);
      }
    }

    return {
      totalPenjualan,
      pesananMasuk: orders.length,
      materialAktif: aktif.length,
      rataRata,
      selesai: selesai.length,
      terlaris: [...terlaris.values()]
        .sort((a, b) => b.qty - a.qty || b.omzet - a.omzet)
        .slice(0, 5),
      stokRendah: aktif
        .filter((material) => Number(material.stok) <= 5)
        .sort((a, b) => Number(a.stok) - Number(b.stok))
        .slice(0, 5),
    };
  }, [orders, materials]);

  const terbaru = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.tgl_pesan || 0).getTime() - new Date(a.tgl_pesan || 0).getTime(),
        )
        .slice(0, 5),
    [orders],
  );

  const sedangMemuat = loading || materialLoading;

  return (
    <>
      <Navbar />
      <RoleGate allow={['seller']}>
        <main className="mx-auto w-full max-w-[1100px] px-6 py-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-[30px] font-semibold leading-tight text-circlo-ink">
                KPI Ringkasan Penjualan
              </h1>
              <p className="mt-2 text-[15px] text-circlo-muted">
                Ringkasan performa toko{seller?.nama_seller ? ` ${seller.nama_seller}` : ''} dari
                pesanan dan material yang tercatat.
              </p>
            </div>
            <Link
              href="/seller/orders"
              className="inline-flex items-center gap-2 rounded-lg bg-circlo-green px-5 py-2.5 text-[14px] font-medium text-white hover:brightness-110"
            >
              Lihat Pesanan <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {needsLogin && (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-[14px] text-amber-800">
              <p className="font-semibold">Masuk dulu untuk membuka KPI penjual.</p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-lg bg-circlo-green px-5 py-2.5 text-[14px] font-medium text-white hover:brightness-110"
              >
                Masuk
              </Link>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-[14px] text-red-700"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Data KPI gagal dimuat</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          {materialError && !error && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
              Jumlah material aktif belum bisa dihitung: {materialError}
            </div>
          )}

          {sedangMemuat && !needsLogin && !error && (
            <div className="mt-8 flex items-center gap-2 text-[14px] text-circlo-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat KPI...
            </div>
          )}

          {!sedangMemuat && !needsLogin && !error && (
            <>
              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <Kartu
                  label="Total Penjualan"
                  value={rupiah.format(ringkas.totalPenjualan)}
                  hint={`Dari ${ringkas.selesai} pesanan selesai`}
                  icon={Wallet}
                />
                <Kartu
                  label="Pesanan Masuk"
                  value={angka.format(ringkas.pesananMasuk)}
                  hint="Seluruh pesanan yang tercatat"
                  icon={ShoppingBag}
                />
                <Kartu
                  label="Material Aktif"
                  value={angka.format(ringkas.materialAktif)}
                  hint="Tayang dan memiliki stok"
                  icon={Package}
                />
                <Kartu
                  label="Rata-rata Nilai Pesanan"
                  value={rupiah.format(ringkas.rataRata)}
                  hint="Per pesanan selesai"
                  icon={TrendingUp}
                />
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-2xl bg-white p-6 shadow-card">
                  <h2 className="font-display text-[20px] font-semibold text-circlo-ink">
                    Pesanan Terbaru
                  </h2>
                  <p className="mt-1 text-[14px] text-circlo-muted">
                    Lima pesanan terakhir beserta statusnya.
                  </p>

                  {terbaru.length === 0 ? (
                    <div className="mt-5 rounded-xl border border-dashed border-circlo-line p-8 text-center text-[14px] text-circlo-muted">
                      Belum ada data pesanan.
                    </div>
                  ) : (
                    <ul className="mt-5 divide-y divide-circlo-line">
                      {terbaru.map((order) => (
                        <li key={order.id_pesanan} className="flex items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-circlo-ink">
                              #{order.id_pesanan} · {order.buyer?.nama_buyer || 'Pembeli'}
                            </p>
                            <p className="mt-0.5 text-[12.5px] text-circlo-muted">
                              {tanggal(order.tgl_pesan)} · {order.items?.length || 0} material
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[13.5px] font-semibold text-circlo-ink">
                              {rupiah.format(Number(order.seller_total || 0))}
                            </p>
                            <p className="mt-0.5 text-[12px] text-circlo-muted">
                              {statusLabel(order.status_pesanan, order.metode_kirim)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-2xl bg-white p-6 shadow-card">
                  <h2 className="font-display text-[20px] font-semibold text-circlo-ink">
                    Material Terlaris
                  </h2>
                  <p className="mt-1 text-[14px] text-circlo-muted">
                    Diurutkan berdasarkan jumlah unit yang dipesan.
                  </p>

                  {ringkas.terlaris.length === 0 ? (
                    <div className="mt-5 rounded-xl border border-dashed border-circlo-line p-8 text-center text-[14px] text-circlo-muted">
                      Belum ada data material terjual.
                    </div>
                  ) : (
                    <ol className="mt-5 space-y-3">
                      {ringkas.terlaris.map((item, index) => (
                        <li key={item.id_material} className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-circlo-soft text-[12px] font-bold text-circlo-green">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold text-circlo-ink">
                              {item.nama}
                            </p>
                            <p className="text-[12.5px] text-circlo-muted">
                              {angka.format(item.qty)} {item.satuan} · {rupiah.format(item.omzet)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>

              {ringkas.stokRendah.length > 0 && (
                <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-[18px] font-semibold text-amber-900">
                        Stok Perlu Perhatian
                      </h2>
                      <p className="mt-1 text-[13.5px] text-amber-800">
                        Material aktif dengan stok 5 atau kurang.
                      </p>
                    </div>
                    <Link
                      href="/my-materials"
                      className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-[13px] font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      Kelola Material
                    </Link>
                  </div>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {ringkas.stokRendah.map((material) => (
                      <li
                        key={material.id_material}
                        className="rounded-xl border border-amber-200 bg-white px-4 py-3"
                      >
                        <p className="truncate text-[13.5px] font-semibold text-circlo-ink">
                          {material.nama_material}
                        </p>
                        <p className="mt-1 text-[12.5px] text-amber-800">
                          Sisa {angka.format(Number(material.stok || 0))} {material.satuan || 'unit'}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="mt-6 text-[12px] text-circlo-muted">
                Total penjualan dihitung dari pesanan berstatus Selesai. Angka material adalah volume
                yang tercatat, bukan klaim dampak lingkungan.
              </p>
            </>
          )}
        </main>
        <Footer />
      </RoleGate>
    </>
  );
}
