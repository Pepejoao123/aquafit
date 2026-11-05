# FitPro — Treino, Água e Nutrição

App de controle de hidratação, refeições e macronutrientes. Um único código roda como:

- **Web/PWA** (PC e celular pelo navegador, funciona offline e pode ser "instalado")
- **APK Android** (empacotado com Capacitor 8, com lembretes nativos que funcionam com o app fechado)

## Estrutura

```
www/                      # o app (HTML/CSS/JS puro, sem build)
  index.html              # toda a lógica e interface
  manifest.webmanifest    # PWA
  sw.js                   # cache offline (PWA)
  icons/
assets/                   # ícone e splash usados para gerar os recursos Android
capacitor.config.json
.github/workflows/build-apk.yml   # gera o APK e publica a versão web no GitHub Pages
```

## Gerar o APK — opção 1: GitHub Actions (sem instalar nada)

1. Crie um repositório no GitHub e suba esta pasta (branch `main`).
2. Em **Settings → Pages → Source**, selecione **GitHub Actions** (para a versão web).
3. A cada push, o workflow **Build APK** roda. Ao terminar, abra a execução em **Actions** e baixe o artefato **FitPro-apk** (um zip com `app-debug.apk`).
4. Passe o APK para o celular e instale (permita "instalar apps de fontes desconhecidas").

A versão web fica em `https://<seu-usuario>.github.io/<repositorio>/` — abra no PC ou no celular. No Chrome do PC/Android dá para "Instalar app".

## Gerar o APK — opção 2: na sua máquina

Pré-requisitos: Node 22+, JDK 21 e Android Studio (Android SDK 36).

```bash
npm install
npm run android:init      # cria a pasta android/ e gera ícones (só na primeira vez)
npm run apk               # APK em android/app/build/outputs/apk/debug/app-debug.apk
```

Ou `npm run android:open` para abrir no Android Studio e rodar direto no celular via USB.

Para publicar na Play Store, gere um APK/AAB **release** assinado (Android Studio → Build → Generate Signed Bundle/APK).

## Rodar a versão web localmente

```bash
npm run serve   # http://localhost:8080
```

## Como as metas são calculadas

| Item | Regra |
|---|---|
| Metabolismo basal | **Mifflin-St Jeor** (padrão); **Katch-McArdle** se o % de gordura for informado |
| Gasto total (GET) | Basal × fator de atividade (1,2 a 1,9) |
| Calorias | Perder: −20% · Manter: GET · Ganhar: +10% (nunca abaixo do basal / 1200–1500 kcal) |
| Proteína | 2,0 g/kg (perder) · 1,6 g/kg (manter) · 1,8 g/kg (ganhar); peso ajustado se IMC ≥ 30 |
| Gordura | 25% das kcal, mínimo 0,6 g/kg |
| Carboidrato | Calorias restantes |
| Água | 35 ml/kg + 500 ml (atividade moderada+) + 250 ml (atividade alta+) |

Todas as metas podem ser sobrescritas manualmente no Perfil.

## Notificações

- **Refeições:** café 08:10, almoço 12:30, jantar 20:00 (editáveis no Perfil). Tocar abre o registro daquela refeição; o botão "📷 Foto do prato" já abre a câmera.
- **Água:** a cada 30 min (ou 1h/1h30/2h) dentro da janela acordado. Botões "Bebi 250 ml" / "Bebi 500 ml" registram direto da notificação.
- No APK são notificações nativas (chegam com o app fechado). Para pontualidade, toque em "Permitir horário exato" no Perfil e tire o app da otimização de bateria do Android.
- No navegador, os avisos funcionam enquanto o app estiver aberto.

## Foto do prato (IA)

1. Tire/escolha a foto (opcional: escreva detalhes como "2 conchas de feijão").
2. A IA lista os alimentos com medida caseira (concha, colher de sopa, colher de servir, escumadeira, unidade…).
3. Você confere, ajusta quantidade/medida, adiciona ou remove itens e confirma.

Os valores nutricionais vêm da base local (aprox. Tabela TACO, ~65 alimentos) quando o alimento é reconhecido; senão, da estimativa da IA.
Configure no Perfil → "Análise de foto": **Google Gemini** (chave grátis em aistudio.google.com) ou **Anthropic Claude**. A chave fica só no aparelho e não vai para o backup.
Também dá para adicionar alimentos manualmente, sem IA, escolhendo a medida.

## Treino e descanso

- Aba **Treino**: ▶ iniciar → adicionar exercícios → kg/reps por série → ✓ marca a série e dispara o timer.
- Ao adicionar um exercício já feito antes, as cargas da última vez vêm preenchidas (↺ mostra o histórico).
- **↻** repete um treino anterior com as mesmas cargas.
- Timer de descanso (30s–3min, ±15s, pausa): vibra e apita no fim.
- Notificações do descanso (APK): uma notificação fixa com **contagem regressiva ao vivo** (cronômetro nativo do Android, roda com o app fechado/tela bloqueada) e, no fim, outra notificação "✅ Descanso acabou" com som/vibração.
  A contagem ao vivo vem do plugin nativo local `native/RestTimerPlugin.java`, instalado no projeto Android por `scripts/patch-android.js`.

## Contas e sincronização

- Login por e-mail e senha (Firebase Auth), cadastro em etapas e redefinição de senha por e-mail.
- Os dados de cada usuário ficam no Firestore (`users/{uid}` + `users/{uid}/months/{AAAA-MM}`) e sincronizam entre app e site. Regras em `firestore.rules`.

## Planilha central (Google Sheets)

Todos os usuários enviam para a mesma planilha, sem configuração no app:
- A cada **30 s**, se houver algo novo, o app envia os dados do usuário logado para o Apps Script (`SHEETS_URL` no `index.html`). Ao fechar o app, o pendente vai por `sendBeacon`.
- Cada envio leva o token da conta Firebase; o script valida o token, então ninguém grava em nome de outra pessoa.
- Abas geradas, com colunas **Usuário** e **E-mail**: **Resumo**, **Água**, **Refeições**, **Treinos**, **Perfil**. Os dados brutos ficam na aba oculta `_usuarios`.
- A planilha é só relatório: o app nunca lê dela (a fonte dos dados é o Firestore).
- Código do script: `apps-script/Code.gs`. Para atualizar mantendo a URL: **Implantar → Gerenciar implantações → lápis → Versão: Nova versão → Implantar**.
