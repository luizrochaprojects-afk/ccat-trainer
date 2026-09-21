import { mulberry32, type Rng } from '../rng'
import { optionIdAt } from '../optionIds'
import type { Difficulty } from '../taxonomy'
import { pick, type LocalizedText } from '../i18n'
import {
  ANALOGY_PAIRS,
  LOGIC_TERMS,
  RELATION_LABEL,
  SENTENCE_FRAMES,
  VOCAB,
  forbiddenFor,
  pairsOfRelation,
  type AnalogyPair,
  type VocabEntry,
} from './lexicon'
import {
  allStatements,
  entails,
  renderStatement,
  sameStatement,
  VALID_FORMS,
  type Statement,
} from './syllogism'

/**
 * Geradores verbais a partir do léxico curado.
 *
 * Conteúdo em inglês (a CCAT é aplicada em inglês), explicações em português.
 *
 * O gabarito é derivado do léxico (analogia e vocabulário) ou de prova lógica
 * (silogismo) — nunca de julgamento. Cada gerador expõe `satisfiesRule` para o
 * gate auditar alternativa por alternativa, igual aos espaciais.
 */

export interface VerbalGenerated {
  subtipo: string
  stem: string
  options: { id: string; text: string }[]
  answerId: string
  explanation: LocalizedText
  /** a regra, para auditoria: quantas alternativas a satisfazem? */
  satisfiesRule: (texto: string) => boolean
}

export type VerbalGenerator = (seed: number, difficulty: Difficulty) => VerbalGenerated

const optionCountFor = (d: Difficulty): number => (d <= 2 ? 4 : 5)

// --- Analogias ---------------------------------------------------------------

export const gerarAnalogia: VerbalGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const subtipo = difficulty >= 4 ? 'analogia_dupla' : 'analogia_simples'

  const base = escolherPar(rng, difficulty)
  // A resposta também precisa respeitar o nível: de nada adianta calibrar os
  // distratores se o gabarito de uma questão nível 1 for "decanter is to wine".
  const mesmaRelacao = noNivelOuAbaixo(
    pairsOfRelation(base.relation).filter((p) => !(p.a === base.a && p.b === base.b)),
    difficulty,
    (p) => p.level,
    1,
  )
  const correta = rng.pick(mesmaRelacao)

  // Só entra como distrator um par de OUTRA relação — dois pares da mesma
  // relação seriam duas respostas certas.
  //
  // E o distrator não pode ser mais difícil que a questão: um nível 1 com
  // "exculpate is to incriminate" entre as alternativas não é nível 1, por mais
  // simples que seja o enunciado. A dificuldade tem de estar na RELAÇÃO, não em
  // palavras que o candidato não conhece.
  const outras = noNivelOuAbaixo(
    ANALOGY_PAIRS.filter((p) => p.relation !== base.relation),
    difficulty,
    (p) => p.level,
  )

  const satisfiesRule = (texto: string) => {
    const par = ANALOGY_PAIRS.find((p) => formatPar(p) === texto)
    return par?.relation === base.relation
  }

  const escolhidas = [correta]
  const usadas = new Set([formatPar(correta)])
  let guard = 0
  while (escolhidas.length < optionCountFor(difficulty)) {
    if (guard++ > 500) throw new Error('não consegui montar distratores de analogia')
    const cand = rng.pick(outras)
    const chave = formatPar(cand)
    if (usadas.has(chave)) continue
    usadas.add(chave)
    escolhidas.push(cand)
  }

  const { options, answerId } = embaralhar(rng, escolhidas.map(formatPar))

  return {
    subtipo,
    stem: `${base.a.toUpperCase()} is to ${base.b.toUpperCase()} as:`,
    options,
    answerId,
    explanation: {
      pt:
        `A relação é **${pick(RELATION_LABEL[base.relation]!, 'pt')}**: ${base.a} → ` +
        `${base.b}. A alternativa correta (${correta.a} → ${correta.b}) é a única que ` +
        `repete essa mesma relação. O método é sempre o mesmo: monte uma frase que ligue ` +
        `as duas palavras do enunciado e teste essa frase em cada alternativa. Se a frase ` +
        `não encaixa, elimine.`,
      en:
        `The relation is **${pick(RELATION_LABEL[base.relation]!, 'en')}**: ${base.a} → ` +
        `${base.b}. The correct option (${correta.a} → ${correta.b}) is the only one that ` +
        `repeats it. The method never changes: build a sentence linking the two words in ` +
        `the prompt, then read that sentence with each option in place. If it does not ` +
        `hold, eliminate.`,
    },
    satisfiesRule,
  }
}

