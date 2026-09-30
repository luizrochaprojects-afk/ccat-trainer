import { normalizeText, questionSchema, type Question } from '../schema'
import { comparacaoDe, evaluateExpression, parseNumber, toleranciaDe } from '../math/solver'
import { lerSerieDeLetras } from '../math/alfabeto'
import { runGenerator } from '../generators'
import {
  acceptsVerification,
  opcoesDoSubtipo,
  RESPOSTA_CITADA_NO_ENUNCIADO,
  verificationMethodsOf,
  type AnySubtipo,
  type Tipo,
} from '../taxonomy'

/**
 * Os cinco gates do PRD §4.13.
 *
 * Função pura: recebe os drafts e o banco já aprovado, devolve o veredito de
 * cada questão. Os scripts só fazem I/O em volta disto — assim o gate é
 * testável com fixture quebrada de propósito, que é a única forma de saber que
 * ele de fato barra alguma coisa.
 */

export type GateId = 'G1_schema' | 'G2_gabarito' | 'G3_dificuldade' | 'G4_dedup' | 'G5_alternativas'

export interface Violation {
  gate: GateId
  questionId: string
  message: string
}

export interface GateResult {
  approved: Question[]
  rejected: { question: Question; violations: Violation[] }[]
  violations: Violation[]
}

/** Limiar de quase-duplicata por Jaccard de trigramas. */
export const NEAR_DUPLICATE_THRESHOLD = 0.85

export function runGates(drafts: unknown[], approvedBank: Question[] = []): GateResult {
  const approved: Question[] = []
  const rejected: GateResult['rejected'] = []
  const violations: Violation[] = []

  // Assinaturas já existentes, para o gate de dedup. Cresce conforme aprova,
  // então duas questões idênticas DENTRO do mesmo lote também colidem.
  const assinaturas = new Map<string, string>()
  const trigramasVistos: { id: string; grams: Set<string>; resposta: string }[] = []

  for (const bruto of approvedBank) {
    assinaturas.set(dedupSignature(bruto), bruto.id)
    if (ehTextual(bruto)) {
      trigramasVistos.push({ id: bruto.id, grams: trigrams(bruto.stem), resposta: respostaDe(bruto) })
    }
  }

  for (const bruto of drafts) {
    const locais: Violation[] = []

    // --- G1: schema -----------------------------------------------------
    const parsed = questionSchema.safeParse(bruto)
    if (!parsed.success) {
      const id = idDe(bruto)
      for (const issue of parsed.error.issues) {
        locais.push({
          gate: 'G1_schema',
          questionId: id,
          message: `${issue.path.join('.') || '(raiz)'}: ${issue.message}`,
        })
      }
      violations.push(...locais)
      rejected.push({ question: bruto as Question, violations: locais })
      continue
    }

    const q = parsed.data as Question

    // --- G5: alternativas ------------------------------------------------
    locais.push(...gateAlternativas(q))

    // --- G3: dificuldade -------------------------------------------------
    locais.push(...gateDificuldade(q))

    // --- G2: gabarito ----------------------------------------------------
    locais.push(...gateGabarito(q))

    // --- G4: dedup -------------------------------------------------------
    locais.push(...gateDedup(q, assinaturas, trigramasVistos))

    if (locais.length > 0) {
      violations.push(...locais)
      rejected.push({ question: q, violations: locais })
      continue
    }

    assinaturas.set(dedupSignature(q), q.id)
    if (ehTextual(q)) {
      trigramasVistos.push({ id: q.id, grams: trigrams(q.stem), resposta: respostaDe(q) })
    }
    approved.push({ ...q, status: 'approved' })
  }

  return { approved, rejected, violations }
}

// --- G5 ----------------------------------------------------------------------

