'use client';

import { RequireAuth } from '@/components/auth/require-auth';
import { Sidebar } from '@/components/dashboard/sidebar';
import { SupportChatMount } from '@/components/support/support-chat-mount';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <RequireAuth>
      <div className="container py-6 md:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          <Sidebar />
          <main className="min-w-0 flex-1 space-y-6">{children}</main>
        </div>
      </div>
      <SupportChatMount />
    </RequireAuth>
  );
}