function escolherPar(rng: Rng, difficulty: Difficulty): AnalogyPair {
  const noNivel = ANALOGY_PAIRS.filter(
    (p) => p.level === difficulty && pairsOfRelation(p.relation).length >= 2,
  )
  return rng.pick(noNivel.length > 0 ? noNivel : ANALOGY_PAIRS)
}

const formatPar = (p: AnalogyPair): string => `${p.a} is to ${p.b}`

// --- Vocabulário -------------------------------------------------------------

export const gerarAntonimo: VerbalGenerator = (seed, difficulty) =>
  gerarVocabOposicao(seed, difficulty, 'antonimo')

export const gerarSinonimo: VerbalGenerator = (seed, difficulty) =>
  gerarVocabOposicao(seed, difficulty, 'sinonimo')

function gerarVocabOposicao(
  seed: number,
  difficulty: Difficulty,
  subtipo: 'antonimo' | 'sinonimo',
): VerbalGenerated {
  const rng = mulberry32(seed)
  const entry = escolherVerbete(rng, difficulty)

  const alvo = subtipo === 'antonimo' ? entry.antonyms : entry.synonyms
  const armadilhas = subtipo === 'antonimo' ? entry.synonyms : entry.antonyms
  const correta = rng.pick(alvo)

  // Uma palavra é resposta certa se está na lista-alvo do verbete.
  const satisfiesRule = (texto: string) => alvo.includes(texto)

  const escolhidas = [correta]
  const usadas = new Set([correta])

  // 1. A armadilha clássica: sob pressão, muita gente lê "antônimo" e marca
  //    um sinônimo (e vice-versa).
  for (const armadilha of rng.shuffle(armadilhas).slice(0, 2)) {
    if (escolhidas.length >= optionCountFor(difficulty)) break
    if (usadas.has(armadilha)) continue
    usadas.add(armadilha)
    escolhidas.push(armadilha)
  }

  // 2. O resto vem de OUTROS clusters semânticos — nunca de palavra vizinha,
  //    que poderia ser uma segunda resposta defensável.
  const proibidas = forbiddenFor(entry)
  const preenchimento = noNivelOuAbaixo(
    VOCAB.filter((o) => o.cluster !== entry.cluster),
    difficulty,
    (o) => o.level,
  ).flatMap((o) => [o.word, ...o.synonyms])

  let guard = 0
  while (escolhidas.length < optionCountFor(difficulty)) {
    if (guard++ > 800) throw new Error(`não consegui montar distratores para "${entry.word}"`)
    const cand = rng.pick(preenchimento)
    if (usadas.has(cand) || proibidas.has(cand)) continue
    usadas.add(cand)
    escolhidas.push(cand)
  }

  const { options, answerId } = embaralhar(rng, escolhidas)
  const rotulo = subtipo === 'antonimo' ? 'OPPOSITE' : 'SIMILAR'

  return {
    subtipo,
    stem: `Which word is most nearly ${rotulo} in meaning to "${entry.word.toUpperCase()}"?`,
    options,
    answerId,
    explanation:
      subtipo === 'antonimo'
        ? {
            pt:
              `"${entry.word}" significa algo próximo de "${entry.synonyms[0]}". O oposto ` +
              `é "${correta}". Repare que "${armadilhas[0]}" também está entre as ` +
              `alternativas: é sinônimo, não antônimo — a pegadinha mais comum da prova é ` +
              `marcar o sinônimo por ler o enunciado rápido demais. Leia OPPOSITE antes de ` +
              `olhar as opções.`,
            en:
              `"${entry.word}" means something close to "${entry.synonyms[0]}". Its ` +
              `opposite is "${correta}". Note that "${armadilhas[0]}" is also among the ` +
              `options: it is a synonym, not an antonym — the most common trap on the test ` +
              `is picking the synonym after skimming the prompt. Read OPPOSITE before you ` +
              `look at the options.`,
          }
        : {
            pt:
              `"${entry.word}" significa algo próximo de "${correta}". Cuidado com ` +
              `"${armadilhas[0]}", que é o antônimo e está ali justamente para quem lê o ` +
              `enunciado no automático. Confirme se a pergunta pede SIMILAR ou OPPOSITE ` +
              `antes de escolher.`,
            en:
              `"${entry.word}" means something close to "${correta}". Watch out for ` +
              `"${armadilhas[0]}": it is the antonym, placed there precisely for whoever ` +
              `reads on autopilot. Confirm whether the question asks for SIMILAR or ` +
              `OPPOSITE before choosing.`,
          },
    satisfiesRule,
  }
}

