// Cloudflare Pages serves /404.html as /404 with status 200 when requested
// directly. Handle that explicit alias separately from static missing pages.
export const onRequest = () => new Response(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, follow"><title>Página no encontrada · Page not found</title><style>body{font:1rem/1.7 system-ui,sans-serif;max-width:48rem;margin:5rem auto;padding:0 1.5rem;color:#0f2015;background:#faf8f4}h1{font-family:Georgia,serif;font-size:2.5rem;line-height:1.2}nav{display:flex;gap:1.5rem;flex-wrap:wrap}a{color:#3a7a8d}</style></head><body><main><h1>Página no encontrada</h1><p>La dirección solicitada no existe. Puedes volver a la guía de la Torre del Reloj.</p><p lang="en">This address does not exist. Return to the Clock Tower guide.</p><nav><a href="/es/">Español</a><a href="/en/">English</a><a href="/zh/">中文</a><a href="/arn/">Mapudungun</a></nav></main></body></html>`, {
  status: 404,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Robots-Tag': 'noindex, follow',
    'Cache-Control': 'no-store',
  },
});
