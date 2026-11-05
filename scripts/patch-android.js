// Ajusta o projeto Android gerado pelo Capacitor:
//  - permissão de câmera (foto do prato direto do app)
//  - ícone monocromático (halter) para as notificações
//  - alarmes exatos (lembretes e fim do descanso no horário certo)
//  - plugin nativo RestTimer (notificação com contagem regressiva ao vivo)
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
// ---------- widgets da tela inicial (hidratação e descanso) ----------
const res = path.join(root, 'res');
const write = (rel, txt) => { const p = path.join(res, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, txt); };
const A = 'xmlns:android="http://schemas.android.com/apk/res/android"';
write('drawable/widget_bg.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape ${A} android:shape="rectangle">
    <solid android:color="#F20C0D10"/>
    <corners android:radius="24dp"/>
    <stroke android:width="1dp" android:color="#22FFFFFF"/>
</shape>
`);
write('drawable/widget_btn.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape ${A} android:shape="rectangle">
    <solid android:color="#1FFFFFFF"/>
    <corners android:radius="14dp"/>
</shape>
`);
write('drawable/widget_progress.xml', `<?xml version="1.0" encoding="utf-8"?>
<layer-list ${A}>
    <item android:id="@android:id/background">
        <shape><corners android:radius="6dp"/><solid android:color="#334D8DFF"/></shape>
    </item>
    <item android:id="@android:id/progress">
        <clip><shape><corners android:radius="6dp"/><solid android:color="#4D8DFF"/></shape></clip>
    </item>
</layer-list>
`);
const phraseView = id => `    <TextView android:id="@+id/${id}" android:layout_width="match_parent" android:layout_height="wrap_content"
        android:text="Constância vence intensidade." android:textColor="#E6FFFFFF" android:textSize="12sp"
        android:textStyle="italic" android:maxLines="2" android:ellipsize="end"/>`;
const btn = (id, text, color, extra = '') => `        <Button android:id="@+id/${id}" android:layout_width="0dp" android:layout_weight="1" android:layout_height="38dp"
            android:background="@drawable/widget_btn" android:text="${text}" android:textColor="${color}" android:textSize="13sp"
            android:textStyle="bold" android:textAllCaps="false" android:minHeight="0dp" android:minWidth="0dp" android:padding="0dp"${extra}/>`;