function escolherVerbete(rng: Rng, difficulty: Difficulty): VocabEntry {
  const noNivel = VOCAB.filter((e) => e.level === difficulty)
  return rng.pick(noNivel.length > 0 ? noNivel : VOCAB)
}

// --- Completar frase ---------------------------------------------------------

export const gerarCompletarFrase: VerbalGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const noNivel = SENTENCE_FRAMES.filter((f) => f.level === difficulty)
  const frame = rng.pick(noNivel.length > 0 ? noNivel : SENTENCE_FRAMES)

  const satisfiesRule = (texto: string) => texto === frame.answer

  const escolhidas = [frame.answer, ...rng.shuffle(frame.distractors)].slice(
    0,
    optionCountFor(difficulty),
  )
  const { options, answerId } = embaralhar(rng, escolhidas)

  return {
    subtipo: 'completar_frase',
    stem: frame.frame,
    options,
    answerId,
    explanation: {
      pt:
        `A resposta é "${frame.answer}". ${frame.rationale.pt} ` +
        `Regra geral: antes de olhar as alternativas, decida que TIPO de palavra a frase ` +
        `pede (positiva ou negativa, forte ou fraca). Conectivos como "although", ` +
        `"despite" e os dois-pontos são o que denuncia isso.`,
      en:
        `The answer is "${frame.answer}". ${frame.rationale.en} ` +
        `General rule: before looking at the options, decide what KIND of word the ` +
        `sentence needs (positive or negative, strong or weak). Connectives such as ` +
        `"although" and "despite", and the colon, are what give it away.`,
    },
    satisfiesRule,
  }
}

// --- Lógica verbal -----------------------------------------------------------

