import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CIRCLO - Cari Material",
  description: "AI Matching & Recommendation Material",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-[#f8fafc] text-gray-800 antialiased min-h-screen flex flex-col`}>
        {/* Header Reusable */}
        <Header />
        
        {/* Konten Halaman */}
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}