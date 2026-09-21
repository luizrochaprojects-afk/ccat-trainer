import { mulberry32, type Rng } from '../rng'
import type { Question } from '../schema'
import { EXAM_BLUEPRINT, TIPOS, type Difficulty, type Tipo } from '../taxonomy'

/**
 * Composição da fila de questões (PRD §4.3, §4.4, §4.9).
 *
 * Duas regras que brigam entre si e precisam conviver: dificuldade crescente e
 * tipos intercalados. Ordenar só por dificuldade agruparia os tipos (um bloco
 * de espaciais fáceis, depois um de verbais fáceis); intercalar sem critério
 * destruiria a rampa. A solução é ordenar por dificuldade e desempatar
 * intercalando dentro de cada faixa.
 */

export interface ComposeOptions {
  /** ids já vistos numa janela recente — evitados enquanto houver alternativa */
  seen?: Set<string>
  seed?: number
}

/** Corridas de um mesmo tipo acima disto cansam e denunciam composição preguiçosa. */
const MAX_SEQUENCIA_MESMO_TIPO = 2

export function composeExam(bank: Question[], opts: ComposeOptions = {}): Question[] {
  const rng = mulberry32(opts.seed ?? Date.now())
  const seen = opts.seed !== undefined || opts.seen ? (opts.seen ?? new Set()) : new Set<string>()

  const selecionadas: Question[] = []
  for (const tipo of TIPOS) {
    const cota = EXAM_BLUEPRINT[tipo]
    selecionadas.push(...sortear(bank.filter((q) => q.tipo === tipo), cota, seen, rng))
  }

  return intercalar(ordenarPorDificuldade(selecionadas, rng))
}

export interface DrillOptions extends ComposeOptions {
  tipo: Tipo
  subtipo?: string
  count: number
}

export function composeDrill(bank: Question[], opts: DrillOptions): Question[] {
  const rng = mulberry32(opts.seed ?? Date.now())
  const pool = bank.filter(
    (q) => q.tipo === opts.tipo && (!opts.subtipo || q.subtipo === opts.subtipo),
  )
  const escolhidas = sortear(pool, opts.count, opts.seen ?? new Set(), rng)
  // No drill não há intercalação: o ponto é martelar um tipo só, em
  // dificuldade crescente.
  return ordenarPorDificuldade(escolhidas, rng)
}

// --- Seleção -----------------------------------------------------------------

/**
 * Sorteia `cota` questões espalhadas pelos 5 níveis, preferindo as não vistas.
 *
 * Se as não vistas não bastam, completa com vistas em vez de devolver menos —
 * uma simulação de 43 questões não é uma simulação.
 */
function sortear(pool: Question[], cota: number, seen: Set<string>, rng: Rng): Question[] {
  if (pool.length === 0) return []

  const novas = pool.filter((q) => !seen.has(q.id))
  const repetidas = pool.filter((q) => seen.has(q.id))

  const escolhidas: Question[] = []
  const porNivel = distribuirPorNivel(cota)

  for (const [nivel, quantos] of porNivel) {
    const doNivel = rng.shuffle(novas.filter((q) => q.difficulty === nivel))
    escolhidas.push(...doNivel.slice(0, quantos))
  }

  // Completa o que faltou: primeiro qualquer não vista, depois repetidas.
  const jaEscolhidas = new Set(escolhidas.map((q) => q.id))
  for (const fonte of [novas, repetidas]) {
    if (escolhidas.length >= cota) break
    for (const q of rng.shuffle(fonte)) {
      if (escolhidas.length >= cota) break
      if (jaEscolhidas.has(q.id)) continue
      jaEscolhidas.add(q.id)
      escolhidas.push(q)
    }
  }

  return escolhidas.slice(0, cota)
}

/**
 * Espalha a cota pelos 5 níveis com peso levemente maior no meio — a prova não
 * é só fácil nem só difícil, e um bloco final de nível 5 só produziria
 * desistência.
 */
function distribuirPorNivel(cota: number): [Difficulty, number][] {
  const pesos: [Difficulty, number][] = [
    [1, 0.2],
    [2, 0.25],
    [3, 0.25],
    [4, 0.2],
    [5, 0.1],
  ]
  const bruto = pesos.map(([n, p]) => [n, Math.floor(cota * p)] as [Difficulty, number])
  let sobra = cota - bruto.reduce((acc, [, q]) => acc + q, 0)
  // Distribui o resto do meio para fora, na ordem 2, 3, 1, 4, 5.
  for (const alvo of [2, 3, 1, 4, 5] as Difficulty[]) {
    if (sobra <= 0) break
    const item = bruto.find(([n]) => n === alvo)
    if (item) {
      item[1] += 1
      sobra--
    }
  }
  return bruto
}

// --- Ordenação ---------------------------------------------------------------

function ordenarPorDificuldade(questoes: Question[], rng: Rng): Question[] {
  // Embaralha antes para que o desempate dentro de um nível não seja sempre
  // na mesma ordem de tipo.
  return rng.shuffle(questoes).sort((a, b) => a.difficulty - b.difficulty)
}

/**
 * Quebra corridas de um mesmo tipo trocando com uma questão vizinha do MESMO
 * nível de dificuldade — assim a rampa é preservada enquanto os tipos se
 * alternam.
 */
function intercalar(questoes: Question[]): Question[] {
  const out = [...questoes]

  for (let i = MAX_SEQUENCIA_MESMO_TIPO; i < out.length; i++) {
    const janela = out.slice(i - MAX_SEQUENCIA_MESMO_TIPO, i + 1)
    const tipo = out[i]!.tipo
    if (!janela.every((q) => q.tipo === tipo)) continue

    const troca = out.findIndex(
      (q, j) => j > i && q.tipo !== tipo && q.difficulty === out[i]!.difficulty,
    )
    if (troca === -1) continue

    const tmp = out[i]!
    out[i] = out[troca]!
    out[troca] = tmp
  }

  return out
}
