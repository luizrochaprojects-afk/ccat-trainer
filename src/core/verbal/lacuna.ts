import { mulberry32, type Rng } from '../rng'
import { optionIdAt } from '../optionIds'
import { OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import { pick } from '../i18n'
import type { VerbalGenerated, VerbalGenerator } from './generators'
import {
  ANALOGY_PAIRS,
  RELATION_LABEL,
  VOCAB,
  forbiddenFor,
  neighborsOf,
  pairsOfRelation,
  type AnalogyPair,
  type VocabEntry,
} from './lexicon'

/**
 * Analogia com lacuna — "MANUSCRIPT is to DOCUMENT as TALON is to:", com
 * alternativas de UMA palavra.
 *
 * Duas fontes, meio a meio:
 *
 * 1. **Relações conceituais** (ANALOGY_PAIRS): o par do enunciado e o par da
 *    resposta têm a mesma relação. Os distratores são CURADOS por palavra C,
 *    porque o léxico não é exaustivo: "EAGLE" seria resposta certa para
 *    "TALON is to" tanto quanto "hawk", e só uma lista revisada garante que
 *    nenhum distrator é uma segunda resposta. Cada lista mistura as armadilhas
 *    reais: palavra ligada a C por OUTRA relação (POTTER → kiln, clay), palavra
 *    de som parecido (CYGNET × signet, ENTOMOLOGY × etymology) e sinônimo de C
 *    (TALON → claw).
 *
 * 2. **Sinônimo e antônimo** (VOCAB): "CANDID is to FRANK as LUCID is to:".
 *    A armadilha fixa é a relação invertida — o antônimo de C quando o par pede
 *    sinônimo, e vice-versa —, mais palavras de grafia parecida com C (LUCID ×
 *    lurid). O preenchimento segue as travas do vocabulário: outro cluster,
 *    mesma classe gramatical, fora dos vizinhos declarados.
 */

export interface LacunaCurada {
  /** lado A de um par de ANALOGY_PAIRS; a resposta é o lado B */
  c: string
  /** palavras erradas e tentadoras para "C is to ___" nessa relação */
  distratores: string[]
}

/**
 * Listas revisadas uma a uma: nenhuma palavra aqui mantém com C a relação do
 * par. Ficaram de fora, de propósito, as que seriam defensáveis — "colt" para
 * HORSE, "juice" para GRAPE, "atlas" para CARTOGRAPHER, "candle" para TALLOW,
 * "china" para KAOLIN, "smolt" e "fry" para SALMON.
 */
export const LACUNAS_CURADAS: LacunaCurada[] = [
  // nível 1
  { c: 'spoke', distratores: ['hub', 'speak', 'tire', 'axle', 'rim'] },
  { c: 'scalpel', distratores: ['incision', 'hospital', 'patient', 'scalp', 'blade'] },
  { c: 'judge', distratores: ['verdict', 'gavel', 'jury', 'lawyer', 'judgment'] },
  { c: 'author', distratores: ['reader', 'pen', 'library', 'authority', 'publisher'] },
  { c: 'drought', distratores: ['rain', 'draught', 'harvest', 'cloud', 'weather'] },
  { c: 'compass', distratores: ['north', 'needle', 'compose', 'map', 'magnet'] },
  { c: 'horse', distratores: ['stallion', 'mare', 'stable', 'hoarse', 'saddle'] },
  { c: 'grape', distratores: ['vine', 'vineyard', 'grapple', 'purple', 'barrel'] },
  { c: 'geology', distratores: ['geologist', 'hammer', 'geometry', 'laboratory', 'textbook'] },
  { c: 'decibel', distratores: ['meter', 'decimal', 'ear', 'music', 'silence'] },
  { c: 'miser', distratores: ['generous', 'misery', 'money', 'hoard', 'bank'] },
  { c: 'pauper', distratores: ['poverty', 'beggar', 'paper', 'prince', 'alms'] },
  // nível 2
  { c: 'keel', distratores: ['sail', 'anchor', 'kneel', 'ocean', 'captain'] },
  { c: 'trowel', distratores: ['brick', 'mortar', 'towel', 'wall', 'cement'] },
  { c: 'monk', distratores: ['prayer', 'abbot', 'robe', 'monkey', 'vow'] },
  { c: 'potter', distratores: ['kiln', 'clay', 'wheel', 'studio', 'putter'] },
  { c: 'insomnia', distratores: ['sleep', 'pillow', 'insomniac', 'night', 'dream'] },
  { c: 'drizzle', distratores: ['umbrella', 'puddle', 'sprinkle', 'cloud', 'dazzle'] },
  { c: 'thermostat', distratores: ['temperature', 'heat', 'thermometer', 'furnace', 'wall'] },
  { c: 'goose', distratores: ['gander', 'flock', 'feather', 'moose', 'pond'] },
  { c: 'hide', distratores: ['seek', 'cow', 'tanner', 'skin', 'hidden'] },
  { c: 'legume', distratores: ['vegetable', 'soup', 'plant', 'lemon', 'protein'] },
  { c: 'cardiology', distratores: ['cardiologist', 'hospital', 'cardigan', 'surgery', 'lungs'] },
  { c: 'hertz', distratores: ['sound', 'radio', 'hurts', 'speed', 'antenna'] },
  { c: 'insomniac', distratores: ['night', 'tired', 'pill', 'bed', 'insomnia'] },
  // nível 3
  { c: 'talon', distratores: ['claw', 'prey', 'feather', 'tallow', 'nest'] },
  { c: 'fret', distratores: ['worry', 'string', 'music', 'pick', 'ferret'] },
  { c: 'gavel', distratores: ['hammer', 'bid', 'gravel', 'courtroom', 'sale'] },
  { c: 'kiln', distratores: ['oven', 'fire', 'clay', 'brick', 'kilt'] },
  { c: 'croupier', distratores: ['cards', 'dealer', 'wager', 'gambler', 'dice'] },
  { c: 'cartographer', distratores: ['compass', 'explorer', 'territory', 'surveyor', 'cartoon'] },
  { c: 'deforestation', distratores: ['logging', 'forest', 'timber', 'reforestation', 'lumberjack'] },
  { c: 'crucible', distratores: ['metal', 'furnace', 'crucial', 'laboratory', 'gold'] },
  { c: 'swan', distratores: ['lake', 'signet', 'duckling', 'cob', 'feather'] },
  { c: 'latex', distratores: ['tree', 'sap', 'lattice', 'plantation', 'elastic'] },
  { c: 'entomology', distratores: ['etymology', 'entomologist', 'words', 'microscope', 'net'] },
  { c: 'knot', distratores: ['rope', 'sailor', 'distance', 'tie', 'ship'] },
  { c: 'sycophant', distratores: ['flattery', 'boss', 'honest', 'arrogant', 'sympathetic'] },
  { c: 'ignoramus', distratores: ['ignorance', 'fool', 'book', 'school', 'ignore'] },
  // nível 4
  { c: 'vestibule', distratores: ['vestment', 'entrance', 'door', 'visitor', 'coat'] },
  { c: 'sextant', distratores: ['stars', 'sextet', 'angle', 'ship', 'ocean'] },
  { c: 'apiarist', distratores: ['honey', 'bees', 'aviary', 'veil', 'pollen'] },
  { c: 'luthier', distratores: ['workshop', 'chisel', 'orchestra', 'music', 'maple'] },
  { c: 'contagion', distratores: ['vaccine', 'quarantine', 'germ', 'patient', 'contusion'] },
  { c: 'tourniquet', distratores: ['bleed', 'bandage', 'tournament', 'wound', 'limb'] },
  { c: 'hare', distratores: ['rabbit', 'kitten', 'hair', 'field', 'tortoise'] },
  { c: 'tallow', distratores: ['fat', 'talon', 'wax', 'sheep', 'butcher'] },
  { c: 'marsupial', distratores: ['pouch', 'mammal', 'martial', 'rodent', 'eucalyptus'] },
  { c: 'ohm', distratores: ['current', 'volt', 'wire', 'home', 'electricity'] },
  { c: 'curmudgeon', distratores: ['cheerful', 'complaint', 'grudge', 'hermit', 'generous'] },
  { c: 'neophyte', distratores: ['novice', 'training', 'neon', 'enthusiasm', 'mentor'] },
  { c: 'milliner', distratores: ['miller', 'felt', 'shop', 'needle', 'head'] },
  // nível 5
  { c: 'transept', distratores: ['transit', 'altar', 'bishop', 'spire', 'pilgrim'] },
  { c: 'burin', distratores: ['copper', 'etching', 'burial', 'print', 'chisel'] },
  { c: 'chandler', distratores: ['chandelier', 'wax', 'ship', 'flame', 'shop'] },
  { c: 'farrier', distratores: ['horseshoe', 'hammer', 'ferry', 'hoof', 'horse'] },
  { c: 'hubris', distratores: ['pride', 'humility', 'hero', 'hubcap', 'oracle'] },
  { c: 'strop', distratores: ['razor', 'leather', 'strap', 'shave', 'barber'] },
  { c: 'salmon', distratores: ['river', 'trout', 'sermon', 'bear', 'ocean'] },
  { c: 'numismatics', distratores: ['stamps', 'numbers', 'collector', 'mint', 'pneumatics'] },
  { c: 'kaolin', distratores: ['kiln', 'clay', 'potter', 'quarry', 'glaze'] },
  { c: 'poltroon', distratores: ['valiant', 'coward', 'patron', 'soldier', 'battle'] },
  { c: 'parsec', distratores: ['star', 'parse', 'second', 'light', 'telescope'] },
  { c: 'recreant', distratores: ['recreation', 'traitor', 'soldier', 'battle', 'desertion'] },
  { c: 'cooper', distratores: ['copper', 'oak', 'wine', 'cellar', 'coop'] },
]

/**
 * Palavras de grafia parecida com verbetes do VOCAB — a armadilha de quem lê
 * rápido (INEVITABLE → "invited"). Nenhuma é sinônimo nem antônimo do verbete.
 */
export const GRAFIA_PARECIDA: Record<string, string[]> = {
  candid: ['candied'],
  lucid: ['lurid'],
  vivid: ['livid'],
  adept: ['adapt'],
  naive: ['native'],
  ample: ['amble'],
  arduous: ['ardent'],
  cynical: ['cyclical'],
  conceal: ['concede'],
  endorse: ['endure'],
  diligent: ['indulgent'],
  timid: ['tepid'],
  vague: ['vogue'],
  immense: ['immerse'],
  deter: ['defer'],
  transient: ['transparent'],
  ambiguous: ['ambitious'],
  zealous: ['jealous'],
  deft: ['daft'],
  placid: ['flaccid'],
  terse: ['tense'],
  affluent: ['effluent'],
  docile: ['domicile'],
  judicious: ['judicial'],
  momentous: ['momentary'],
  volatile: ['versatile'],
  callous: ['callus'],
  sanguine: ['sanguinary'],
  ubiquitous: ['iniquitous'],
  prodigious: ['prodigal'],
  pervasive: ['persuasive'],
  laconic: ['iconic'],
  phlegmatic: ['pragmatic'],
  salubrious: ['salacious'],
  inept: ['inert'],
}

interface Montada {
  stem: string
  correta: string
  distratores: string[]
  pt: string
  en: string
  satisfaz: (t: string) => boolean
}

function montarConceitual(rng: Rng, difficulty: Difficulty): Montada | null {
  const doNivel = LACUNAS_CURADAS.filter((l) => parDe(l.c)?.level === difficulty)
  const item = rng.pick(doNivel.length > 0 ? doNivel : LACUNAS_CURADAS)
  const alvo = parDe(item.c) as AnalogyPair
  const palavras = new Set([alvo.a, alvo.b, ...item.distratores])

  // O par do enunciado: mesma relação, perto do nível, sem dividir palavra com
  // a questão — "TALON is to HAWK" ao lado de "hawk" nas alternativas se
  // resolveria pela superfície.
  const candidatos = pairsOfRelation(alvo.relation).filter(
    (p) => p !== alvo && !palavras.has(p.a) && !palavras.has(p.b) && Math.abs(p.level - difficulty) <= 1,
  )
  if (candidatos.length === 0) return null
  const base = rng.pick(candidatos)
  const distratores = rng.shuffle(item.distratores).slice(0, OPCOES_POR_QUESTAO - 1)
  const rel = RELATION_LABEL[alvo.relation]!

  return {
    stem: `${base.a.toUpperCase()} is to ${base.b.toUpperCase()} as ${alvo.a.toUpperCase()} is to:`,
    correta: alvo.b,
    distratores,
    pt:
      `A relação é **${pick(rel, 'pt')}**: ${base.a} → ${base.b}. Aplicada a ${alvo.a}, dá ` +
      `"${alvo.b}". As outras alternativas têm alguma ligação com ${alvo.a} — pela grafia ou ` +
      `por outra relação —, mas não esta.`,
    en:
      `The relation is **${pick(rel, 'en')}**: ${base.a} → ${base.b}. Applied to ${alvo.a}, it ` +
      `gives "${alvo.b}". The other options have some link to ${alvo.a} — by spelling or by ` +
      `another relation —, but not this one.`,
    satisfaz: (t) => t === alvo.b,
  }
}

function montarLexical(rng: Rng, difficulty: Difficulty): Montada | null {
  const relacao = rng.pick(['sinonimo', 'antonimo'] as const)
  const noNivel = VOCAB.filter((e) => e.level === difficulty)
  const c = rng.pick(noNivel)
  const base = rng.pick(noNivel.filter((e) => e !== c && e.pos === c.pos))
  const listaBase = relacao === 'sinonimo' ? base.synonyms : base.antonyms
  const certas = relacao === 'sinonimo' ? c.synonyms : c.antonyms
  const invertidas = relacao === 'sinonimo' ? c.antonyms : c.synonyms
  const b = rng.pick(listaBase)
  const correta = rng.pick(certas)
  const doEnunciado = new Set([base.word, b, c.word])
  if (doEnunciado.has(correta)) return null

  // 1. a relação invertida: sempre uma
  const escolhidas: string[] = [rng.pick(invertidas)]
  // 2. grafia parecida com C, quando há
  const parecida = GRAFIA_PARECIDA[c.word]
  if (parecida) escolhidas.push(rng.pick(parecida))

  // 3. preenchimento com as travas do vocabulário, um por cluster
  const vizinhos = neighborsOf(c.word)
  const proibidas = new Set([
    ...forbiddenFor(c),
    ...doEnunciado,
    ...VOCAB.filter((o) => vizinhos.has(o.word)).flatMap((o) => [o.word, ...o.synonyms]),
  ])
  const donos = VOCAB.filter(
    (o: VocabEntry) =>
      o.cluster !== c.cluster &&
      o.pos === c.pos &&
      !vizinhos.has(o.word) &&
      Math.abs(o.level - difficulty) <= 1,
  )
  const clusters = new Set<string>()
  for (const dono of rng.shuffle(donos)) {
    if (escolhidas.length >= OPCOES_POR_QUESTAO - 1) break
    if (clusters.has(dono.cluster)) continue
    const cand = rng.pick(dono.synonyms)
    if (proibidas.has(cand) || escolhidas.includes(cand) || cand === correta) continue
    clusters.add(dono.cluster)
    escolhidas.push(cand)
  }
  if (escolhidas.length < OPCOES_POR_QUESTAO - 1) return null
  if (escolhidas.some((w) => doEnunciado.has(w))) return null

  const nome = relacao === 'sinonimo' ? { pt: 'sinônimo', en: 'synonym' } : { pt: 'antônimo', en: 'antonym' }
  const outra = relacao === 'sinonimo' ? { pt: 'antônimo', en: 'antonym' } : { pt: 'sinônimo', en: 'synonym' }
  const trap = escolhidas[0]!
  return {
    stem: `${base.word.toUpperCase()} is to ${b.toUpperCase()} as ${c.word.toUpperCase()} is to:`,
    correta,
    distratores: escolhidas,
    pt:
      `O par do enunciado é de **${nome.pt}s**: ${base.word} → ${b}. O ${nome.pt} de ${c.word} ` +
      `entre as alternativas é "${correta}". "${trap}" é a armadilha: é o ${outra.pt} de ` +
      `${c.word} — a relação certa ao contrário.`,
    en:
      `The pair in the prompt is **${nome.en}s**: ${base.word} → ${b}. The ${nome.en} of ` +
      `${c.word} among the options is "${correta}". "${trap}" is the trap: it is the ` +
      `${outra.en} of ${c.word} — the right relation reversed.`,
    satisfaz: (t) => certas.includes(t),
  }
}

function parDe(a: string): AnalogyPair | undefined {
  return ANALOGY_PAIRS.find((p) => p.a === a)
}

export const gerarAnalogiaLacuna: VerbalGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  let montada: Montada | null = null
  for (let t = 0; t < 50 && !montada; t++) {
    montada = rng.next() < 0.5 ? montarConceitual(rng, difficulty) : montarLexical(rng, difficulty)
  }
  if (!montada) throw new Error(`não consegui montar analogia com lacuna no nível ${difficulty}`)

  const textos = [montada.correta, ...montada.distratores]
  const marcados = rng.shuffle(textos.map((text, i) => ({ text, certa: i === 0 })))

  return {
    subtipo: 'analogia_lacuna',
    stem: montada.stem,
    options: marcados.map((m, i) => ({ id: optionIdAt(i) as string, text: m.text })),
    answerId: optionIdAt(marcados.findIndex((m) => m.certa)) as string,
    explanation: {
      pt: `${montada.pt} Método: monte a frase-ponte com o primeiro par e aplique-a à terceira palavra antes de olhar as opções.`,
      en: `${montada.en} Method: build the bridge sentence from the first pair and apply it to the third word before looking at the options.`,
    },
    satisfiesRule: montada.satisfaz,
  } satisfies VerbalGenerated
}
