import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type ServiceType } from '@prisma/client';
import {
  BCRYPT_SALT_ROUNDS,
  DEFAULT_AIR_RATES,
  DEFAULT_SEA_RATES,
} from '../src/config/constants';
import { FALLBACK_PUBLIC_FOOTER_JSON } from '../src/services/public/site.service';
import { generateReferralCode } from '../src/utils/generateCode';

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'admin@pgfishipping.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMe!Now123';

async function seedSuperAdmin() {
  const existing = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN_EMAIL.toLowerCase() },
  });
  if (existing) {
    console.log('✓ Super admin already exists:', existing.email);
    return existing;
  }
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);
  const referralCode = generateReferralCode();
  const user = await prisma.user.create({
    data: {
      customerCode: 'HT-000000',
      email: SUPER_ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      firstName: 'PGFI',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      referralCode,
    },
  });
  await prisma.wallet.create({ data: { userId: user.id } });
  console.log('✓ Created super admin:', user.email, '(password from env)');
  return user;
}

async function seedWarehouses() {
  const existing = await prisma.warehouse.count();
  if (existing > 0) {
    console.log(`✓ Warehouses already seeded (${existing}).`);
    return;
  }
  await prisma.warehouse.createMany({
    data: [
      {
        name: 'PGFI Miami (US Hub)',
        type: 'US',
        address: '8435 NW 68TH ST',
        city: 'Medley',
        state: 'FL',
        country: 'US',
        phone: '+1 305 000 0000',
        email: 'miami@pgfishipping.com',
        sortOrder: 0,
      },
      {
        name: 'PGFI Port-au-Prince',
        type: 'HAITI',
        address: 'Delmas 33',
        city: 'Port-au-Prince',
        country: 'HT',
        phone: '+509 0000 0000',
        email: 'pap@pgfishipping.com',
        sortOrder: 1,
      },
      {
        name: 'PGFI Cap-Haïtien',
        type: 'HAITI',
        address: 'Rue 11',
        city: 'Cap-Haïtien',
        country: 'HT',
        phone: '+509 0000 0001',
        email: 'cap@pgfishipping.com',
        sortOrder: 2,
      },
    ],
  });
  console.log('✓ Seeded default warehouses (1 US, 2 Haiti).');
}

async function seedPricingRules() {
  const existing = await prisma.pricingRule.count();
  if (existing > 0) {
    console.log(`✓ Pricing rules already seeded (${existing}).`);
    return;
  }
  const air: Array<{ feeType: string; rate: number; name: string }> = [
    { feeType: 'freight', rate: DEFAULT_AIR_RATES.freight, name: 'Air Freight per LB' },
    { feeType: 'fuel', rate: DEFAULT_AIR_RATES.fuel, name: 'Air Fuel surcharge per LB' },
    { feeType: 'airport', rate: DEFAULT_AIR_RATES.airport, name: 'Air Airport fee per LB' },
    { feeType: 'customs', rate: DEFAULT_AIR_RATES.customs, name: 'Air Customs fee per LB' },
    { feeType: 'handling', rate: DEFAULT_AIR_RATES.handling, name: 'Air Handling fee per LB' },
  ];
  const sea: Array<{ feeType: string; rate: number; name: string }> = [
    { feeType: 'freight', rate: DEFAULT_SEA_RATES.freight, name: 'Sea Freight per LB' },
    { feeType: 'fuel', rate: DEFAULT_SEA_RATES.fuel, name: 'Sea Fuel surcharge per LB' },
    { feeType: 'airport', rate: DEFAULT_SEA_RATES.airport, name: 'Sea Port fee per LB' },
    { feeType: 'customs', rate: DEFAULT_SEA_RATES.customs, name: 'Sea Customs fee per LB' },
    { feeType: 'handling', rate: DEFAULT_SEA_RATES.handling, name: 'Sea Handling fee per LB' },
  ];

  const rows = [
    ...air.map<{ name: string; serviceType: ServiceType; feeType: string; ratePerLb: number }>(
      (r) => ({
        name: r.name,
        serviceType: 'AIR',
        feeType: r.feeType,
        ratePerLb: r.rate,
      }),
    ),
    ...sea.map<{ name: string; serviceType: ServiceType; feeType: string; ratePerLb: number }>(
      (r) => ({
        name: r.name,
        serviceType: 'SEA',
        feeType: r.feeType,
        ratePerLb: r.rate,
      }),
    ),
  ];

  await prisma.pricingRule.createMany({ data: rows });
  console.log(`✓ Seeded ${rows.length} pricing rules.`);
}

/** Reference list of transactional email templates (code lives in `src/emails/templates/`). */
const NOTIFICATION_EMAIL_CATALOG = {
  version: 1,
  templates: [
    { key: 'welcome', when: 'Customer registers (with US address block)' },
    { key: 'verify_email', when: 'Registration and resend-verification' },
    { key: 'password_reset', when: 'Forgot-password link' },
    { key: 'password_reset_success', when: 'Password reset via email link completed' },
    { key: 'password_changed', when: 'Customer changes password while logged in' },
    { key: 'email_verified', when: 'Email verification link used successfully' },
    { key: 'package_received', when: 'Shipment status → received at US warehouse' },
    { key: 'package_in_transit', when: 'Shipment status → in transit (air/sea/branch)' },
    { key: 'package_available', when: 'Shipment ready for pickup / payment' },
    { key: 'package_delivered', when: 'Shipment marked delivered' },
    { key: 'package_status_alert', when: 'Inventory, returned, lost, or cancelled' },
    { key: 'wallet_deposit', when: 'Wallet deposit confirmed' },
    { key: 'third_party_auth', when: 'Third-party pickup authorization set' },
  ],
} as const;

async function seedNotificationEmailCatalog() {
  const existing = await prisma.systemConfig.findUnique({
    where: { key: 'notification_email_catalog' },
  });
  if (existing) {
    console.log('✓ notification_email_catalog already present.');
    return;
  }
  await prisma.systemConfig.create({
    data: {
      key: 'notification_email_catalog',
      value: JSON.stringify(NOTIFICATION_EMAIL_CATALOG),
    },
  });
  console.log('✓ Seeded notification_email_catalog (email template index).');
}

async function seedSystemConfig() {
  const defaults: Array<{ key: string; value: string }> = [
    { key: 'usd_to_htg_rate', value: '132.5' },
    { key: 'tax_rate', value: '0' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'min_deposit_usd', value: '5' },
    { key: 'public_social_links', value: '{}' },
    { key: 'haiti_delivery_disabled_cities', value: '{"keys":[]}' },
    { key: 'public_footer_content', value: FALLBACK_PUBLIC_FOOTER_JSON },
  ];
  for (const cfg of defaults) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg,
    });
  }
  console.log('✓ Seeded default system config.');
}

async function main() {
  console.log('— Seeding PGFI Shipping database —');
  await seedSuperAdmin();
  await seedWarehouses();
  await seedPricingRules();
  await seedSystemConfig();
  await seedNotificationEmailCatalog();
  console.log('— Done. —');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
