
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  CircleUserRound,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import FlashBanner from "@/components/FlashBanner";
import { LOGIN_PATH, useRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { clearDraft, clearResult } from "@/lib/storage";
import { NAV_BY_ROLE, dashboardPathFor } from "@/lib/roles";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useRole();

  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const logoutButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);

  const nav = NAV_BY_ROLE[role] || {
    links: [],
    profileLabel: "Profil",
  };
  // Menu aktif = path persis sama, atau path di bawahnya, KECUALI ada menu lain
  // yang lebih spesifik (mis. /monitoring tidak aktif saat di /monitoring/material).
  const isActive = (href) => {
    if (!pathname) return false;
    const cocok = (h) => pathname === h || pathname.startsWith(h + "/");
    if (!cocok(href)) return false;
    return !nav.links.some((l) => l.href !== href && l.href.startsWith(href + "/") && cocok(l.href));
  };
  const isBuyer = role === "buyer";

  const isCartActive =
    pathname === "/cart" ||
    pathname?.startsWith("/cart/");

  // TUTUP MENU SAAT BERPINDAH HALAMAN
  useEffect(() => {
    setOpen(false);
    setLogoutOpen(false);
  }, [pathname]);

  // PENGATURAN POPUP LOGOUT
  useEffect(() => {
    if (!logoutOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    cancelButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loggingOut) {
        setLogoutOpen(false);
        setLogoutError("");
        logoutButtonRef.current?.focus();
      }

      // Menjaga fokus tetap di dalam popup
      if (event.key === "Tab") {
        const dialog = document.getElementById(
          "circlo-logout-dialog"
        );

        const focusables = Array.from(
          dialog?.querySelectorAll(
            'button:not(:disabled)'
          ) || []
        );

        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [logoutOpen, loggingOut]);

  // MEMBUKA POPUP
  function bukaPopupLogout() {
    setLogoutError("");
    setLogoutOpen(true);
  }

  // MENUTUP POPUP
  function tutupPopupLogout() {
    if (loggingOut) return;

    setLogoutOpen(false);
    setLogoutError("");
    logoutButtonRef.current?.focus();
  }

  // LOGOUT HANYA SETELAH DIKONFIRMASI
  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }
      }

      clearDraft();
      clearResult();

      setLogoutOpen(false);

      router.replace(LOGIN_PATH);
      router.refresh();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Gagal logout. Silakan coba lagi."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <FlashBanner />

      <header className="overflow-x-clip border-b border-circlo-line/60 bg-circlo-bg">
        <div className="flex h-20 w-full items-center justify-between px-4 sm:px-6 lg:px-10">

          {/* LOGO DAN NAVIGASI */}
          <div className="flex h-full items-center gap-3 lg:gap-[41px]">
            <Link
              href={dashboardPathFor(role)}
              className="flex items-center gap-3"
            >
              <Image
                src="/images/circlo-logo.png"
                alt="CIRCLO"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />

              <span className="font-display text-[23.5px] font-extrabold tracking-tight text-circlo-green">
                CIRCLO
              </span>
            </Link>

            {/* MENU DESKTOP */}
            <nav className="hidden h-full items-stretch gap-[35px] lg:flex">
              {nav.links.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center text-[14px] ${
                      active
                        ? "font-semibold text-circlo-green"
                        : "font-normal text-circlo-ink/80 hover:text-circlo-green"
                    }`}
                  >
                    {item.label}

                    {active && (
                      <span className="absolute inset-x-[-13px] bottom-0 h-[3px] bg-circlo-green" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* BAGIAN KANAN NAVBAR */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* LOGOUT: MEMBUKA POPUP DULU */}
            <button
              ref={logoutButtonRef}
              type="button"
              onClick={bukaPopupLogout}
              disabled={loggingOut}
              aria-label="Logout dari akun"
              title="Logout"
              className="flex items-center justify-center rounded-lg p-2 text-circlo-green transition hover:bg-circlo-soft disabled:opacity-50"
            >
              <LogOut
                className="h-5 w-5"
                strokeWidth={2}
              />
            </button>

            {/* KERANJANG KHUSUS BUYER */}
            {isBuyer && (
              <Link
                href="/cart"
                aria-label="Buka Keranjang Saya"
                aria-current={
                  isCartActive ? "page" : undefined
                }
                title="Keranjang Saya"
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-[14px] font-medium transition ${
                  isCartActive
                    ? "bg-circlo-soft text-circlo-green"
                    : "text-circlo-ink/80 hover:bg-circlo-soft hover:text-circlo-green"
                }`}
              >
                <ShoppingCart
                  className="h-5 w-5 text-circlo-green"
                  strokeWidth={2}
                />

                <span className="hidden sm:inline">
                  Keranjang
                </span>
              </Link>
            )}

            {/* PROFIL */}
            <Link
              href="/profile"
              className="flex items-center gap-2 text-[14px] text-circlo-ink/80 hover:text-circlo-green"
            >
              <CircleUserRound
                className="h-6 w-6 text-circlo-green"
                strokeWidth={2}
              />

              <span className="hidden sm:inline">
                {nav.profileLabel}
              </span>
            </Link>

            {/* MENU MOBILE */}
            <button
              type="button"
              onClick={() =>
                setOpen((value) => !value)
              }
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={
                open ? "Tutup menu" : "Buka menu"
              }
              className="rounded-lg p-2 text-circlo-green hover:bg-circlo-soft lg:hidden"
            >
              {open ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* NAVIGASI MOBILE */}
        {open && (
          <nav
            id="mobile-nav"
            className="border-t border-circlo-line/60 px-4 py-3 sm:px-6 lg:hidden"
          >
            <div className="flex flex-col">
              {nav.links.map((item) => {
              const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-[14px] ${
                      active
                        ? "bg-circlo-soft font-semibold text-circlo-green"
                        : "text-circlo-ink/80 hover:bg-circlo-field"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {!nav.links.length && (
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-[14px] text-circlo-ink/80 hover:bg-circlo-field"
                >
                  {nav.profileLabel}
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* POPUP KONFIRMASI LOGOUT */}
      {logoutOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-[2px]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                tutupPopupLogout();
              }
            }}
          >
            <div
              id="circlo-logout-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-dialog-title"
              aria-describedby="logout-dialog-description"
              className="relative w-full max-w-[430px] rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              {/* TOMBOL X */}
              <button
                type="button"
                onClick={tutupPopupLogout}
                disabled={loggingOut}
                aria-label="Tutup popup"
                className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>

              {/* ICON */}
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle size={27} />
              </div>

              {/* JUDUL */}
              <h2
                id="logout-dialog-title"
                className="pr-8 text-xl font-bold text-slate-900"
              >
                Keluar dari CIRCLO?
              </h2>

              {/* DESKRIPSI */}
              <p
                id="logout-dialog-description"
                className="mt-3 text-sm leading-6 text-slate-600"
              >
                Apakah kamu yakin ingin logout dari akun
                CIRCLO? Kamu perlu login kembali untuk
                mengakses akunmu.
              </p>

              {/* ERROR */}
              {logoutError && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {logoutError}
                </p>
              )}

              {/* TOMBOL POPUP */}
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  ref={cancelButtonRef}
                  type="button"
                  onClick={tutupPopupLogout}
                  disabled={loggingOut}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingOut ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <LogOut size={17} />
                      Ya, Logout
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
