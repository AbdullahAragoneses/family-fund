const { getFundStore } = require('./lib/blobs');

exports.handler = async (event) => {
  const store = getFundStore();
  const headers = { 'Content-Type': 'application/json' };

  try {
    if (event.httpMethod === 'GET') {
      const goals = await store.get('goals', { type: 'json' });
      return { statusCode: 200, headers, body: JSON.stringify({ goals: goals || [] }) };
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
      }
      const { id, name, target } = body;
      if (typeof name !== 'string' || !name.trim()) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Indica un nombre para la meta.' }) };
      }
      const amt = Number(target);
      if (!Number.isFinite(amt) || amt <= 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'El monto objetivo debe ser mayor a 0.' }) };
      }
      const safeName = name.trim().slice(0, 120);

      let goals = await store.get('goals', { type: 'json' });
      if (!goals) goals = [];

      if (typeof id === 'string' && id) {
        const idx = goals.findIndex((g) => g.id === id);
        if (idx === -1) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Meta no encontrada' }) };
        }
        goals[idx] = { ...goals[idx], name: safeName, target: amt, updatedAt: new Date().toISOString() };
        await store.set('goals', JSON.stringify(goals));
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, goal: goals[idx] }) };
      }

      const goal = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: safeName,
        target: amt,
        setAt: new Date().toISOString(),
      };
      goals.push(goal);
      await store.set('goals', JSON.stringify(goals));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, goal }) };
    }

    if (event.httpMethod === 'DELETE') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
      }
      const { id } = body;
      let goals = await store.get('goals', { type: 'json' });
      if (!goals) goals = [];
      goals = goals.filter((g) => g.id !== id);
      await store.set('goals', JSON.stringify(goals));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Error interno' }) };
  }
};
