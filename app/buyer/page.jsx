import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function BuyerPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[900px] px-6 py-14 min-h-[60vh]">
        <h1 className="font-display text-[30px] font-semibold text-circlo-ink">Welcome, Buyer</h1>
        <p className="mt-3 text-[16px] leading-[1.6] text-circlo-muted">
          Temukan material daur ulang yang cocok untuk kebutuhan usahamu. Jelajahi katalog material atau
          cari lewat asisten AI CIRCLO untuk mendapatkan rekomendasi yang sesuai.
        </p>
      </main>
      <Footer />
    </>
  );
}