function gateAlternativas(q: Question): Violation[] {
  const v: Violation[] = []
  const add = (message: string) => v.push({ gate: 'G5_alternativas', questionId: q.id, message })

  // Formato fixo de 3 (True/False/Uncertain) é exato; o resto aceita 4 ou 5.
  const doSubtipo = opcoesDoSubtipo(q.subtipo)
  if (doSubtipo < 4 ? q.options.length !== doSubtipo : q.options.length < 4 || q.options.length > 5) {
    add(`esperado ${doSubtipo < 4 ? doSubtipo : '4 ou 5'} alternativas, veio ${q.options.length}`)
  }

  const corretas = q.options.filter((o) => o.id === q.answerId)
  if (corretas.length !== 1) {
    add(`answerId "${q.answerId}" casa com ${corretas.length} alternativas`)
  }

  const textos = q.options.map((o) => o.text).filter((t): t is string => Boolean(t))
  const normalizados = textos.map(normalizeText)
  if (new Set(normalizados).size !== normalizados.length) {
    add('há alternativas textuais equivalentes depois de normalizar')
  }
  if (normalizados.some((t) => t.length === 0)) {
    add('alternativa vazia depois de normalizar')
  }

  // Distratores precisam ser plausíveis: numa questão numérica, todos os
  // valores devem ser do mesmo tipo (nada de "nenhuma das anteriores").
  const numericos = textos.filter((t) => podeSerNumero(t))
  if (numericos.length > 0 && numericos.length !== textos.length) {
    add('mistura alternativas numéricas com alternativas textuais')
  }

  return v
}

// --- G3 ----------------------------------------------------------------------

function gateDificuldade(q: Question): Violation[] {
  const v: Violation[] = []
  // A faixa 1..5 já é garantida pelo schema; o que resta checar é o número de
  // alternativas, que na prova real é 5 (3 em verdadeiro/falso/incerto).
  // Questão de fora mantém as alternativas da fonte.
  const esperado = opcoesDoSubtipo(q.subtipo)
  const gerada = q.origin === 'claude-code' && q.verification.method !== 'second-model'
  if (gerada && q.options.length !== esperado) {
    v.push({
      gate: 'G3_dificuldade',
      questionId: q.id,
      message: `deveria ter ${esperado} alternativas, tem ${q.options.length}`,
    })
  }
  return v
}

// --- G2 ----------------------------------------------------------------------

