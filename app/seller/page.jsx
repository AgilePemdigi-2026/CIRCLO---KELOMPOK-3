import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import SellerDashboard from '@/components/seller/SellerDashboard';

export default function SellerPage() {
  return (
    <>
      <Navbar />
      <RoleGate allow={['seller']}>
        <SellerDashboard />
      </RoleGate>
      <Footer />
    </>
  );
}
