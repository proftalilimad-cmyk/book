// ============================================================
// Netlify Function — وسيط RSS للإنتاج (خدمة NEWS AI AGENT)
// المسار العمومي: /api/rss?url=<encoded-feed-url>
// ============================================================

export const handler = async (event) => {
  const target = event.queryStringParameters?.url ?? '';
  if (!/^https?:\/\//i.test(target)) {
    return { statusCode: 400, body: 'bad url' };
  }
  try {
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'NewsMaroc-Agent/1.0 (+https://newsmaroc.ma)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      redirect: 'follow',
    });
    const body = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
      body,
    };
  } catch (e) {
    return { statusCode: 502, body: 'RSS proxy error: ' + String(e) };
  }
};
