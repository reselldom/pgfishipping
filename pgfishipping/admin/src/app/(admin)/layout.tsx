import { Sidebar } from '@/components/layout/sidebar';
import { RequireAdmin } from '@/components/auth/require-admin';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <RequireAdmin>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-x-auto bg-secondary/20">
          <div className="px-4 py-6 md:px-8 md:py-10">{children}</div>
        </main>
      </div>
    </RequireAdmin>
  );
}
