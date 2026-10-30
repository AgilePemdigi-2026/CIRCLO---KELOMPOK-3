import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import CheckoutFlow from '@/components/checkout/CheckoutFlow';

export default function CheckoutPage() {
  return (
    <>
      <Navbar />
      <RoleGate allow={['buyer']}>
        <main className="mx-auto w-full max-w-[1100px] px-6 py-10">
          <h1 className="font-display text-[30px] font-semibold leading-tight text-circlo-ink">Checkout</h1>
          <p className="mt-2 text-[15px] text-circlo-muted">
            Selesaikan pesanan dalam tiga langkah: jumlah pesanan, alamat, lalu pembayaran.
          </p>
          <CheckoutFlow />
        </main>
        <Footer />
      </RoleGate>
    </>
  );
}