function gateGabarito(q: Question): Violation[] {
  const v: Violation[] = []
  const add = (message: string) => v.push({ gate: 'G2_gabarito', questionId: q.id, message })

  // Figura importada não tem gerador que a reproduza: o gabarito dela só pode
  // ser conferido por um segundo modelo resolvendo às cegas. A exceção vale só
  // para o que veio de fora — espacial gerada continua exigindo a regra.
  const importadaSemGerador =
    q.origin !== 'claude-code' && q.tipo === 'spatial' && q.verification.method === 'second-model'

  if (
    !importadaSemGerador &&
    !acceptsVerification(q.tipo as Tipo, q.verification.method, q.subtipo)
  ) {
    const aceitos = verificationMethodsOf(q.tipo as Tipo, q.subtipo).join(' ou ')
    add(`${q.tipo}/${q.subtipo} aceita verificação ${aceitos}, veio "${q.verification.method}"`)
    return v
  }

  if (q.verification.method === 'second-model') {
    if (!q.verification.model) add('verificação por segundo modelo sem identificar o modelo')
    if (!q.verification.modelAnswerId) add('segundo modelo não registrou resposta')
    else if (q.verification.modelAnswerId !== q.answerId) {
      add(
        `segundo modelo respondeu "${q.verification.modelAnswerId}", gabarito diz "${q.answerId}"`,
      )
    }
    return v
  }

  // Caminho 1: re-executar o gerador determinístico. Matemática importada não
  // tem gerador — a prova do gabarito dela é só a expressão, no caminho 2.
  const soExpressao = q.origin !== 'claude-code' && q.verification.method === 'solver'
  if (!soExpressao) {
    const { seed, generator } = q.verification
    if (seed === undefined || !generator) {
      add('verificação por regra sem seed ou sem gerador — não dá para reproduzir')
      return v
    }

    let regerada
    try {
      regerada = runGenerator(generator, seed, q.difficulty)
    } catch (erro) {
      add(`não consegui re-executar o gerador: ${(erro as Error).message}`)
      return v
    }

    if (regerada.answerId !== q.answerId) {
      add(`re-execução deu gabarito "${regerada.answerId}", arquivo diz "${q.answerId}"`)
    }
    if (regerada.stem !== q.stem) {
      add('re-execução produziu enunciado diferente — o arquivo foi editado à mão')
    }
    if (JSON.stringify(regerada.options) !== JSON.stringify(q.options)) {
      add('re-execução produziu alternativas diferentes — o arquivo foi editado à mão')
    }
  }

  // Caminho 2 (solver): avaliar a expressão canônica, independente do gerador.
  if (q.verification.method === 'solver') {
    const { expression } = q.verification
    if (!expression) {
      add('método "solver" exige a expressão canônica')
      return v
    }
    let valor: number
    try {
      valor = evaluateExpression(expression)
    } catch (erro) {
      add(`expressão inválida: ${(erro as Error).message}`)
      return v
    }
    const marcada = q.options.find((o) => o.id === q.answerId)
    const texto = marcada?.text
    if (!texto) {
      add('alternativa marcada não tem texto para comparar com a expressão')
      return v
    }
    let exibido: number
    try {
      exibido = parseNumber(texto)
    } catch {
      add(`alternativa marcada "${texto}" não é um número legível`)
      return v
    }

    // Comparação ("qual é o menor?"): as alternativas são os próprios operandos
    // de min/max/nearest, escritos por extenso — ali não há arredondamento, e a
    // comparação é exata. Em conta, o texto pode ser o valor arredondado.
    const comparacao = comparacaoDe(expression)
    const tolerancia = (t: string) => (comparacao ? 1e-9 : toleranciaDe(t))

    if (Math.abs(exibido - valor) > tolerancia(texto)) {
      add(`expressão "${expression}" vale ${valor}, mas a alternativa marcada diz ${exibido}`)
    }

    // Só UMA alternativa pode valer a resposta. "0.5" e "1/2" são textos
    // diferentes — o G5 não os pega —, mas seriam dois gabaritos.
    const valendo = q.options.filter((o) => {
      if (!o.text || !podeSerNumero(o.text)) return false
      return Math.abs(parseNumber(o.text) - valor) <= tolerancia(o.text)
    })
    if (valendo.length > 1) {
      add(`${valendo.length} alternativas valem ${valor}: ${valendo.map((o) => o.text).join(', ')}`)
    }

    // E a expressão de comparação só prova o gabarito se os candidatos dela
    // forem exatamente as alternativas. Sem isso, `min(1, 2)` aprovaria
    // qualquer alternativa que valesse 1.
    if (comparacao) v.push(...candidatosSaoAsAlternativas(q, comparacao.candidatos))
  }

  // Série de letras: o segundo caminho é o leitor, que reconstrói a regra só a
  // partir do enunciado. Ele precisa fechar com uma resposta única, e ela tem de
  // ser a marcada.
  if (q.subtipo === 'serie_letras') {
    const leituras = lerSerieDeLetras(q.stem)
    const marcada = q.options.find((o) => o.id === q.answerId)?.text
    if (leituras.length === 0) add('o leitor de séries de letras não achou regra no enunciado')
    else if (leituras.length > 1) add(`a série de letras tem mais de uma leitura: ${leituras.join(', ')}`)
    else if (leituras[0] !== marcada) {
      add(`o leitor de séries de letras prevê "${leituras[0]}", a alternativa marcada diz "${marcada}"`)
    }
  }

  // O enunciado não pode entregar a resposta — exceto onde citá-la é o formato.
  const marcada = q.options.find((o) => o.id === q.answerId)
  const citada = RESPOSTA_CITADA_NO_ENUNCIADO.includes(q.subtipo as AnySubtipo)
  if (!citada && marcada?.text && normalizeText(q.stem).includes(` ${normalizeText(marcada.text)} `)) {
    add('o enunciado contém a resposta')
  }

  return v
}

function candidatosSaoAsAlternativas(q: Question, candidatos: number[]): Violation[] {
  const falha = (message: string): Violation[] => [{ gate: 'G2_gabarito', questionId: q.id, message }]
  const textos = q.options.map((o) => o.text)
  if (textos.some((t) => !t || !podeSerNumero(t))) {
    return falha('questão de comparação com alternativa que não é número')
  }
  if (candidatos.length !== textos.length) {
    return falha(`a expressão compara ${candidatos.length} valores, a questão tem ${textos.length} alternativas`)
  }
  const restantes = [...candidatos]
  for (const t of textos as string[]) {
    const i = restantes.findIndex((c) => Math.abs(c - parseNumber(t)) < 1e-9)
    if (i < 0) return falha(`a alternativa "${t}" não está entre os candidatos da expressão`)
    restantes.splice(i, 1)
  }
  return []
}

// --- G4 ----------------------------------------------------------------------

