# Quick Math — Fatia 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um modo "Quick Math" no CCAT Trainer com sessão diária adaptativa de 15 minutos nas subskills 1–4 e 9 do spec (multiplicação, divisão, porcentagem, frações, cadeia), múltipla escolha com distratores que são erros reais, feedback com o atalho mental, PT e EN.

**Architecture:** Tudo novo vive em `src/core/quickmath/` (regras puras, sem DOM) e em telas próprias em `src/app/screens/QuickMath*.tsx`; o motor, o banco e as telas da CCAT não mudam de comportamento. As questões são geradas na hora a partir de uma seed — sem banco aprovado — e os testes de propriedade dos geradores fazem o papel do gate. A persistência fica num IndexedDB próprio (`ccat-quickmath`), para não migrar o banco da CCAT.

**Tech Stack:** TypeScript, React 19, react-router-dom 7 (hash router), idb, vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-02-quick-math-design.md`

**Fora desta fatia:** subskills 5–8 (fatia 2), drill livre por subskill e tela de progresso com tendência (fatia 3), fase 2 (formular). Cada uma ganha plano próprio.

## Global Constraints

- Não alterar o fluxo da CCAT: `src/core/taxonomy.ts`, banco aprovado, gates, `EXAM_BLUEPRINT`, `src/core/session/engine.ts` e `SessionScreen.tsx` ficam intocados. Quick math não entra no simulado.
- Conteúdo gerado na hora; nada de quick math passa por `content/` nem pelo pipeline generate → gate → promote.
- 5 alternativas por questão. Ids `a`–`e` via `optionIdAt` (`src/core/optionIds.ts`).
- Nenhum distrator a menos de **10%** da resposta certa; em questão de estimativa, **15%**.
- Pelo menos **dois distratores na mesma ordem de grandeza** (mesmo `floor(log10)`) da resposta — o que também os coloca na mesma palavra de escala.
- Resposta de estimativa = valor exato arredondado a **2 algarismos significativos**.
- Enunciado, alternativas e feedback **seguem o seletor PT/EN**. PT: `R$ 1,4 bi`, `mi`/`bi`, vírgula decimal. EN: `$1.4B`, `M`/`B`, ponto decimal.
- Sessão: **15 min** no total, **2 min** de aquecimento, blocos de **5**; nível sobe com **≥ 4/5** certas dentro do tempo-alvo e desce com **≤ 2/5** certas. Termina na primeira transição depois de 15 min.
- A sessão cabe sem rolagem em **375×667** antes de responder (`document.querySelector('.questao')` sem `scrollHeight > clientHeight`).
- Nenhuma tela fala com o IndexedDB direto: tudo por `src/data/`.
- Identificadores e comentários em português, como no resto do projeto.
- `main` publica direto na Vercel: trabalhar em `feat/quick-math`; só fazer merge quando a fatia inteira estiver verde. Push só com a conta pessoal (`gh` `luizrochaprojects-afk`) e só com o ok do Luiz.

## Review Focus

1. **F5 ou app fechado no meio da sessão** → as respostas já dadas ficam no histórico e os níveis dos blocos já fechados ficam salvos; abrir `#/quickmath/sessao` direto começa uma sessão nova sem erro. (Task 9: o hook grava a cada resposta; teste de tela confere a chamada.)
2. **IndexedDB indisponível (aba anônima)** → a sessão roda com nível 1 em tudo e histórico vazio, sem lançar. (Task 6: `escolherSubskill` com histórico vazio; Task 8: `comFallback`.)
3. **Arredondamento na fronteira de escala** → `999.600.000` aparece como `R$ 1 bi`, nunca `R$ 1.000 mi`; a regra de ordem de grandeza usa o valor exibido. (Task 1.)
4. **Pular** conta como errada, registra o tempo, e não trava o ajuste de nível nem a seleção. (Task 7.)
5. **Passar de 15 min com o feedback aberto** → "Próxima" encerra em vez de gerar outra questão; responder depois de 15 min ainda vale. (Task 7.)

---

### Task 0: Branch e spec

- [ ] **Step 1:** `git checkout -b feat/quick-math`
- [ ] **Step 2:** Commit do spec e deste plano.

```bash
git add docs/superpowers/specs/2026-11-02-quick-math-design.md docs/superpowers/plans/2026-11-02-quick-math-fatia-1.md
git commit -m "docs(quickmath): design e plano da fatia 1"
```

---

### Task 1: Taxonomia e formatação de valores

**Files:**
- Create: `src/core/quickmath/taxonomia.ts`, `src/core/quickmath/formato.ts`
- Test: `src/core/quickmath/formato.test.ts`

