"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "../../lib/supabase/client";
import Footer from "../../components/Footer";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");
    setIsError(false);

    // Validasi form
    if (!email.trim() || !password) {
      setIsError(true);
      setMessage("Email dan kata sandi harus diisi.");
      return;
    }

    setLoading(true);

    // Login ke Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    // Jika login gagal
    if (error) {
      setIsError(true);

      if (error.message === "Invalid login credentials") {
        setMessage("Email atau kata sandi tidak sesuai.");
      } else if (error.message === "Email not confirmed") {
        setMessage("Email belum dikonfirmasi.");
      } else {
        setMessage(error.message);
      }

      setLoading(false);
      return;
    }

    // Jika login berhasil
    if (data.user) {
      setIsError(false);
      setMessage("Login berhasil.");

      setTimeout(() => {
        router.replace("/buyer");
      }, 500);
    }

    setLoading(false);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eef7fb]">

      {/* ================= MAIN ================= */}
      <main className="min-h-0 flex-1">
        <div className="grid h-full grid-cols-1 lg:grid-cols-2">

          {/* ================= LEFT SIDE ================= */}
          <section className="relative hidden h-full overflow-hidden bg-gradient-to-br from-[#d9ecd6] via-[#e4f0eb] to-[#e3eff7] lg:block">

            <div className="flex h-full flex-col px-8 py-6 xl:px-10">

              {/* Logo */}
              <div className="flex items-center gap-2">
                <Image
                  src="/circlo-logo.png"
                  alt="Logo CIRCLO"
                  width={32}
                  height={32}
                  className="rounded-md"
                />

                <span className="text-[17px] font-bold text-[#3f740b]">
                  CIRCLO
                </span>
              </div>

              {/* Hero */}
              <div className="mt-3 max-w-[385px]">

                <h1 className="text-[34px] font-bold leading-[1.08] tracking-[-0.5px] text-[#16222b] xl:text-[38px]">
                  Memberdayakan
                  <br />
                  Kepedulian
                  <br />
                  Komunitas
                </h1>

                <p className="mt-3 max-w-[370px] text-[12px] leading-[1.65] text-[#5b666a]">
                  Bergabunglah dengan platform ekonomi sirkular yang
                  menjembatani data kompleks dengan aksi komunitas yang
                  berpusat pada manusia. Gaya hidup berkelanjutan yang
                  sederhana, cerdas, dan menarik.
                </p>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#bdca70] px-4 py-2 text-[9px] font-semibold text-[#53620d]">
                  <span>🌱</span>
                  Bergabung dengan 10rb+ Relawan Hari Ini
                </div>

              </div>

              {/* Bottom Visual */}
              <div className="mt-auto pb-2 pt-2">

                <div className="relative h-[175px] w-full max-w-[390px] overflow-hidden rounded-lg">

                  <Image
                    src="/gerakan-daur-ulang.jpg"
                    alt="Gerakan Daur Ulang Lokal"
                    fill
                    priority
                    className="object-cover"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Text */}
                  <div className="absolute bottom-4 left-4 z-10 text-white">

                    <p className="text-[7px] uppercase tracking-widest text-white/80">
                      Inisiatif Dampak
                    </p>

                    <p className="mt-1 text-[15px] font-semibold">
                      Gerakan Daur Ulang Lokal
                    </p>

                  </div>

                </div>

              </div>

            </div>
          </section>

          {/* ================= RIGHT SIDE ================= */}
          <section className="flex h-full min-h-0 flex-col bg-[#f2f8fc]">

            {/* Header */}
            <header className="flex h-[58px] shrink-0 items-center border-b border-[#d9e1df] bg-white px-6">

              <div className="flex items-center gap-2">

                <Image
                  src="/circlo-logo.png"
                  alt="Logo CIRCLO"
                  width={26}
                  height={26}
                  className="rounded-md"
                />

                <span className="text-[16px] font-bold text-[#39750c]">
                  CIRCLO
                </span>

              </div>

            </header>

            {/* Login Area */}
            <div className="flex min-h-0 flex-1 items-center justify-center px-6">

              {/* Login Card */}
              <div className="w-full max-w-[340px] rounded-xl bg-white px-7 py-6 shadow-[0_6px_24px_rgba(40,65,80,0.07)]">

                {/* Tabs */}
                <div className="grid grid-cols-2 border-b border-[#d8ded7]">

                  <button
                    type="button"
                    className="border-b-2 border-[#4e820e] pb-3 text-[10px] font-semibold text-[#4e820e]"
                  >
                    Masuk
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/register")}
                    className="pb-3 text-[10px] font-medium text-[#51585a] transition hover:text-[#4e820e]"
                  >
                    Buat Akun
                  </button>

                </div>

                {/* Heading */}
                <div className="mt-5 text-center">

                  <h2 className="text-[18px] font-bold text-[#182126]">
                    Selamat Datang Kembali
                  </h2>

                  <p className="mt-1 text-[9px] text-[#727a7d]">
                    Lanjutkan perjalanan kepedulian Anda.
                  </p>

                </div>

                {/* ================= LOGIN FORM ================= */}
                <form onSubmit={handleLogin} className="mt-5">

                  {/* Email */}
                  <div>

                    <label className="mb-1 block text-[9px] font-semibold text-[#42494c]">
                      Alamat Email
                    </label>

                    <div className="relative">

                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px]">
                        ✉
                      </span>

                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="relawan@komunitas.org"
                        required
                        className="h-[38px] w-full rounded-md border border-[#aab4b4] bg-white pl-9 pr-3 text-[10px] outline-none transition focus:border-[#4e820e] focus:ring-1 focus:ring-[#4e820e]"
                      />

                    </div>

                  </div>

                  {/* Password */}
                  <div className="mt-3">

                    <div className="mb-1 flex items-center justify-between">

                      <label className="text-[9px] font-semibold text-[#42494c]">
                        Kata Sandi
                      </label>

                      <button
                        type="button"
                        className="text-[8px] font-semibold text-[#4e820e]"
                      >
                        Lupa?
                      </button>

                    </div>

                    <div className="relative">

                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px]">
                        🔒
                      </span>

                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan kata sandi"
                        required
                        className="h-[38px] w-full rounded-md border border-[#aab4b4] bg-white pl-9 pr-9 text-[10px] outline-none transition focus:border-[#4e820e] focus:ring-1 focus:ring-[#4e820e]"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]"
                      >
                        {showPassword ? "🙈" : "👁"}
                      </button>

                    </div>

                  </div>

                  {/* Message */}
                  {message && (
                    <div
                      className={`mt-3 rounded-md px-3 py-2 text-[9px] ${
                        isError
                          ? "bg-red-50 text-red-600"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {message}
                    </div>
                  )}

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 flex h-[36px] w-full items-center justify-center gap-2 rounded-md bg-[#347900] text-[10px] font-semibold text-white transition hover:bg-[#2b6500] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Memproses..." : "Masuk"}

                    {!loading && <span>→</span>}
                  </button>

                </form>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">

                  <div className="h-px flex-1 bg-[#d9ddd7]" />

                  <span className="text-[7px] text-[#737b7c]">
                    Atau lanjutkan dengan
                  </span>

                  <div className="h-px flex-1 bg-[#d9ddd7]" />

                </div>

                {/* Social Login */}
                <div className="grid grid-cols-2 gap-3">

                  <button
                    type="button"
                    className="h-[34px] rounded-md border border-[#ccd3ce] bg-white text-[9px] font-medium text-[#41494b] transition hover:bg-[#f7f8f7]"
                  >
                    <span className="mr-2 font-bold text-blue-500">
                      G
                    </span>
                    Google
                  </button>

                  <button
                    type="button"
                    className="h-[34px] rounded-md border border-[#ccd3ce] bg-white text-[9px] font-medium text-[#41494b] transition hover:bg-[#f7f8f7]"
                  >
                    🏛
                    <span className="ml-1">GovID</span>
                  </button>

                </div>

              </div>
            </div>
          </section>

        </div>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}