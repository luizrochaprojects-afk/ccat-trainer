import { mulberry32, type Rng } from '../rng'
import { optionIdAt } from '../optionIds'
import type { Difficulty } from '../taxonomy'
import { pick, type LocalizedText } from '../i18n'
import {
  ANALOGY_PAIRS,
  LOGIC_TERMS,
  RELATION_FAMILY,
  RELATION_LABEL,
  SENTENCE_FRAMES,
  VOCAB,
  areConfusable,
  forbiddenFor,
  neighborsOf,
  pairsOfRelation,
  type AnalogyPair,
  type VocabEntry,
  type VocabSubtipo,
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
  const doEnunciado = (p: AnalogyPair) =>
    p.a === base.a || p.a === base.b || p.b === base.a || p.b === base.b

  // A resposta também precisa respeitar o nível: de nada adianta calibrar os
  // distratores se o gabarito de uma questão nível 1 for "decanter is to wine" —
  // nem um nível 5 com gabarito "expand is to contract". E não divide palavra
  // com o enunciado: EWER : WATER com gabarito "reservoir is to water" se
  // resolve pela superfície.
  const mesmaRelacao = pertoDoNivel(
    pairsOfRelation(base.relation).filter((p) => p !== base && !doEnunciado(p)),
    difficulty,
    (p) => p.level,
    1,
  )
  const correta = rng.pick(mesmaRelacao)

  // Só entra como distrator um par de OUTRA relação — dois pares da mesma
  // relação seriam duas respostas certas — e nunca de relação que se confunde
  // com a do enunciado (ver CONFUSABLE_RELATIONS).
  //
  // E o distrator não pode ser mais difícil que a questão: um nível 1 com
  // "exculpate is to incriminate" entre as alternativas não é nível 1, por mais
  // simples que seja o enunciado. A dificuldade tem de estar na RELAÇÃO, não em
  // palavras que o candidato não conhece.
  const outras = noNivelOuAbaixo(
    ANALOGY_PAIRS.filter(
      (p) => p.relation !== base.relation && !areConfusable(p.relation, base.relation),
    ),
    difficulty,
    (p) => p.level,
  )

  // Distrator bom se parece com o enunciado. Em ordem de preferência:
  // 1. divide uma palavra com o ENUNCIADO ("decanter : wine" diante de GRAPE :
  //    WINE) — quem casa pela superfície cai nele;
  // 2. é de relação da mesma família ("pilot : cockpit" diante de SCALPEL :
  //    SURGEON), perto do nível da questão;
  // 3. qualquer outro perto do nível, só para completar.
  // Nunca divide palavra com o GABARITO: três alternativas com "wine" apontam
  // a resposta para quem não sabe a relação.
  const doGabarito = (p: AnalogyPair) =>
    p.a === correta.a || p.a === correta.b || p.b === correta.a || p.b === correta.b
  const elegiveis = outras.filter((p) => !doGabarito(p))
  const perto = pertoDoNivel(elegiveis, difficulty, (p) => p.level)
  const familia = RELATION_FAMILY[base.relation]
  const parente = (p: AnalogyPair) => RELATION_FAMILY[p.relation] === familia
  const fila = [
    ...rng.shuffle(elegiveis.filter(doEnunciado)),
    ...rng.shuffle(perto.filter((p) => !doEnunciado(p) && parente(p))),
    ...rng.shuffle(perto.filter((p) => !doEnunciado(p) && !parente(p))),
  ]

  const satisfiesRule = (texto: string) => {
    const par = ANALOGY_PAIRS.find((p) => formatPar(p) === texto)
    return par?.relation === base.relation
  }

  // Um distrator por relação: dois pares de mesma relação entre as erradas
  // deixam o candidato eliminar os dois em bloco ("se valem para os dois, não
  // é nenhum"). Pelo mesmo motivo, cada palavra do enunciado reaparece em um
  // distrator só — duas alternativas com "wine" viram par descartável.
  const escolhidas = [correta]
  const usadas = new Set([formatPar(correta)])
  const relacoesUsadas = new Set([base.relation])
  const palavrasRepetidas = new Set<string>()
  for (const cand of fila) {
    if (escolhidas.length >= optionCountFor(difficulty)) break
    const chave = formatPar(cand)
    if (usadas.has(chave) || relacoesUsadas.has(cand.relation)) continue
    const repetidas = [cand.a, cand.b].filter((w) => w === base.a || w === base.b)
    if (repetidas.some((w) => palavrasRepetidas.has(w))) continue
    for (const w of repetidas) palavrasRepetidas.add(w)
    usadas.add(chave)
    relacoesUsadas.add(cand.relation)
    escolhidas.push(cand)
  }
  if (escolhidas.length < optionCountFor(difficulty)) {
    throw new Error('não consegui montar distratores de analogia')
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
  subtipo: VocabSubtipo,
): VerbalGenerated {
  const rng = mulberry32(seed)
  const entry = escolherVerbete(rng, difficulty, subtipo)

  const alvo = subtipo === 'antonimo' ? entry.antonyms : entry.synonyms
  const armadilhas = subtipo === 'antonimo' ? entry.synonyms : entry.antonyms
  const correta = rng.pick(alvo)

  // Uma palavra é resposta certa se está na lista-alvo do verbete.
  const satisfiesRule = (texto: string) => alvo.includes(texto)

  const escolhidas = [correta]
  const usadas = new Set([correta])

  // De onde sai o preenchimento: OUTROS clusters semânticos — nunca palavra
  // vizinha, que poderia ser uma segunda resposta defensável — da mesma classe
  // gramatical (um verbo entre adjetivos cai por eliminação) e perto do nível
  // da questão, para não destoar do gabarito. Os vizinhos declarados em
  // VOCAB_NEIGHBORS também ficam de fora, e a trava é por PALAVRA: "humdrum" é
  // sinônimo de mundane e de tedious, basta um dos donos ser vizinho.
  const vizinhos = neighborsOf(entry.word)
  const proibidas = new Set([
    ...forbiddenFor(entry),
    ...VOCAB.filter((o) => vizinhos.has(o.word)).flatMap((o) => [o.word, ...o.synonyms]),
  ])
  const donos = pertoDoNivel(
    VOCAB.filter(
      (o) => o.cluster !== entry.cluster && o.pos === entry.pos && !vizinhos.has(o.word),
    ),
    difficulty,
    (o) => o.level,
    4,
  )

  // 1. A armadilha clássica — o quase-acerto: mesmo campo semântico, polaridade
  //    trocada. Sob pressão, muita gente lê "antônimo" e marca um sinônimo (e
  //    vice-versa). Sempre há uma. Só entra a segunda quando faltam clusters
  //    para o preenchimento (verbos têm três): duas armadilhas sinônimas entre
  //    si ajudam a adivinhar o sentido do enunciado, então é o último recurso.
  const clustersLivres = new Set(donos.map((o) => o.cluster)).size
  const nArmadilhas = Math.max(1, optionCountFor(difficulty) - 1 - clustersLivres)
  const armadilhasUsadas = rng.shuffle(armadilhas).slice(0, nArmadilhas)
  for (const armadilha of armadilhasUsadas) {
    usadas.add(armadilha)
    escolhidas.push(armadilha)
  }

  // 2. O preenchimento, no máximo um por cluster: "vast" e "enormous" juntos
  //    formam um par de sinônimos que o candidato descarta em bloco.
  const clustersUsados = new Set<string>()
  let guard = 0
  while (escolhidas.length < optionCountFor(difficulty)) {
    if (guard++ > 800) throw new Error(`não consegui montar distratores para "${entry.word}"`)
    const dono = rng.pick(donos)
    if (clustersUsados.has(dono.cluster)) continue
    const cand = rng.pick([dono.word, ...dono.synonyms])
    if (usadas.has(cand) || proibidas.has(cand)) continue
    clustersUsados.add(dono.cluster)
    usadas.add(cand)
    escolhidas.push(cand)
  }

  const { options, answerId } = embaralhar(rng, escolhidas)
  const rotulo = subtipo === 'antonimo' ? 'OPPOSITE' : 'SIMILAR'
  // a explicação cita a armadilha que de fato está entre as alternativas
  const armadilha = armadilhasUsadas[0] as string

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
              `é "${correta}". Repare que "${armadilha}" também está entre as ` +
              `alternativas: é sinônimo, não antônimo — a pegadinha mais comum da prova é ` +
              `marcar o sinônimo por ler o enunciado rápido demais. Leia OPPOSITE antes de ` +
              `olhar as opções.`,
            en:
              `"${entry.word}" means something close to "${entry.synonyms[0]}". Its ` +
              `opposite is "${correta}". Note that "${armadilha}" is also among the ` +
              `options: it is a synonym, not an antonym — the most common trap on the test ` +
              `is picking the synonym after skimming the prompt. Read OPPOSITE before you ` +
              `look at the options.`,
          }
        : {
            pt:
              `"${entry.word}" significa algo próximo de "${correta}". Cuidado com ` +
              `"${armadilha}", que é o antônimo e está ali justamente para quem lê o ` +
              `enunciado no automático. Confirme se a pergunta pede SIMILAR ou OPPOSITE ` +
              `antes de escolher.`,
            en:
              `"${entry.word}" means something close to "${correta}". Watch out for ` +
              `"${armadilha}": it is the antonym, placed there precisely for whoever ` +
              `reads on autopilot. Confirm whether the question asks for SIMILAR or ` +
              `OPPOSITE before choosing.`,
          },
    satisfiesRule,
  }
}

