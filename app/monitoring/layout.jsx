import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MonitoringShell from "@/components/government/MonitoringShell";

export const metadata = { title: "Monitoring Ekosistem | CIRCLO" };

export default function MonitoringLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#f5f9ff]">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <MonitoringShell>{children}</MonitoringShell>
        </div>
      </main>
      <Footer />
    </>
  );
}