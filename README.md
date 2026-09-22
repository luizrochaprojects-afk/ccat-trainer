# CCAT Trainer

Treino cronometrado para a **Criteria Cognitive Aptitude Test** — 50 questões em 15 minutos.

A prova é curta e o relógio é o adversário: o candidato tem cerca de 18 segundos por
questão e quase ninguém termina. O app treina exatamente isso, com simulado completo e
treino por tipo, e compara o resultado com as normas oficiais da prova.

## O que tem dentro

- **Simulado completo** — 50 questões, 15 minutos, na mesma composição da prova real.
- **Treino por tipo** — sessões curtas focadas num tipo ou subtipo, com o mesmo orçamento
  de tempo por questão.
- **Progresso contra as normas oficiais** — pontuação bruta convertida em percentil. Numa
  sessão parcial, o resultado vira uma *projeção* com intervalo de confiança, em vez de
  comparar quem respondeu 12 questões com quem respondeu 50.
- **Teoria por subtipo** — o que a questão pede, o método e a armadilha típica.
- **Português e inglês** na interface. O conteúdo das questões é sempre em inglês, porque
  a prova é aplicada em inglês.

Os dados ficam no navegador (IndexedDB). Não há servidor nem conta.

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # a suíte inteira
npm run build      # a trava de conteúdo roda antes do bundle
```

## Como o conteúdo é feito

Nenhuma questão é escrita à mão, e nenhuma é escrita por um modelo sem conferência. Todas
saem de **geradores determinísticos**: uma função que, dada uma seed e um nível, devolve a
questão **e o gabarito derivado da regra que a construiu**. O banco guarda só
`(gerador, seed, nível)`, então o gate re-executa o gerador e compara — "verificar o
gabarito" nunca vira confiar no JSON que o próprio gerador escreveu.

```bash
npm run content:generate -- --provas 20   # gera rascunhos dimensionados por N simulados
npm run content:gate                      # os cinco portões
npm run content:promote                   # promove os aprovados ao banco
npm run content:assert                    # trava de CI: nada no banco fora dos portões
```

Os cinco portões: esquema (G1), gabarito re-executado (G2), nível declarado (G3),
duplicata (G4) e integridade das alternativas (G5).

## Os seis tipos

| Tipo | Na prova | Como o gabarito é provado |
| --- | --- | --- |
| Analogia verbal | 7 | relação extraída do léxico |
| Vocabulário | 6 | sinônimo/antônimo do léxico |
| Lógica verbal | 4 | silogismo validado por **verificação de modelos** — 512 modelos finitos sobre 3 predicados, sem importação existencial |
| Séries numéricas | 7 | a própria regra da série |
| Problemas de matemática | 10 | solver simbólico |
| Raciocínio espacial | 16 | a transformação que construiu a figura |

## Raciocínio espacial

É um terço da prova e tem o módulo mais elaborado, em `src/core/spatial/`. A decisão que o
organiza é separar **vocabulário visual** de **forma de pergunta**:

- **Famílias** (`figuras/`) são o vocabulário — arcos nos cantos de um quadrado, ponteiros
  num mostrador, forma × preenchimento × direção, formas concêntricas, moldura com X e
  marcadores. Cada uma implementa o mesmo contrato: girar, espelhar, assinar, desenhar.
- **Formas** (`formas.ts`) são a pergunta — rotação, reflexão, qual não pertence, série,
  matriz 3×3, comparação visual. Toda forma é genérica sobre o contrato e não sabe que
  figura está olhando.

Do produto das duas saem 28 geradores. Uma tabela de compatibilidade barra as combinações
inválidas: a família `atributos` é aquiral, então não alimenta rotação nem reflexão — ali o
espelho sempre coincide com alguma rotação e a questão teria duas respostas certas.

As figuras são **discretas** de propósito, em espaços pequenos e enumeráveis. É o que
permite provar por enumeração, e não por amostragem em pixels, que configurações diferentes
produzem desenhos diferentes — a garantia de que a alternativa certa não é só correta, mas
distinguível a olho em 18 segundos.

```bash
npx tsx scripts/preview-spatial.ts 2 matriz   # auditoria visual, filtrada por gerador
```

## Estrutura

```
src/core/      regra pura, sem DOM — geradores, gates, SRS de sessão, normas
src/app/       telas React
src/data/      IndexedDB
scripts/       pipeline de conteúdo (geração, gate, promoção, preview)
content/       banco aprovado, versionado
tasks/         PRD
```

`src/core` não importa nada de `src/app`: a mesma regra roda nos testes, nos scripts de
auditoria e no app, e um preview que desenhasse diferente do app não provaria nada.

## Mobile e Android

A prova é desenhada contra a dobra: em `/sessao` o `.shell` vira uma grade de altura de
viewport (`100dvh`) com quatro faixas — cronômetro, régua, questão, ação — e **só a
faixa da questão rola**. Medido em 375×667 (iPhone SE), o pior caso (matriz 3×3 com
cinco alternativas gráficas) cabe sem rolagem. Se você mexer no layout da sessão, meça
de novo: `document.querySelector('.questao')` não pode ter `scrollHeight > clientHeight`
antes de responder.

Duas saídas acidentais estão fechadas por confirmação, ambas pela mesma `<Confirmacao>`:
o botão Encerrar e o Voltar (do navegador e o físico do Android). O `useBlocker` do
react-router cobre só a navegação interna — o Voltar do navegador é interceptado por uma
entrada-sentinela no histórico, ver `src/app/useBotaoVoltar.ts`.

O roteador é de **hash**. Dentro da WebView do Capacitor, uma recarga em rota profunda
daria 404 do servidor local — tela branca no meio de uma prova.

```bash
npm run icons            # regenera ícones e splash a partir de scripts/icons.ts
npm run android:sync     # build web + cap sync
npm run android:open     # abre no Android Studio
npm run android:bundle   # gera o AAB de release
```

O `android/` é versionado (manifesto e gradle têm edições nossas); artefatos de build e
**a chave** não são. Para assinar, crie `android/keystore.properties` — gitignorado — com
`storeFile`, `storePassword`, `keyAlias` e `keyPassword`. Sem esse arquivo o build de
release sai sem assinatura em vez de quebrar.

Exige JDK 21 e o Android SDK instalados.