**Interfaces:**
- Produces (`taxonomia.ts`):
  - `SUBSKILLS = ['multiplicacao','divisao','porcentagem','fracoes','crescimento','unidades','breakeven','media_ponderada','cadeia'] as const`; `type Subskill`
  - `SUBSKILLS_ATIVAS: readonly Subskill[] = ['multiplicacao','divisao','porcentagem','fracoes','cadeia']`
  - `SUBSKILL_LABEL: Record<Subskill, LocalizedText>`
  - `type Nivel = Difficulty` (reexporta `1|2|3|4|5` de `src/core/taxonomy.ts`)
  - `ALVO_MS: Record<Subskill, Record<Nivel, number>>` — valores em segundos ×1000:
    multiplicacao 10/15/20/30/45; divisao 12/18/25/35/45; porcentagem 10/15/25/30/40; fracoes 8/10/15/20/25; cadeia 30/45/60/75/90; as quatro da fatia 2 usam 15/20/30/40/50 por ora.
  - `DURACAO_SESSAO_MS = 15 * 60_000`, `AQUECIMENTO_MS = 2 * 60_000`, `TAMANHO_BLOCO = 5`, `FOLGA_EXATA = 0.10`, `FOLGA_ESTIMATIVA = 0.15`, `CHANCE_EXPLORAR = 0.2`
- Produces (`formato.ts`):
  - `type Unidade = 'moeda' | 'numero' | 'percent'`
  - `arredondarSig(valor: number, sig: number): number`
  - `formatarValor(valor: number, unidade: Unidade, locale: Locale): string`
  - `formatarLocalizado(valor: number, unidade: Unidade): LocalizedText` (os dois idiomas de uma vez)
  - `ordemDeGrandeza(valor: number): number` — `floor(log10(|v|))` **do valor já arredondado para exibição**

Regra de exibição: a mantissa é arredondada a 3 algarismos significativos **antes** de escolher a escala, sem zeros à direita. Escalas: < 1.000 sem sufixo; mil/K; mi/M; bi/B; tri/T. Em PT há espaço entre número e sufixo e entre `R$` e o número; em EN não. Percentual: até 1 casa decimal.

- [ ] **Step 1: Write the failing test**

```ts
describe('formatarValor', () => {
  it.each([
    [1_400_000_000, 'moeda', 'pt', 'R$ 1,4 bi'],
    [1_400_000_000, 'moeda', 'en', '$1.4B'],
    [980_000_000, 'moeda', 'pt', 'R$ 980 mi'],
    [1_380_000, 'numero', 'pt', '1,38 mi'],
    [45_000, 'moeda', 'en', '$45K'],
    [45_000, 'moeda', 'pt', 'R$ 45 mil'],
    [240, 'numero', 'pt', '240'],
    [999_600_000, 'moeda', 'pt', 'R$ 1 bi'],
    [999_600_000, 'moeda', 'en', '$1B'],
    [12.5, 'percent', 'pt', '12,5%'],
    [-13.04, 'percent', 'en', '-13%'],
    [0.5, 'percent', 'pt', '0,5%'],
    [2_500_000_000_000, 'moeda', 'en', '$2.5T'],
  ] as const)('%s %s %s → %s', (v, u, l, esperado) => {
    expect(formatarValor(v, u, l)).toBe(esperado)
  })
})

it('ordemDeGrandeza usa o valor exibido', () => {
  expect(ordemDeGrandeza(999_600_000)).toBe(9)
  expect(ordemDeGrandeza(980_000_000)).toBe(8)
})

it('arredondarSig', () => {
  expect(arredondarSig(3.47 * 238, 2)).toBe(830)
  expect(arredondarSig(0.0456, 2)).toBe(0.046)
})
```

- [ ] **Step 2:** `npx vitest run src/core/quickmath/formato.test.ts` → FAIL (módulo não existe)
- [ ] **Step 3:** Implementar `taxonomia.ts` e `formato.ts` com as assinaturas acima.
- [ ] **Step 4:** Mesmo comando → PASS
- [ ] **Step 5:** `git commit -m "feat(quickmath): taxonomia e formatação de valores PT/EN"`

---

### Task 2: Montagem das alternativas

**Files:**
- Create: `src/core/quickmath/questao.ts`, `src/core/quickmath/alternativas.ts`
- Test: `src/core/quickmath/alternativas.test.ts`

