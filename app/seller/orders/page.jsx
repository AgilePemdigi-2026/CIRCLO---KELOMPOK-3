import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import SellerOrderHistory from '@/components/seller/SellerOrderHistory';

export default function SellerOrdersPage() {
  return (
    <>
      <Navbar />
      <RoleGate allow={['seller']}>
        <SellerOrderHistory />
      </RoleGate>
      <Footer />
    </>
  );
}
