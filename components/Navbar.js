'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { CircleUserRound } from 'lucide-react';
import { useRole } from '@/lib/auth';
import { NAV_BY_ROLE, dashboardPathFor } from '@/lib/roles';

export default function Navbar() {
  const pathname = usePathname();
  const { role } = useRole();
  const nav = NAV_BY_ROLE[role] || { links: [], profileLabel: 'Profil' };

  return (
    <header className="border-b border-circlo-line/60 bg-circlo-bg">
      <div className="flex h-20 w-full items-center justify-between px-10">
        <div className="flex h-full items-center gap-[41px]">
          <Link href={dashboardPathFor(role)} className="flex items-center gap-3">
            <Image src="/images/circlo-logo.png" alt="CIRCLO" width={44} height={44} className="h-11 w-11 object-contain" />
            <span className="font-display text-[23.5px] font-extrabold tracking-tight text-circlo-green">CIRCLO</span>
          </Link>

          <nav className="flex h-full items-stretch gap-[35px]">
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

        <Link href="/profile" className="flex items-center gap-2 text-[14px] text-circlo-ink/80 hover:text-circlo-green">
          <CircleUserRound className="h-6 w-6 text-circlo-green" strokeWidth={2} />
          {nav.profileLabel}
        </Link>
      </div>
    </header>
  );
}
