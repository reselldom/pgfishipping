import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PGFI Shipping',
  description: 'Ship from the US to Haiti — fast, safe, transparent.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return children as JSX.Element;
}
