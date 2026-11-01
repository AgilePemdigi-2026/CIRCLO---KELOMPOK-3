'use client';

import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import JumlahPesananStep from './JumlahPesananStep';
import AlamatPengirimanStep from './AlamatPengirimanStep';
import PembayaranStep from './PembayaranStep';

const steps = ['Jumlah Pesanan', 'Alamat', 'Pembayaran'];

export default function CheckoutFlow() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    jumlah: 1,
    metodeKirim: 'Dikirim',
    alamat: '',
    metodePembayaran: 'Transfer Bank',
  });

  const update = (patch) => setData((prev) => ({ ...prev, ...patch }));
  const next = () => setStep((current) => Math.min(current + 1, steps.length - 1));
  const back = () => setStep((current) => Math.max(current - 1, 0));

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
        <ol className="mb-8 flex flex-wrap items-center gap-3">
          {steps.map((label, index) => {
            const active = index === step;
            const done = index < step;
            return (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${
                    active
                      ? 'bg-circlo-green text-white'
                      : done
                        ? 'bg-circlo-soft text-circlo-green'
                        : 'bg-circlo-field text-circlo-muted'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className={`text-[13px] font-medium ${active ? 'text-circlo-ink' : 'text-circlo-muted'}`}>
                  {label}
                </span>
                {index < steps.length - 1 && <span className="mx-1 hidden h-px w-8 bg-circlo-line sm:block" />}
              </li>
            );
          })}
        </ol>

        {step === 0 && <JumlahPesananStep data={data} onChange={update} />}
        {step === 1 && <AlamatPengirimanStep data={data} onChange={update} />}
        {step === 2 && <PembayaranStep data={data} onChange={update} />}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-circlo-line pt-6">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-circlo-fieldline px-5 py-2.5 text-[14px] font-medium text-circlo-ink hover:bg-circlo-bg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Kembali
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-lg bg-circlo-green px-6 py-2.5 text-[14px] font-medium text-white hover:brightness-110"
            >
              Lanjut <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              title="Hubungkan tombol ini ke /api/orders untuk membuat pesanan."
              className="inline-flex items-center gap-1.5 rounded-lg bg-circlo-green px-6 py-2.5 text-[14px] font-medium text-white opacity-60"
            >
              Buat Pesanan
            </button>
          )}
        </div>
      </section>

      <aside className="h-fit rounded-2xl bg-white p-6 shadow-card">
        <h2 className="font-display text-[18px] font-semibold text-circlo-ink">Ringkasan Pesanan</h2>
        <dl className="mt-4 space-y-3 text-[14px]">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-circlo-muted">Jumlah</dt>
            <dd className="font-medium text-circlo-ink">{data.jumlah || 0} unit</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-circlo-muted">Pengiriman</dt>
            <dd className="text-right font-medium text-circlo-ink">{data.metodeKirim}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-circlo-muted">Pembayaran</dt>
            <dd className="text-right font-medium text-circlo-ink">{data.metodePembayaran}</dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-circlo-line pt-3">
            <dt className="font-semibold text-circlo-ink">Total estimasi</dt>
            <dd className="font-semibold text-circlo-ink">Rp0</dd>
          </div>
        </dl>
        <p className="mt-4 text-[12.5px] leading-relaxed text-circlo-muted">
          Total dihitung dari harga material dan jumlah pesanan. Hubungkan ringkasan ini dengan data material yang dipilih.
        </p>
      </aside>
    </div>
  );
}
