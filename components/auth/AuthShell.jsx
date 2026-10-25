"use client";

import { useRouter } from "next/navigation";

import { GREEN } from "./AuthFields";

const TAB_ACTIVE = "flex-1 border-b-2 pb-3 text-center";
const TAB_INACTIVE = "flex-1 pb-3 text-center text-gray-600 hover:text-[#356b00]";

export default function AuthShell({ activeTab = "login", title, subtitle, children }) {
  const router = useRouter();
  const isLogin = activeTab === "login";

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      {/* ===== Panel kiri ===== */}
      <section className="relative hidden overflow-hidden bg-[#e3eff7] p-12 lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#c9e0b0]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-[#eadfbd]/80 blur-3xl" />

        <div className="relative flex items-center gap-2">
          <img
            src="/circlo-logo.png"
            alt="CIRCLO"
            className="h-9 w-9 rounded-lg bg-white object-contain p-1"
          />
          <span className="text-base font-bold" style={{ color: GREEN }}>
            CIRCLO
          </span>
        </div>

        <div className="relative mt-10">
          <h2 className="text-5xl font-extrabold leading-[1.1] text-slate-900">
            Memberdayakan
            <br />
            Kepedulian
            <br />
            Komunitas
          </h2>

          <p className="mt-6 max-w-md text-sm leading-relaxed text-slate-600">
            Bergabunglah dengan platform ekonomi sirkular yang menjembatani data
            kompleks dengan aksi komunitas yang berpusat pada manusia. Gaya hidup
            berkelanjutan yang sederhana, cerdas, dan menarik.
          </p>

          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#b5c46a] px-4 py-2 text-[11px] font-semibold text-[#2f4a00]">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4C9 4 4 9 4 16c0 1.5.3 2.8.8 4 .9-5 4-9 9.2-11-4 3-6.5 6.5-7.5 11.5 1 .3 2 .5 3.5.5 7 0 10-5 10-17Z" />
            </svg>
            Bergabung dengan 10rb+ Relawan Hari Ini
          </span>
        </div>

        {/* Kartu kaca di bawah */}
        <div className="relative mt-auto h-52 max-w-lg rounded-2xl border border-white/60 bg-white/30 p-5 backdrop-blur-sm">
          <div className="flex h-full flex-col justify-end">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/80">
              Inisiatif Dampak
            </p>
            <p className="text-lg font-semibold text-white">
              Gerakan Daur Ulang Lokal
            </p>
          </div>
        </div>
      </section>

      {/* ===== Panel kanan ===== */}
      <section className="flex flex-col bg-[#f3f8fb]">
        <header className="flex items-center gap-2 border-b border-gray-200 bg-white px-8 py-4">
          <img src="/circlo-logo.png" alt="CIRCLO" className="h-7 w-7 object-contain" />
          <span className="text-base font-bold" style={{ color: GREEN }}>
            CIRCLO
          </span>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm rounded-2xl bg-white px-7 py-6 shadow-md">
            {/* Tab */}
            <div className="mb-6 flex border-b border-gray-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className={isLogin ? TAB_ACTIVE : TAB_INACTIVE}
                style={isLogin ? { borderColor: GREEN, color: GREEN } : undefined}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => router.push("/register")}
                className={isLogin ? TAB_INACTIVE : TAB_ACTIVE}
                style={isLogin ? undefined : { borderColor: GREEN, color: GREEN }}
              >
                Buat Akun
              </button>
            </div>

            <h1 className="text-center text-xl font-bold text-gray-900">{title}</h1>
            <p className="mb-5 mt-1 text-center text-xs text-gray-500">{subtitle}</p>

            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