**Interfaces:**
- Consumes: Task 1 (`formatarLocalizado`, `ordemDeGrandeza`, `FOLGA_*`), `Rng`, `optionIdAt`.
- Produces (`questao.ts`):
```ts
export interface QmOpcao { id: OptionId; valor: number; texto: LocalizedText; erro?: LocalizedText }
export interface QmQuestao {
  id: string            // `${subskill}-${nivel}-${seed}`
  subskill: Subskill; nivel: Nivel; seed: number
  enunciado: LocalizedText
  opcoes: QmOpcao[]     // 5
  answerId: OptionId
  expression: string    // avaliável por evaluateExpression (src/core/math/solver.ts)
  estimativa: boolean
  atalho: LocalizedText // a conta feita do jeito rápido
  alvoMs: number        // ALVO_MS[subskill][nivel]
}
export type QmGerador = (seed: number, nivel: Nivel) => QmQuestao
```
- Produces (`alternativas.ts`):
  - `interface Candidato { valor: number; erro: LocalizedText }`
  - `montarAlternativas(rng: Rng, correta: number, candidatos: Candidato[], unidade: Unidade, estimativa: boolean): { opcoes: QmOpcao[]; answerId: OptionId } | null`

Algoritmo: arredonda `correta` (2 sig se `estimativa`); percorre `candidatos` na ordem dada aceitando cada um que (a) difere da correta em ≥ folga relativa, (b) difere de todos os já aceitos em ≥ folga relativa, (c) tem texto exibido distinto nos dois idiomas. Se, ao chegar a 4 aceitos, menos de 2 estão na mesma `ordemDeGrandeza` da correta, troca os últimos aceitos fora da ordem por perturbações dos dígitos iniciais (`correta × f`, `f` de `[1.2, 0.8, 1.5, 0.7, 1.3]`, arredondadas a 2 sig) com o erro genérico `{ pt: 'Conta parcial errada nos primeiros dígitos.', en: 'Arithmetic slip in the leading digits.' }`. Se ainda não fecha 4 → `null` (o gerador sorteia de novo). Embaralha com `rng.shuffle`. Valores não positivos são descartados, exceto em `percent`.

- [ ] **Step 1: Write the failing test**

```ts
const erro = { pt: 'x', en: 'x' }
it('aplica folga, ordem de grandeza e unicidade', () => {
  const r = montarAlternativas(mulberry32(1), 840_000_000,
    [{ valor: 8_400_000_000, erro }, { valor: 84_000_000, erro }, { valor: 860_000_000, erro },
     { valor: 840_000, erro }, { valor: 8_400_000_000, erro }], 'moeda', false)!
  const certa = r.opcoes.find((o) => o.id === r.answerId)!
  expect(r.opcoes).toHaveLength(5)
  expect(certa.valor).toBe(840_000_000)
  for (const o of r.opcoes.filter((o) => o !== certa))
    expect(Math.abs(o.valor - certa.valor) / certa.valor).toBeGreaterThanOrEqual(0.1)
  expect(r.opcoes.filter((o) => o !== certa && ordemDeGrandeza(o.valor) === 8).length).toBeGreaterThanOrEqual(2)
  expect(new Set(r.opcoes.map((o) => o.texto.pt)).size).toBe(5)
  expect(r.opcoes.some((o) => o.valor === 860_000_000)).toBe(false) // a 2,4%: fica fora
})
it('estimativa usa folga de 15% e arredonda a 2 sig', () => { /* correta 825.86 → 830; nenhum distrator em (705.5, 954.5) */ })
it('mesma seed → mesma ordem', () => { /* duas chamadas com mulberry32(7) devolvem ids iguais */ })
```

- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar. **Step 4:** rodar → PASS.
- [ ] **Step 5:** `git commit -m "feat(quickmath): alternativas com folga e ordem de grandeza"`

---

### Task 3: Geradores de multiplicação e divisão + harness de propriedade