/**
 * Sorteia o verbete entre os DO SUBTIPO: cada palavra é cobrada em um só,
 * então sinônimo e antônimo nunca repetem enunciado nem alternativas.
 */
function escolherVerbete(rng: Rng, difficulty: Difficulty, subtipo: VocabSubtipo): VocabEntry {
  const doSubtipo = VOCAB.filter((e) => e.subtipo === subtipo)
  const noNivel = doSubtipo.filter((e) => e.level === difficulty)
  return rng.pick(noNivel.length > 0 ? noNivel : doSubtipo)
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

  // O gabarito vale na semântica booleana — logo vale para todo leitor, assuma
  // ele ou não que os grupos citados existem.
  if (!entails(forma.premises, forma.conclusion)) {
    throw new Error(`forma "${forma.id}" não é válida na semântica booleana`)
  }

  // Níveis altos usam termos inventados: com categorias reais dá para acertar
  // por conhecimento de mundo, que é justamente o que a questão não mede.
  const pool = difficulty >= 3 ? LOGIC_TERMS.inventados : LOGIC_TERMS.concretos
  const termos = [...rng.pick(pool as unknown as string[][])]

  // "Obrigatório" medido pela leitura MAIS generosa: com importação
  // existencial. Qualquer alternativa que se segue para quem assume que os
  // grupos existem é defensável — e o gate precisa enxergá-la como tal.
  const satisfiesRule = (texto: string) => {
    const s = allStatements().find((st) => renderStatement(st, termos) === texto)
    return s !== undefined && entails(forma.premises, s, COM_IMPORTACAO)
  }

  // Distratores: afirmações que NÃO se seguem nem com importação existencial —
  // cada uma tem um contramodelo com os três grupos povoados. Sem isso,
  // "Some engineers are not graduates" ao lado de "No engineers are graduates"
  // vira segunda resposta certa para quem (como a CCAT) assume que existem
  // engenheiros.
  const naoSeguem = allStatements().filter(
    (s) => !sameStatement(s, forma.conclusion) && !entails(forma.premises, s, COM_IMPORTACAO),
  )

  // Os distratores mais tentadores falam dos mesmos dois termos da conclusão
  // (A e C): a conversa ilícita, a negação, a particular trocada. Nos níveis
  // altos eles dominam; nos baixos, dividem espaço com afirmações sobre o termo
  // médio, que são mais fáceis de descartar.
  const ligaExtremos = (s: Statement) => s.subject !== 1 && s.predicate !== 1
  const tentadores = rng.shuffle(naoSeguem.filter(ligaExtremos))
  const demais = rng.shuffle(naoSeguem.filter((s) => !ligaExtremos(s)))
  const nDistratores = optionCountFor(difficulty) - 1
  const quantosTentadores = Math.min(tentadores.length, difficulty <= 2 ? 2 : nDistratores)
  const fila = [
    ...tentadores.slice(0, quantosTentadores),
    ...demais,
    ...tentadores.slice(quantosTentadores),
  ]

  const escolhidas: Statement[] = [forma.conclusion, ...fila.slice(0, nDistratores)]
  if (escolhidas.length < optionCountFor(difficulty)) {
    throw new Error('não consegui montar distratores de silogismo')
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
        `**obrigatórias** — existe um caso, com todos os grupos citados existindo, em ` +
        `que as premissas valem e elas falham. A armadilha campeã é inverter os termos: ` +
        `"All X are Y" não dá "All Y are X", e "Some X are not Y" não dá "Some Y are ` +
        `not X". Desenhe os círculos e procure o cenário que derruba cada alternativa.`,
      en:
        `The correct conclusion is "${renderStatement(forma.conclusion, termos)}". ` +
        `The others may well be true in some scenario, but they are not **necessary** — ` +
        `there is a case, with every group mentioned actually existing, where the ` +
        `premises hold and they fail. The champion trap is flipping the terms: "All X ` +
        `are Y" does not give "All Y are X", and "Some X are not Y" does not give "Some ` +
        `Y are not X". Draw the circles and look for the scenario that breaks each option.`,
    },
    satisfiesRule,
  }
}

const COM_IMPORTACAO = { existentialImport: true } as const

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

/**
 * Como `noNivelOuAbaixo`, mas prefere a faixa [nível − 1, nível]: no
 * vocabulário, preencher uma questão nível 5 com palavras de nível 1 deixaria o
 * gabarito (e a armadilha) destoando das demais alternativas.
 */
function pertoDoNivel<T>(
  itens: T[],
  difficulty: Difficulty,
  nivelDe: (t: T) => number,
  minimo = 8,
): T[] {
  const faixa = itens.filter((t) => nivelDe(t) >= difficulty - 1 && nivelDe(t) <= difficulty)
  return faixa.length >= minimo ? faixa : noNivelOuAbaixo(itens, difficulty, nivelDe, minimo)
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
