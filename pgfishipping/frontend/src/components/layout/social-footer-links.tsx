'use client';

import { useEffect, useState } from 'react';
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { fetchPublicSocialLinks, type PublicSocialLinks } from '@/lib/public-api';
import { cn } from '@/lib/utils';

function TikTokGlyph({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

type IconLink = {
  href: string;
  label: string;
  node: JSX.Element;
};

export function SocialFooterLinks({
  className,
}: {
  className?: string;
}): JSX.Element | null {
  const [links, setLinks] = useState<PublicSocialLinks | null>(null);

  useEffect(() => {
    void (async () => {
      setLinks(await fetchPublicSocialLinks());
    })();
  }, []);

  const items = ((): IconLink[] => {
    if (!links) return [];
    const out: IconLink[] = [];
    if (links.facebook?.trim())
      out.push({
        href: links.facebook.trim(),
        label: 'Facebook',
        node: <Facebook className="h-5 w-5" />,
      });
    if (links.instagram?.trim())
      out.push({
        href: links.instagram.trim(),
        label: 'Instagram',
        node: <Instagram className="h-5 w-5" />,
      });
    if (links.twitter?.trim())
      out.push({
        href: links.twitter.trim(),
        label: 'X (Twitter)',
        node: <Twitter className="h-5 w-5" />,
      });
    if (links.youtube?.trim())
      out.push({
        href: links.youtube.trim(),
        label: 'YouTube',
        node: <Youtube className="h-5 w-5" />,
      });
    if (links.tiktok?.trim())
      out.push({
        href: links.tiktok.trim(),
        label: 'TikTok',
        node: <TikTokGlyph className="h-5 w-5" />,
      });
    return out;
  })();

  if (!links) return null;
  if (items.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          {item.node}
        </a>
      ))}
    </div>
  );
}
