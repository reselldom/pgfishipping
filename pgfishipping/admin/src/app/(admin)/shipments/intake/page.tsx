'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  getCustomerByCodeForIntake,
  getAdminHaitiDeliverySettings,
  listWarehouses,
  searchCustomersForIntake,
  submitAdminIntake,
  type IntakeCustomerDetail,
  type IntakeCustomerSummary,
  type Warehouse,
  type AdminHaitiDeptOption,
} from '@/lib/admin-api';
import { getApiErrorMessage } from '@/lib/api';

const SPECIAL_FLAG_OPTIONS = [
  'FRAGILE',
  'LIQUID',
  'TIRES',
  'TV',
  'ELECTRONICS',
  'REFRIGERATED',
  'MEDICATIONS',
  'PERISHABLE',
  'MOBILE_PHONE',
] as const;

export default function ReceivePackagePage(): JSX.Element {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [suggestions, setSuggestions] = useState<IntakeCustomerSummary[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [customer, setCustomer] = useState<IntakeCustomerDetail | null>(null);
  const [loadCustomerError, setLoadCustomerError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdTracking, setCreatedTracking] = useState<string | null>(null);

  const [serviceType, setServiceType] = useState<'AIR' | 'SEA'>('AIR');
  const [contentType, setContentType] = useState<'PACKAGE' | 'DOCUMENT'>('PACKAGE');
  const [externalTracking, setExternalTracking] = useState('');
  const [externalCarrier, setExternalCarrier] = useState('');
  const [contentsDescription, setContentsDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [dimL, setDimL] = useState('');
  const [dimW, setDimW] = useState('');
  const [dimH, setDimH] = useState('');
  const [fobValue, setFobValue] = useState('');
  const [fobCurrency, setFobCurrency] = useState<'USD' | 'EUR'>('USD');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [originWarehouseId, setOriginWarehouseId] = useState('');
  const [destinationBranchId, setDestinationBranchId] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [initialStatus, setInitialStatus] = useState<'RECEIVED' | 'WAITING'>('RECEIVED');
  const [locationNote, setLocationNote] = useState('');
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [labelFile, setLabelFile] = useState<File | null>(null);

  const [haitiCatalog, setHaitiCatalog] = useState<AdminHaitiDeptOption[]>([]);
  const [haitiDeptKey, setHaitiDeptKey] = useState('');
  const [haitiCity, setHaitiCity] = useState('');

  const suggestRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void listWarehouses().then(setWarehouses).catch(() => setWarehouses([]));
  }, []);

  useEffect(() => {
    void getAdminHaitiDeliverySettings()
      .then((d) => {
        setHaitiCatalog(d.departments);
        const first = d.departments[0];
        if (first) {
          setHaitiDeptKey(first.key);
          setHaitiCity(first.cities[0] ?? '');
        }
      })
      .catch(() => setHaitiCatalog([]));
  }, []);

  const haitiCities = useMemo(
    () => haitiCatalog.find((d) => d.key === haitiDeptKey)?.cities ?? [],
    [haitiCatalog, haitiDeptKey],
  );

  useEffect(() => {
    if (haitiCities.length === 0) return;
    if (!haitiCities.includes(haitiCity)) {
      setHaitiCity(haitiCities[0]);
    }
  }, [haitiCities, haitiCity]);

  const usWarehouses = warehouses.filter((w) => w.type === 'US' && w.isActive);
  const htBranches = warehouses.filter((w) => w.type === 'HAITI' && w.isActive);

  useEffect(() => {
    if (!originWarehouseId && usWarehouses.length > 0) {
      const sorted = [...usWarehouses].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      );
      setOriginWarehouseId(sorted[0].id);
    }
  }, [usWarehouses, originWarehouseId]);

  useEffect(() => {
    if (!destinationBranchId && htBranches.length > 0) {
      const sorted = [...htBranches].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      );
      setDestinationBranchId(sorted[0].id);
    }
  }, [htBranches, destinationBranchId]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const t = q.trim();
      if (t.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const rows = await searchCustomersForIntake(t);
        setSuggestions(rows);
        setSuggestOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 280);
  }, []);

  useEffect(() => {
    runSearch(searchQ);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQ, runSearch]);

  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  async function applyCustomer(code: string): Promise<void> {
    setLoadCustomerError('');
    setCustomer(null);
    try {
      const c = await getCustomerByCodeForIntake(code);
      setCustomer(c);
      setSearchQ(c.customerCode);
      setSuggestOpen(false);
      setRecipientName(`${c.firstName} ${c.lastName}`.trim());
      setRecipientPhone(c.phoneCell ?? '');
    } catch (err) {
      setLoadCustomerError(getApiErrorMessage(err));
    }
  }

  function toggleFlag(f: string): void {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitError('');
    setCreatedTracking(null);
    if (!customer) {
      setSubmitError('Select a customer by code first.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        userId: customer.id,
        serviceType,
        contentType,
        externalTracking: externalTracking.trim() || undefined,
        externalCarrier: externalCarrier.trim() || undefined,
        contentsDescription: contentsDescription.trim() || undefined,
        vendor: vendor.trim() || undefined,
        weightLbs: weightLbs ? Number(weightLbs) : undefined,
        dimensionLength: dimL ? Number(dimL) : undefined,
        dimensionWidth: dimW ? Number(dimW) : undefined,
        dimensionHeight: dimH ? Number(dimH) : undefined,
        fobValue: fobValue ? Number(fobValue) : undefined,
        fobCurrency,
        specialFlags: flags.size > 0 ? Array.from(flags) : undefined,
        recipientName: recipientName.trim() || undefined,
        recipientPhone: recipientPhone.trim() || undefined,
        originWarehouseId: originWarehouseId || undefined,
        destinationBranchId: destinationBranchId || undefined,
        haitiDepartmentKey: haitiDeptKey,
        haitiDeliveryCity: haitiCity,
        additionalNotes: additionalNotes.trim() || undefined,
        initialStatus,
        location: locationNote.trim() || undefined,
      };
      const ship = await submitAdminIntake(
        payload,
        labelFile && labelFile.size > 0 ? labelFile : null,
      );
      setCreatedTracking(ship.trackingCode);
      router.push(`/shipments/${ship.id}`);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <PackagePlus className="h-7 w-7" />
            Receive package
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find the customer by their <strong>HT-</strong> code (or search), then record
            the package. They will see updates on their dashboard.
          </p>
        </div>
        <Link
          href="/shipments"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          ← Back to shipments
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Customer</CardTitle>
          <p className="text-sm text-muted-foreground">
            Search by code, name, email, or phone — then pick a row or enter a full code and
            press Lookup.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative flex flex-wrap gap-2" ref={suggestRef}>
            <div className="relative min-w-[240px] flex-1">
              <Input
                placeholder="e.g. HT-000123 or name / email"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
                autoComplete="off"
              />
              {suggestOpen && suggestions.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-card py-1 text-sm shadow-lg">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-secondary"
                        onClick={() => void applyCustomer(s.customerCode)}
                      >
                        <span className="font-mono font-semibold">{s.customerCode}</span>
                        <span className="text-muted-foreground">
                          {s.firstName} {s.lastName} · {s.email}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void applyCustomer(searchQ)}
            >
              Lookup code
            </Button>
          </div>

          {loadCustomerError ? (
            <p className="text-sm text-destructive">{loadCustomerError}</p>
          ) : null}

          {customer ? (
            <div className="rounded-lg border bg-secondary/20 p-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Code</span>
                  <div className="font-mono font-semibold">{customer.customerCode}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Name</span>
                  <div>
                    {customer.firstName} {customer.lastName}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <div>{customer.email}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone</span>
                  <div>{customer.phoneCell ?? '—'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div>{customer.status.replace(/_/g, ' ')}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Wallet (USD)</span>
                  <div>{customer.walletUsd.toFixed(2)}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 border-t pt-3">
                <div className="text-xs font-medium text-muted-foreground">Air address</div>
                <div className="whitespace-pre-wrap text-xs">{customer.airAddress}</div>
                <div className="text-xs font-medium text-muted-foreground">Sea address</div>
                <div className="whitespace-pre-wrap text-xs">{customer.seaAddress}</div>
              </div>
              {customer.status === 'SUSPENDED' ? (
                <p className="mt-3 text-sm font-medium text-destructive">
                  This account is suspended — intake will be rejected until reactivated.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <form onSubmit={(e) => void onSubmit(e)}>
        <Card>
          <CardHeader>
            <CardTitle>2. Package</CardTitle>
            <p className="text-sm text-muted-foreground">
              External tracking is optional. Default status is <strong>Received</strong> at the
              US hub (customer gets the “package received” email).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as 'AIR' | 'SEA')}
                >
                  <option value="AIR">Air</option>
                  <option value="SEA">Sea</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content type</Label>
                <Select
                  value={contentType}
                  onChange={(e) =>
                    setContentType(e.target.value as 'PACKAGE' | 'DOCUMENT')
                  }
                >
                  <option value="PACKAGE">Package</option>
                  <option value="DOCUMENT">Document</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Initial status</Label>
                <Select
                  value={initialStatus}
                  onChange={(e) =>
                    setInitialStatus(e.target.value as 'RECEIVED' | 'WAITING')
                  }
                >
                  <option value="RECEIVED">Received at US warehouse</option>
                  <option value="WAITING">Pre-alert only (not arrived yet)</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location note (optional)</Label>
                <Input
                  placeholder="e.g. Miami dock 3"
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>External tracking (optional)</Label>
                <Input
                  value={externalTracking}
                  onChange={(e) => setExternalTracking(e.target.value)}
                  placeholder="USPS / UPS / FedEx #"
                />
              </div>
              <div className="space-y-2">
                <Label>Carrier (optional)</Label>
                <Input
                  value={externalCarrier}
                  onChange={(e) => setExternalCarrier(e.target.value)}
                  placeholder="USPS, UPS, Amazon…"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Contents description</Label>
                <Input
                  value={contentsDescription}
                  onChange={(e) => setContentsDescription(e.target.value)}
                  placeholder="What is inside"
                />
              </div>
              <div className="space-y-2">
                <Label>Vendor / store (optional)</Label>
                <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Weight (lbs, optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Length (in)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dimL}
                  onChange={(e) => setDimL(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Width (in)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dimW}
                  onChange={(e) => setDimW(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Height (in)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dimH}
                  onChange={(e) => setDimH(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>FOB value (optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fobValue}
                  onChange={(e) => setFobValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>FOB currency</Label>
                <Select
                  value={fobCurrency}
                  onChange={(e) => setFobCurrency(e.target.value as 'USD' | 'EUR')}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Haiti — department</Label>
                <Select
                  value={haitiDeptKey}
                  onChange={(e) => setHaitiDeptKey(e.target.value)}
                  disabled={haitiCatalog.length === 0}
                >
                  <option value="">—</option>
                  {haitiCatalog.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.nameFr} ({d.capital})
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Customer-visible list is filtered in Settings → Haiti cities; staff can always pick
                  any city here.
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Haiti — city / commune</Label>
                <Select
                  value={haitiCity}
                  onChange={(e) => setHaitiCity(e.target.value)}
                  disabled={haitiCities.length === 0}
                >
                  {haitiCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Origin warehouse (US)</Label>
                <Select
                  value={originWarehouseId}
                  onChange={(e) => setOriginWarehouseId(e.target.value)}
                >
                  <option value="">—</option>
                  {usWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {w.city}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destination branch (Haiti)</Label>
                <Select
                  value={destinationBranchId}
                  onChange={(e) => setDestinationBranchId(e.target.value)}
                >
                  <option value="">—</option>
                  {htBranches.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {w.city}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Recipient name</Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Recipient phone</Label>
                <Input
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Special flags</Label>
              <div className="flex flex-wrap gap-2">
                {SPECIAL_FLAG_OPTIONS.map((f) => (
                  <label
                    key={f}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={flags.has(f)}
                      onChange={() => toggleFlag(f)}
                    />
                    {f.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Label photo (optional)</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setLabelFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG, or WebP — stored on the shipment for staff reference.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Internal notes (optional)</Label>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
            </div>

            {submitError ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {submitError}
              </div>
            ) : null}

            {createdTracking ? (
              <p className="text-sm text-emerald-700">
                Created <span className="font-mono font-semibold">{createdTracking}</span> —
                redirecting…
              </p>
            ) : null}

            <Button type="submit" disabled={busy || !customer || haitiCatalog.length === 0}>
              {busy ? 'Creating…' : 'Create shipment & notify customer'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
