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

function WhatsAppGlyph({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.992c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
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
    if (links.whatsapp?.trim()) {
      const raw = links.whatsapp.trim();
      // Accept either a wa.me URL or a bare phone (admin can paste either).
      const href = /^(https?:|tel:|mailto:)/i.test(raw)
        ? raw
        : `https://wa.me/${raw.replace(/[^\d+]/g, '').replace(/^\+/, '')}`;
      out.push({
        href,
        label: 'WhatsApp',
        node: <WhatsAppGlyph className="h-5 w-5" />,
      });
    }
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
