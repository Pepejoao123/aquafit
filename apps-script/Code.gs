/**
 * AquaFit — API de sincronização (Google Apps Script)
 * Cole este código em Extensões → Apps Script da sua planilha e implante como App da Web
 * (Executar como: Eu · Acesso: Qualquer pessoa). O TOKEN protege seus dados.
 */
const TOKEN = 'COLE-AQUI-O-TOKEN-DO-APP';

function doGet(e) { return handle_((e && e.parameter) || {}); }
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {}
  return handle_(body);
}

function handle_(b) {
  if (!b.token || b.token !== TOKEN) return out_({ ok: false, error: 'token' });
  const ss = SpreadsheetApp.getActive();
  if (b.action === 'ping') return out_({ ok: true, url: ss.getUrl(), name: ss.getName() });
  if (b.action !== 'sync') return out_({ ok: false, error: 'action' });
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const merged = mergeState(readState_(), b.data || null);
    if (merged) {
      writeTables_(merged, b.targets || null, b.tz || ss.getSpreadsheetTimeZone());
      writeState_(merged);
    }
    return out_({ ok: true, data: merged, url: ss.getUrl() });
  } finally {
    lock.releaseLock();
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- estado completo (aba oculta _dados, em pedaços de texto) ---------- */
function readState_() {
  const sh = SpreadsheetApp.getActive().getSheetByName('_dados');
  if (!sh || sh.getLastRow() < 1) return null;
  const txt = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(function (r) { return String(r[0]).slice(1); }).join('');
  try { return JSON.parse(txt); } catch (e) { return null; }
}
function writeState_(data) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('_dados') || ss.insertSheet('_dados');
  const txt = JSON.stringify(data), rows = [];
  for (let i = 0; i < txt.length; i += 40000) rows.push(['#' + txt.slice(i, i + 40000)]); // "#" evita virar fórmula/número
  sh.clearContents();
  sh.getRange(1, 1, rows.length, 1).setNumberFormat('@').setValues(rows);
  try { if (!sh.isSheetHidden()) sh.hideSheet(); } catch (e) {}
}

