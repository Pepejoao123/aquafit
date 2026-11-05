/**
 * FitPro — planilha central (Google Apps Script)
 *
 * Recebe os dados de cada usuário do app e monta abas legíveis (Resumo, Água, Refeições, Treinos,
 * Perfil) com as colunas Usuário e E-mail. Cada envio é autenticado pela conta Firebase do usuário,
 * então ninguém consegue gravar em nome de outra pessoa.
 *
 * Como implantar / atualizar:
 *  1. Na planilha: Extensões → Apps Script → apague tudo e cole este arquivo → Salvar.
 *  2. Primeira vez: Implantar → Nova implantação → App da Web
 *     (Executar como: Eu · Quem pode acessar: Qualquer pessoa) → autorize o acesso.
 *     Atualização (mantém a mesma URL): Implantar → Gerenciar implantações → lápis → Versão: Nova versão → Implantar.
 */
const FIREBASE_API_KEY = 'AIzaSyAG9UKyil1ncfq5j2-0PEK4mt4vTkEzrlg'; // chave web (pública) do projeto Firebase FitPro
const USERS_SHEET = '_usuarios';  // aba oculta: um usuário por linha
const CHUNK = 45000;              // limite de texto por célula (~50 mil)
const HEADER_COLOR = '#16a34a';

function doGet() { return out_({ ok: true, app: 'FitPro' }); }

function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents); } catch (err) {}
  if (b.action !== 'push') return out_({ ok: false, error: 'action' });
  const user = verify_(b.idToken);
  if (!user) return out_({ ok: false, error: 'auth' });
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const ss = SpreadsheetApp.getActive();
    saveUser_(user, b);
    writeTables_(readUsers_(), b.tz || ss.getSpreadsheetTimeZone());
    return out_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- autenticação: valida o token da conta Firebase ---------- */
function verify_(idToken) {
  if (!idToken) return null;
  const cache = CacheService.getScriptCache();
  const key = 'tk_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken));
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) return null;
  const u = (JSON.parse(r.getContentText()).users || [])[0];
  if (!u) return null;
  const user = { uid: u.localId, email: u.email || '' };
  cache.put(key, JSON.stringify(user), 1800);
  return user;
}

/* ---------- armazenamento por usuário (aba oculta _usuarios) ----------
   Colunas: uid | e-mail | nome | atualizado em | metas (JSON) | dados (JSON em pedaços…) */
function usersSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(USERS_SHEET);
  if (!sh) { sh = ss.insertSheet(USERS_SHEET); try { sh.hideSheet(); } catch (e) {} }
  return sh;
}
function saveUser_(user, b) {
  const sh = usersSheet_();
  const txt = JSON.stringify(b.data || {});
  const row = [user.uid, user.email, String(b.name || ''), new Date(), '#' + JSON.stringify(b.targets || null)];
  for (let i = 0; i < txt.length; i += CHUNK) row.push('#' + txt.slice(i, i + CHUNK)); // "#" evita virar fórmula/número
  if (sh.getMaxColumns() < row.length) sh.insertColumnsAfter(sh.getMaxColumns(), row.length - sh.getMaxColumns());
  const last = sh.getLastRow();
  const ids = last ? sh.getRange(1, 1, last, 1).getValues().map(function (r) { return r[0]; }) : [];
  let r = ids.indexOf(user.uid) + 1;
  if (!r) r = last + 1;
  sh.getRange(r, 1, 1, sh.getMaxColumns()).clearContent();
  sh.getRange(r, 1, 1, row.length).setNumberFormat('@').setValues([row]);
  sh.getRange(r, 4).setNumberFormat('dd/mm/yyyy hh:mm');
}
function readUsers_() {
  const sh = usersSheet_(), last = sh.getLastRow();
  if (!last) return [];
  return sh.getRange(1, 1, last, sh.getLastColumn()).getValues().map(function (r) {
    let data = null, targets = null;
    try { targets = JSON.parse(String(r[4]).slice(1)); } catch (e) {}
    try { data = JSON.parse(r.slice(5).filter(String).map(function (c) { return String(c).slice(1); }).join('')); } catch (e) {}
    return { uid: r[0], email: r[1], name: r[2], at: r[3], targets: targets, data: data };
  }).filter(function (u) { return u.uid && u.data; });
}

