"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import Navbar from "@/components/Navbar";
import MaterialImage from "@/components/MaterialImage";
import OrderModal from "@/components/OrderModal";

const AI_GREETING =
  "Halo! Aku **CIRCLO AI**, asisten usaha dari material daur ulang. Ceritakan kebutuhan materialmu (misalnya produk yang ingin dibuat), lalu sebutkan **kota** dan perkiraan **modal** agar rekomendasinya pas.";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

const MD_COMPONENTS = {
  p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
  em: ({ node, ...props }) => <em className="italic" {...props} />,
  h1: ({ node, ...props }) => <h1 className="font-bold text-gray-800 text-lg mt-4 mb-2" {...props} />,
  h2: ({ node, ...props }) => <h2 className="font-bold text-gray-800 text-base mt-4 mb-2" {...props} />,
  h3: ({ node, ...props }) => <h3 className="font-bold text-gray-800 text-sm sm:text-base mt-3 mb-2" {...props} />,
  a: ({ node, ...props }) => <a className="text-[#3f6a0b] underline" {...props} />,
};

function MaterialCard({ m, onOrder }) {
  const stock = Number(m.stok || 0);
  const isIllustration = m.image_match_type === "category_fallback";

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-[#3f6a0b] transition-all flex flex-col">
      <Link href={`/katalog/${m.id_material}`} className="block">
        <div className="relative h-24">
          <MaterialImage
            materialId={m.id_material}
            materialName={m.nama_material}
            category={m.kategori}
            imageUrl={m.image_url}
            imageAlt={m.image_alt}
            className="h-full w-full"
          />
          <span className="absolute top-2 right-2 bg-[#d9f99d] text-[#3f6212] text-xs font-bold px-2 py-1 rounded-full">
            {m.kategori}
          </span>
          {isIllustration && (
            <span className="absolute bottom-2 left-2 bg-white/90 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded">
              Ilustrasi kategori
            </span>
          )}
        </div>
      </Link>

      <div className="p-3 flex flex-col flex-grow">
        <Link href={`/katalog/${m.id_material}`} className="block">
          <h4 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2 hover:text-[#3f6a0b]">
            {m.nama_material}
          </h4>
        </Link>
        <p className="text-xs text-gray-500 mt-1">
          {m.kota}
          {m.provinsi ? `, ${m.provinsi}` : ""}
        </p>
        <p className="text-sm font-semibold text-gray-800 mt-1">
          {rupiah.format(Number(m.harga))}
          <span className="text-xs font-normal text-gray-500">/{m.satuan}</span>
        </p>
        <p className={`text-[11px] mt-1 ${stock > 0 ? "text-gray-500" : "text-red-600"}`}>
          Stok {angka.format(stock)} {m.satuan}
        </p>

        <div className="mt-auto pt-3 flex items-center gap-2">
          <Link
            href={`/katalog/${m.id_material}`}
            className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-center text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            Detail
          </Link>
          <button
            type="button"
            onClick={() => onOrder?.(m)}
            disabled={stock <= 0}
            className="flex-1 rounded-md bg-[#3f6a0b] px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-[#345609] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Pesan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CariMaterialPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { id: "intro", role: "ai", text: AI_GREETING },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showBanner, setShowBanner] = useState(true);
  const [orderMaterial, setOrderMaterial] = useState(null);
  const [orderNotice, setOrderNotice] = useState(null);
  const sessionIdRef = useRef(null);
  const scrollRef = useRef(null);
  const sudahOtomatis = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, error]);

  const handleSend = (e) => {
    e.preventDefault();
    kirimPesan(input);
  };

  const kirimPesan = async (teks) => {
    const text = String(teks || "").trim();
    if (!text || loading) return;

    if (!sessionIdRef.current) {
      sessionIdRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `sess-${Date.now()}`;
    }

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setInput("");
    setLoading(true);
    setError(null);

    const aiId = `ai-${Date.now()}`;
    let created = false;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, session_id: sessionIdRef.current }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Gagal mendapat jawaban dari CIRCLO AI.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);

          let event = "message";
          let data = "";
          for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;

          let obj;
          try {
            obj = JSON.parse(data);
          } catch {
            continue;
          }

          if (event === "meta") {
            created = true;
            setLoading(false);
            setMessages((prev) => [
              ...prev,
              {
                id: aiId,
                role: "ai",
                text: "",
                materials: Array.isArray(obj.materials) ? obj.materials : [],
              },
            ]);
          } else if (event === "delta") {
            const chunk = obj?.text || "";
            if (!chunk) continue;
            if (!created) {
              created = true;
              setLoading(false);
              setMessages((prev) => [...prev, { id: aiId, role: "ai", text: chunk, materials: [] }]);
            } else {
              setMessages((prev) =>
                prev.map((m) => (m.id === aiId ? { ...m, text: m.text + chunk } : m)),
              );
            }
          } else if (event === "done") {
            finished = true;
          }
        }
      }
    } catch (err) {
      setError(err?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Kalau datang dari kotak pencarian Beranda (?q=...), kirim pesannya otomatis satu kali.
  useEffect(() => {
    if (sudahOtomatis.current) return;
    sudahOtomatis.current = true;
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    if (!q) return;
    // Hapus ?q dari alamat supaya refresh halaman tidak mengirim ulang.
    window.history.replaceState(null, "", window.location.pathname);
    kirimPesan(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

      {/* Banner Notifikasi */}
      {showBanner && (
        <div className="relative bg-[#c5d8a4] rounded-lg px-4 py-3 flex items-start gap-3 shadow-sm border border-[#b3c893] mb-6">
          <div className="bg-white rounded-full p-2 shadow-sm flex-shrink-0">
            <svg className="w-6 h-6 text-[#4d7c0f]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
          </div>
          <div className="pr-6">
            <h1 className="text-base sm:text-lg font-bold text-gray-800">Mencari Kebutuhan & Material</h1>
            <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
              Jelaskan Kebutuhan Material menggunakan bahasa sehari-hari atau cari dengan Kata Kunci. Sistem menampilkan material yang relevan melalui AI Matching & Recommendation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            aria-label="Tutup notifikasi"
            className="absolute top-2 right-2 text-[#4d7c0f] hover:bg-white/50 rounded-full p-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {orderNotice && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex flex-wrap items-center justify-between gap-2">
          <span>{orderNotice}</span>
          <Link href="/orders" className="font-semibold underline">
            Lihat pesanan
          </Link>
        </div>
      )}

      {/* Area Chat / Hasil Pencarian */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[700px]">

        {/* Area Percakapan */}
        <div ref={scrollRef} className="flex-grow p-6 overflow-y-auto space-y-6 bg-[#fafafa]">

          {/* Label Hari Ini */}
          <div className="flex justify-center">
            <span className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">Hari ini</span>
          </div>

          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-[#3f6a0b] text-white px-5 py-4 rounded-2xl rounded-tr-sm max-w-[80%] text-sm sm:text-base shadow-sm whitespace-pre-line">
                  {msg.text}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex items-start gap-3 max-w-[95%] lg:max-w-[90%]">
                <div className="w-8 h-8 rounded-full bg-[#c5d8a4] flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-[#4d7c0f]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  </svg>
                </div>

                <div className="flex-grow">
                  <span className="text-xs font-semibold text-gray-500 mb-2 block ml-1">CIRCLO AI</span>

                  <div className="bg-[#e5f0f8] border border-[#d0e5f5] rounded-2xl rounded-tl-sm p-5 text-sm sm:text-base text-gray-700 shadow-sm">
                    {msg.text ? (
                      <ReactMarkdown components={MD_COMPONENTS}>{msg.text}</ReactMarkdown>
                    ) : (
                      <span className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-[#4d7c0f] animate-pulse" />
                        <span className="w-2 h-2 rounded-full bg-[#4d7c0f] animate-pulse [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-[#4d7c0f] animate-pulse [animation-delay:300ms]" />
                        <span className="ml-1">CIRCLO AI sedang menyusun jawaban...</span>
                      </span>
                    )}

                    {msg.materials?.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                        {msg.materials.map((m) => (
                          <MaterialCard key={m.id_material} m={m} onOrder={setOrderMaterial} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {/* Indikator Loading */}
          {loading && (
            <div className="flex items-start gap-3 max-w-[95%]">
              <div className="w-8 h-8 rounded-full bg-[#c5d8a4] flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-5 h-5 text-[#4d7c0f]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
              </div>
              <div className="flex-grow">
                <span className="text-xs font-semibold text-gray-500 mb-2 block ml-1">CIRCLO AI</span>
                <div className="bg-[#e5f0f8] border border-[#d0e5f5] rounded-2xl rounded-tl-sm p-5 text-sm text-gray-500 shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4d7c0f] animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-[#4d7c0f] animate-pulse [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-[#4d7c0f] animate-pulse [animation-delay:300ms]" />
                  <span className="ml-1">CIRCLO AI sedang menyusun jawaban...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex justify-center">
              <span className="bg-red-50 text-red-600 text-xs sm:text-sm font-medium px-4 py-2 rounded-full border border-red-200">
                {error}
              </span>
            </div>
          )}
        </div>

        {/* Area Input Chat */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={handleSend}
              className="flex items-center bg-white border border-gray-300 rounded-full px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#3f6a0b] focus-within:border-transparent transition-all"
            >
              <button type="button" className="text-gray-400 hover:text-gray-600 p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Kebutuhan Material atau Kata Kunci..."
                disabled={loading}
                className="flex-grow bg-transparent border-none focus:ring-0 text-gray-700 px-3 py-2 outline-none text-sm sm:text-base disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={loading || input.trim() === ""}
                className="bg-[#3f6a0b] hover:bg-[#345609] text-white rounded-full p-3 ml-2 transition-colors shadow-md flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                </svg>
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-3">
              Saran AI dibuat berdasarkan ketersediaan lokal. Selalu verifikasi keamanan material untuk penggunaan spesifik Anda.
            </p>
          </div>
        </div>

      </div>

      {orderMaterial && (
        <OrderModal
          material={orderMaterial}
          onClose={() => setOrderMaterial(null)}
          onSuccess={(data) => {
            setOrderNotice(
              `Pesanan #${data.id_pesanan} berhasil dibuat. Total estimasi ${rupiah.format(
                Number(data.total_estimasi || 0),
              )}, belum termasuk ongkir.`,
            );
          }}
        />
      )}
    </div>
    </>
  );
}
