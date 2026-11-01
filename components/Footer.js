import Image from 'next/image';

const FOOTER_LINKS = ['Tentang Sirkularitas', 'Kebijakan Privasi', 'Laporan Keberlanjutan', 'Pedoman Komunitas'];

export default function Footer() {
  return (
    <footer className="mt-[70px] border-t border-circlo-line/70">
      <div className="w-full px-4 py-[30px] sm:px-6 lg:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/images/circlo-logo.png" alt="CIRCLO" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="font-display text-[14px] font-bold text-circlo-green">CIRCLO</span>
          </div>
          <p className="text-[13px] font-medium text-circlo-ink/80 sm:text-right">
            © 2026 CIRCLO. Memberdayakan pengelolaan komunitas melalui kecerdasan sirkular.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] font-medium text-circlo-ink/80">
          {FOOTER_LINKS.map((t) => (
            <a key={t} href="#" className="hover:text-circlo-green">
              {t}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
