import { ANGULAR_STEPS, reflect, rotate, toPoints, type Glyph, type Point } from './glyph'

/**
 * Métricas de LEGIBILIDADE de uma figura.
 *
 * O resto do módulo prova correção: existe exatamente uma resposta certa. Isso
 * não basta. Uma figura com três vértices quase colineares é uma reta disfarçada
 * — e uma reta não tem lado, então seu espelho é igual a ela girada. A questão
 * continua logicamente correta e fica impossível de responder.
 *
 * Aqui medimos em PIXELS, na caixa em que a figura é de fato desenhada, porque
 * é isso que o olho recebe. `isChiral` compara conjuntos de células por
 * igualdade exata: uma figura pode ser quiral por uma casa na grade e ainda
 * assim ter espelho visualmente idêntico a uma rotação.
 */

/** Caixa de referência para medir. É a mesma em que a figura é renderizada. */
export const CAIXA_MEDIDA = 100

function pontosDe(g: Glyph): Point[] {
  return toPoints(g, CAIXA_MEDIDA * 0.78, CAIXA_MEDIDA / 2, CAIXA_MEDIDA / 2).points
}

/**
 * Distância de Hausdorff simétrica: o vértice que MAIS se deslocou.
 *
 * Deliberadamente não é a média. Duas figuras com dois vértices coincidentes e
 * um deslocado 30px são obviamente diferentes para o olho, mas a média
 * diluiria isso em 10px e as declararia parecidas. O que o olho pega é o
 * vértice que saiu do lugar, e é ele que precisa ser medido.
 */
export function distanciaVisual(a: Glyph, b: Glyph): number {
  const pa = pontosDe(a)
  const pb = pontosDe(b)
  if (pa.length === 0 || pb.length === 0) return 0

  const maisProximo = (p: Point, conjunto: Point[]) =>
    Math.min(...conjunto.map((q) => Math.hypot(p.x - q.x, p.y - q.y)))

  const ida = Math.max(...pa.map((p) => maisProximo(p, pb)))
  const volta = Math.max(...pb.map((p) => maisProximo(p, pa)))
  return Math.max(ida, volta)
}

/**
 * Quão visivelmente quiral a figura é: a menor distância entre o seu espelho e
 * QUALQUER rotação dela mesma.
 *
 * Perto de zero significa que espelhar e girar produzem o mesmo desenho — numa
 * questão de reflexão, nenhuma alternativa "espelha bem"; numa de rotação, a
 * resposta certa e os distratores viram a mesma coisa.
 */
export function quiralidadeVisual(g: Glyph): number {
  const espelho = reflect(g)
  let menor = Number.POSITIVE_INFINITY
  for (let k = 0; k < ANGULAR_STEPS; k++) {
    menor = Math.min(menor, distanciaVisual(espelho, rotate(g, k)))
  }
  return menor
}

/**
 * Área do FECHO CONVEXO sobre o quadrado do maior vão — mede se a figura tem
 * estrutura em duas dimensões ou é um sliver quase colinear.
 *
 * Um triângulo equilátero dá ~0,43. Três pontos em linha dão 0.
 *
 * Tem de ser o fecho convexo, e não o polígono desenhado. O polígono é
 * percorrido em ordem angular, e quando dois vértices caem no mesmo raio essa
 * ordem é ambígua: espelhar a figura trocava o desempate e mudava a área
 * calculada, fazendo a mesma figura parecer legível numa orientação e
 * degenerada na outra. Fecho convexo é invariante a rotação e reflexão, que é
 * o que a medida precisa ser.
 */
export function corpo(g: Glyph): number {
  const p = pontosDe(g)
  if (p.length < 3) return 0

  const area = areaFechoConvexo(p)

  let maiorVao = 0
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      maiorVao = Math.max(
        maiorVao,
        Math.hypot((p[i] as Point).x - (p[j] as Point).x, (p[i] as Point).y - (p[j] as Point).y),
      )
    }
  }
  return maiorVao === 0 ? 0 : area / (maiorVao * maiorVao)
}

/**
 * Limiares.
 *
 * Calibrados medindo a distribuição real das figuras (scripts/audit-spatial.ts):
 * abaixo destes valores a diferença entre duas figuras some no traço de 2,5px
 * com que elas são desenhadas.
 */
export const MIN_QUIRALIDADE = 18
export const MIN_CORPO = 0.1
/** Separação mínima entre duas alternativas da MESMA questão. */
export const MIN_SEPARACAO_ALTERNATIVAS = 16

/** A figura serve de base para uma questão? */
export function ehLegivel(g: Glyph): boolean {
  return corpo(g) >= MIN_CORPO && quiralidadeVisual(g) >= MIN_QUIRALIDADE
}

/** Área do fecho convexo (Andrew monotone chain). n ≤ 6, então simplicidade ganha. */
function areaFechoConvexo(pontos: Point[]): number {
  const p = [...pontos].sort((a, b) => a.x - b.x || a.y - b.y)
  if (p.length < 3) return 0

  const cruz = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

  const construir = (seq: Point[]): Point[] => {
    const meia: Point[] = []
    for (const ponto of seq) {
      while (
        meia.length >= 2 &&
        cruz(meia[meia.length - 2] as Point, meia[meia.length - 1] as Point, ponto) <= 0
      ) {
        meia.pop()
      }
      meia.push(ponto)
    }
    meia.pop()
    return meia
  }

  const fecho = [...construir(p), ...construir([...p].reverse())]
  if (fecho.length < 3) return 0

  let area2 = 0
  for (let i = 0; i < fecho.length; i++) {
    const a = fecho[i] as Point
    const b = fecho[(i + 1) % fecho.length] as Point
    area2 += a.x * b.y - b.x * a.y
  }
  return Math.abs(area2) / 2
}
