const fs = require('fs');
const path = require('path');

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MONTHS_EN = ['january','february','march','april','may','june',
                   'july','august','september','october','november','december'];

function formatMonthsList(months) {
  if (months.length === 0) return '';
  if (months.length === 1) return months[0];
  return months.slice(0, -1).join(', ') + ' y ' + months[months.length - 1];
}

function generateHTML(state) {
  const totalPaid    = state.members.reduce((s, m) => s + m.paid,    0);
  const totalPending = state.members.reduce((s, m) => s + m.pending, 0);
  const totalExpected = totalPaid + totalPending;

  // Current month name for the column header and footer
  const parts = state.lastUpdated.split(' ');  // e.g. ["26", "junio", "2026"]
  const monthName = parts[1];
  const year      = parts[2];

  const rows = state.members.map(m => {
    const cls     = m.pending === 0 ? 'pending clear' : 'pending owed';
    const mStr    = formatMonthsList(m.pendingMonths);
    const content = m.pending === 0
      ? '0 &euro;'
      : `${m.pending} &euro; <span class="months">(${mStr})</span>`;
    return `        <tr>
          <td class="name">${m.name}</td>
          <td>${m.paid} &euro;</td>
          <td class="${cls}">${content}</td>
        </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fondo Familiar</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #FFFFFF; --text: #191916; --muted: #6A6A64; --border: #D6D8DC;
    --accent: #3A5F8A; --pending-fg: #B07A28; --zero-fg: #4A8A5A;
    --summary-bg: #F3F5F8; --stripe: #F8F8F6;
  }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 1.5; }
  #auth-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .auth-card { width: 100%; max-width: 360px; border-top: 3px solid var(--accent); padding-top: 24px; }
  .auth-card h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
  .auth-card p  { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
  .auth-card input { width: 100%; padding: 11px 14px; font-size: 15px; font-family: inherit; border: 1.5px solid var(--border); border-radius: 4px; color: var(--text); outline: none; margin-bottom: 12px; transition: border-color .15s; }
  .auth-card input:focus { border-color: var(--accent); }
  .auth-card button { width: 100%; padding: 11px; background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; font-family: inherit; border: none; border-radius: 4px; cursor: pointer; transition: opacity .15s; }
  .auth-card button:hover { opacity: .88; }
  .auth-error { margin-top: 10px; font-size: 13px; color: #B85C38; display: none; }
  #tracker { display: none; padding: 48px 24px 64px; }
  .doc { max-width: 680px; margin: 0 auto; }
  .doc-header { border-top: 3px solid var(--accent); padding-top: 20px; margin-bottom: 36px; }
  .doc-header h1 { font-size: 20px; font-weight: 600; letter-spacing: -.01em; margin-bottom: 4px; }
  .doc-header .meta { font-size: 12.5px; color: var(--muted); letter-spacing: .03em; text-transform: uppercase; }
  .fund-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
  .fund-table thead th { font-size: 11.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding: 10px 0; border-bottom: 1.5px solid var(--border); text-align: left; }
  .fund-table thead th:not(:first-child) { text-align: right; }
  .fund-table tbody tr { border-bottom: 1px solid var(--border); }
  .fund-table tbody tr:nth-child(odd) { background: var(--stripe); }
  .fund-table tbody td { padding: 14px 0; font-size: 15px; vertical-align: middle; }
  .fund-table tbody td:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
  .name { font-weight: 500; }
  .pending { font-weight: 500; }
  .pending.owed { color: var(--pending-fg); }
  .pending.clear { color: var(--zero-fg); }
  .pending .months { font-style: italic; font-weight: 400; font-size: 13px; color: var(--muted); margin-left: 4px; }
  .summary { background: var(--summary-bg); border-left: 3px solid var(--accent); padding: 20px 24px; border-radius: 0 4px 4px 0; }
  .summary h2 { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; }
  .summary ul { list-style: none; display: flex; flex-direction: column; gap: 7px; }
  .summary ul li { font-size: 14.5px; display: flex; align-items: baseline; gap: 8px; }
  .summary ul li::before { content: ''; display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--accent); flex-shrink: 0; position: relative; top: -1px; }
  .summary ul li strong { font-variant-numeric: tabular-nums; }
  .doc-footer { margin-top: 36px; font-size: 11.5px; color: var(--muted); border-top: 1px solid var(--border); padding-top: 14px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  @media print { body { padding: 0; } .doc { max-width: 100%; } }
</style>
</head>
<body>

<div id="auth-screen">
  <div class="auth-card">
    <h1>Fondo Familiar</h1>
    <p>Introduce la contrase&ntilde;a para ver el tracker.</p>
    <input type="password" id="pwd-input" placeholder="Contrase&ntilde;a" onkeydown="if(event.key==='Enter') checkPassword()">
    <button onclick="checkPassword()">Entrar</button>
    <div class="auth-error" id="auth-error">Contrase&ntilde;a incorrecta. Int&eacute;ntalo de nuevo.</div>
  </div>
</div>

<div id="tracker">
  <div class="doc">
    <div class="doc-header">
      <h1>Fondo Familiar</h1>
      <div class="meta">Actualizado: ${state.lastUpdated} &nbsp;&middot;&nbsp; Aportaci&oacute;n mensual: 30 &euro; por persona</div>
    </div>
    <table class="fund-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Pagado hasta ahora</th>
          <th>Pendiente (hasta finales de ${monthName})</th>
        </tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
    <div class="summary">
      <h2>Resumen</h2>
      <ul>
        <li>Total recaudado hasta ahora: <strong>${totalPaid} &euro;</strong></li>
        <li>Total pendiente: <strong>${totalPending} &euro;</strong></li>
        <li>Total esperado al finalizar ${monthName}: <strong>${totalExpected.toLocaleString('de-DE')} &euro;</strong></li>
      </ul>
    </div>
    <div class="doc-footer">
      <span>Fondo familiar &middot; Contribuci&oacute;n mensual 30 &euro;/persona</span>
      <span>4 miembros &middot; objetivo ${monthName} ${year}</span>
    </div>
  </div>
</div>

<script>
  const AUTH_KEY = 'familyFundAuth_v1';
  const PWD = 'papasito';
  if (localStorage.getItem(AUTH_KEY) === 'yes') {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('tracker').style.display = 'block';
  }
  function checkPassword() {
    const val = document.getElementById('pwd-input').value;
    if (val === PWD) {
      localStorage.setItem(AUTH_KEY, 'yes');
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('tracker').style.display = 'block';
    } else {
      document.getElementById('auth-error').style.display = 'block';
      document.getElementById('pwd-input').value = '';
      document.getElementById('pwd-input').focus();
    }
  }
</script>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const statePath = path.join(__dirname, 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

const now        = new Date();
const monthIdx   = now.getMonth();
const year       = now.getFullYear();
const monthKey   = `${MONTHS_EN[monthIdx]}-${year}`;
const monthES    = MONTHS_ES[monthIdx];

if (state.lastMonthAdded === monthKey) {
  console.log(`${monthKey} already added — skipping obligations update.`);
} else {
  state.members.forEach(m => {
    m.pending += 30;
    m.pendingMonths.push(monthES);
  });
  state.lastMonthAdded = monthKey;
  state.lastUpdated    = `1 ${monthES} ${year}`;
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(`Added 30 € obligation for ${monthES} ${year} to all members.`);
}

fs.writeFileSync(path.join(__dirname, 'index.html'), generateHTML(state));
console.log('index.html regenerated successfully.');
