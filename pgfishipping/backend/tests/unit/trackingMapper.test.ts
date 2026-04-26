import { describe, it, expect } from 'vitest';
import { mapAftershipTag } from '../../src/services/tracking.service';

describe('mapAftershipTag', () => {
  it('maps known tags to internal statuses', () => {
    expect(mapAftershipTag('Pending')).toBe('WAITING');
    expect(mapAftershipTag('InfoReceived')).toBe('WAITING');
    expect(mapAftershipTag('InTransit')).toBe('IN_TRANSIT');
    expect(mapAftershipTag('OutForDelivery')).toBe('IN_TRANSIT_B');
    expect(mapAftershipTag('AvailableForPickup')).toBe('AVAILABLE');
    expect(mapAftershipTag('Delivered')).toBe('DELIVERED');
  });

  it('returns null for unknown or empty tags', () => {
    expect(mapAftershipTag(null)).toBeNull();
    expect(mapAftershipTag(undefined)).toBeNull();
    expect(mapAftershipTag('')).toBeNull();
    expect(mapAftershipTag('SomeWeirdNewTag')).toBeNull();
  });
});
