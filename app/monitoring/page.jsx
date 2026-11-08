import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GovernmentDashboard from "@/components/GovernmentDashboard";

export const metadata = { title: "Monitoring Ekosistem | CIRCLO" };

export default function MonitoringPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#f5f9ff]">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <GovernmentDashboard />
        </div>
      </main>
      <Footer />
    </>
  );
}
