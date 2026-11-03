# Quick Math para case interview — design

Data: 2026-11-02 · Status: rascunho para aprovação

## Intenção

O Luiz tem uma entrevista de case em **15 dias** (por volta de 2026-11-17) e travou num
problema típico: estimar quanto do impacto de um novo modelo de decisão de crédito um
banco realiza no primeiro ano. Duas falhas apareceram:

1. **Formular** — montar as camadas empilhadas (impacto anual cheio × fração do ano em
   que o modelo roda × curva de adoção × parcela da carteira afetada) a partir da
   pergunta de negócio.
2. **Executar** — fazer as contas que saem dessa estrutura: errou ordem de grandeza
   (zeros), errou dígitos e foi lento em multiplicação de números grandes.

O treino novo entra **dentro do CCAT Trainer**, como um modo próprio, para ser usado
**~15 minutos por dia** no celular. Sucesso: no dia da entrevista, encarar uma pergunta
como a do banco e chegar a um número defensável em ~2 minutos, sem errar a ordem de
grandeza.

## Metas, não-metas, anti-metas

**Metas**
- Cobrir as subskills de math de case (lista abaixo) com drills curtos, cronometrados,
  gerados na hora.
- Priorizar automaticamente as subskills mais fracas a partir do histórico.
- Fase 2: treinar a formulação de estruturas no mesmo formato de alternativas.

**Não-metas**
- Não é preparação para o GMAT nem para a CCAT; não usa as normas da CCAT nem percentil.
- Não ensina a resolver o case inteiro (frameworks, síntese, recomendação).
- Sem conta, servidor ou sincronização — continua tudo local, como o resto do app.

**Anti-metas (fracassos mesmo que funcione)**
- Alternativas que se resolvem só pela ordem de grandeza ou pelo último dígito: o
  usuário acerta sem fazer a conta e o treino não treina nada.
- Fase 1 chegando ao celular depois de ~2 dias: sobra pouco treino antes da entrevista.
- Mexer no fluxo da CCAT existente (simulado, drill por tipo, banco, gates) e quebrar
  algo que já está em produção.

## Decisões do Luiz

- **Formato de resposta: múltipla escolha**, não resposta digitada.
- **Sessão de ~15 minutos por dia.**
- Treinar **todas** as subskills de math necessárias para case, não só multiplicação.
- Fazer **dentro deste app**.

## Desenho (propostas minhas, aprovadas em conversa como direção geral)

### Fase 1 — Executar (prioridade; entregar em ~2 dias)

**Subskills**, cada uma com níveis 1–5:

| # | Subskill | Exemplo | Tempo-alvo (nível médio) |
|---|---|---|---|
| 1 | Multiplicação grande | 3,5 mi × 240 | ~15 s |
| 2 | Divisão grande | 48 bi ÷ 1.200 | ~20 s |
| 3 | Porcentagem | 18% de 2,4 bi; variação de 80→92; % de %; p.p. vs % | ~15 s |
| 4 | Frações ↔ % ↔ decimal | 1/8, 1/12, 7/12 do ano em % | ~10 s |
| 5 | Crescimento | composto 3 anos a 8%; CAGR; regra do 72 | ~30 s |
| 6 | Unidades e escala | R$ 40/mês por cliente × 2 mi clientes → por ano | ~20 s |
| 7 | Break-even / payback | custo fixo ÷ margem de contribuição | ~30 s |
| 8 | Média ponderada / mix | margem média de 3 produtos com pesos | ~30 s |
| 9 | Cadeia de 3–4 fatores | impacto anual × 7/12 × 40% adoção × 60% da carteira | ~60 s |

Os níveis sobem o quanto de arredondamento a conta exige, a quantidade de zeros e o
número de passos. A subskill 9 é a ponte para a fase 2.

**Alternativas e distratores.** 5 alternativas por questão, como no resto do app. Os
distratores são os erros que se cometem de verdade, nesta ordem de preferência:
- ordem de grandeza ±1 (×10, ÷10) e ±3 (mil vs milhão);
- dígito trocado ou conta parcial errada com a mesma ordem de grandeza;
- operação errada: % somado em vez de multiplicado, fração invertida, crescimento
  simples em vez de composto, mês tratado como ano;
- arredondamento ingênuo que desvia > 10%.

Regra dura: **pelo menos dois distratores na mesma ordem de grandeza da resposta**, para
que não se acerte só contando zeros. Alternativas são formatadas como o entrevistador
falaria ("R$ 1,4 bi", não "1.400.000.000").

**Quando a conta é estimativa.** Se a resposta exata é feia (3,47 × 238), a alternativa
correta é a exata arredondada a 2 algarismos significativos, e nenhum distrator fica a
menos de ~15% dela. O usuário pode arredondar com intenção e ainda acertar.

**Folga mínima em todas as questões (decisão minha).** Nenhum distrator fica a menos de
**10%** da resposta certa, nem quando a conta é exata. Entrevista de case não cobra o
terceiro algarismo; cobra ordem de grandeza e os dois primeiros dígitos. Por isso
"dígito trocado" quer dizer erro nos **dígitos iniciais** (1,4 vs 4,1; vai-um esquecido
que leva 1,4 a 1,6), não 1,44 vs 1,46.

**Ordem de corte se o prazo apertar (decisão minha).** Primeira fatia: subskills 1–4 e 9,
sessão diária adaptativa e feedback. Segunda fatia: subskills 5–8. Terceira: drill livre
por subskill e tela de progresso com tendência. Cada fatia precisa ser usável sozinha.

