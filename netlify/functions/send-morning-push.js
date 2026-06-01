// netlify/functions/send-morning-push.js
// Called daily at 8am by cron-job.org
// Set these env vars in Netlify: SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

const webpush = require('web-push');

exports.handler = async (event) => {
  // Simple security: require a secret header from cron-job.org
  const cronSecret = event.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,       // e.g. mailto:jeff@example.com
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  // Fetch all stored push subscriptions from Supabase
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/push_subscriptions?select=id,subscription`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    }
  );

  const rows = await res.json();
  if (!rows.length) return { statusCode: 200, body: 'No subscribers' };

  const payload = JSON.stringify({
    title: 'Good morning, Carolyn ♡',
    body: 'Your morning messages are ready — made with love, just for you.'
  });

  const results = await Promise.allSettled(
    rows.map(async row => {
      try {
        await webpush.sendNotification(row.subscription, payload);
      } catch (err) {
        // Remove expired/invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await fetch(
            `${process.env.SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${row.id}`,
            {
              method: 'DELETE',
              headers: {
                apikey: process.env.SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
              }
            }
          );
        }
        throw err;
      }
    })
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  return {
    statusCode: 200,
    body: `Sent ${sent}/${rows.length} notifications`
  };
};
