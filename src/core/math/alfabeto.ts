/**
 * Leitor de séries de letras para o gate G2.
 *
 * Letra não vira número na alternativa, então a série de letras não tem
 * expressão para o solver avaliar. O segundo caminho dela é este: um leitor
 * que olha SÓ o enunciado, reconstrói a regra componente por componente e
 * prevê o próximo termo. Ele não sabe qual família montou a série — se a regra
 * não está na tela, ele não fecha, e a questão é reprovada.
 *
 * Um termo se decompõe em componentes: cada letra é uma, e cada número (com
 * todos os dígitos) é outra. "CEG" são três letras; "E8" é letra e número. A
 * letra vale a posição no alfabeto (A = 1 … Z = 26), que é a conta que se faz
 * de cabeça na prova.
 *
 * Leituras testadas, cada componente sozinho:
 *  - diferença constante (pelo menos 3 valores);
 *  - diferença que cresce por um passo constante (pelo menos 4 valores);
 *  - razão constante, só em número (pelo menos 3 valores).
 * E duas formas de ler a sequência: inteira, ou como duas trilhas trançadas (um
 * termo sim, um não). Na trança, as DUAS trilhas precisam fechar, não só a da
 * vaga — a regra tem de valer do primeiro ao último termo.
 *
 * Devolve todas as previsões distintas das leituras que fecham. Questão boa tem
 * exatamente uma, e ela é o gabarito.
 */

export const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** A = 1, …, Z = 26. */
export function posicao(letra: string): number {
  const i = ALFABETO.indexOf(letra)
  if (letra.length !== 1 || i < 0) throw new Error(`não é letra maiúscula: "${letra}"`)
  return i + 1
}

export function letra(pos: number): string {
  if (!Number.isInteger(pos) || pos < 1 || pos > 26) {
    throw new Error(`posição fora do alfabeto: ${pos}`)
  }
  return ALFABETO[pos - 1] as string
}

export function letraValida(pos: number): boolean {
  return Number.isInteger(pos) && pos >= 1 && pos <= 26
}

export type TipoComponente = 'letra' | 'numero'

export interface Componente {
  tipo: TipoComponente
  valor: number
}

/** "E8" → [letra 5, número 8]. null se o termo tem qualquer outra coisa. */
export function componentesDe(termo: string): Componente[] | null {
  if (!/^(?:[A-Z]|\d+)+$/.test(termo)) return null
  return (termo.match(/[A-Z]|\d+/g) ?? []).map((t) =>
    /\d/.test(t) ? { tipo: 'numero', valor: Number(t) } : { tipo: 'letra', valor: posicao(t) },
  )
}

/** Monta o texto do termo de volta: letra pela posição, número por extenso. */
export function termoDe(componentes: readonly Componente[]): string {
  return componentes.map((c) => (c.tipo === 'letra' ? letra(c.valor) : String(c.valor))).join('')
}

/** Termos de "CEG, DFH, EGI, ?" — null se o enunciado não termina na vaga. */
export function termosDoEnunciado(stem: string): string[] | null {
  const partes = stem.split(',').map((t) => t.trim())
  if (partes.at(-1) !== '?' || partes.length < 4) return null
  return partes.slice(0, -1)
}

export function lerSerieDeLetras(stem: string): string[] {
  const termos = termosDoEnunciado(stem)
  if (!termos) return []
  const decompostos = termos.map(componentesDe)
  if (decompostos.some((c) => c === null || c.length === 0)) return []
  const lista = decompostos as Componente[][]

  // Todos os termos com a mesma forma (mesma sequência de letra/número).
  const forma = (lista[0] as Componente[]).map((c) => c.tipo)
  const mesmaForma = lista.every(
    (c) => c.length === forma.length && c.every((x, k) => x.tipo === forma[k]),
  )
  if (!mesmaForma) return []

  const previsoes = new Set<string>()
  for (const periodo of [1, 2]) {
    const vaga = lista.length % periodo
    let fecha = true
    let daVaga: number[][] = []

    for (let r = 0; r < periodo; r++) {
      const trilha = lista.filter((_, i) => i % periodo === r)
      const porComponente = forma.map((tipo, k) => proximos(trilha.map((c) => (c[k] as Componente).valor), tipo))
      if (porComponente.some((p) => p.length === 0)) {
        fecha = false
        break
      }
      if (r === vaga) daVaga = porComponente
    }
    if (!fecha) continue

    for (const combinacao of produto(daVaga)) {
      previsoes.add(termoDe(combinacao.map((valor, k) => ({ tipo: forma[k] as TipoComponente, valor }))))
    }
  }
  return [...previsoes]
}

/** Próximos valores possíveis de um componente, uma previsão por leitura que fecha. */
function proximos(v: number[], tipo: TipoComponente): number[] {
  const out = new Set<number>()
  const ultimo = v.at(-1) as number
  const d = difs(v)
  if (v.length >= 3 && constantes(d)) out.add(ultimo + (d[0] as number))
  const dd = difs(d)
  if (v.length >= 4 && constantes(dd)) out.add(ultimo + (d.at(-1) as number) + (dd[0] as number))
  if (tipo === 'numero' && v.length >= 3 && v.every((x) => x !== 0)) {
    const razoes = v.slice(1).map((x, i) => x / (v[i] as number))
    if (constantes(razoes)) out.add(ultimo * (razoes[0] as number))
  }
  return [...out].filter((x) =>
    tipo === 'letra' ? letraValida(x) : Number.isInteger(x) && x > 0,
  )
}

function produto(listas: number[][]): number[][] {
  return listas.reduce<number[][]>(
    (acc, opcoes) => acc.flatMap((prefixo) => opcoes.map((o) => [...prefixo, o])),
    [[]],
  )
}

function difs(v: number[]): number[] {
  return v.slice(1).map((x, i) => x - (v[i] as number))
}

function constantes(xs: number[]): boolean {
  return xs.length > 0 && xs.every((x) => Math.abs(x - (xs[0] as number)) < 1e-9)
}
