import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PGFI Admin',
  description: 'PGFI Shipping internal admin panel.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
