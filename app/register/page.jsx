"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const GREEN = "#356b00";

function Icon({ children }) {
  return (
    <svg
      className="h-4 w-4 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const UserIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </Icon>
);
const MailIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icon>
);
const LockIcon = () => (
  <Icon>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);
const RoleIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
    <path d="M17 8h5M19.5 5.5v5" />
  </Icon>
);
const EyeIcon = ({ off }) => (
  <Icon>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </Icon>
);

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("buyer");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    setMessage("");
    setIsError(false);

    const cleanEmail = email.trim().toLowerCase();
    const cleanNama = nama.trim();

    if (!cleanNama || !cleanEmail || !password || !confirmPassword) {
      setIsError(true);
      setMessage("Semua data harus diisi.");
      return;
    }

    if (password.length < 6) {
      setIsError(true);
      setMessage("Password minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Konfirmasi password tidak sesuai.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          nama: cleanNama,
          role,
        },
      },
    });

    console.log("REGISTER DATA:", data);
    console.log("REGISTER ERROR:", error);

    if (error) {
      setIsError(true);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setIsError(false);
    setMessage("Registrasi berhasil.");

    setNama("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRole("buyer");

    setLoading(false);
  };

  const labelClass = "mb-1 block text-[11px] font-semibold text-gray-800";
  const fieldClass =
    "flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5 focus-within:border-[#356b00] focus-within:ring-1 focus-within:ring-[#356b00]";
  const inputClass =
    "w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400";

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
            Bergabunglah dengan platform ekonomi sirkular yang menjembatani
            data kompleks dengan aksi komunitas yang berpusat pada manusia.
            Gaya hidup berkelanjutan yang sederhana, cerdas, dan menarik.
          </p>

          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#b5c46a] px-4 py-2 text-[11px] font-semibold text-[#2f4a00]">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
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
          <img
            src="/circlo-logo.png"
            alt="CIRCLO"
            className="h-7 w-7 object-contain"
          />
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
                className="flex-1 pb-3 text-gray-600 hover:text-[#356b00]"
              >
                Masuk
              </button>
              <span
                className="flex-1 border-b-2 pb-3 text-center"
                style={{ borderColor: GREEN, color: GREEN }}
              >
                Buat Akun
              </span>
            </div>

            <h1 className="text-center text-xl font-bold text-gray-900">
              Buat Akun Baru
            </h1>
            <p className="mb-5 mt-1 text-center text-xs text-gray-500">
              Mulai perjalanan kepedulian Anda.
            </p>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className={labelClass}>Nama Lengkap</label>
                <div className={fieldClass}>
                  <UserIcon />
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama lengkap"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Alamat Email</label>
                <div className={fieldClass}>
                  <MailIcon />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="relawan@komunitas.org"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Daftar Sebagai</label>
                <div className={fieldClass}>
                  <RoleIcon />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={inputClass}
                  >
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="government">Pemerintah/Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Kata Sandi</label>
                <div className={fieldClass}>
                  <LockIcon />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Tampilkan atau sembunyikan kata sandi"
                  >
                    <EyeIcon off={showPassword} />
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Konfirmasi Kata Sandi</label>
                <div className={fieldClass}>
                  <LockIcon />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label="Tampilkan atau sembunyikan konfirmasi kata sandi"
                  >
                    <EyeIcon off={showConfirm} />
                  </button>
                </div>
              </div>

              {message && (
                <p
                  className={`rounded-md px-3 py-2 text-xs ${
                    isError
                      ? "bg-red-50 text-red-600"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: GREEN }}
              >
                {loading ? "Mendaftarkan..." : "Daftar"}
                {!loading && <span>→</span>}
              </button>
            </form>

            {/* Pemisah */}
            <div className="my-5 flex items-center gap-3 text-[10px] text-gray-500">
              <span className="h-px flex-1 bg-gray-200" />
              Atau lanjutkan dengan
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white py-2 text-xs font-medium text-gray-800 hover:bg-gray-50"
              >
                <span className="font-bold text-blue-600">G</span> Google
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white py-2 text-xs font-medium text-gray-800 hover:bg-gray-50"
              >
                <span>🏛</span> GovID
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}