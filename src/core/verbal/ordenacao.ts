import { mulberry32, type Rng } from '../rng'
import { optionIdAt } from '../optionIds'
import { OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import type { LocalizedText } from '../i18n'
import type { VerbalGenerated, VerbalGenerator } from './generators'
import { NOMES, permutacoes } from './verdadeiroFalso'

/**
 * Ordenação — o quebra-cabeça de fila que a CCAT põe perto do fim da prova:
 * 5 a 7 pessoas, 4 ou 5 regras e uma pergunta do tipo "If H is 3rd, who could
 * be last?", "Who must be 2nd?" ou "Which list includes everyone who could be
 * last?".
 *
 * O gabarito sai de força bruta: enumeramos TODAS as permutações (no máximo
 * 7! = 5040) e ficamos com as que respeitam as regras. "Could" é existir uma
 * ordem válida; "must" é valer em todas. Os distratores vêm dos erros reais:
 * quem seria possível se o candidato esquecesse UMA regra, e quem pode estar
 * na posição mas não precisa (o "could" lido como "must").
 */

/** `pos[pessoa]` = posição, 0 = primeiro da fila. */
type Posicoes = number[]

type Regra =
  | { tipo: 'antes'; a: number; b: number }
  | { tipo: 'colado'; a: number; b: number }
  | { tipo: 'vizinhos'; a: number; b: number }
  | { tipo: 'separados'; a: number; b: number }
  | { tipo: 'meio'; a: number }
  | { tipo: 'fixo'; a: number; k: number }
  | { tipo: 'se'; a: number; b: number }

function vale(r: Regra, pos: Posicoes, n: number): boolean {
  switch (r.tipo) {
    case 'antes':
      return pos[r.a]! < pos[r.b]!
    case 'colado':
      return pos[r.a]! + 1 === pos[r.b]!
    case 'vizinhos':
      return Math.abs(pos[r.a]! - pos[r.b]!) === 1
    case 'separados':
      return Math.abs(pos[r.a]! - pos[r.b]!) !== 1
    case 'meio':
      return pos[r.a]! !== 0 && pos[r.a]! !== n - 1
    case 'fixo':
      return pos[r.a] === r.k
    case 'se':
      // "If A is not 1st, B is last."
      return pos[r.a] === 0 || pos[r.b] === n - 1
  }
}

const ORDINAIS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'] as const
const ORDINAIS_PT = ['1º', '2º', '3º', '4º', '5º', '6º', '7º'] as const

const ordinal = (k: number, n: number) => (k === n - 1 ? 'last' : ORDINAIS[k]!)
const ordinalPt = (k: number, n: number) => (k === n - 1 ? 'último' : ORDINAIS_PT[k]!)

function renderRegra(r: Regra, nomes: string[], n: number): string {
  const A = nomes[r.a]
  switch (r.tipo) {
    case 'antes':
      return `${A} is somewhere ahead of ${nomes[r.b]}.`
    case 'colado':
      return `${A} is right in front of ${nomes[r.b]}.`
    case 'vizinhos':
      return `${A} stands next to ${nomes[r.b]}.`
    case 'separados':
      return `${A} does not stand next to ${nomes[r.b]}.`
    case 'meio':
      return `${A} is neither 1st nor last.`
    case 'fixo':
      return `${A} is ${ordinal(r.k, n)}.`
    case 'se':
      return `If ${A} is not 1st, ${nomes[r.b]} is last.`
  }
}

/** Posições de cada permutação, calculadas uma vez por tamanho de fila. */
const CACHE_POSICOES = new Map<number, Posicoes[]>()
function todasAsFilas(n: number): Posicoes[] {
  let filas = CACHE_POSICOES.get(n)
  if (!filas) {
    filas = permutacoes(n).map((ordem) => {
      const pos: Posicoes = new Array(n)
      ordem.forEach((pessoa, i) => (pos[pessoa] = i))
      return pos
    })
    CACHE_POSICOES.set(n, filas)
  }
  return filas
}

function validas(regras: Regra[], n: number): Posicoes[] {
  return todasAsFilas(n).filter((pos) => regras.every((r) => vale(r, pos, n)))
}

/** Quem aparece na posição k em alguma das filas. */
function quemPodeEstar(filas: Posicoes[], k: number, n: number): Set<number> {
  const out = new Set<number>()
  for (const pos of filas) {
    for (let p = 0; p < n; p++) if (pos[p] === k) out.add(p)
  }
  return out
}

// --- Perguntas ---------------------------------------------------------------

type Pergunta = 'must' | 'mustTrue' | 'could' | 'cannot' | 'lista'

interface Nivel {
  pessoas: number
  regras: number
  perguntas: Pergunta[]
  /** chance de a pergunta vir com hipótese ("If H is 3rd, …") */
  hipotese: number
  tiposDeRegra: Regra['tipo'][]
}

const BASICAS: Regra['tipo'][] = ['antes', 'antes', 'colado', 'vizinhos', 'meio', 'fixo']

const NIVEIS: Record<Difficulty, Nivel> = {
  1: { pessoas: 5, regras: 4, perguntas: ['must'], hipotese: 0, tiposDeRegra: BASICAS },
  2: { pessoas: 5, regras: 4, perguntas: ['must', 'cannot'], hipotese: 0.3, tiposDeRegra: BASICAS },
  3: { pessoas: 6, regras: 4, perguntas: ['could', 'cannot', 'mustTrue'], hipotese: 0.5, tiposDeRegra: [...BASICAS, 'separados'] },
  4: { pessoas: 6, regras: 5, perguntas: ['could', 'lista', 'mustTrue'], hipotese: 0.6, tiposDeRegra: [...BASICAS, 'separados', 'se'] },
  5: { pessoas: 7, regras: 5, perguntas: ['could', 'lista', 'mustTrue'], hipotese: 0.6, tiposDeRegra: [...BASICAS, 'separados', 'se', 'se'] },
}

function sortearRegra(rng: Rng, tipo: Regra['tipo'], escondida: Posicoes, n: number): Regra | null {
  const pessoa = () => rng.int(0, n - 1)
  const a = pessoa()
  let b = pessoa()
  while (b === a) b = pessoa()
  const pa = escondida[a]!
  const pb = escondida[b]!
  // Toda regra é verdadeira na fila escondida: as regras nunca se contradizem.
  switch (tipo) {
    case 'antes':
      return pa < pb ? { tipo, a, b } : { tipo, a: b, b: a }
    case 'colado':
      if (Math.abs(pa - pb) !== 1) return null
      return pa < pb ? { tipo, a, b } : { tipo, a: b, b: a }
    case 'vizinhos':
      return Math.abs(pa - pb) === 1 ? { tipo, a, b } : null
    case 'separados':
      return Math.abs(pa - pb) !== 1 ? { tipo, a, b } : null
    case 'meio':
      return pa !== 0 && pa !== n - 1 ? { tipo, a } : null
    case 'fixo':
      return { tipo, a, k: pa }
    case 'se':
      // Só interessa quando a condição dispara na fila escondida.
      return pa !== 0 && pb === n - 1 ? { tipo, a, b } : null
  }
}

interface Montada {
  stem: string
  opcoes: string[]
  explicacao: LocalizedText
  /** textos das alternativas corretas — exatamente um, por construção */
  correta: string
}

function montar(rng: Rng, difficulty: Difficulty): Montada | null {
  const nivel = NIVEIS[difficulty]
  const n = nivel.pessoas
  const nomes = [...rng.shuffle(NOMES).slice(0, n)].sort()
  const escondida = rng.shuffle([...Array(n).keys()])

  const regras: Regra[] = []
  // Cada par de pessoas aparece em uma regra só: "Ana stands next to Fay" e
  // "Fay is somewhere ahead of Ana" juntas são uma regra disfarçada de duas.
  const pares = new Set<string>()
  const soltas = new Set<number>()
  for (let guard = 0; regras.length < nivel.regras && guard < 60; guard++) {
    const r = sortearRegra(rng, rng.pick(nivel.tiposDeRegra), escondida, n)
    if (!r) continue
    // No máximo uma posição fixa: com duas, a fila se resolve sozinha.
    if (r.tipo === 'fixo' && regras.some((x) => x.tipo === 'fixo')) continue
    if ('b' in r) {
      const par = [r.a, r.b].sort().join('-')
      if (pares.has(par)) continue
      pares.add(par)
    } else {
      // uma regra de posição por pessoa ("Kim is 2nd" já diz "not at an end")
      if (soltas.has(r.a)) continue
      soltas.add(r.a)
    }
    regras.push(r)
  }
  if (regras.length < nivel.regras) return null

  const pergunta = rng.pick(nivel.perguntas)
  const hipotese: Regra | null =
    rng.next() < nivel.hipotese ? { tipo: 'fixo', a: rng.int(0, n - 1), k: rng.int(1, n - 2) } : null
  if (hipotese && regras.some((r) => 'a' in r && r.a === hipotese.a && r.tipo === 'fixo')) return null

  const todas = hipotese ? [...regras, hipotese] : regras
  const filas = validas(todas, n)
  if (filas.length < 2) return null
  // A hipótese precisa mudar alguma coisa, senão é enfeite.
  if (hipotese && validas(regras, n).length === filas.length) return null

  // Posição perguntada: "could"/"cannot"/"lista" preferem as pontas, como na prova.
  const k =
    pergunta === 'must'
      ? rng.int(0, n - 1)
      : rng.pick([0, n - 1, n - 1, rng.int(1, n - 2)])
  if (hipotese && hipotese.k === k) return null
  // A resposta não pode estar escrita numa regra: "X is 3rd" + "who must be 3rd?".
  if (regras.some((r) => r.tipo === 'fixo' && r.k === k)) return null

  const S = quemPodeEstar(filas, k, n)
  // Quem entraria em S se o candidato esquecesse uma regra (a hipótese nunca
  // se esquece: é a própria pergunta).
  const esquecidas = regras.map((r) => {
    const sem = validas(
      todas.filter((x) => x !== r),
      n,
    )
    const extra = [...quemPodeEstar(sem, k, n)].filter((p) => !S.has(p))
    return { regra: r, extra, possiveis: new Set([...S, ...extra]) }
  })
  const extraPorPessoa = new Map<number, Regra>()
  for (const e of rng.shuffle(esquecidas)) for (const p of e.extra) if (!extraPorPessoa.has(p)) extraPorPessoa.set(p, e.regra)

  const posEn = ordinal(k, n)
  const posPt = ordinalPt(k, n)
  const fila = (pos: Posicoes) =>
    [...Array(n).keys()]
      .sort((x, y) => pos[x]! - pos[y]!)
      .map((p) => nomes[p])
      .join(' – ')
  const exemplo = (p: number) => filas.find((pos) => pos[p] === k)!
  const se = hipotese ? `If ${nomes[hipotese.a]} is ${ordinal(hipotese.k, n)}, ` : ''
  const sePt = hipotese ? ` (com ${nomes[hipotese.a]} em ${ordinalPt(hipotese.k, n)})` : ''

  let opcoes: string[]
  let correta: string
  let perguntaTexto: string
  let pt: string
  let en: string

  const esquecidaPt = (p: number) => {
    const r = extraPorPessoa.get(p)
    return r ? ` ${nomes[p]} só caberia ali esquecendo a regra "${renderRegra(r, nomes, n).slice(0, -1)}".` : ''
  }
  const esquecidaEn = (p: number) => {
    const r = extraPorPessoa.get(p)
    return r ? ` ${nomes[p]} would only fit there if you forgot "${renderRegra(r, nomes, n).slice(0, -1)}".` : ''
  }

  if (pergunta === 'must') {
    const sempre = [...S].filter((p) => filas.every((pos) => pos[p] === k))
    if (sempre.length !== 1 || S.size !== 1) return null
    const certa = sempre[0]!
    // Distratores: quem poderia estar ali sem uma regra, depois o resto.
    const outros = rng.shuffle([...Array(n).keys()].filter((p) => p !== certa))
    const distratores = [
      ...outros.filter((p) => extraPorPessoa.has(p)),
      ...outros.filter((p) => !extraPorPessoa.has(p)),
    ].slice(0, OPCOES_POR_QUESTAO - 1)
    if (distratores.length < OPCOES_POR_QUESTAO - 1) return null
    correta = nomes[certa]!
    opcoes = [correta, ...distratores.map((p) => nomes[p]!)]
    perguntaTexto = `${se}who must be ${posEn}?`
    const tentador = distratores.find((p) => extraPorPessoa.has(p))
    pt =
      `Em todas as ${filas.length} filas que respeitam as regras${sePt}, ${correta} é o ${posPt} — ` +
      `por exemplo: ${fila(filas[0]!)}.${tentador !== undefined ? esquecidaPt(tentador) : ''}`
    en =
      `In all ${filas.length} lines that respect the rules, ${correta} is ${posEn} — for example: ` +
      `${fila(filas[0]!)}.${tentador !== undefined ? esquecidaEn(tentador) : ''}`
  } else if (pergunta === 'mustTrue') {
    // "Which of the following must be true?": a certa vale em TODAS as filas;
    // os distratores valem em ALGUMA — é o "could" lido como "must".
    type Afirmacao = { texto: string; vale: (pos: Posicoes) => boolean }
    const afirmacoes: Afirmacao[] = []
    const jaDito = new Set(regras.map((r) => renderRegra(r, nomes, n)))
    const colados = new Set(regras.filter((r) => r.tipo === 'colado').map((r) => `${r.a}>${'b' in r ? r.b : ''}`))
    for (let p = 0; p < n; p++) {
      for (let j = 0; j < n; j++) {
        afirmacoes.push({ texto: `${nomes[p]} is ${ordinal(j, n)}`, vale: (pos) => pos[p] === j })
      }
      for (let q = 0; q < n; q++) {
        if (p === q || colados.has(`${p}>${q}`)) continue
        afirmacoes.push({ texto: `${nomes[p]} is somewhere ahead of ${nomes[q]}`, vale: (pos) => pos[p]! < pos[q]! })
      }
    }
    // Nada que só repita uma regra ou a hipótese da pergunta.
    if (hipotese) jaDito.add(renderRegra(hipotese, nomes, n))
    const novas = afirmacoes.filter((a) => !jaDito.has(`${a.texto}.`))
    const sempre = novas.filter((a) => filas.every(a.vale))
    const asVezes = novas.filter((a) => filas.some(a.vale) && !filas.every(a.vale))
    if (sempre.length === 0 || asVezes.length < OPCOES_POR_QUESTAO - 1) return null
    const certa = rng.pick(sempre)
    const distratores = rng.shuffle(asVezes).slice(0, OPCOES_POR_QUESTAO - 1)
    correta = certa.texto
    opcoes = [correta, ...distratores.map((a) => a.texto)]
    perguntaTexto = `${se}which of the following must be true?`
    const outro = distratores[0]!
    const aFavor = filas.find((pos) => outro.vale(pos))!
    const contra = filas.find((pos) => !outro.vale(pos))!
    pt =
      `"${correta}" vale em todas as ${filas.length} filas que respeitam as regras${sePt}. As outras PODEM ` +
      `ser verdade, mas não precisam: "${outro.texto}" vale em ${fila(aFavor)}, mas falha em ${fila(contra)}.`
    en =
      `"${correta}" holds in all ${filas.length} lines that respect the rules. The others COULD be true but ` +
      `need not be: "${outro.texto}" holds in ${fila(aFavor)}, but fails in ${fila(contra)}.`
  } else if (pergunta === 'could') {
    const fora = [...Array(n).keys()].filter((p) => !S.has(p))
    if (fora.length < OPCOES_POR_QUESTAO - 1) return null
    const certa = rng.pick([...S])
    const embaralhados = rng.shuffle(fora)
    const distratores = [
      ...embaralhados.filter((p) => extraPorPessoa.has(p)),
      ...embaralhados.filter((p) => !extraPorPessoa.has(p)),
    ].slice(0, OPCOES_POR_QUESTAO - 1)
    correta = nomes[certa]!
    opcoes = [correta, ...distratores.map((p) => nomes[p]!)]
    perguntaTexto = `${se}who could be ${posEn}?`
    const tentador = distratores.find((p) => extraPorPessoa.has(p))
    pt =
      `${correta} pode ser o ${posPt}${sePt}: a fila ${fila(exemplo(certa))} respeita todas as regras. ` +
      `Nenhum dos outros aparece nessa posição em fila válida alguma.${tentador !== undefined ? esquecidaPt(tentador) : ''}`
    en =
      `${correta} could be ${posEn}: the line ${fila(exemplo(certa))} respects every rule. None of the ` +
      `others appears in that position in any valid line.${tentador !== undefined ? esquecidaEn(tentador) : ''}`
  } else if (pergunta === 'cannot') {
    const fora = [...Array(n).keys()].filter((p) => !S.has(p))
    if (fora.length === 0 || S.size < OPCOES_POR_QUESTAO - 1) return null
    const certa = rng.pick(fora)
    const distratores = rng.shuffle([...S]).slice(0, OPCOES_POR_QUESTAO - 1)
    correta = nomes[certa]!
    opcoes = [correta, ...distratores.map((p) => nomes[p]!)]
    perguntaTexto = `${se}who CANNOT be ${posEn}?`
    const outro = distratores[0]!
    pt =
      `${correta} nunca é o ${posPt}${sePt} numa fila que respeite as regras. Cada um dos outros aparece ` +
      `ali em alguma fila válida — ${nomes[outro]}, por exemplo, em ${fila(exemplo(outro))}.`
    en =
      `${correta} is never ${posEn} in a line that respects the rules. Each of the others appears there in ` +
      `some valid line — ${nomes[outro]}, for example, in ${fila(exemplo(outro))}.`
  } else {
    if (S.size < 2 || S.size > n - 2) return null
    const lista = (ps: Iterable<number>) =>
      [...ps]
        .map((p) => nomes[p]!)
        .sort()
        .join(', ')
    const chave = (ps: Set<number>) => lista(ps)
    const candidatas: Set<number>[] = []
    // 1. o conjunto de quem esquece uma regra (o erro mais comum)
    for (const e of rng.shuffle(esquecidas)) if (e.extra.length > 0) candidatas.push(e.possiveis)
    // 2. faltou um (achou uma fila e parou de procurar)
    for (const y of rng.shuffle([...S])) candidatas.push(new Set([...S].filter((p) => p !== y)))
    // 3. sobrou um / trocou um
    const fora = rng.shuffle([...Array(n).keys()].filter((p) => !S.has(p)))
    for (const x of fora) candidatas.push(new Set([...S, x]))
    for (const x of fora) {
      const y = rng.pick([...S])
      candidatas.push(new Set([...[...S].filter((p) => p !== y), x]))
    }
    const vistas = new Set([chave(S)])
    const distratores: string[] = []
    for (const c of candidatas) {
      if (distratores.length >= OPCOES_POR_QUESTAO - 1) break
      if (c.size === 0) continue
      const t = chave(c)
      if (vistas.has(t)) continue
      vistas.add(t)
      distratores.push(t)
    }
    if (distratores.length < OPCOES_POR_QUESTAO - 1) return null
    correta = lista(S)
    opcoes = [correta, ...distratores]
    perguntaTexto = `${se}which list includes everyone who could be ${posEn}?`
    const um = [...S][0]!
    const tentador = [...extraPorPessoa.keys()][0]
    pt =
      `Podem ser o ${posPt}${sePt}: ${correta} — cada um em alguma fila válida (${nomes[um]}, por exemplo, em ` +
      `${fila(exemplo(um))}), e ninguém mais.${tentador !== undefined ? esquecidaPt(tentador) : ''}`
    en =
      `Those who could be ${posEn}: ${correta} — each in some valid line (${nomes[um]}, for example, in ` +
      `${fila(exemplo(um))}), and nobody else.${tentador !== undefined ? esquecidaEn(tentador) : ''}`
  }

  // Cabeçalho curto: o enunciado inteiro tem de caber com as 5 alternativas
  // numa tela de notebook a 150% (1269×545) sem rolagem.
  const cabecalho = `In a line (1st = front): ${nomes.join(', ')}.`
  const q = perguntaTexto.charAt(0).toUpperCase() + perguntaTexto.slice(1)
  const stem = [cabecalho, ...regras.map((r) => renderRegra(r, nomes, n)), q].join('\n')

  return { stem, opcoes, correta, explicacao: { pt, en } }
}

export const gerarOrdenacao: VerbalGenerator = (seed, difficulty) => {
  // O nível entra na seed: níveis vizinhos têm a mesma estrutura, e a mesma
  // seed daria a MESMA questão rotulada com duas dificuldades.
  const rng = mulberry32(seed + difficulty * 100_003)
  let montada: Montada | null = null
  for (let tentativa = 0; tentativa < 400 && !montada; tentativa++) montada = montar(rng, difficulty)
  if (!montada) throw new Error(`não consegui montar ordenação no nível ${difficulty}`)

  const { opcoes, correta } = montada
  const marcados = rng.shuffle(opcoes.map((text) => ({ text, certa: text === correta })))
  const options = marcados.map((m, i) => ({ id: optionIdAt(i) as string, text: m.text }))
  const answerId = optionIdAt(marcados.findIndex((m) => m.certa)) as string

  return {
    subtipo: 'ordenacao',
    stem: montada.stem,
    options,
    answerId,
    explanation: {
      pt:
        `${montada.explicacao.pt} Método: comece pelas regras rígidas (posição fixa, "right in front of"), ` +
        `aplique a hipótese da pergunta e só então teste as alternativas. "Could" pede UMA fila válida; ` +
        `"must", todas.`,
      en:
        `${montada.explicacao.en} Method: start with the rigid rules (fixed position, "right in front of"), ` +
        `apply the question's supposition, and only then test the options. "Could" needs ONE valid line; ` +
        `"must" needs all of them.`,
    },
    satisfiesRule: (texto: string) => texto === correta,
  } satisfies VerbalGenerated
}