**Sessão diária (~15 min).**
1. Aquecimento (~2 min): questões de nível baixo misturando subskills, para ganhar
   ritmo.
2. Blocos focados (~13 min): a cada bloco de 5 questões, escolhe-se a subskill com
   pior desempenho recente (acerto e tempo vs alvo), com alguma aleatoriedade para não
   abandonar as outras. O nível sobe quando acerta ≥ 4/5 dentro do tempo e desce com
   ≤ 2/5.
3. Fim por tempo: a sessão termina ao passar de 15 min, na questão corrente.

Também existe **drill livre por subskill**, para quando o usuário quiser martelar uma só.

**Feedback.** Imediato após cada resposta: certo/errado, a conta resolvida do jeito
rápido (o atalho mental, não a conta longa) e, se errou, qual erro o distrator
escolhido representa ("você somou os percentuais").

**Progresso.** Por subskill: taxa de acerto, tempo médio vs alvo e nível atual, com
tendência nos últimos dias. Sem percentil nem normas.

### Fase 2 — Formular (depois da fase 1, dentro dos 15 dias se couber)

Mesmo formato de alternativas. O enunciado é uma pergunta de negócio com os dados
("O banco implanta o modelo em abril; adoção de 40% no 1º ano, 80% depois; o modelo
reduz perdas em R$ 200 mi/ano na carteira de PF, que é 60% do total…"). A pergunta é
**qual estrutura de cálculo responde à pergunta**, com alternativas que são expressões
(`200 × 9/12 × 40%` vs `200 × 40%` vs `200 × 60% × 9/12 × 40%`…). Os distratores
esquecem uma camada, aplicam uma camada que não se aplica (os 60% quando o impacto já é
da carteira de PF), ou erram a fração do ano.

Opcional dentro da fase 2: depois de escolher a estrutura, uma segunda questão pede o
número (reaproveita a subskill 9).

Famílias de cenários a cobrir: impacto com ramp-up no ano 1; market sizing
(população × penetração × frequência × ticket); break-even de investimento; efeito de
preço × volume; mix de canais. O desenho detalhado das famílias fica para quando a fase
1 estiver no ar.

## Restrições e integração com o app existente

- **Não alterar o fluxo da CCAT.** Taxonomia (`src/core/taxonomy.ts`), banco aprovado,
  gates e `EXAM_BLUEPRINT` continuam como estão. Quick math **não** entra no simulado de
  50 questões.
- **Conteúdo gerado na hora, não pelo banco.** Os geradores já provam o gabarito a partir
  da regra que construiu a questão; não há banco aprovado nem pipeline
  generate → gate → promote para quick math. Os testes de unidade fazem o papel do gate:
  para muitas seeds por subskill × nível, conferem gabarito por caminho independente
  (o `evaluateExpression` de `src/core/math/solver.ts`), unicidade das alternativas e a
  regra dos dois distratores na mesma ordem de grandeza.
- **Reaproveitar:** `mulberry32`/`seedFromString` (`src/core/rng.ts`), `evaluateExpression`
  e `parseNumber` (`src/core/math/solver.ts`), as famílias de `calculo_basico`
  (`src/core/math/calculo.ts`) como referência de estilo, `<Confirmacao>`,
  `useBotaoVoltar` e o layout de sessão contra a dobra (README, seção Mobile).
- **Motor de sessão:** o atual (`src/core/session/engine.ts`) supõe tempo total ou
  tempo fixo por questão e fila composta de antemão. Quick math precisa de tempo-alvo
  por questão (não estoura: só mede), fila gerada sob demanda pela seleção adaptativa e
  fim por tempo total. Estender ou criar um reducer próprio fica com o builder, desde
  que o da CCAT não mude de comportamento.
- **Persistência:** IndexedDB via `src/data/db.ts`, nenhuma tela fala com o banco direto.
  Sessões de quick math precisam ser distinguíveis das da CCAT para que a tela de
  progresso da CCAT não as misture.
- **Mobile primeiro:** a sessão precisa caber sem rolagem em 375×667, como as da CCAT.
- **Idioma (decisão do Luiz): dois idiomas.** Ao contrário da CCAT, cujas questões são
  sempre em inglês, aqui enunciado, alternativas e feedback **seguem o seletor PT/EN**.
  O formato numérico acompanha: PT com "R$ 1,4 bi", "mi/bi", vírgula decimal; EN com
  "$1.4B", "M/B", ponto decimal. Cada gerador produz os dois textos a partir da mesma
  seed, e os testes conferem que as duas versões têm o mesmo gabarito e as mesmas
  alternativas em valor.
- **Mesma unidade de escala (decisão minha).** A regra dos dois distratores na mesma
  ordem de grandeza vale também para a **palavra da escala**: pelo menos dois
  distratores usam a mesma unidade da resposta (todos em "bi", por exemplo). Senão
  "R$ 980 mi" ao lado de "R$ 1,4 bi" se elimina só pela palavra.
- **Deploy (decisão do Luiz):** o uso é pelo site da Vercel no navegador do celular, e o
  modo aparece **para todo mundo**, sem flag nem rota escondida. Como `main` publica
  direto, cada fatia da ordem de corte só entra em `main` quando estiver usável sozinha.

## O que fica com o builder

- Nomes de arquivos, rotas e componentes (seguindo o padrão em português do projeto).
- Estender o reducer existente ou criar um novo.
- Pesos exatos da seleção adaptativa e os limites de subida/descida de nível, dentro
  da regra acima.
- Tempos-alvo exatos por subskill × nível (a tabela acima é ordem de grandeza).
- Onde exatamente o modo aparece na Home.

## Questões em aberto

Nenhuma.
