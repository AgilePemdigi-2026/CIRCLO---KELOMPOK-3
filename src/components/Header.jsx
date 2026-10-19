"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import logoCirclo from "../../assets/LOGO CIRCLO.png";

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { name: "Beranda", path: "/" },
    { name: "Material Catalog", path: "/katalog" },
    { name: "Cari Material", path: "/cari-material" },
    { name: "Pesanan", path: "/pesanan" },
    { name: "Chat", path: "/chat" },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo Kiri */}
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <Image
              src={logoCirclo}
              alt="Logo CIRCLO"
              width={40}
              height={40}
              priority
              className="w-10 h-10 object-contain"
            />
            <span className="text-2xl font-bold text-[#4d7c0f] tracking-tight">CIRCLO</span>
          </Link>

          {/* Menu Tengah (Desktop) */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`font-medium pb-6 mt-6 border-b-2 transition-all ${
                    isActive
                      ? "text-[#4d7c0f] font-semibold border-[#4d7c0f]"
                      : "text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Profil Kanan */}
          <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
            <svg className="w-6 h-6 text-[#4d7c0f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Profil</span>
          </div>

        </div>
      </div>
    </header>
  );
}