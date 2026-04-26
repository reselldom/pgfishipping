export function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function layout(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const cta = opts.ctaUrl
    ? `<p style="margin:32px 0">
         <a href="${opts.ctaUrl}" style="background:#0a3d91;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">${esc(opts.ctaLabel ?? 'View details')}</a>
       </p>`
    : '';
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(opts.title)}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#222;background:#f4f6fb;margin:0;padding:24px">
  ${opts.preheader ? `<div style="display:none;color:#f4f6fb;font-size:1px;line-height:1px">${esc(opts.preheader)}</div>` : ''}
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.04)">
    <h1 style="color:#0a3d91;margin:0 0 16px 0;font-size:22px">${esc(opts.title)}</h1>
    ${opts.bodyHtml}
    ${cta}
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
    <p style="color:#888;font-size:12px;margin:0">PGFI Shipping &middot; Haiti &lrm;&middot; pgfishipping.com</p>
  </div>
</body></html>`;
}
