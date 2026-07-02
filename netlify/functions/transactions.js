const { getStore } = require('@netlify/blobs');

const SITE_ID = '268bde3a-87ee-4dac-9d04-05264cd8826c';

function getFundStore() {
  // Falls back to an explicit siteID/token when the runtime doesn't auto-inject
  // Blobs context (observed on this account: works via CLI, not via the deployed function).
  if (process.env.BLOBS_TOKEN) {
    return getStore({ name: 'family-fund', siteID: SITE_ID, token: process.env.BLOBS_TOKEN });
  }
  return getStore('family-fund');
}

function getProofStore() {
  if (process.env.BLOBS_TOKEN) {
    return getStore({ name: 'family-fund-proofs', siteID: SITE_ID, token: process.env.BLOBS_TOKEN });
  }
  return getStore('family-fund-proofs');
}

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5MB decoded (client caps the original file at 4MB)
const ALLOWED_PROOF_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

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
  const store = getFundStore();
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
      const { name, amount, note, date, proof, proofName, proofType } = body;
      if (!MEMBERS.includes(name)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Miembro desconocido' }) };
      }
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Monto inválido' }) };
      }
      if (typeof proof !== 'string' || proof.length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Debes adjuntar un comprobante de pago (captura o PDF).' }) };
      }
      let proofBuffer;
      try {
        proofBuffer = Buffer.from(proof, 'base64');
      } catch {
        proofBuffer = Buffer.alloc(0);
      }
      if (proofBuffer.length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'El comprobante no es válido.' }) };
      }
      if (proofBuffer.length > MAX_PROOF_BYTES) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'El comprobante es demasiado grande (máx. 4MB).' }) };
      }
      const safeProofType = ALLOWED_PROOF_TYPES.includes(proofType) ? proofType : 'application/octet-stream';
      const safeProofName = typeof proofName === 'string' && proofName.trim() ? proofName.slice(0, 120) : 'comprobante';

      const safeDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : new Date().toISOString().slice(0, 10);

      let transactions = await store.get('transactions', { type: 'json' });
      if (!transactions) transactions = seedTransactions();

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const proofStore = getProofStore();
      await proofStore.set(id, proofBuffer, {
        metadata: { contentType: safeProofType, filename: safeProofName },
      });

      transactions.push({
        id,
        name,
        amount: amt,
        note: typeof note === 'string' ? note.slice(0, 200) : '',
        date: safeDate,
        submittedAt: new Date().toISOString(),
        proof: true,
        proofName: safeProofName,
        proofType: safeProofType,
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
      const target = transactions.find((t) => t.id === id);
      transactions = transactions.filter((t) => t.id !== id);
      await store.set('transactions', JSON.stringify(transactions));
      if (target && target.proof) {
        await getProofStore().delete(id);
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Error interno' }) };
  }
};
