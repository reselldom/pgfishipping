// Minimum env required to import the app in tests.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-secret-at-least-32-characters-long-x';
process.env.RESEND_API_KEY = '';
process.env.PORT = process.env.PORT ?? '4001';

// Provide a placeholder DATABASE_URL so env validation passes even when no DB
// is reachable. Tests that hit the DB skip themselves automatically when the
// connection fails; pure unit tests don't need a DB.
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://pgfi:pgfi_local_password@localhost:5432/pgfishipping?schema=public';
