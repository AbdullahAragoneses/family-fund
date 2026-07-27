const webpush = require('web-push');
const { getSubscriptionsStore } = require('./lib/blobs');

// Public VAPID key — not secret, meant to be shipped to every client. The
// matching private key lives only in the VAPID_PRIVATE_KEY Netlify env var.
const VAPID_PUBLIC_KEY = 'BN7yE70j2F00LScOnwhAEZam-mE3UH9B4yzrxnc8-vC5vXlVAZvILzCyTVlXR8lrN2htVvPU5FolkvoFhBaO1eE';

function keyFor(subscription) {
  return Buffer.from(subscription.endpoint).toString('base64url').slice(0, 200);
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };
  const store = getSubscriptionsStore();

  try {
    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
      }
      const { name, subscription, sendTest } = body;
      if (!subscription || typeof subscription.endpoint !== 'string') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Suscripción inválida' }) };
      }
      const safeName = typeof name === 'string' ? name.trim().slice(0, 60) : '';
      const key = keyFor(subscription);
      await store.set(key, JSON.stringify({
        name: safeName,
        subscription,
        subscribedAt: new Date().toISOString(),
      }));

      let testSent = false;
      let testError = null;
      if (sendTest) {
        try {
          webpush.setVapidDetails(
            process.env.VAPID_SUBJECT || 'mailto:example@example.com',
            VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
          );
          await webpush.sendNotification(subscription, JSON.stringify({
            title: 'Fondo Familiar',
            body: safeName
              ? '¡Hola ' + safeName + '! Las notificaciones están activadas.'
              : 'Notificaciones activadas correctamente.',
          }));
          testSent = true;
        } catch (err) {
          testError = err.message || 'No se pudo enviar la notificación de prueba';
        }
      }

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, testSent, testError }) };
    }

    if (event.httpMethod === 'DELETE') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
      }
      const { subscription } = body;
      if (!subscription || typeof subscription.endpoint !== 'string') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Suscripción inválida' }) };
      }
      await store.delete(keyFor(subscription));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Error interno' }) };
  }
};