/* ---------- abas legíveis ---------- */
function writeTables_(d, t, tz) {
  const days = Object.keys(d.days || {}).sort().reverse();
  const date = function (k) { const p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  const hora = function (ms) { return Utilities.formatDate(new Date(ms), tz, 'HH:mm'); };
  const r1 = function (n) { return Math.round((+n || 0) * 10) / 10; };
  const TIPOS = { cafe: 'Café da manhã', almoco: 'Almoço', lanche: 'Lanche', jantar: 'Jantar', ceia: 'Ceia' };
  const resumo = [], agua = [], refeicoes = [], treinos = [];

  days.forEach(function (k) {
    const day = d.days[k], W = day.water || [], M = day.meals || [], T = day.workouts || [];
    let ml = 0, kcal = 0, p = 0, c = 0, f = 0, vol = 0;
    W.forEach(function (w) { ml += w.ml; agua.push([date(k), hora(w.t), w.ml]); });
    M.forEach(function (m) {
      kcal += +m.kcal || 0; p += +m.p || 0; c += +m.c || 0; f += +m.f || 0;
      const itens = (m.items || []).map(function (i) { return i.manual ? i.name : i.name + ' (' + i.qty + ' ' + (i.unit === 'g' ? 'g' : i.unit) + ')'; }).join('; ');
      refeicoes.push([date(k), hora(m.t), TIPOS[m.type] || m.type, m.name, Math.round(+m.kcal || 0), r1(m.p), r1(m.c), r1(m.f), itens]);
    });
    T.forEach(function (w) {
      const dur = Math.round((w.end - w.start) / 60000);
      w.exercises.forEach(function (e) {
        e.sets.forEach(function (s, i) {
          vol += (+s.kg || 0) * (+s.reps || 0);
          treinos.push([date(k), w.name, hora(w.start), dur, e.name, i + 1, +s.kg || 0, +s.reps || 0]);
        });
      });
    });
    resumo.push([date(k), ml, t ? t.water : '', Math.round(kcal), r1(p), r1(c), r1(f), T.length, Math.round(vol)]);
  });

  put_('Resumo', ['Data', 'Água (ml)', 'Meta água', 'Kcal', 'Proteína (g)', 'Carbo (g)', 'Gordura (g)', 'Treinos', 'Volume (kg)'], resumo, [1]);
  put_('Água', ['Data', 'Hora', 'ml'], agua, [1]);
  put_('Refeições', ['Data', 'Hora', 'Refeição', 'Nome', 'Kcal', 'Proteína (g)', 'Carbo (g)', 'Gordura (g)', 'Alimentos'], refeicoes, [1]);
  put_('Treinos', ['Data', 'Treino', 'Início', 'Duração (min)', 'Exercício', 'Série', 'Kg', 'Reps'], treinos, [1]);

  const pf = d.profile || {}, perfil = [
    ['Sexo', pf.sex === 'f' ? 'Feminino' : pf.sex === 'm' ? 'Masculino' : ''], ['Idade', pf.age || ''], ['Altura (cm)', pf.height || ''],
    ['Peso (kg)', pf.weight || ''], ['% gordura', pf.bodyfat || ''], ['Fator de atividade', pf.activity || ''], ['Objetivo', pf.goal || '']
  ];
  if (t) perfil.push(['Meta água (ml)', t.water], ['Meta kcal', t.kcal], ['Meta proteína (g)', t.p], ['Meta carbo (g)', t.c], ['Meta gordura (g)', t.f]);
  perfil.push(['Atualizado em', new Date()]);
  put_('Perfil', ['Campo', 'Valor'], perfil, []);
}

function put_(name, headers, rows, dateCols) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  const all = [headers].concat(rows);
  sh.getRange(1, 1, all.length, headers.length).setValues(all);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0b0b0d').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  dateCols.forEach(function (c) { if (rows.length) sh.getRange(2, c, rows.length, 1).setNumberFormat('dd/mm/yyyy'); });
}

/* ---------- mesclagem (mesma função usada no app) ---------- */
function mergeState(base, inc) {
  if (!inc) return base;
  if (!base) return inc;
  var ts = function (x) { return x.u || x.end || x.t || x.start || 0; };
  var cutoff = Date.now() - 120 * 864e5, del = {};
  [base.deleted || {}, inc.deleted || {}].forEach(function (d) {
    Object.keys(d).forEach(function (id) { if (d[id] > cutoff) del[id] = Math.max(del[id] || 0, d[id]); });
  });
  var nb = (inc.updatedAt || 0) > (base.updatedAt || 0) ? inc : base, ob = nb === inc ? base : inc;
  var out = JSON.parse(JSON.stringify(nb));
  out.profile = nb.profile || ob.profile || null;
  var bs = base.settings || {};
  out.settings = Object.assign({}, nb.settings || ob.settings || {}, { ai: bs.ai, sync: bs.sync });
  out.days = {};
  var keys = {};
  Object.keys(base.days || {}).concat(Object.keys(inc.days || {})).forEach(function (k) { keys[k] = 1; });
  Object.keys(keys).forEach(function (k) {
    var d = {}, any = false;
    ['water', 'meals', 'workouts'].forEach(function (kind) {
      var map = {};
      [base, inc].forEach(function (src) {
        ((((src.days || {})[k]) || {})[kind] || []).forEach(function (it) {
          if (del[it.id]) return;
          if (!map[it.id] || ts(it) > ts(map[it.id])) map[it.id] = it;
        });
      });
      d[kind] = Object.keys(map).map(function (id) { return map[id]; })
        .sort(function (a, b) { return (a.t || a.start || 0) - (b.t || b.start || 0); });
      if (d[kind].length) any = true;
    });
    if (any) out.days[k] = JSON.parse(JSON.stringify(d));
  });
  out.deleted = del;
  out.updatedAt = Math.max(base.updatedAt || 0, inc.updatedAt || 0);
  return out;
}
