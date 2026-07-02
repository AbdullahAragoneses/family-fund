const { getFundStore } = require('./lib/blobs');

exports.handler = async (event) => {
  const store = getFundStore();
  const headers = { 'Content-Type': 'application/json' };

  try {
    if (event.httpMethod === 'GET') {
      const goal = await store.get('goal', { type: 'json' });
      return { statusCode: 200, headers, body: JSON.stringify({ goal: goal || null }) };
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
      }
      const { name, target } = body;
      if (typeof name !== 'string' || !name.trim()) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Indica un nombre para la meta.' }) };
      }
      const amt = Number(target);
      if (!Number.isFinite(amt) || amt <= 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'El monto objetivo debe ser mayor a 0.' }) };
      }
      const goal = { name: name.trim().slice(0, 120), target: amt, setAt: new Date().toISOString() };
      await store.set('goal', JSON.stringify(goal));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, goal }) };
    }

    if (event.httpMethod === 'DELETE') {
      await store.delete('goal');
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Error interno' }) };
  }
};
