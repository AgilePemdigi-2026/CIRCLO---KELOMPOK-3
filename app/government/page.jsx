import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function GovernmentPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[900px] px-6 py-14 min-h-[60vh]">
        <h1 className="font-display text-[30px] font-semibold text-circlo-ink">Dashboard Pemerintah</h1>
        <p className="mt-3 text-[16px] leading-[1.6] text-circlo-muted">
          Pantau ekosistem material sirkular di wilayahmu melalui data material, penjual, dan aktivitas
          pengguna CIRCLO.
        </p>
      </main>
      <Footer />
    </>
  );
}