/* ---------- abas legíveis (todos os usuários) ---------- */
function writeTables_(users, tz) {
  const date = function (k) { const p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  const hora = function (ms) { return Utilities.formatDate(new Date(ms), tz, 'HH:mm'); };
  const r1 = function (n) { return Math.round((+n || 0) * 10) / 10; };
  const TIPOS = { cafe: 'Café da manhã', almoco: 'Almoço', lanche: 'Lanche', jantar: 'Jantar', ceia: 'Ceia' };
  const OBJ = { perder: 'Secar', manter: 'Manter', ganhar: 'Ganhar' };
  const resumo = [], agua = [], refeicoes = [], treinos = [], perfil = [];

  users.forEach(function (u) {
    const d = u.data, t = u.targets, who = [u.name || '', u.email || ''];
    const days = Object.keys(d.days || {}).sort().reverse();
    days.forEach(function (k) {
      const day = d.days[k], W = day.water || [], M = day.meals || [], T = day.workouts || [];
      let ml = 0, kcal = 0, p = 0, c = 0, f = 0, vol = 0;
      W.forEach(function (w) { ml += w.ml; agua.push(who.concat([date(k), hora(w.t), w.ml])); });
      M.forEach(function (m) {
        kcal += +m.kcal || 0; p += +m.p || 0; c += +m.c || 0; f += +m.f || 0;
        const itens = (m.items || []).map(function (i) { return i.manual ? i.name : i.name + ' (' + i.qty + ' ' + (i.unit === 'g' ? 'g' : i.unit) + ')'; }).join('; ');
        refeicoes.push(who.concat([date(k), hora(m.t), TIPOS[m.type] || m.type, m.name, Math.round(+m.kcal || 0), r1(m.p), r1(m.c), r1(m.f), itens]));
      });
      T.forEach(function (w) {
        const dur = Math.round((w.end - w.start) / 60000);
        (w.exercises || []).forEach(function (e) {
          (e.sets || []).forEach(function (s, i) {
            vol += (+s.kg || 0) * (+s.reps || 0);
            treinos.push(who.concat([date(k), w.name, hora(w.start), dur, e.name, i + 1, +s.kg || 0, +s.reps || 0]));
          });
        });
      });
      resumo.push(who.concat([date(k), ml, t ? t.water : '', Math.round(kcal), r1(p), r1(c), r1(f), T.length, Math.round(vol)]));
    });
    const pf = d.profile || {};
    perfil.push(who.concat([pf.sex === 'f' ? 'Feminino' : pf.sex === 'm' ? 'Masculino' : '', pf.age || '', pf.height || '', pf.weight || '',
      pf.bodyfat || '', pf.activity || '', OBJ[pf.goal] || '', t ? t.water : '', t ? t.kcal : '', t ? t.p : '', t ? t.c : '', t ? t.f : '', u.at]));
  });

  const byDate = function (a, b) { return b[2] - a[2] || String(a[0]).localeCompare(String(b[0])); };
  [resumo, agua, refeicoes, treinos].forEach(function (rows) { rows.sort(byDate); });
  const U = ['Usuário', 'E-mail'];
  put_('Resumo', U.concat(['Data', 'Água (ml)', 'Meta água', 'Kcal', 'Proteína (g)', 'Carbo (g)', 'Gordura (g)', 'Treinos', 'Volume (kg)']), resumo, [3]);
  put_('Água', U.concat(['Data', 'Hora', 'ml']), agua, [3]);
  put_('Refeições', U.concat(['Data', 'Hora', 'Refeição', 'Nome', 'Kcal', 'Proteína (g)', 'Carbo (g)', 'Gordura (g)', 'Alimentos']), refeicoes, [3]);
  put_('Treinos', U.concat(['Data', 'Treino', 'Início', 'Duração (min)', 'Exercício', 'Série', 'Kg', 'Reps']), treinos, [3]);
  put_('Perfil', U.concat(['Sexo', 'Idade', 'Altura (cm)', 'Peso (kg)', '% gordura', 'Fator de atividade', 'Objetivo',
    'Meta água (ml)', 'Meta kcal', 'Meta proteína (g)', 'Meta carbo (g)', 'Meta gordura (g)', 'Atualizado em']), perfil, []);
}

function put_(name, headers, rows, dateCols) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  const all = [headers].concat(rows);
  sh.getRange(1, 1, all.length, headers.length).setValues(all);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground(HEADER_COLOR).setFontColor('#ffffff');
  sh.setFrozenRows(1);
  dateCols.forEach(function (c) { if (rows.length) sh.getRange(2, c, rows.length, 1).setNumberFormat('dd/mm/yyyy'); });
}
