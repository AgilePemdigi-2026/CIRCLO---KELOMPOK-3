import Navbar from '@/components/Navbar';

// Placeholder: halaman marketplace dikerjakan anggota lain. Cukup jadi tujuan redirect setelah Confirm.
export default function MarketplacePlaceholder() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[736px] px-8 pt-24 text-center">
        <h1 className="font-display text-[28px] font-semibold">Marketplace</h1>
        <p className="mt-3 text-circlo-muted">Halaman ini masih placeholder. Material yang dikonfirmasi akan tampil di sini setelah katalog tersambung.</p>
      </main>
    </>
  );
}
