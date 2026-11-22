"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Landmark } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import {
  AuthField,
  AuthInput,
  MailIcon,
  LockIcon,
  EyeIcon,
  GREEN,
} from "@/components/auth/AuthFields";
import { createClient } from "../../lib/supabase/client";
import { roleFromUser, dashboardPathFor } from "../../lib/roles";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isGovernment, setIsGovernment] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const toggleGovernment = () => {
    setIsGovernment(!isGovernment);
    setMessage("");
    setIsError(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");
    setIsError(false);

    if (!email.trim() || !password) {
      setIsError(true);
      setMessage("Email dan kata sandi harus diisi.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

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

    if (data.user) {
      const role = roleFromUser(data.user);

      // Mode pemerintah: tolak akun yang bukan government
      if (isGovernment && role !== "government") {
        await supabase.auth.signOut();
        setIsError(true);
        setMessage("Akun ini bukan akun Pemerintah.");
        setLoading(false);
        return;
      }

      setIsError(false);
      setMessage("Login berhasil.");
      router.replace(dashboardPathFor(role));
      return;
    }
  };

  return (
    <AuthShell
      activeTab="login"
      title={isGovernment ? "Masuk Pemerintah" : "Selamat Datang Kembali"}
      subtitle={
        isGovernment
          ? "Akses khusus untuk pemantauan ekosistem."
          : "Lanjutkan perjalanan kepedulian Anda."
      }
    >
      <form onSubmit={handleLogin} className="space-y-3.5">
        <AuthField label="Alamat Email" icon={<MailIcon />}>
          <AuthInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={
              isGovernment ? "petugas@instansi.go.id" : "relawan@komunitas.org"
            }
          />
        </AuthField>

        <AuthField
          label="Kata Sandi"
          icon={<LockIcon />}
          action={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Tampilkan atau sembunyikan kata sandi"
            >
              <EyeIcon off={showPassword} />
            </button>
          }
        >
          <AuthInput
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan kata sandi"
          />
        </AuthField>

        {message && (
          <p
            className={`rounded-md px-3 py-2 text-xs ${
              isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
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
          {loading ? "Memproses..." : "Masuk"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>

        {/* Pemisah */}
        <div className="flex items-center gap-3 pt-1">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-[11px] text-gray-500">Atau lanjutkan dengan</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Tombol Government */}
        <button
          type="button"
          onClick={toggleGovernment}
          className={`flex w-full items-center justify-center gap-2 rounded-md border py-2.5 text-xs font-semibold transition hover:bg-gray-50 ${
            isGovernment
              ? "border-green-700 bg-green-50 text-green-800"
              : "border-gray-200 bg-white text-gray-700"
          }`}
        >
          <Landmark className="h-4 w-4" />
          {isGovernment ? "Kembali ke login umum" : "Masuk sebagai Pemerintah"}
        </button>
      </form>
    </AuthShell>
  );
}