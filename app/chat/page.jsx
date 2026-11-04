import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoleGate from '@/components/RoleGate';
import ChatApp from '@/components/chat/ChatApp';

export const metadata = { title: 'Chat | CIRCLO' };

// Halaman Chat Buyer-Seller (SRS 3.1.13 dan 4.10).
export default function ChatPage() {
  return (
    <>
      <Navbar />
      <RoleGate allow={['buyer', 'seller']}>
        <ChatApp />
      </RoleGate>
      <Footer />
    </>
  );
}
