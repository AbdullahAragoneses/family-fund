const { getStore } = require('@netlify/blobs');

const MEMBERS = ['Mohammed', 'Abdullah', 'Asia', 'Fausia'];

// Fund started December 2025 with a €50 base contribution, then €30/month per person.
const START_YEAR = 2025;
const START_MONTH = 11; // December (0-indexed)
const BASE_AMOUNT = 50;
const MONTHLY_AMOUNT = 30;

// Snapshot of what had actually been paid as of 1 July 2026, carried over from the
// old manually-maintained tracker so historical totals don't reset to zero.
const OPENING_BALANCES = [
  { name: 'Mohammed', amount: 260 },
  { name: 'Abdullah', amount: 260 },
  { name: 'Asia', amount: 170 },
  { name: 'Fausia', amount: 260 },
];
const OPENING_DATE = '2026-07-01';

function monthsElapsed(now) {
  const start = new Date(Date.UTC(START_YEAR, START_MONTH, 1));
  const cur = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return (cur.getUTCFullYear() - start.getUTCFullYear()) * 12 + (cur.getUTCMonth() - start.getUTCMonth()) + 1;
}

function obligation(now) {
  return BASE_AMOUNT + monthsElapsed(now) * MONTHLY_AMOUNT;
}

function seedTransactions() {
  return OPENING_BALANCES.map((m, i) => ({
    id: `seed-${i}`,
    name: m.name,
    amount: m.amount,
    note: 'Saldo inicial (migrado del tracker anterior)',
    date: OPENING_DATE,
    submittedAt: `${OPENING_DATE}T00:00:00.000Z`,
  }));
}

exports.handler = async (event) => {
  const store = getStore('family-fund');
  const headers = { 'Content-Type': 'application/json' };

  try {
    if (event.httpMethod === 'GET') {
      let transactions = await store.get('transactions', { type: 'json' });
      if (!transactions) {
        transactions = seedTransactions();
        await store.set('transactions', JSON.stringify(transactions));
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          transactions,
          members: MEMBERS,
          obligation: obligation(new Date()),
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
      }
      const { name, amount, note, date } = body;
      if (!MEMBERS.includes(name)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Miembro desconocido' }) };
      }
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Monto inválido' }) };
      }
      const safeDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : new Date().toISOString().slice(0, 10);

      let transactions = await store.get('transactions', { type: 'json' });
      if (!transactions) transactions = seedTransactions();

      transactions.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        amount: amt,
        note: typeof note === 'string' ? note.slice(0, 200) : '',
        date: safeDate,
        submittedAt: new Date().toISOString(),
      });
      await store.set('transactions', JSON.stringify(transactions));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod === 'DELETE') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
      }
      const { id } = body;
      let transactions = await store.get('transactions', { type: 'json' });
      if (!transactions) transactions = seedTransactions();
      transactions = transactions.filter((t) => t.id !== id);
      await store.set('transactions', JSON.stringify(transactions));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Error interno' }) };
  }
};
