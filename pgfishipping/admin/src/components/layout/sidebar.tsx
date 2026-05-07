'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  PackagePlus,
  DollarSign,
  Warehouse,
  Gift,
  LifeBuoy,
  Settings,
  UserCog,
  Mail,
  Share2,
  MapPinned,
  Image as ImageIcon,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth';
import { adminLogout } from '@/lib/admin-api';
import { cn } from '@/lib/utils';

interface Item {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
}

const ITEMS: Item[] = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', Icon: Users },
  { href: '/shipments', label: 'Shipments', Icon: Package },
  { href: '/shipments/intake', label: 'Receive package', Icon: PackagePlus },
  { href: '/pricing', label: 'Pricing', Icon: DollarSign },
  { href: '/warehouses', label: 'Warehouses', Icon: Warehouse },
  { href: '/gift-cards', label: 'Gift cards', Icon: Gift },
  { href: '/tickets', label: 'Support', Icon: LifeBuoy },
  { href: '/staff', label: 'Staff', Icon: UserCog },
  { href: '/broadcast', label: 'Broadcast', Icon: Mail },
  { href: '/settings/site-images', label: 'Site images', Icon: ImageIcon },
  { href: '/settings/social', label: 'Social links', Icon: Share2 },
  { href: '/settings/footer', label: 'Footer content', Icon: MapPinned },
  { href: '/config', label: 'Config', Icon: Settings },
];

export function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  async function logout(): Promise<void> {
    await adminLogout();
    clear();
    router.push('/login');
  }

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="border-b p-4">
        <Link href="/" className="block">
          <div className="text-base font-bold text-primary">PGFI Admin</div>
          <div className="text-xs text-muted-foreground">Internal panel</div>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {ITEMS.map(({ href, label, Icon }) => {
          const active =
            href === '/shipments'
              ? pathname === '/shipments' ||
                (pathname.startsWith('/shipments/') &&
                  !pathname.startsWith('/shipments/intake'))
              : href.startsWith('/settings/')
                ? pathname === href
                : pathname === href ||
                  (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
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

      <div className="border-t p-3">
        {user ? (
          <div className="mb-2 text-xs">
            <div className="font-medium text-foreground">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-muted-foreground">{user.email}</div>
            <div className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              {user.role.replace(/_/g, ' ')}
            </div>
          </div>
        ) : null}
        <Link
          href="/account"
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
            pathname === '/account'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          <KeyRound className="h-4 w-4" /> Account & password
        </Link>
        <button
          type="button"
          onClick={logout}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
