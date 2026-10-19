import Image from "next/image";

export default function Footer() {
  return (
    <footer className="h-[64px] shrink-0 border-t border-[#dce4e8] bg-[#f8fbfc]">
      <div className="flex h-full items-center justify-between px-8">

        <div>
          <div className="flex items-center gap-2">
            <Image
              src="/circlo-logo.png"
              alt="Logo CIRCLO"
              width={40}
              height={40}
            />

            <span className="text-[9px] font-bold text-[#39750c]">
              CIRCLO
            </span>
          </div>

          <div className="mt-2 flex gap-5">
            <span className="text-[7px] text-[#4d565a]">
              Tentang Sirkularitas
            </span>

            <span className="text-[7px] text-[#4d565a]">
              Kebijakan Privasi
            </span>

            <span className="text-[7px] text-[#4d565a]">
              Laporan Keberlanjutan
            </span>

            <span className="text-[7px] text-[#4d565a]">
              Pedoman Komunitas
            </span>
          </div>
        </div>

        <p className="text-[7px] text-[#596266]">
          © 2026 CIRCLO. Memberdayakan pengelolaan komunitas melalui kecerdasan sirkular.
        </p>
      </div>
    </footer>
  );
}