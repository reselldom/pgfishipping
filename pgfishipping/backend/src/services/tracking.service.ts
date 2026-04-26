import { ShipmentStatus } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { setShipmentStatus } from './shipment.service';

/**
 * Aftership tag → our internal ShipmentStatus.
 * Aftership tags reference: https://www.aftership.com/docs/api/4/delivery-status
 *   Pending, InfoReceived, InTransit, OutForDelivery, AttemptFail, Delivered,
 *   AvailableForPickup, Exception, Expired
 */
const AFTERSHIP_TAG_MAP: Record<string, ShipmentStatus> = {
  Pending: 'WAITING',
  InfoReceived: 'WAITING',
  InTransit: 'IN_TRANSIT',
  OutForDelivery: 'IN_TRANSIT_B',
  AttemptFail: 'IN_TRANSIT_B',
  AvailableForPickup: 'AVAILABLE',
  Delivered: 'DELIVERED',
  Exception: 'IN_TRANSIT',
  Expired: 'IN_TRANSIT',
};

export function mapAftershipTag(tag: string | undefined | null): ShipmentStatus | null {
  if (!tag) return null;
  return AFTERSHIP_TAG_MAP[tag] ?? null;
}

export interface ExternalTrackingResult {
  status: ShipmentStatus | null;
  rawTag: string | null;
  location: string | null;
  fetchedAt: Date;
}

/**
 * Fetches the current status of an external tracking number from Aftership.
 * Falls back gracefully if no API key is configured (returns null status).
 */
export async function fetchExternalTracking(
  trackingNumber: string,
  carrierSlug?: string | null,
): Promise<ExternalTrackingResult> {
  const fetchedAt = new Date();
  if (!env.AFTERSHIP_API_KEY) {
    return { status: null, rawTag: null, location: null, fetchedAt };
  }

  try {
    const slug = carrierSlug || (await detectCarrierSlug(trackingNumber));
    if (!slug) return { status: null, rawTag: null, location: null, fetchedAt };

    const url = `https://api.aftership.com/v4/trackings/${slug}/${encodeURIComponent(trackingNumber)}`;
    const r = await fetch(url, {
      headers: {
        'aftership-api-key': env.AFTERSHIP_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    if (!r.ok) {
      if (r.status === 404) {
        await fetch('https://api.aftership.com/v4/trackings', {
          method: 'POST',
          headers: {
            'aftership-api-key': env.AFTERSHIP_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tracking: { tracking_number: trackingNumber, slug },
          }),
        }).catch(() => undefined);
      }
      return { status: null, rawTag: null, location: null, fetchedAt };
    }
    const j = (await r.json()) as {
      data?: {
        tracking?: {
          tag?: string;
          checkpoints?: Array<{ location?: string; city?: string }>;
        };
      };
    };
    const tag = j.data?.tracking?.tag ?? null;
    const lastCheckpoint = j.data?.tracking?.checkpoints?.slice(-1)[0];
    const location =
      lastCheckpoint?.location ?? lastCheckpoint?.city ?? null;
    return {
      status: mapAftershipTag(tag),
      rawTag: tag,
      location,
      fetchedAt,
    };
  } catch (err) {
    logger.warn({ err }, 'Aftership fetch failed');
    return { status: null, rawTag: null, location: null, fetchedAt };
  }
}

async function detectCarrierSlug(trackingNumber: string): Promise<string | null> {
  if (!env.AFTERSHIP_API_KEY) return null;
  try {
    const r = await fetch('https://api.aftership.com/v4/couriers/detect', {
      method: 'POST',
      headers: {
        'aftership-api-key': env.AFTERSHIP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracking: { tracking_number: trackingNumber } }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      data?: { couriers?: Array<{ slug?: string }> };
    };
    return j.data?.couriers?.[0]?.slug ?? null;
  } catch {
    return null;
  }
}

/**
 * Pulls latest status for a single shipment and applies it via setShipmentStatus.
 * Returns true if status changed, false otherwise.
 */
export async function syncShipmentTracking(shipmentId: string): Promise<boolean> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      status: true,
      externalTracking: true,
      externalCarrier: true,
    },
  });
  if (!shipment || !shipment.externalTracking) return false;

  // Don't poll terminal states.
  const TERMINAL: ShipmentStatus[] = ['DELIVERED', 'RETURNED', 'LOST', 'CANCELLED'];
  if (TERMINAL.includes(shipment.status)) return false;

  const result = await fetchExternalTracking(
    shipment.externalTracking,
    shipment.externalCarrier,
  );
  if (!result.status || result.status === shipment.status) return false;

  await setShipmentStatus(shipmentId, {
    status: result.status,
    location: result.location ?? undefined,
    source: 'aftership',
    label: result.rawTag ?? undefined,
  });
  return true;
}

/**
 * Returns the IDs of shipments that should be polled (have external tracking
 * and aren't in a terminal state).
 */
export async function listPollableShipments(): Promise<string[]> {
  const TERMINAL: ShipmentStatus[] = ['DELIVERED', 'RETURNED', 'LOST', 'CANCELLED'];
  const rows = await prisma.shipment.findMany({
    where: {
      externalTracking: { not: null },
      status: { notIn: TERMINAL },
    },
    select: { id: true },
    take: 500,
  });
  return rows.map((r) => r.id);
}
