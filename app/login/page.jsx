"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
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

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

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
      setIsError(false);
      setMessage("Login berhasil.");
      router.replace(dashboardPathFor(roleFromUser(data.user)));
      return;
    }
  };

  return (
    <AuthShell
      activeTab="login"
      title="Selamat Datang Kembali"
      subtitle="Lanjutkan perjalanan kepedulian Anda."
    >
      <form onSubmit={handleLogin} className="space-y-3.5">
        <AuthField label="Alamat Email" icon={<MailIcon />}>
          <AuthInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="relawan@komunitas.org"
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
      </form>
    </AuthShell>
  );
}
