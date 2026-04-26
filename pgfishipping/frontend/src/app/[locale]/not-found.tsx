import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound(): JSX.Element {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found.</p>
      <Link href="/">
        <Button variant="outline">Go home</Button>
      </Link>
    </div>
  );
}
