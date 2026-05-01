'use client';

import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, RotateCcw, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BRANDING_SLOT_ORDER,
  getBrandingImages,
  resetBrandingImage,
  setBrandingImageUrl,
  uploadBrandingImage,
  type BrandingImage,
  type BrandingImages,
  type BrandingSlot,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';

const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3030';

export default function SiteImagesPage(): JSX.Element {
  const [data, setData] = useState<BrandingImages | null>(null);
  const [globalMsg, setGlobalMsg] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        setData(await getBrandingImages());
      } catch (err) {
        setGlobalMsg(getApiErrorMessage(err));
      }
    })();
  }, []);

  function patchSlot(slot: BrandingSlot, next: BrandingImage): void {
    setData((prev) => (prev ? { ...prev, [slot]: next } : prev));
  }

  if (!data) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Site images</h1>
        <p className="text-sm text-muted-foreground">
          {globalMsg || 'Loading…'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Site images</h1>
        <p className="text-sm text-muted-foreground">
          Manage all the photos shown on the public homepage. Upload a new image, paste an
          external URL, or reset any slot to its bundled default. Recommended size 1600×900
          or wider. Max 6MB. JPG / PNG / WebP.
        </p>
      </div>

      {globalMsg ? (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">{globalMsg}</div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {BRANDING_SLOT_ORDER.map((slot) => (
          <SlotCard
            key={slot}
            slot={slot}
            image={data[slot]}
            onChange={(next) => patchSlot(slot, next)}
          />
        ))}
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  image,
  onChange,
}: {
  slot: BrandingSlot;
  image: BrandingImage;
  onChange: (next: BrandingImage) => void;
}): JSX.Element {
  const [urlInput, setUrlInput] = useState(image.url);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrlInput(image.url);
  }, [image.url]);

  const isDefault = !image.url;
  const previewSrc = image.url || `${PUBLIC_SITE_URL}${image.defaultPath}`;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      setMsg('Only JPG, PNG, or WebP are accepted.');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setMsg('Image must be 6MB or less.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const next = await uploadBrandingImage(slot, file);
      onChange(next);
      setMsg('Uploaded. Refresh the public homepage to see the change.');
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSaveUrl(): Promise<void> {
    setBusy(true);
    setMsg('');
    try {
      const next = await setBrandingImageUrl(slot, urlInput.trim());
      onChange(next);
      setMsg('Saved.');
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(): Promise<void> {
    if (!confirm(`Reset "${image.label}" to the bundled default?`)) return;
    setBusy(true);
    setMsg('');
    try {
      const next = await resetBrandingImage(slot);
      onChange(next);
      setUrlInput('');
      setMsg('Reset to default.');
    } catch (err) {
      setMsg(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-0 pb-3">
        <CardTitle className="text-base">{image.label}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {isDefault ? (
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              Using bundled default
            </span>
          ) : (
            <span>Custom image set</span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-lg border bg-secondary/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt={image.label}
            className="aspect-[16/9] w-full object-cover"
          />
        </div>

        {msg ? (
          <div className="rounded-md border bg-secondary/30 p-2 text-xs">{msg}</div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor={`file-${slot}`} className="text-xs">
            Upload new image
          </Label>
          <Input
            ref={fileRef}
            id={`file-${slot}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void handleUpload(e)}
            disabled={busy}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`url-${slot}`} className="text-xs">
            Or paste an external URL
          </Label>
          <div className="flex gap-2">
            <Input
              id={`url-${slot}`}
              type="url"
              inputMode="url"
              placeholder="https://cdn.example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={busy}
            />
            <Button
              size="sm"
              onClick={() => void handleSaveUrl()}
              disabled={busy || urlInput === image.url}
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>

        {!isDefault ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleReset()}
            disabled={busy}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to default
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
