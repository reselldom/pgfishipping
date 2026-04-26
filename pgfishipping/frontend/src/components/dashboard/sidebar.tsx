'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  Wallet,
  MapPin,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
}

export function Sidebar(): JSX.Element {
  const locale = useLocale();
  const t = useTranslations('dashboard.side');
  const pathname = usePathname();

  const items: Item[] = [
    { href: `/${locale}/dashboard`, label: t('overview'), Icon: LayoutDashboard },
    { href: `/${locale}/dashboard/shipments`, label: t('shipments'), Icon: Package },
    {
      href: `/${locale}/dashboard/pre-alert`,
      label: t('preAlert'),
      Icon: PlusCircle,
    },
    { href: `/${locale}/dashboard/wallet`, label: t('wallet'), Icon: Wallet },
    { href: `/${locale}/dashboard/address`, label: t('address'), Icon: MapPin },
    {
      href: `/${locale}/dashboard/settings`,
      label: t('settings'),
      Icon: Settings,
    },
  ];

  return (
    <aside className="w-full md:w-60 md:shrink-0">
      <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5 md:overflow-visible">
        {items.map(({ href, label, Icon }) => {
          const active =
            pathname === href ||
            (href !== `/${locale}/dashboard` && pathname.startsWith(`${href}`));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