write('layout/widget_water.xml', `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout ${A} android:id="@+id/w_root" android:layout_width="match_parent" android:layout_height="match_parent"
    android:orientation="vertical" android:padding="14dp" android:background="@drawable/widget_bg">
${phraseView('w_phrase')}
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal"
        android:gravity="center_vertical" android:layout_marginTop="8dp">
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="💧" android:textSize="22sp"/>
        <LinearLayout android:layout_width="0dp" android:layout_weight="1" android:layout_height="wrap_content"
            android:orientation="vertical" android:layout_marginStart="10dp">
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="HIDRATAÇÃO"
                android:textColor="#5CF25C" android:textSize="10sp" android:textStyle="bold" android:letterSpacing="0.08"/>
            <TextView android:id="@+id/w_value" android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:text="0 ml de 2,5 L" android:textColor="#FFFFFF" android:textSize="17sp" android:textStyle="bold"/>
        </LinearLayout>
        <TextView android:id="@+id/w_pct" android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="0%" android:textColor="#4D8DFF" android:textSize="15sp" android:textStyle="bold"/>
    </LinearLayout>
    <ProgressBar android:id="@+id/w_bar" style="@android:style/Widget.ProgressBar.Horizontal" android:layout_width="match_parent"
        android:layout_height="8dp" android:layout_marginTop="8dp" android:max="100" android:progress="0"
        android:progressDrawable="@drawable/widget_progress"/>
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal"
        android:layout_marginTop="10dp">
${btn('w_add250', '+250 ml', '#4D8DFF')}
${btn('w_add500', '+500 ml', '#4D8DFF', ' android:layout_marginStart="8dp"')}
    </LinearLayout>
</LinearLayout>
`);
write('layout/widget_rest.xml', `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout ${A} android:id="@+id/r_root" android:layout_width="match_parent" android:layout_height="match_parent"
    android:orientation="vertical" android:padding="14dp" android:background="@drawable/widget_bg">
${phraseView('r_phrase')}
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal"
        android:gravity="center_vertical" android:layout_marginTop="8dp">
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="⏱️" android:textSize="22sp"/>
        <LinearLayout android:layout_width="0dp" android:layout_weight="1" android:layout_height="wrap_content"
            android:orientation="vertical" android:layout_marginStart="10dp">
            <TextView android:id="@+id/r_label" android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="DESCANSO"
                android:textColor="#5CF25C" android:textSize="10sp" android:textStyle="bold" android:letterSpacing="0.08"/>
            <Chronometer android:id="@+id/r_chrono" android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:textColor="#22D3EE" android:textSize="24sp" android:textStyle="bold" android:visibility="gone"/>
            <TextView android:id="@+id/r_idle" android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:text="Pronto para a série" android:textColor="#FFFFFF" android:textSize="17sp" android:textStyle="bold"/>
        </LinearLayout>
    </LinearLayout>
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal"
        android:layout_marginTop="10dp">
${btn('r_60', '1:00', '#22D3EE')}
${btn('r_90', '1:30', '#22D3EE', ' android:layout_marginStart="6dp"')}
${btn('r_120', '2:00', '#22D3EE', ' android:layout_marginStart="6dp"')}
${btn('r_stop', '✕', '#FF5A5F', ' android:layout_marginStart="6dp"')}
    </LinearLayout>
</LinearLayout>
`);
const info = (layout, desc) => `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider ${A}
    android:minWidth="250dp" android:minHeight="140dp"
    android:minResizeWidth="180dp" android:minResizeHeight="120dp"
    android:targetCellWidth="4" android:targetCellHeight="2"
    android:resizeMode="horizontal|vertical" android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/${layout}" android:previewLayout="@layout/${layout}"
    android:previewImage="@mipmap/ic_launcher" android:description="@string/${desc}"
    android:widgetCategory="home_screen"/>
`;
write('xml/widget_water_info.xml', info('widget_water', 'widget_water_desc'));
write('xml/widget_rest_info.xml', info('widget_rest', 'widget_rest_desc'));
write('values/fitpro_widgets.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="widget_water_desc">Água de hoje, frase do dia e registro rápido de 250/500 ml</string>
    <string name="widget_rest_desc">Timer de descanso com contagem regressiva e frase do dia</string>
</resources>
`);
manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('.WaterWidget')) {
  const widget = (name, label, xml) => `        <receiver android:name=".${name}" android:exported="false" android:label="${label}">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/${xml}" />
        </receiver>
`;
  manifest = manifest.replace('</application>', widget('WaterWidget', 'FitPro · Hidratação', 'widget_water_info') +
    widget('RestWidget', 'FitPro · Descanso', 'widget_rest_info') +
    '        <receiver android:name=".RestAlarmReceiver" android:exported="false" />\n    </application>');
  fs.writeFileSync(manifestPath, manifest);
}

// plugins nativos + MainActivity que os registra
const appId = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'capacitor.config.json'), 'utf8')).appId;
const javaDir = path.join(root, 'java', ...appId.split('.'));
fs.mkdirSync(javaDir, { recursive: true });
for (const f of ['RestTimerPlugin.java', 'MainActivity.java', 'FitWidgets.java', 'WaterWidget.java', 'RestWidget.java', 'RestAlarmReceiver.java', 'FitWidgetPlugin.java']) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'native', f), 'utf8').replace(/__PACKAGE__/g, appId);
  fs.writeFileSync(path.join(javaDir, f), src);
}
console.log('Android ajustado: câmera, alarmes exatos, ícone de notificação, plugin RestTimer e widgets.');
