import { describe, it, expect } from 'vitest';
import {
  buildWarehouseAddress,
  warehouseToShipmentAddressString,
} from '../../src/services/customerCode.service';

describe('buildWarehouseAddress', () => {
  it('builds Air and Sea addresses with /A and /B suffixes', () => {
    const { airAddress, seaAddress } = buildWarehouseAddress({
      customerCode: 'HT-000123',
      firstName: 'Marie',
      lastName: 'Joseph',
      warehouseAddress: '8435 NW 68TH ST, MEDLEY, FL 33166',
    });
    expect(airAddress).toBe(
      'Marie Joseph/HT-000123/A\n8435 NW 68TH ST, MEDLEY, FL 33166',
    );
    expect(seaAddress).toBe(
      'Marie Joseph/HT-000123/B\n8435 NW 68TH ST, MEDLEY, FL 33166',
    );
  });
});

describe('warehouseToShipmentAddressString', () => {
  it('joins street, locality, country', () => {
    expect(
      warehouseToShipmentAddressString({
        address: '8435 NW 68TH ST',
        city: 'Medley',
        state: 'FL',
        country: 'US',
      }),
    ).toBe('8435 NW 68TH ST, Medley, FL, US');
  });
});
