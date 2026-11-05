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
// plugin nativo + MainActivity que o registra
const appId = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'capacitor.config.json'), 'utf8')).appId;
const javaDir = path.join(root, 'java', ...appId.split('.'));
fs.mkdirSync(javaDir, { recursive: true });
for (const f of ['RestTimerPlugin.java', 'MainActivity.java']) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'native', f), 'utf8').replace(/__PACKAGE__/g, appId);
  fs.writeFileSync(path.join(javaDir, f), src);
}
console.log('Android ajustado: câmera, alarmes exatos, ícone de notificação e plugin RestTimer.');
