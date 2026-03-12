export async function onRequestPost(context) {
  const { request, env } = context;

  // Rate limiting by IP
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateKey = `rate:${ip}`;
  const current = parseInt(await env.RATE_LIMIT.get(rateKey) || '0', 10);

  if (current >= 5) {
    return jsonResponse({ success: false, error: 'Too many requests. Please try again later.' }, 429);
  }

  // Increment rate limit immediately (counts every attempt, not just successes)
  await env.RATE_LIMIT.put(rateKey, String(current + 1), { expirationTtl: 3600 });

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid request body.' }, 400);
  }

  const { name, email, message } = body;

  if (!name || !email || !message) {
    return jsonResponse({ success: false, error: 'All fields are required.' }, 400);
  }

  if (name.length > 200 || email.length > 320 || message.length > 5000) {
    return jsonResponse({ success: false, error: 'Input too long.' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ success: false, error: 'Invalid email address.' }, 400);
  }

  // Sanitize name for use in email subject (strip control characters)
  const safeName = name.replace(/[\r\n\t]/g, ' ').trim();

  // RESEND_API_KEY must be set as an encrypted secret in Cloudflare Pages settings
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GV Digital Contact <noreply@gvdigital.be>',
        to: [env.RECIPIENT_EMAIL],
        subject: `Contact form: ${safeName}`,
        reply_to: email,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });

    if (!emailRes.ok) {
      console.error('Email send failed:', await emailRes.text());
      return jsonResponse({ success: false, error: 'Failed to send message.' }, 500);
    }
  } catch (err) {
    console.error('Email error:', err);
    return jsonResponse({ success: false, error: 'Failed to send message.' }, 500);
  }

  return jsonResponse({ success: true }, 200);
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
