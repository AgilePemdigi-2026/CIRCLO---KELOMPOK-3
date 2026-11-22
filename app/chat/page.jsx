import Navbar from '@/components/Navbar';
import RoleGate from '@/components/RoleGate';
import ChatApp from '@/components/chat/ChatApp';

export const metadata = { title: 'Chat | CIRCLO' };

// Halaman Chat Buyer-Seller (SRS 3.1.13 dan 4.10).
// Tata letak setinggi layar penuh: navbar di atas tetap diam dan halaman tidak ikut scroll.
// Yang scroll hanya daftar percakapan dan riwayat pesan di dalam kotaknya masing-masing.
// Footer tidak ditampilkan di halaman ini.
export default function ChatPage() {
  return (
    <div className="flex h-[100dvh] min-h-[560px] flex-col overflow-hidden">
      <div className="shrink-0">
        <Navbar />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <RoleGate allow={['buyer', 'seller']}>
          <ChatApp />
        </RoleGate>
      </div>
    </div>
  );
}
