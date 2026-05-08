const DEFAULT_LOCAL = 'http://localhost:4000/api';

export function clientApiBaseUrl(): string {
  const raw =
    typeof process.env.NEXT_PUBLIC_API_URL === 'string'
      ? process.env.NEXT_PUBLIC_API_URL.trim()
      : '';
  const noTrail = raw.replace(/\/+$/, '');
  return noTrail.length > 0 ? noTrail : DEFAULT_LOCAL;
}
