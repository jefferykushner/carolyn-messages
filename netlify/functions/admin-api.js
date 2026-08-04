// ─────────────────────────────────────────────────────────
// admin-api.js  —  Secure proxy for Morning Messages admin
//
// Keeps the Supabase service_role key server-side.
// Every request must include the admin password in a header.
//
// Required Netlify environment variables:
//   SUPABASE_URL              SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY (your service_role JWT)
//   ADMIN_PASSWORD            (your chosen admin password)
// ─────────────────────────────────────────────────────────

exports.handler = async (event) => {
  // ── Only accept POST (the admin page wraps every call as POST) ──
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Validate admin password ──
  const password = event.headers['x-admin-password'];
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  // ── Special endpoint: password validation only ──
  const targetPath = event.headers['x-target-path'];
  if (targetPath === '/__validate') {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (!targetPath) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing x-target-path header' }) };
  }

  // ── Build the Supabase request ──
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const targetMethod = (event.headers['x-target-method'] || 'GET').toUpperCase();

  const supaHeaders = {
    'apikey':        serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
  };

  // Forward specific headers the admin page sets
  if (event.headers['content-type']) {
    supaHeaders['Content-Type'] = event.headers['content-type'];
  }
  if (event.headers['prefer']) {
    supaHeaders['Prefer'] = event.headers['prefer'];
  }
  if (event.headers['x-upsert']) {
    supaHeaders['x-upsert'] = event.headers['x-upsert'];
  }

  const fetchOpts = { method: targetMethod, headers: supaHeaders };

  // Attach body for POST/PUT/PATCH
  if (targetMethod !== 'GET' && targetMethod !== 'HEAD' && targetMethod !== 'DELETE' && event.body) {
    if (event.isBase64Encoded) {
      // Binary data (image uploads) — decode from base64
      fetchOpts.body = Buffer.from(event.body, 'base64');
    } else {
      fetchOpts.body = event.body;
    }
  }

  // ── Forward to Supabase ──
  try {
    const res = await fetch(`${supabaseUrl}${targetPath}`, fetchOpts);
    const responseBody = await res.text();

    return {
      statusCode: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
      body: responseBody,
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Proxy error: ' + err.message }),
    };
  }
};
