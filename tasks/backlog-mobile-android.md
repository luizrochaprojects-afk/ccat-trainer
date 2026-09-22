# Backlog — mobile e publicação Android

Aberto em 21/09/2026, ao fim da rodada de UX/UI mobile (commit `1e3203f`).
O que **já está feito** está no README (seção "Mobile e Android") e no corpo daquele
commit — aqui só fica o que sobrou.

---

## Bloqueado em decisão ou acesso do Luiz

Nada abaixo anda sem uma resposta ou uma ação dele. Ordem = urgência.

### B1. Conta de desenvolvedor Google Play — abrir primeiro

US$ 25, com verificação de identidade que pode levar dias. É a única dependência
que não acelera com esforço de engenharia.

**Junto com isso, descobrir se a conta é pessoal ou de organização.** Conta pessoal
nova cai na exigência de teste fechado com 12 testadores por 14 dias. Isso muda o
cronograma em duas semanas e precisa ser confirmado no Play Console atual, não
presumido a partir daqui.

### B2. `applicationId` definitivo

Hoje: `com.ccattrainer.app`, **provisório**, em `capacitor.config.ts` e
`android/app/build.gradle`.

É **imutável depois do primeiro envio** à Play. Trocar agora custa três linhas;
trocar depois custa a listagem inteira. A resposta original ("ccattrainer") não é um
`applicationId` válido — precisa de pelo menos dois segmentos separados por ponto.

### B3. Nome na loja e marca registrada

"CCAT" e "Criteria Cognitive Aptitude Test" são marcas da Criteria Corp.

Recomendação: o título na loja **não começar com "CCAT"** (ex.: "Aptitude Trainer —
prática para o CCAT"). Rejeição por propriedade intelectual é comum e custa um ciclo
de revisão inteiro. O aviso de não-afiliação já está em `public/privacidade.html`; o
nome é decisão de produto.

### B4. Keystore de release

```
keytool -genkey -keystore ccat-upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Guardar **fora do repositório** (ex.: `%USERPROFILE%\keys\`), com senha e alias num
gerenciador **e** num backup offline. Depois criar `android/keystore.properties`
(gitignorado) com `storeFile`, `storePassword`, `keyAlias`, `keyPassword`.

**Habilitar Play App Signing no primeiro upload, sem exceção.** Com ele, perder a
chave de upload é recuperável; sem ele, perder a chave de assinatura é perder o app.

### B5. JDK 21 + Android SDK nesta máquina

Verificado em 21/09/2026: `java` não está no PATH, `%LOCALAPPDATA%\Android\Sdk` não
existe, Android Studio não instalado. Sem isso `npm run android:bundle` não roda.

São alguns GB e mexem no ambiente — precisa de autorização.

### B6. Publicar a política de privacidade

Pronta em `public/privacidade.html`, sai no build web. A Play exige uma **URL
pública**. Só falta hospedar e colar o endereço na ficha.

### B7. Ficha da loja

Título ≤30, descrição curta ≤80, completa ≤4000, 2–8 screenshots de telefone
(≥1080px no lado maior), ícone 512², feature graphic 1024×500.

Content rating (IARC → "Everyone"), público-alvo, "sem anúncios" e "sem login" são
declarações triviais. **Data safety é trivial e é a vantagem real de ser offline:**
nenhum dado coletado, nenhum compartilhado, tudo no dispositivo, e uma única
permissão no manifesto (`INTERNET`, que a WebView local exige).

---

## Engenharia — dá para tocar sem esperar ninguém

### E1. Gerar o AAB assinado — esforço S

Depende de B2, B4, B5. Tudo o mais já está cabeado: `signingConfigs.release` lê de
`android/keystore.properties` e, sem o arquivo, o build de release sai sem assinatura
em vez de quebrar.

```bash
npm run android:bundle
# → android/app/build/outputs/bundle/release/app-release.aab
```

### E2. Verificação em aparelho real — esforço S, irredutivelmente manual

Emulador Pixel 5 API 34 **e** um telefone físico. Instalar via
`bundletool build-apks --local-testing`. Roteiro:

- iniciar simulado → **Voltar pede confirmação** e não abandona;
- minimizar 30s → voltar → o relógio descontou o tempo certo;
- matar o app → reabrir → banner de retomada com o tempo certo;
- modo avião → tudo funciona;
- rotacionar → nada gira;
- splash, ícone adaptativo e háptico do treino.

Só o comportamento nativo entra aqui. A dobra já foi medida por emulação em
375×667 e 412×915 e está coberta pelo README.

### E3. `/ajustes` — esforço S, destrava item da Play

Idioma, toggle de háptico, **"Apagar todos os dados"** (usa `clearAllData`, hoje morto
em `src/data/db.ts`), versão do app e aviso de não-afiliação.

Fecha o item de exclusão de dados que a política da Play cobra na prática, e dá um
lar ao `LanguageSwitcher`, que hoje disputa espaço no cabeçalho.

### E4. `/progresso/:id` — detalhe da tentativa — esforço S, valor alto

**Os dados já existem e nunca são lidos:** `answers` é gravado a cada sessão em
`src/data/db.ts` e `getSessionAnswers` está pronto e nunca é chamado.

Lista as questões da sessão com acerto/erro, tempo e link para a teoria do subtipo.
É o que falta para "histórico de tentativas" ser um histórico, e não uma tabela de
placares.

### E5. Alvo de toque da marca no cabeçalho — esforço XS, baixa prioridade

`.marca` fica com 36px de área tocável (medido) porque a expansão por pseudo-elemento
esbarra no topo da página. Passa o critério AA (24px) e falha o AAA (44px).

Deixado assim de propósito: é um caminho **redundante** para a Home, que já tem
"HOME" na navegação com 48px. Só mexer se aparecer reclamação real.

### E6. `scripts/review.ts` não existe — esforço XS, pré-existente

`npm run content:review` está quebrado desde antes desta rodada: o `package.json`
aponta para um arquivo que não está no repositório. Fora do escopo da rodada, apenas
registrado para não se perder.

---

## Decisões registradas (não são tarefas — são para não serem re-litigadas)

- **Sem dark mode.** `color-scheme: light` fixo é decisão documentada em
  `src/app/styles.css`.
- **Roteador de hash.** Numa WebView, recarga em rota profunda daria 404 do servidor
  local — tela branca no meio de uma prova. O custo é o `#` na URL e nenhum SEO, que
  um app offline sem conta não tem o que perder.
- **O relógio do treino continua correndo em segundo plano.** No simulado isso é
  correto (a prova real não pausa). No treino é frustrante, mas pausar exigiria um
  campo `pausedMs` em `SessionState` e reescrever `remainingMs`/`tick` e seus testes.
  Vira fase própria se virar reclamação real.
- **Sem `user-scalable=no`.** Viola WCAG 1.4.4 e é sinalizado em revisão. O
  `touch-action: manipulation` já mata o double-tap-to-zoom sem tirar o pinch.
- **Háptico só no treino.** Vibrar diferente para certo e errado no simulado
  entregaria o gabarito, que a prova real não dá.
- **iOS / App Store** e **contas de usuário com sync** seguem fora de escopo.
