'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { CircleUserRound, Menu, X } from 'lucide-react';
import FlashBanner from '@/components/FlashBanner';
import { useRole } from '@/lib/auth';
import { NAV_BY_ROLE, dashboardPathFor } from '@/lib/roles';

export default function Navbar() {
  const pathname = usePathname();
  const { role } = useRole();
  const [open, setOpen] = useState(false);
  const nav = NAV_BY_ROLE[role] || { links: [], profileLabel: 'Profil' };

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
    <FlashBanner />
    <header className="overflow-x-clip border-b border-circlo-line/60 bg-circlo-bg">
      <div className="flex h-20 w-full items-center justify-between px-4 sm:px-6 lg:px-10">
        <div className="flex h-full items-center gap-3 lg:gap-[41px]">
          <Link href={dashboardPathFor(role)} className="flex items-center gap-3">
            <Image src="/images/circlo-logo.png" alt="CIRCLO" width={44} height={44} className="h-11 w-11 object-contain" />
            <span className="font-display text-[23.5px] font-extrabold tracking-tight text-circlo-green">CIRCLO</span>
          </Link>

          <nav className="hidden h-full items-stretch gap-[35px] lg:flex">
            {nav.links.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center text-[14px] ${
                    active ? 'font-semibold text-circlo-green' : 'font-normal text-circlo-ink/80 hover:text-circlo-green'
                  }`}
                >
                  {item.label}
                  {active && <span className="absolute inset-x-[-13px] bottom-0 h-[3px] bg-circlo-green" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/profile" className="flex items-center gap-2 text-[14px] text-circlo-ink/80 hover:text-circlo-green">
            <CircleUserRound className="h-6 w-6 text-circlo-green" strokeWidth={2} />
            {nav.profileLabel}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            className="rounded-lg p-2 text-circlo-green hover:bg-circlo-soft lg:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-circlo-line/60 px-4 py-3 sm:px-6 lg:hidden">
          <div className="flex flex-col">
            {nav.links.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-[14px] ${
                    active ? 'bg-circlo-soft font-semibold text-circlo-green' : 'text-circlo-ink/80 hover:bg-circlo-field'
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
    </>
  );
}
