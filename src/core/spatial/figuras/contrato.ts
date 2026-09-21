import type { Rng } from '../../rng'
import type { SpatialSpec } from '../../schema'
import type { Difficulty } from '../../taxonomy'

/**
 * Contrato de uma família de figuras.
 *
 * A separação que organiza o módulo: uma FAMÍLIA é o vocabulário visual (arcos
 * nos cantos, ponteiros num mostrador, formas aninhadas); uma FORMA DE PERGUNTA
 * é o que se pede sobre ela (qual é a rotação, qual completa a sequência, qual
 * não pertence). Antes as duas coisas estavam fundidas, e o resultado foi cinco
 * perguntas diferentes sempre sobre o mesmo desenho — nada parecido com um
 * teste real.
 *
 * As figuras são DISCRETAS de propósito. Um conjunto de cantos, um conjunto de
 * ângulos, uma tupla de atributos: espaços pequenos e enumeráveis, em que
 * "configurações diferentes" implica "desenhos visivelmente diferentes" por
 * construção. A versão anterior usava pontos numa grade polar contínua, onde
 * essa implicação não valia — e produziu questões corretas e irrespondíveis.
 */
export interface Familia<F> {
  id: string

  /** Sorteia uma figura utilizável: assimétrica sob rotação e quiral. */
  sortear(rng: Rng, nivel: Difficulty): F

  rotate(f: F, passos: number): F
  reflect(f: F): F

  /**
   * Chave canônica do DESENHO. Duas figuras com a mesma assinatura produzem o
   * mesmo `SpatialSpec`; com assinaturas diferentes, desenhos visivelmente
   * diferentes. O teste exaustivo por família verifica as duas direções.
   */
  assinatura(f: F): string

  toSpec(f: F): SpatialSpec

  /** Quantos passos de rotação fecham o ciclo. 4 para arcos, 8 para raios. */
  passosNoCiclo: number

  /**
   * Se a família tem figuras quirais, isto é, se espelhar produz algo que
   * nenhuma rotação alcança.
   *
   * `atributos` é aquiral de propósito — um triângulo espelhado é um triângulo
   * girado — e por isso alimenta séries e matrizes, nunca questões de reflexão.
   * A tabela de compatibilidade em `formas.ts` respeita este campo.
   */
  suportaReflexao: boolean

  /**
   * Eixo de ATRIBUTO, independente da rotação: tamanho dos arcos, preenchimento
   * da forma, número de anéis. É o que permite uma matriz 3×3 com duas regras
   * simultâneas — gira ao longo das colunas, muda o atributo ao longo das
   * linhas —, que é o que as provas reais fazem e a versão anterior não fazia.
   *
   * Precisa COMUTAR com `rotate`: avançar e depois girar tem de dar o mesmo
   * resultado que girar e depois avançar, senão a matriz muda de resposta
   * conforme o candidato a leia por linha ou por coluna. O teste verifica isso.
   */
  passosSecundarios: number
  avancarSecundario(f: F, passos: number): F

  /**
   * Variação mínima porém visível, para a forma "ache o par idêntico": produz
   * uma figura parecida mas garantidamente distinta.
   */
  variar(f: F, rng: Rng): F

  /** Todas as configurações do espaço — usado pelo teste exaustivo. */
  todasAsConfiguracoes(): F[]
}

/**
 * Uma figura é utilizável quando girar de fato muda o desenho — e, nas famílias
 * que suportam reflexão, quando espelhar também muda.
 */
export function ehUtilizavel<F>(fam: Familia<F>, f: F): boolean {
  if (!semSimetriaRotacional(fam, f)) return false
  return fam.suportaReflexao ? ehQuiral(fam, f) : true
}

/**
 * Girar precisa mudar o desenho em TODOS os passos intermediários. Se alguma
 * rotação devolve a figura original, as alternativas de uma questão de rotação
 * colidem entre si.
 */
export function semSimetriaRotacional<F>(fam: Familia<F>, f: F): boolean {
  const original = fam.assinatura(f)
  for (let k = 1; k < fam.passosNoCiclo; k++) {
    if (fam.assinatura(fam.rotate(f, k)) === original) return false
  }
  return true
}

/**
 * Quiral = o espelho NÃO é alcançável por rotação.
 *
 * Numa figura aquiral, o espelho vira um duplicado de alguma rotação e a
 * questão de reflexão passa a ter duas respostas certas — ou nenhuma
 * distinguível, que foi o bug reportado.
 */
export function ehQuiral<F>(fam: Familia<F>, f: F): boolean {
  const espelho = fam.assinatura(fam.reflect(f))
  for (let k = 0; k < fam.passosNoCiclo; k++) {
    if (fam.assinatura(fam.rotate(f, k)) === espelho) return false
  }
  return true
}

/** Sorteia até achar uma figura utilizável. */
export function sortearUtilizavel<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): F {
  for (let tentativa = 0; tentativa < 2000; tentativa++) {
    const f = fam.sortear(rng, nivel)
    if (ehUtilizavel(fam, f)) return f
  }
  throw new Error(`família "${fam.id}": não consegui sortear figura utilizável`)
}

/** Todas as configurações utilizáveis — base dos testes exaustivos. */
export function configuracoesUtilizaveis<F>(fam: Familia<F>): F[] {
  return fam.todasAsConfiguracoes().filter((f) => ehUtilizavel(fam, f))
}

// --- Geometria compartilhada -------------------------------------------------

/** Lado do quadrado em que toda família desenha. */
export const LADO = 100

export const TINTA = '#111111'
export const TRACO = 2.5

/**
 * Rotaciona um ponto em torno do centro da caixa.
 *
 * As famílias geram coordenadas já rotacionadas em vez de usar o atributo
 * `rotate` do SpatialSpec: aquele aplica `transform="rotate()"` em torno da
 * ORIGEM do SVG, não do centro da figura, e o resultado sairia do quadro.
 */
export function girarPonto(x: number, y: number, graus: number): { x: number; y: number } {
  const rad = (graus * Math.PI) / 180
  const cx = LADO / 2
  const cy = LADO / 2
  const dx = x - cx
  const dy = y - cy
  return {
    x: arred(cx + dx * Math.cos(rad) - dy * Math.sin(rad)),
    y: arred(cy + dx * Math.sin(rad) + dy * Math.cos(rad)),
  }
}

export function arred(n: number): number {
  return Math.round(n * 100) / 100
}