**Files:**
- Create: `src/core/quickmath/geradores/multiplicacao.ts`, `src/core/quickmath/geradores/divisao.ts`, `src/core/quickmath/geradores/propriedades.ts` (harness de teste, exportado só para testes)
- Test: `src/core/quickmath/geradores/geradores.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2; `mulberry32`; `evaluateExpression`.
- Produces: `gerarMultiplicacao: QmGerador`, `gerarDivisao: QmGerador`; `verificarPropriedades(gerador: QmGerador, seeds: number): void` (expect's do vitest dentro).

Cada gerador sorteia com `mulberry32(seed)`, chama `montarAlternativas` e, se vier `null`, re-sorteia no mesmo rng (até 50 tentativas; depois lança — o teste pega). Números do enunciado passam por `formatarLocalizado`.

| Nível | Multiplicação | Divisão |
|---|---|---|
| 1 | mantissa 1 dígito × mantissa 1 dígito, 3–6 zeros no total; exata | quociente de 1 dígito, limpo; exata |
| 2 | 2 dígitos × 1 dígito (`3,5 mi × 40`); exata | quociente de 2 dígitos, limpo; exata |
| 3 | 2 × 2 dígitos; estimativa | mantissas de 2 dígitos; estimativa |
| 4 | 3 × 2 dígitos com troca de escala (mil × mi → bi); estimativa | escalas diferentes (`bi ÷ mil`); estimativa |
| 5 | três fatores de 2–3 dígitos; estimativa | dividendo e divisor de 3 dígitos com escalas diferentes; estimativa |

Candidatos de erro, nesta ordem: ×10 e ÷10 (`"Você perdeu um zero."`/`"You dropped a zero."` e o inverso), ×1000 e ÷1000 (`"Confundiu mil com milhão."`), e na divisão também o quociente invertido escalado. O `atalho` mostra a separação mantissa × potência de 10 (`"35 × 4 = 140; 5 zeros + 1 zero → 140 mi"`).

- [ ] **Step 1: Write the failing test** — o harness, rodado para cada gerador × nível 1–5 × seeds 1..200:

```ts
export function verificarPropriedades(g: QmGerador, seeds = 200) {
  for (const nivel of [1, 2, 3, 4, 5] as const)
    for (let seed = 1; seed <= seeds; seed++) {
      const q = g(seed, nivel)
      const certa = q.opcoes.find((o) => o.id === q.answerId)!
      const exato = evaluateExpression(q.expression)
      const tol = q.estimativa ? 0.05 : 1e-9
      expect(Math.abs(certa.valor - exato) / Math.abs(exato)).toBeLessThanOrEqual(tol)
      expect(q.opcoes).toHaveLength(5)
      const folga = q.estimativa ? 0.15 : 0.1
      const outras = q.opcoes.filter((o) => o !== certa)
      for (const o of outras) expect(Math.abs(o.valor - certa.valor) / Math.abs(certa.valor)).toBeGreaterThanOrEqual(folga)
      expect(outras.filter((o) => ordemDeGrandeza(o.valor) === ordemDeGrandeza(certa.valor)).length).toBeGreaterThanOrEqual(2)
      for (const l of ['pt', 'en'] as const) {
        expect(new Set(q.opcoes.map((o) => o.texto[l])).size).toBe(5)
        expect(q.enunciado[l].length).toBeGreaterThan(0)
        expect(q.atalho[l].length).toBeGreaterThan(0)
      }
      expect(q.nivel).toBe(nivel)
      expect(g(seed, nivel)).toEqual(q) // determinístico
    }
}
it.each([['multiplicacao', gerarMultiplicacao], ['divisao', gerarDivisao]])('%s', (_, g) => verificarPropriedades(g))
it('multiplicação nível 1 é exata e nível 3 é estimativa', () => {
  expect(gerarMultiplicacao(1, 1).estimativa).toBe(false)
  expect(gerarMultiplicacao(1, 3).estimativa).toBe(true)
})
```

- [ ] **Step 2:** `npx vitest run src/core/quickmath/geradores` → FAIL
- [ ] **Step 3:** implementar os dois geradores.
- [ ] **Step 4:** → PASS
- [ ] **Step 5:** `git commit -m "feat(quickmath): geradores de multiplicação e divisão"`

---

### Task 4: Geradores de porcentagem e frações

**Files:**
- Create: `src/core/quickmath/geradores/porcentagem.ts`, `src/core/quickmath/geradores/fracoes.ts`
- Test: adicionar ao `geradores.test.ts`

**Interfaces:** Produces `gerarPorcentagem: QmGerador`, `gerarFracoes: QmGerador`. Consumes o harness da Task 3.

| Nível | Porcentagem | Frações ↔ % (unidade `percent`, salvo onde dito) |
|---|---|---|
| 1 | p% de N, p ∈ {5, 10, 20, 25, 50}; exata | 1/2, 1/4, 1/5, 1/8, 3/4 → %; exata |
| 2 | p% de N, p ∈ {8, 12, 15, 35, 45}, N escolhido para dar exato | 1/3, 2/3, 1/6, 1/12, 3/8, 5/8 → % (1 casa); exata |
| 3 | variação % de A → B, subida e queda; estimativa | **fração do ano**: "o modelo entra em {mês}; que % do ano ele roda?" (de {mês} a dezembro); exata |
| 4 | p% de q% de N; estimativa | 1/7, 1/9, 1/11, 1/16 e múltiplos → % (1 casa); estimativa |
| 5 | sobe p% e depois cai q% (variação líquida), ou "a taxa vai de 4% para 5%: aumento de quantos %?"; estimativa | k/12 de N (unidade `moeda`); estimativa |

Candidatos de erro, por família: base errada na variação (`(B−A)/B`); sinal trocado; percentuais somados (`(p+q)%` em vez de `p% × q%`; `p − q` na subida-e-queda); ponto percentual tratado como % (`1%` no exemplo 4 → 5); mês a mais e a menos na fração do ano (`(k±1)/12`) com o erro `"Contou um mês a mais/a menos."`; fração vizinha (1/7 ↔ 1/8); ×10 e ÷10.

Mês do enunciado: nomes `janeiro…dezembro` / `January…December`, entrada no dia 1, meses de fevereiro a dezembro. Em questão exata o `valor` da alternativa é o número exato (7/12 → 58,333…); só o texto é arredondado (`58,3%`).

- [ ] **Step 1:** adicionar `it.each` com os dois geradores ao harness, mais:

```ts
it('fração do ano: abril → 9/12 = 75%, com mês a mais ou a menos entre os distratores', () => {
  const q = encontrar(gerarFracoes, 3, (q) => q.enunciado.pt.includes('abril'))
  const valores = q.opcoes.map((o) => o.valor)
  expect(q.opcoes.find((o) => o.id === q.answerId)!.valor).toBe(75)
  expect(valores.some((v) => Math.abs(v - 200 / 3) < 1e-6 || Math.abs(v - 250 / 3) < 1e-6)).toBe(true)
})
```
(`encontrar(g, nivel, pred)` percorre seeds 1..500 até achar; ficar em `propriedades.ts`.)

- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS
- [ ] **Step 5:** `git commit -m "feat(quickmath): geradores de porcentagem e frações"`

---

### Task 5: Gerador de cadeia e registro dos geradores

**Files:**
- Create: `src/core/quickmath/geradores/cadeia.ts`, `src/core/quickmath/geradores/index.ts`
- Test: adicionar ao `geradores.test.ts`

**Interfaces:**
- Produces: `gerarCadeia: QmGerador`; em `index.ts`: `GERADORES: Record<(typeof SUBSKILLS_ATIVAS)[number], QmGerador>` e `gerarQuestao(subskill: Subskill, nivel: Nivel, seed: number): QmQuestao` (lança para subskill fora das ativas).

Dois cenários sorteados, sempre com `moeda` na resposta:
- **Impacto no ano 1** (o caso do Luiz): impacto anual cheio X; entra em {mês}; adoção média Y% no 1º ano; afeta Z% da carteira.
- **Market sizing**: população × penetração × frequência anual × ticket.

| Nível | Camadas | Números |
|---|---|---|
| 1 | 2 (X × fração do ano) | redondos; exata |
| 2 | 3 | redondos; exata |
| 3 | 4 | redondos; estimativa |
| 4 | 4 | mantissas de 2–3 dígitos; estimativa |
| 5 | 4 + conversão de unidade (valor mensal → ×12, ou por cliente → total) | mantissas de 2–3 dígitos; estimativa |

Candidatos de erro: **uma camada esquecida** (um candidato por camada, com o erro nomeando a camada: `"Esqueceu a adoção de 40%."`), fração do ano com um mês a mais/a menos, ×10 e ÷10. O `atalho` lista as camadas na ordem e o produto parcial de cada passo.

- [ ] **Step 1:** harness para `gerarCadeia`, mais:

```ts
it('cada camada esquecida vira candidato', () => {
  const q = gerarCadeia(3, 3)
  expect(q.opcoes.filter((o) => o.erro?.pt.startsWith('Esqueceu')).length).toBeGreaterThanOrEqual(1)
})
it('gerarQuestao recusa subskill inativa', () => {
  expect(() => gerarQuestao('crescimento', 1, 1)).toThrow()
  expect(gerarQuestao('cadeia', 2, 9).subskill).toBe('cadeia')
})
```

- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS
- [ ] **Step 5:** `git commit -m "feat(quickmath): gerador de cadeia e registro"`

---

### Task 6: Seleção adaptativa

**Files:**
- Create: `src/core/quickmath/selecao.ts`
- Test: `src/core/quickmath/selecao.test.ts`

**Interfaces:**
- Produces:
```ts
export interface QmResposta {
  id: string; sessaoId: string; questaoId: string
  subskill: Subskill; nivel: Nivel
  chosenId: OptionId | null; correta: boolean
  elapsedMs: number; alvoMs: number; respondidaEm: number
}
export function fraqueza(respostas: QmResposta[], subskill: Subskill): number
export function escolherSubskill(rng: Rng, respostas: QmResposta[], ativas: readonly Subskill[]): Subskill
export function ajustarNivel(nivel: Nivel, bloco: QmResposta[]): Nivel
```

`fraqueza`: sobre as últimas 20 respostas da subskill; com menos de 5, devolve `Infinity` (nunca treinada vem primeiro). Senão `(1 − acerto) + 0.5 × max(0, tempoMédio/alvoMédio − 1)`. `escolherSubskill`: com probabilidade `CHANCE_EXPLORAR` (`rng.next() < 0.2`) sorteia uniforme entre as ativas; senão a de maior fraqueza, empate pela ordem de `ativas`. `ajustarNivel`: `certasNoTempo = correta && elapsedMs <= alvoMs`; ≥ 4 → +1 (teto 5); `certas` (qualquer tempo) ≤ 2 → −1 (piso 1); senão igual.

- [ ] **Step 1: Write the failing test**

```ts
it('histórico vazio escolhe uma ativa sem lançar', () => {
  expect(SUBSKILLS_ATIVAS).toContain(escolherSubskill(mulberry32(1), [], SUBSKILLS_ATIVAS))
})
it('prefere a mais fraca quando não explora', () => { /* rng cujo next() devolve 0.9; porcentagem com 2/10 certas, demais 10/10 → 'porcentagem' */ })
it('subskill com < 5 respostas vem antes', () => { /* fraqueza === Infinity */ })
it.each([
  [3, [1,1,1,1,0], 4],   // 4 certas no tempo → sobe
  [5, [1,1,1,1,1], 5],   // teto
  [3, [1,1,0,0,0], 2],   // 2 certas → desce
  [1, [0,0,0,0,0], 1],   // piso
  [3, [1,1,1,0,0], 3],   // 3 → mantém
])('ajustarNivel(%i, %j) → %i', (n, certas, esperado) => { /* respostas com elapsed ≤ alvo */ })
it('4 certas mas 2 fora do tempo não sobem', () => { /* nível 3 → 3 */ })
it('pulada (chosenId null) conta como errada', () => { /* correta false */ })
```

- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS
- [ ] **Step 5:** `git commit -m "feat(quickmath): seleção adaptativa e ajuste de nível"`

---

### Task 7: Reducer da sessão diária e resumo

**Files:**
- Create: `src/core/quickmath/sessao.ts`
- Test: `src/core/quickmath/sessao.test.ts`

**Interfaces:**
- Consumes: Tasks 5–6, `seedFromString`, `mulberry32`.
- Produces:
```ts
export interface QmSessao {
  id: string; seed: number; startedAt: number
  niveis: Record<Subskill, Nivel>
  historico: QmResposta[]          // de sessões anteriores, só para seleção
  respostas: QmResposta[]          // desta sessão
  atual: QmQuestao; indice: number; questaoIniciadaEm: number
  revelada: QmResposta | null      // resposta da atual, enquanto o feedback está aberto
  bloco: { subskill: Subskill; inicio: number } | null   // null durante o aquecimento
  status: 'rodando' | 'encerrada'; encerradaEm?: number
}
export function criarSessao(p: { seed: number; agora: number; niveis: Partial<Record<Subskill, Nivel>>; historico: QmResposta[] }): QmSessao
export function responder(s: QmSessao, chosenId: OptionId | null, agora: number): QmSessao
export function avancar(s: QmSessao, agora: number): QmSessao
export function encerrar(s: QmSessao, agora: number): QmSessao
export function restanteMs(s: QmSessao, agora: number): number
export interface QmResumoLinha { subskill: Subskill; n: number; certas: number; tempoMedioMs: number; alvoMedioMs: number; nivelFinal: Nivel }
export function resumir(s: QmSessao): QmResumoLinha[]
```

Regras: `id = qm-${startedAt}`; níveis ausentes valem 1. Seed da questão `i` = `seedFromString(`${seed}:${i}`)`; rng de seleção = `mulberry32(seedDaQuestão)`. `responder` só age sem `revelada`: grava a `QmResposta` (pulada = `chosenId: null`, errada) em `respostas` e em `revelada`; não avança. `avancar` exige `revelada`; zera-a; se `agora − startedAt ≥ DURACAO_SESSAO_MS` → `encerrar`. Senão escolhe a próxima: no aquecimento (`agora − startedAt < AQUECIMENTO_MS`) subskill uniforme entre as ativas e nível `min(niveis[s], 2)`; fora dele, se `bloco` é null ou já tem `TAMANHO_BLOCO` respostas, fecha o bloco (`ajustarNivel` com as respostas do bloco, se havia bloco) e abre outro com `escolherSubskill(rng, [...historico, ...respostas], SUBSKILLS_ATIVAS)`. Respostas do aquecimento não ajustam nível.

- [ ] **Step 1: Write the failing test**

```ts
const t0 = 1_000_000
it('aquecimento usa nível ≤ 2', () => { /* niveis todos 5; atual.nivel ≤ 2 */ })
it('responder não avança; avancar avança', () => { /* indice 0 → 0 → 1; respostas.length 1 */ })
it('pular registra errada com o tempo gasto', () => {
  const s = responder(criarSessao({ seed: 1, agora: t0, niveis: {}, historico: [] }), null, t0 + 7_000)
  expect(s.respostas[0]).toMatchObject({ chosenId: null, correta: false, elapsedMs: 7_000 })
})
it('depois do aquecimento, blocos de 5 na mesma subskill', () => { /* avança até t0+3min; as 5 próximas têm a mesma subskill */ })
it('bloco com 5 certas no tempo sobe o nível daquela subskill', () => { /* responde sempre answerId em 1s */ })
it('passar de 15 min com feedback aberto: avancar encerra', () => {
  let s = responder(criarSessao({ seed: 1, agora: t0, niveis: {}, historico: [] }), 'a', t0 + 14 * 60_000 + 59_000)
  s = avancar(s, t0 + 15 * 60_000 + 5_000)
  expect(s.status).toBe('encerrada')
  expect(s.respostas).toHaveLength(1)
})
it('resumir agrupa por subskill', () => { /* n, certas, tempoMedioMs */ })
it('determinístico para a mesma seed e os mesmos instantes', () => {})
```

- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS
- [ ] **Step 5:** `git commit -m "feat(quickmath): sessão diária com aquecimento e blocos adaptativos"`

---

### Task 8: Persistência

**Files:**
- Create: `src/data/quickmath.ts`
- Modify: `src/data/db.ts` (`clearAllData` também chama `limparQuickMath()`)

**Interfaces:**
- Produces:
```ts
export async function salvarResposta(r: QmResposta): Promise<void>
export async function carregarHistorico(limite?: number): Promise<QmResposta[]>   // padrão 500, mais recentes, em ordem cronológica
export async function carregarNiveis(): Promise<Partial<Record<Subskill, Nivel>>>
export async function salvarNiveis(n: Record<Subskill, Nivel>): Promise<void>
export async function salvarSessaoQm(s: { id: string; startedAt: number; encerradaEm: number; resumo: QmResumoLinha[] }): Promise<void>
export async function limparQuickMath(): Promise<void>
```

Banco `ccat-quickmath`, versão 1, stores `respostas` (keyPath `id`, índice `by-respondida`), `niveis` (keyPath `userId`, `LOCAL_USER`), `sessoes` (keyPath `id`). Mesmo padrão `comFallback` de `db.ts`, com o mesmo `console.warn` e devolvendo o padrão (lista vazia, `{}`) em falha; reaproveitar `armazenamentoIndisponivel` não é necessário. Sem teste de unidade: o projeto não tem `fake-indexeddb`, e as telas mockam `src/data/*`.

- [ ] **Step 1:** implementar. **Step 2:** `npm run typecheck` → sem erros.
- [ ] **Step 3:** `git commit -m "feat(quickmath): persistência local separada do banco da CCAT"`

---

### Task 9: Telas, rotas e entrada na Home

**Files:**
- Create: `src/app/useQuickMath.ts`, `src/app/screens/QuickMathScreen.tsx`, `src/app/screens/QuickMathSessionScreen.tsx`, `src/app/screens/QuickMathResultScreen.tsx`
- Modify: `src/app/App.tsx` (3 rotas; `emSessao` também em `/quickmath/sessao`), `src/app/screens/HomeScreen.tsx` (um `<Link className="ato" to="/quickmath">` depois de "Practice by type"), `src/app/strings.ts` (chaves `home.quickmath.*` e `qm.*` em en e pt), `src/app/styles.css` só se a medição do Step 6 exigir.
- Test: `src/app/screens/QuickMathSessionScreen.test.tsx`, `src/app/screens/HomeScreen.test.tsx` (acrescentar um caso)

**Interfaces:**
- Consumes: Tasks 7–8; `useOptionHotkeys` (`src/app/useSession.ts`); `useGuardaDeSaida(encerrar)` (`src/app/useBotaoVoltar.ts`) para o Encerrar e o Voltar do navegador/Android passarem pela `Confirmacao`, como na CCAT; `tocar` (`haptics.ts`); `useLocale`. `useSalvarAoSair` não entra: não há sessão em andamento a restaurar, as respostas já são gravadas uma a uma.
- Produces: `useQuickMath(): { fase: 'carregando' | 'rodando' | 'encerrada'; sessao: QmSessao | null; agora: number; responder(id: OptionId | null): void; avancar(): void; encerrar(): void }`.

Rotas: `quickmath` → `QuickMathScreen`, `quickmath/sessao` → `QuickMathSessionScreen`, `quickmath/resultado` → `QuickMathResultScreen` (lê o resumo de `location.state`; sem state, redireciona para `/quickmath`).

`useQuickMath`: no mount carrega `carregarHistorico()` e `carregarNiveis()` em paralelo e chama `criarSessao({ seed: Date.now() >>> 0, agora: Date.now(), ... })` (por isso abrir a rota direto ou dar F5 começa uma sessão nova); relógio por `setInterval` de 250 ms. A cada `responder` → `salvarResposta`. Quando `niveis` muda (bloco fechado) → `salvarNiveis`. Ao encerrar → `salvarSessaoQm` e `navigate('/quickmath/resultado', { replace: true, state: { resumo } })`.

`QuickMathScreen`: título, uma linha do que é, botão "Começar sessão de hoje" (`/quickmath/sessao`) e a lista das 5 subskills ativas com o nível atual (de `carregarNiveis`).

`QuickMathSessionScreen` reaproveita as classes da sessão da CCAT: `.barra-sessao` (relógio = `restanteMs` da sessão, rótulo da subskill no lugar do contador, botão Encerrar com `Confirmacao`), `.progresso` (preenche de 0 a `alvoMs` da questão atual; ganha `urgente` ao passar do alvo — não estoura, só mede), `.questao` › `.enunciado` + `.opcoes.curtas` (alternativas de número são curtas), `.feedback` com veredito, `tx(atual.atalho)` e, se errou numa alternativa com `erro`, `t('qm.feedback.erro', { erro: tx(opcao.erro) })`. `.barra-acao`: "Pular" antes de responder, "Próxima" depois (chama `avancar`). Háptico de acerto/erro como no drill. Atalhos A–E/1–5 e Enter/espaço para avançar.

`QuickMathResultScreen`: tabela `lista-mobile` com subskill, certas/n, tempo médio vs alvo e nível final; links "Outra sessão" e "Início".

Strings mínimas (en / pt):
- `home.quickmath.title`: `Case math` / `Math de case`
- `home.quickmath.body`: `Mental math for case interviews: big numbers, percentages, fractions of a year, chained estimates. 15 minutes a day.` / `Conta de cabeça para case interview: números grandes, porcentagem, fração do ano, estimativas encadeadas. 15 minutos por dia.`
- `qm.start`, `qm.level`, `qm.skip`, `qm.next`, `qm.finish`, `qm.correct`, `qm.incorrect`, `qm.feedback.erro` (`Likely slip: {erro}` / `Erro provável: {erro}`), `qm.result.*`.

- [ ] **Step 1: Write the failing tests** (mockando `../../data/quickmath` como os testes existentes mockam `../../data/db`, e `Date.now` fixo):

```ts
it('mostra a questão com 5 alternativas e o relógio da sessão', async () => {
  // carregarHistorico → [], carregarNiveis → {}
  expect(await screen.findAllByRole('radio')).toHaveLength(5)
  expect(screen.getByRole('timer')).toHaveTextContent('15:00')
})
it('responder revela o feedback com o atalho e grava a resposta', async () => {
  await user.click((await screen.findAllByRole('radio'))[0])
  expect(screen.getByText(/^(Correct|Incorrect)/)).toBeInTheDocument() // veredito, locale en
  expect(salvarResposta).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: /next|próxima/i })).toBeInTheDocument()
})
it('Próxima traz outra questão', async () => { /* id da questão muda */ })
it('trocar o idioma mantém a questão e os valores', async () => { /* textos mudam, número de radios igual */ })
// HomeScreen.test.tsx
it('Home tem a entrada de Math de case', () => {
  expect(screen.getByRole('link', { name: /case math/i })).toHaveAttribute('href', '#/quickmath')
})
```

- [ ] **Step 2:** `npx vitest run src/app/screens` → FAIL nos novos casos
- [ ] **Step 3:** implementar hook, três telas, rotas, link e strings.
- [ ] **Step 4:** `npx vitest run src/app/screens` → PASS
- [ ] **Step 5:** `npm run dev`, abrir `http://localhost:5173/#/quickmath/sessao` no browser em 375×667, para cada subskill ativa em nível 1 e 5 (forçar pela seed no console ou temporariamente pelos níveis salvos): `document.querySelector('.questao').scrollHeight <= document.querySelector('.questao').clientHeight` antes de responder. Conferir PT e EN.
- [ ] **Step 6:** se algum caso rolar, ajustar só classes novas `.qm-*` em `styles.css` (não mexer nas da CCAT) e medir de novo.
- [ ] **Step 7:** `git commit -m "feat(quickmath): telas, rotas e entrada na Home"`

---

### Task 10: Verificação final e README

**Files:**
- Modify: `README.md` (seção curta "Case math": o que é, que não passa pelo banco nem pelos gates e por quê, onde vivem os geradores)

- [ ] **Step 1:** `npm test` → tudo verde, incluindo os testes da CCAT que já existiam.
- [ ] **Step 2:** `npm run typecheck` → sem erros.
- [ ] **Step 3:** `npm run build` → passa (o `content:assert` continua verde porque nada de quick math entrou em `content/`).
- [ ] **Step 4:** sessão real de 15 min no browser em 375×667: aquecimento, pelo menos dois blocos, nível subindo, resultado, Home → Math de case mostra os níveis novos.
- [ ] **Step 5:** atualizar o README; `git commit -m "docs: README com o modo Math de case"`
- [ ] **Step 6:** parar e pedir ao Luiz o ok para merge em `main` (publica na Vercel) e push com a conta pessoal.