export const gerarDeducao: VerbalGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)

  const candidatas = VALID_FORMS.filter((f) => f.level === difficulty)
  const forma = rng.pick(candidatas.length > 0 ? candidatas : VALID_FORMS)

  // Níveis altos usam termos inventados: com categorias reais dá para acertar
  // por conhecimento de mundo, que é justamente o que a questão não mede.
  const pool = difficulty >= 3 ? LOGIC_TERMS.inventados : LOGIC_TERMS.concretos
  const termos = [...rng.pick(pool as unknown as string[][])]

  const satisfiesRule = (texto: string) => {
    const s = allStatements().find((st) => renderStatement(st, termos) === texto)
    return s !== undefined && entails(forma.premises, s)
  }

  // Distratores: afirmações que NÃO se seguem — cada uma com contramodelo.
  const naoSeguem = allStatements().filter(
    (s) => !sameStatement(s, forma.conclusion) && !entails(forma.premises, s),
  )

  const escolhidas: Statement[] = [forma.conclusion]
  const usadas = new Set([renderStatement(forma.conclusion, termos)])
  let guard = 0
  while (escolhidas.length < optionCountFor(difficulty)) {
    if (guard++ > 500) throw new Error('não consegui montar distratores de silogismo')
    const cand = rng.pick(naoSeguem)
    const texto = renderStatement(cand, termos)
    if (usadas.has(texto)) continue
    usadas.add(texto)
    escolhidas.push(cand)
  }

  const { options, answerId } = embaralhar(
    rng,
    escolhidas.map((s) => renderStatement(s, termos)),
  )

  const premissas = forma.premises.map((p) => renderStatement(p, termos)).join(' ')

  return {
    subtipo: 'deducao',
    stem: `${premissas}\n\nWhich of the following must be true?`,
    options,
    answerId,
    explanation: {
      pt:
        `A conclusão correta é "${renderStatement(forma.conclusion, termos)}". ` +
        `As demais podem até ser verdadeiras em algum cenário, mas não são ` +
        `**obrigatórias** — existe um caso em que as premissas valem e elas falham. ` +
        `A armadilha campeã é inverter os termos ("All X are Y" não dá "All Y are X") ` +
        `e concluir "Some" a partir só de "All": dizer que todos os X são Y não garante ` +
        `que exista algum X. Desenhe dois círculos e teste.`,
      en:
        `The correct conclusion is "${renderStatement(forma.conclusion, termos)}". ` +
        `The others may well be true in some scenario, but they are not **necessary** — ` +
        `there is a case where the premises hold and they fail. The champion trap is ` +
        `flipping the terms ("All X are Y" does not give "All Y are X") and concluding ` +
        `"Some" from "All" alone: saying every X is a Y does not guarantee that any X ` +
        `exists. Draw two circles and test it.`,
    },
    satisfiesRule,
  }
}

// --- Registro ----------------------------------------------------------------

export const VERBAL_GENERATORS = {
  analogia: gerarAnalogia,
  antonimo: gerarAntonimo,
  sinonimo: gerarSinonimo,
  completar_frase: gerarCompletarFrase,
  deducao: gerarDeducao,
} as const satisfies Record<string, VerbalGenerator>

export type VerbalGeneratorId = keyof typeof VERBAL_GENERATORS
export const VERBAL_GENERATOR_IDS = Object.keys(VERBAL_GENERATORS) as VerbalGeneratorId[]

// --- Infra -------------------------------------------------------------------

/**
 * Filtra candidatos a distrator para que não sejam mais difíceis que a questão.
 *
 * Alarga a faixa em um nível de cada vez até ter candidatos suficientes — num
 * nível 1 o pool é pequeno, e travar a geração seria pior do que admitir um
 * distrator um nível acima.
 */
function noNivelOuAbaixo<T>(
  itens: T[],
  difficulty: Difficulty,
  nivelDe: (t: T) => number,
  minimo = 8,
): T[] {
  for (let teto = difficulty; teto <= 5; teto++) {
    const filtrados = itens.filter((t) => nivelDe(t) <= teto)
    if (filtrados.length >= minimo) return filtrados
  }
  return itens
}

/** Embaralha mantendo o rastro de qual alternativa é a correta (índice 0). */
function embaralhar(
  rng: Rng,
  textos: string[],
): { options: { id: string; text: string }[]; answerId: string } {
  const marcados = rng.shuffle(textos.map((text, i) => ({ text, isCorrect: i === 0 })))
  return {
    options: marcados.map((m, i) => ({ id: optionIdAt(i) as string, text: m.text })),
    answerId: optionIdAt(marcados.findIndex((m) => m.isCorrect)) as string,
  }
}