function gateDedup(
  q: Question,
  assinaturas: Map<string, string>,
  vistos: { id: string; grams: Set<string>; resposta: string }[],
): Violation[] {
  const v: Violation[] = []

  const exato = assinaturas.get(dedupSignature(q))
  if (exato) {
    return [{ gate: 'G4_dedup', questionId: q.id, message: `questão idêntica à de "${exato}"` }]
  }

  // Quase-duplicata só faz sentido em questão textual. Numa questão gráfica o
  // enunciado é boilerplate ("Qual figura completa a sequência?") e a
  // similaridade de trigramas daria 1,00 entre questões completamente
  // diferentes — reprovaria o banco espacial inteiro.
  if (!ehTextual(q)) return v

  // E só faz sentido em conteúdo ESCRITO, não gerado por regra.
  //
  // O gate difuso existe para pegar paráfrase: a mesma questão reescrita com
  // outras palavras, risco real em conteúdo redigido por modelo. Conteúdo
  // gerado por regra é templated por natureza — dois silogismos de formas
  // lógicas diferentes ("All A are B. No B are C." vs "No C are B. All A are B.")
  // batem 0,95 de similaridade e concluem a mesma coisa, mas testam raciocínios
  // distintos. Aqui a identidade exata (enunciado + alternativas) é precisa, e
  // o difuso só produz falso positivo.
  if (q.verification.method !== 'second-model') return v

  const grams = trigrams(q.stem)
  const resposta = respostaDe(q)

  for (const outro of vistos) {
    const sim = jaccard(grams, outro.grams)
    if (sim < NEAR_DUPLICATE_THRESHOLD) continue

    // Texto parecido + resposta diferente = mesmo template com outros números.
    // Isso é conteúdo legítimo: a pessoa refaz a conta, não relembra a resposta.
    // Texto parecido + MESMA resposta = a mesma questão reescrita, que é o que
    // este gate existe para pegar (principalmente em conteúdo gerado por LLM).
    if (outro.resposta !== resposta) continue

    v.push({
      gate: 'G4_dedup',
      questionId: q.id,
      message: `quase-duplicata de "${outro.id}" (similaridade ${sim.toFixed(2)}, mesma resposta)`,
    })
    break
  }

  return v
}

function respostaDe(q: Question): string {
  const marcada = q.options.find((o) => o.id === q.answerId)
  return marcada?.text ? normalizeText(marcada.text) : `#${q.answerId}`
}

/**
 * Identidade de uma questão para fins de duplicata.
 *
 * Em questão textual, o enunciado basta. Em questão gráfica, o enunciado é
 * sempre o mesmo — a identidade está nas figuras, então elas entram na
 * assinatura. Questão de comparação ("Which of the following numbers is the
 * smallest?") é o mesmo caso em texto: o enunciado se repete e a questão está
 * no conjunto de alternativas — que entra ordenado, porque a mesma lista
 * embaralhada de outro jeito é a mesma questão.
 */
export function dedupSignature(q: Question): string {
  const partes: string[] = [normalizeText(q.stem)]
  if (q.stemSpatial) partes.push(JSON.stringify(q.stemSpatial))
  if (q.options.some((o) => o.spatial)) {
    partes.push(JSON.stringify(q.options.map((o) => o.spatial ?? o.text)))
  }
  if (ehComparacao(q)) {
    partes.push(JSON.stringify(q.options.map((o) => normalizeText(o.text ?? '')).sort()))
  }
  return partes.join('|')
}

function ehComparacao(q: Question): boolean {
  const { expression } = q.verification
  if (!expression) return false
  try {
    return comparacaoDe(expression) !== null
  } catch {
    return false
  }
}

/** Questão cuja identidade está no texto, e não numa figura. */
function ehTextual(q: Question): boolean {
  return !q.stemSpatial && !q.options.some((o) => o.spatial)
}

export function trigrams(texto: string): Set<string> {
  const limpo = ` ${normalizeText(texto)} `
  const out = new Set<string>()
  for (let i = 0; i + 3 <= limpo.length; i++) out.add(limpo.slice(i, i + 3))
  return out
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let intersecao = 0
  for (const g of a) if (b.has(g)) intersecao++
  return intersecao / (a.size + b.size - intersecao)
}

// --- Utilitários -------------------------------------------------------------

function idDe(bruto: unknown): string {
  if (bruto && typeof bruto === 'object' && 'id' in bruto && typeof bruto.id === 'string') {
    return bruto.id
  }
  return '(sem id)'
}

function podeSerNumero(texto: string): boolean {
  try {
    parseNumber(texto)
    return true
  } catch {
    return false
  }
}
