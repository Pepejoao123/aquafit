// Ajusta o projeto Android gerado pelo Capacitor:
//  - permissão de câmera (foto do prato direto do app)
//  - ícone monocromático (halter) para as notificações
//  - alarmes exatos (lembretes e fim do descanso no horário certo)
//  - plugin nativo RestTimer (notificação com contagem regressiva ao vivo)
//  - widgets da tela inicial (hidratação, descanso e refeição) em 3 temas, de 2x2 para cima
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'android', 'app', 'src', 'main');
const manifestPath = path.join(root, 'AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) {
  console.error('android/ não encontrado — rode "npx cap add android" antes.');
  process.exit(1);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');
const perms = ['android.permission.CAMERA', 'android.permission.INTERNET', 'android.permission.USE_EXACT_ALARM'];
for (const p of perms) {
  if (!manifest.includes(`"${p}"`)) {
    manifest = manifest.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
  }
}
if (!manifest.includes('android.hardware.camera')) {
  manifest = manifest.replace('</manifest>', '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>');
}
fs.writeFileSync(manifestPath, manifest);

const drawable = path.join(root, 'res', 'drawable');
fs.mkdirSync(drawable, { recursive: true });
fs.writeFileSync(path.join(drawable, 'ic_stat_water.xml'), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp"
    android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#FFFFFFFF"
        android:pathData="M2,9.5L4,8.8L4.6,15.2L2.4,15.6Z M5.2,6.4L7.6,6.2L7.4,17.8L5,16.4Z M7.8,11L16.2,11L16.2,13L7.8,13Z M16.4,6.2L18.8,6.4L19,16.4L16.6,17.8Z M20,8.8L22,9.5L21.6,15.6L19.4,15.2Z"/>
</vector>
`);
// ---------- widgets da tela inicial (hidratação, descanso e refeição) ----------
// Cada widget tem 2 layouts — compacto (2x2) e largo (3x2 ou maior) — em 3 temas:
// dark (escuro), glass (Liquid Glass escuro) e glasslight (Liquid Glass claro).
// O Java escolhe o layout pelo tamanho do widget e pelo tema salvo pelo app.
const res = path.join(root, 'res');
const write = (rel, txt) => { const p = path.join(res, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, txt); };
const A = 'xmlns:android="http://schemas.android.com/apk/res/android"';
const THEMES = {
  dark: {
    ink: '#FFFFFF', soft: '#E6FFFFFF', muted: '#99FFFFFF', label: '#5CF25C', water: '#4D8DFF', rest: '#22D3EE', stop: '#FF5A5F',
    kcal: '#5CF25C', p: '#FF6B7D', c: '#FBBF24', f: '#A78BFA', track: '#26FFFFFF',
    bg: `<shape android:shape="rectangle"><solid android:color="#F20C0D10"/><corners android:radius="24dp"/><stroke android:width="1dp" android:color="#22FFFFFF"/></shape>`,
    btn: `<shape android:shape="rectangle"><solid android:color="#1FFFFFFF"/><corners android:radius="14dp"/></shape>`,
  },
  // Vidro escuro: fundo translúcido (mostra o papel de parede), brilho no topo e borda clara
  glass: {
    ink: '#FFFFFF', soft: '#F2FFFFFF', muted: '#B3FFFFFF', label: '#7CFF7C', water: '#7FB0FF', rest: '#67E8F9', stop: '#FF8A8E',
    kcal: '#7CFF7C', p: '#FF8C9A', c: '#FCD34D', f: '#C4B5FD', track: '#33FFFFFF',
    bg: `<layer-list>
        <item><shape android:shape="rectangle"><solid android:color="#7314161C"/><corners android:radius="26dp"/></shape></item>
        <item><shape android:shape="rectangle"><gradient android:angle="270" android:startColor="#38FFFFFF" android:centerColor="#0AFFFFFF" android:endColor="#14FFFFFF"/><corners android:radius="26dp"/></shape></item>
        <item><shape android:shape="rectangle"><corners android:radius="26dp"/><stroke android:width="1dp" android:color="#66FFFFFF"/></shape></item>
        <item android:left="1dp" android:top="1dp" android:right="1dp" android:bottom="1dp"><shape android:shape="rectangle"><corners android:radius="25dp"/><stroke android:width="1dp" android:color="#1AFFFFFF"/></shape></item>
    </layer-list>`,
    btn: `<layer-list>
        <item><shape android:shape="rectangle"><gradient android:angle="270" android:startColor="#40FFFFFF" android:endColor="#1AFFFFFF"/><corners android:radius="16dp"/></shape></item>
        <item><shape android:shape="rectangle"><corners android:radius="16dp"/><stroke android:width="1dp" android:color="#4DFFFFFF"/></shape></item>
    </layer-list>`,
  },
  // Vidro claro: leitoso, texto escuro
  glasslight: {
    ink: '#0F1115', soft: '#D90F1115', muted: '#990F1115', label: '#15803D', water: '#2563EB', rest: '#0E7490', stop: '#DC2626',
    kcal: '#15803D', p: '#E11D48', c: '#B45309', f: '#7C3AED', track: '#1F0F1115',
    bg: `<layer-list>
        <item><shape android:shape="rectangle"><solid android:color="#A6FFFFFF"/><corners android:radius="26dp"/></shape></item>
        <item><shape android:shape="rectangle"><gradient android:angle="270" android:startColor="#80FFFFFF" android:centerColor="#1AFFFFFF" android:endColor="#33FFFFFF"/><corners android:radius="26dp"/></shape></item>
        <item><shape android:shape="rectangle"><corners android:radius="26dp"/><stroke android:width="1dp" android:color="#E6FFFFFF"/></shape></item>
    </layer-list>`,
    btn: `<layer-list>
        <item><shape android:shape="rectangle"><gradient android:angle="270" android:startColor="#CCFFFFFF" android:endColor="#80FFFFFF"/><corners android:radius="16dp"/></shape></item>
        <item><shape android:shape="rectangle"><corners android:radius="16dp"/><stroke android:width="1dp" android:color="#FFFFFFFF"/></shape></item>
    </layer-list>`,
  },
};
for (const [tn, T] of Object.entries(THEMES)) {
  write(`drawable/widget_bg_${tn}.xml`, `<?xml version="1.0" encoding="utf-8"?>\n${T.bg.replace(/^<(shape|layer-list)/, `<$1 ${A}`)}\n`);
  write(`drawable/widget_btn_${tn}.xml`, `<?xml version="1.0" encoding="utf-8"?>\n${T.btn.replace(/^<(shape|layer-list)/, `<$1 ${A}`)}\n`);
  for (const pc of ['water', 'kcal', 'p', 'c', 'f']) {
    write(`drawable/widget_prog_${pc}_${tn}.xml`, `<?xml version="1.0" encoding="utf-8"?>
<layer-list ${A}>
    <item android:id="@android:id/background"><shape><corners android:radius="6dp"/><solid android:color="${T.track}"/></shape></item>
    <item android:id="@android:id/progress"><clip><shape><corners android:radius="6dp"/><solid android:color="${T[pc]}"/></shape></clip></item>
</layer-list>
`);
  }
}

// ---- peças de layout ----
const tv = (id, text, color, size, extra = '') => `<TextView${id ? ` android:id="@+id/${id}"` : ''} android:layout_width="wrap_content" android:layout_height="wrap_content"
    android:text="${text}" android:textColor="${color}" android:textSize="${size}sp" android:maxLines="1" android:ellipsize="end"${extra}/>`;
const B = ' android:textStyle="bold"';
const label = (T, id, text) => tv(id, text, T.label, 10, `${B} android:letterSpacing="0.08"`);
const phrase = (T, id, lines) => `<TextView android:id="@+id/${id}" android:layout_width="match_parent" android:layout_height="wrap_content"
    android:text="Constância vence intensidade." android:textColor="${T.soft}" android:textSize="12sp"
    android:textStyle="italic" android:maxLines="${lines}" android:ellipsize="end"/>`;
const spacer = '<FrameLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:minHeight="4dp"/>';
const bar = (tn, id, col, h = 8, extra = '') => `<ProgressBar android:id="@+id/${id}" style="@android:style/Widget.ProgressBar.Horizontal" android:layout_width="match_parent"
    android:layout_height="${h}dp" android:max="100" android:progress="0" android:progressDrawable="@drawable/widget_prog_${col}_${tn}"${extra}/>`;
const btn = (tn, id, text, color, h, extra = '', w = 1) => `<Button android:id="@+id/${id}" android:layout_width="0dp" android:layout_weight="${w}" android:layout_height="${h}dp"
    android:background="@drawable/widget_btn_${tn}" android:text="${text}" android:textColor="${color}" android:textSize="${h < 36 ? 12 : 13}sp"
    android:textStyle="bold" android:textAllCaps="false" android:minHeight="0dp" android:minWidth="0dp" android:padding="0dp"${extra}/>`;
const row = (inner, extra = '') => `<LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal"
    ${extra.includes('android:gravity=') ? '' : 'android:gravity="center_vertical"'}${extra}>
${inner}
</LinearLayout>`;
const col = (inner, extra = '') => `<LinearLayout android:layout_width="0dp" android:layout_weight="1" android:layout_height="wrap_content" android:orientation="vertical"${extra}>
${inner}
</LinearLayout>`;
const frame = (tn, id, pad, inner) => `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout ${A} android:id="@+id/${id}" android:layout_width="match_parent" android:layout_height="match_parent"
    android:orientation="vertical" android:padding="${pad}dp" android:background="@drawable/widget_bg_${tn}">
${inner}
</LinearLayout>
`;
const ML = ' android:layout_marginStart="6dp"';
const icon = (e, size) => tv(null, e, '#FFFFFF', size);

const LAYOUTS = {
  // ---------- Hidratação ----------
  water_s: (tn, T) => frame(tn, 'w_root', 12, [
    row(icon('💧', 16) + '\n' + col(label(T, null, 'ÁGUA'), ' android:layout_marginStart="6dp"') + '\n' + tv('w_pct', '0%', T.water, 13, B)),
    row(tv('w_value', '0 ml', T.ink, 20, B) + '\n' + tv('w_goal', 'de 2,5 L', T.muted, 11, ' android:layout_marginStart="4dp"'), ' android:gravity="bottom" android:layout_marginTop="4dp"'),
    spacer,
    bar(tn, 'w_bar', 'water', 6),
    row(btn(tn, 'w_add250', '+250', T.water, 32) + '\n' + btn(tn, 'w_add500', '+500', T.water, 32, ML), ' android:layout_marginTop="8dp"'),
  ].join('\n')),
  water_w: (tn, T) => frame(tn, 'w_root', 14, [
    phrase(T, 'w_phrase', 2),
    row(icon('💧', 22) + '\n' + col(label(T, null, 'HIDRATAÇÃO') + '\n' + tv('w_value', '0 ml de 2,5 L', T.ink, 17, B), ' android:layout_marginStart="10dp"') + '\n' + tv('w_pct', '0%', T.water, 15, B), ' android:layout_marginTop="8dp"'),
    spacer,
    bar(tn, 'w_bar', 'water', 8),
    row(btn(tn, 'w_add250', '+250 ml', T.water, 38) + '\n' + btn(tn, 'w_add500', '+500 ml', T.water, 38, ' android:layout_marginStart="8dp"'), ' android:layout_marginTop="10dp"'),
  ].join('\n')),
  // ---------- Descanso ----------
  rest_s: (tn, T) => frame(tn, 'r_root', 12, [
    row(icon('⏱️', 16) + '\n' + col(label(T, 'r_label', 'DESCANSO'), ' android:layout_marginStart="6dp"')),
    `<Chronometer android:id="@+id/r_chrono" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="2dp"
    android:textColor="${T.rest}" android:textSize="26sp" android:textStyle="bold" android:visibility="gone"/>`,
    tv('r_idle', 'Pronto', T.ink, 15, `${B} android:layout_marginTop="4dp"`),
    spacer,
    row(btn(tn, 'r_60', '1:00', T.rest, 32) + '\n' + btn(tn, 'r_90', '1:30', T.rest, 32, ML) + '\n' + btn(tn, 'r_stop', '✕', T.stop, 32, ML)),
  ].join('\n')),
  rest_w: (tn, T) => frame(tn, 'r_root', 14, [
    phrase(T, 'r_phrase', 2),
    row(icon('⏱️', 22) + '\n' + col(label(T, 'r_label', 'DESCANSO') + `
<Chronometer android:id="@+id/r_chrono" android:layout_width="wrap_content" android:layout_height="wrap_content"
    android:textColor="${T.rest}" android:textSize="24sp" android:textStyle="bold" android:visibility="gone"/>
` + tv('r_idle', 'Pronto para a série', T.ink, 17, B), ' android:layout_marginStart="10dp"'), ' android:layout_marginTop="8dp"'),
    spacer,
    row([btn(tn, 'r_60', '1:00', T.rest, 38), btn(tn, 'r_90', '1:30', T.rest, 38, ML), btn(tn, 'r_120', '2:00', T.rest, 38, ML), btn(tn, 'r_stop', '✕', T.stop, 38, ML)].join('\n'), ' android:layout_marginTop="10dp"'),
  ].join('\n')),
  // ---------- Refeição (calorias + macros de hoje, foto e registro) ----------
  meal_s: (tn, T) => frame(tn, 'm_root', 12, [
    row(icon('🍽️', 16) + '\n' + col(label(T, null, 'HOJE'), ' android:layout_marginStart="6dp"') + '\n' + tv('m_pct', '0%', T.kcal, 13, B)),
    row(tv('m_kcal', '0', T.ink, 20, B) + '\n' + tv('m_goal', 'kcal', T.muted, 11, ' android:layout_marginStart="4dp"'), ' android:gravity="bottom" android:layout_marginTop="2dp"'),
    bar(tn, 'm_bar', 'kcal', 6, ' android:layout_marginTop="4dp"'),
    row(['p', 'c', 'f'].map((k, i) => `<TextView android:id="@+id/m_${k}" android:layout_width="0dp" android:layout_weight="1" android:layout_height="wrap_content"
    android:text="${k.toUpperCase()} 0g" android:textColor="${T[k]}" android:textSize="11sp" android:textStyle="bold" android:maxLines="1"
    android:gravity="${['start', 'center', 'end'][i]}"/>`).join('\n'), ' android:layout_marginTop="5dp"'),
    spacer,
    row(btn(tn, 'm_photo', '📷 Foto', T.kcal, 32) + '\n' + btn(tn, 'm_add', '＋', T.kcal, 32, ML, 0.5)),
  ].join('\n')),
  meal_w: (tn, T) => frame(tn, 'm_root', 13, [
    phrase(T, 'm_phrase', 1),
    row(icon('🍽️', 22) + '\n' + col(label(T, null, 'NUTRIÇÃO DE HOJE') + '\n' + tv('m_value', '0 kcal', T.ink, 17, B), ' android:layout_marginStart="10dp"') + '\n' + tv('m_pct', '0%', T.kcal, 15, B), ' android:layout_marginTop="6dp"'),
    bar(tn, 'm_bar', 'kcal', 6, ' android:layout_marginTop="6dp"'),
    row(['p', 'c', 'f'].map((k, i) => col(tv(`m_${k}`, { p: 'Prot', c: 'Carbo', f: 'Gord' }[k] + ' 0g', T[k], 11, B) + '\n' + bar(tn, `m_${k}bar`, k, 4, ' android:layout_marginTop="3dp"'), i ? ' android:layout_marginStart="10dp"' : '')).join('\n'), ' android:layout_marginTop="8dp"'),
    spacer,
    row(btn(tn, 'm_photo', '📷 Foto do prato', T.kcal, 36) + '\n' + btn(tn, 'm_add', '＋ Refeição', T.kcal, 36, ' android:layout_marginStart="8dp"'), ' android:layout_marginTop="8dp"'),
  ].join('\n')),
};
for (const [tn, T] of Object.entries(THEMES)) {
  for (const [name, fn] of Object.entries(LAYOUTS)) write(`layout/widget_${name}_${tn}.xml`, fn(tn, T));
}

// Tamanho padrão 4x2; pode ser redimensionado a partir de 2x2 (sem limite máximo)
const info = (kind, desc) => `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider ${A}
    android:minWidth="250dp" android:minHeight="110dp"
    android:minResizeWidth="110dp" android:minResizeHeight="110dp"
    android:targetCellWidth="4" android:targetCellHeight="2"
    android:resizeMode="horizontal|vertical" android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_${kind}_w_dark" android:previewLayout="@layout/widget_${kind}_w_dark"
    android:previewImage="@mipmap/ic_launcher" android:description="@string/${desc}"
    android:widgetCategory="home_screen"/>
`;
write('xml/widget_water_info.xml', info('water', 'widget_water_desc'));
write('xml/widget_rest_info.xml', info('rest', 'widget_rest_desc'));
write('xml/widget_meal_info.xml', info('meal', 'widget_meal_desc'));
write('values/fitpro_widgets.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="widget_water_desc">Água de hoje, frase do dia e registro rápido de 250/500 ml</string>
    <string name="widget_rest_desc">Timer de descanso com contagem regressiva e frase do dia</string>
    <string name="widget_meal_desc">Calorias e macros de hoje, foto do prato e registro de refeição</string>
</resources>
`);
manifest = fs.readFileSync(manifestPath, 'utf8');
const receiver = (name, label, xml) => `        <receiver android:name=".${name}" android:exported="false" android:label="${label}">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/${xml}" />
        </receiver>
`;
const receivers = [
  ['WaterWidget', receiver('WaterWidget', 'FitPro · Hidratação', 'widget_water_info')],
  ['RestWidget', receiver('RestWidget', 'FitPro · Descanso', 'widget_rest_info')],
  ['MealWidget', receiver('MealWidget', 'FitPro · Refeição', 'widget_meal_info')],
  ['RestAlarmReceiver', '        <receiver android:name=".RestAlarmReceiver" android:exported="false" />\n'],
];
for (const [name, xml] of receivers) {
  if (!manifest.includes(`".${name}"`)) manifest = manifest.replace('</application>', `${xml}    </application>`);
}
fs.writeFileSync(manifestPath, manifest);

// plugins nativos + MainActivity que os registra
const appId = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'capacitor.config.json'), 'utf8')).appId;
const javaDir = path.join(root, 'java', ...appId.split('.'));
fs.mkdirSync(javaDir, { recursive: true });
for (const f of ['RestTimerPlugin.java', 'MainActivity.java', 'FitWidgets.java', 'WaterWidget.java', 'RestWidget.java', 'RestAlarmReceiver.java', 'FitWidgetPlugin.java', 'MealWidget.java']) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'native', f), 'utf8').replace(/__PACKAGE__/g, appId);
  fs.writeFileSync(path.join(javaDir, f), src);
}
console.log('Android ajustado: câmera, alarmes exatos, ícone de notificação, plugin RestTimer e widgets (hidratação, descanso e refeição).');
