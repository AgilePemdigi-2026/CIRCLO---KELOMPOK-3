import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function SellerPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[900px] px-6 py-14 min-h-[60vh]">
        <h1 className="font-display text-[30px] font-semibold text-circlo-ink">Dashboard Seller</h1>
        <p className="mt-3 text-[16px] leading-[1.6] text-circlo-muted">
          Kelola material yang kamu unggah dan pantau hasil klasifikasi AI. Mulai dengan mengunggah
          material baru agar dapat ditemukan oleh calon pembeli.
        </p>
      </main>
      <Footer />
    </>
  );
}
