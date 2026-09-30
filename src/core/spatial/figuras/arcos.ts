import type { Rng } from '../../rng'
import type { SpatialSpec } from '../../schema'
import type { Difficulty } from '../../taxonomy'
import { arred, girarPonto, LADO, TINTA, TRACO, type Familia } from './contrato'

/**
 * Quadrado com arcos de quarto de círculo nos cantos.
 *
 * É o vocabulário mais comum das matrizes 3×3 de raciocínio espacial — o caso
 * das imagens de referência 9 e 11. Cada canto está vazio ou traz um arco
 * pequeno, um grande ou os dois juntos, centrados no próprio canto; nos níveis
 * altos um ponto deslocado do centro aponta para um dos lados.
 *
 * Cantos em ordem horária a partir do superior esquerdo, que é o que torna a
 * rotação de 90° um simples deslocamento cíclico:
 *
 *     0 ── 1
 *     │    │
 *     3 ── 2
 */

/** 0 = canto vazio, 1 = arco pequeno, 2 = arco grande, 3 = os dois arcos. */
export type Arco = 0 | 1 | 2 | 3

export interface FiguraArcos {
  /** Sempre 4 posições, na ordem dos cantos. */
  cantos: readonly [Arco, Arco, Arco, Arco]
  /**
   * Lado para onde aponta o ponto deslocado do centro — 0 = cima, 1 = direita,
   * 2 = baixo, 3 = esquerda —, ou `null` sem ponto. Gira junto com os cantos.
   */
  ponto: number | null
}

const RAIO_PEQUENO = 26
const RAIO_GRANDE = 46

/**
 * Onde fica o ponto: 18 do centro, na direção do lado. Com os dois cantos
 * vizinhos em arco grande sobram ~5 de folga até a curva — o ponto nunca
 * encosta num arco, que foi o problema de pôr uma marca na borda do quadrado.
 */
const DESLOCAMENTO_PONTO = 18
const RAIO_PONTO = 4.5

export const familiaArcos: Familia<FiguraArcos> = {
  id: 'arcos',
  passosNoCiclo: 4,
  suportaReflexao: true,

  sortear(rng: Rng, nivel: Difficulty): FiguraArcos {
    // Vazio, arco pequeno e arco grande SEMPRE aparecem nos níveis baixos.
    //
    // Restringir a duas opções parecia mais legível, mas um arranjo binário de
    // quatro cantos é sempre aquiral — refletir coincide com alguma rotação — e
    // a família não geraria nenhuma questão de reflexão. É o terceiro valor que
    // quebra a simetria.
    //
    // O piso de complexidade subiu: o quarto canto já vem ocupado desde o nível
    // 1 (antes era vazio até o 2, e a figura inteira eram dois arcos). O arco
    // duplo entra no 2 e o ponto deslocado no 4 — é ele que dá o quinto
    // elemento que as figuras dos níveis altos não tinham.
    const base: Arco[] =
      nivel <= 2
        ? [0, 1, 2, rng.pick((nivel === 1 ? [1, 2] : [1, 2, 3]) as Arco[])]
        : nivel === 3
          ? [0, 1, 2, 3]
          : [1, 2, 3, rng.pick((nivel === 4 ? [0, 1, 2, 3] : [1, 2, 3]) as Arco[])]
    const cantos = rng.shuffle(base) as unknown as FiguraArcos['cantos']
    const ponto = nivel >= 4 ? rng.int(0, 3) : null
    return { cantos, ponto }
  },

  passosSecundarios: 2,

  avancarSecundario(f, passos) {
    // Troca o tamanho dos arcos simples, sem mexer nos cantos vazios nem nos
    // duplos. É uma renomeação de valores, então comuta com a rotação (que mexe
    // em posições) e preserva a quiralidade.
    if (((passos % 2) + 2) % 2 === 0) return f
    return {
      ...f,
      cantos: f.cantos.map((v) => (v === 1 ? 2 : v === 2 ? 1 : v)) as unknown as FiguraArcos['cantos'],
    }
  },

  rotate(f, passos) {
    // Girar 90° no sentido horário leva o canto i para o canto i+1.
    const p = ((passos % 4) + 4) % 4
    const c = f.cantos
    return {
      cantos: [c[(4 - p) % 4], c[(5 - p) % 4], c[(6 - p) % 4], c[(7 - p) % 4]] as FiguraArcos['cantos'],
      ponto: f.ponto === null ? null : (f.ponto + p) % 4,
    }
  },

  reflect(f) {
    // Espelho no eixo vertical: esquerda troca com direita, em cima e embaixo.
    const c = f.cantos
    return {
      cantos: [c[1], c[0], c[3], c[2]] as FiguraArcos['cantos'],
      ponto: f.ponto === null ? null : (4 - f.ponto) % 4,
    }
  },

  assinatura(f) {
    return `${f.cantos.join('')}${f.ponto === null ? '' : `.${f.ponto}`}`
  },

  variar(f, rng) {
    // Diferença mínima, mas discreta e visível. Com ponto, metade das vezes é
    // ele que muda de lado; senão um canto troca de valor — de preferência para
    // um valor que JÁ existe na figura. Um arco duplo surgindo do nada saltaria
    // aos olhos antes de qualquer comparação, e a intrusa de "qual não
    // pertence" ficaria óbvia pelo motivo errado.
    if (f.ponto !== null && rng.int(0, 1) === 0) {
      return { ...f, ponto: (f.ponto + rng.pick([1, 2, 3])) % 4 }
    }
    const i = rng.int(0, 3)
    const presentes = ([0, 1, 2, 3] as Arco[]).filter((v) => v !== f.cantos[i] && f.cantos.includes(v))
    const todos = ([0, 1, 2, 3] as Arco[]).filter((v) => v !== f.cantos[i])
    const copia = [...f.cantos] as Arco[]
    copia[i] = rng.pick(presentes.length > 0 ? presentes : todos)
    return { ...f, cantos: copia as unknown as FiguraArcos['cantos'] }
  },

  toSpec(f): SpatialSpec {
    const shapes: SpatialSpec['shapes'] = [
      {
        kind: 'rect',
        x: TRACO,
        y: TRACO,
        w: LADO - TRACO * 2,
        h: LADO - TRACO * 2,
        fill: 'none',
        stroke: TINTA,
        strokeWidth: TRACO,
      },
    ]

    f.cantos.forEach((arco, canto) => {
      const raios = arco === 0 ? [] : arco === 1 ? [RAIO_PEQUENO] : arco === 2 ? [RAIO_GRANDE] : [RAIO_PEQUENO, RAIO_GRANDE]
      for (const r of raios) {
        shapes.push({
          kind: 'path',
          d: caminhoDoArco(canto, r),
          fill: 'none',
          stroke: TINTA,
          strokeWidth: TRACO,
        })
      }
    })

    if (f.ponto !== null) {
      const c = girarPonto(LADO / 2, LADO / 2 - DESLOCAMENTO_PONTO, f.ponto * 90)
      shapes.push({ kind: 'circle', cx: c.x, cy: c.y, r: RAIO_PONTO, fill: TINTA, stroke: TINTA, strokeWidth: 1 })
    }

    return { width: LADO, height: LADO, shapes }
  },

  todasAsConfiguracoes() {
    const valores: Arco[] = [0, 1, 2, 3]
    const todas: FiguraArcos[] = []
    for (const a of valores) {
      for (const b of valores) {
        for (const c of valores) {
          for (const d of valores) {
            for (const ponto of [null, 0, 1, 2, 3]) todas.push({ cantos: [a, b, c, d], ponto })
          }
        }
      }
    }
    return todas
  },
}

/**
 * Quarto de círculo centrado no canto, abrindo para dentro do quadrado.
 *
 * Os quatro cantos usam sweep-flag 1 porque os extremos são dados na ordem em
 * que o ângulo cresce no sistema do SVG (y para baixo). Escrever cada um
 * explicitamente é mais legível do que derivar o flag em tempo de execução.
 */
function caminhoDoArco(canto: number, r: number): string {
  const m = TRACO
  const f = LADO - TRACO
  const a = arred

  switch (canto) {
    case 0: // superior esquerdo
      return `M ${a(m + r)} ${m} A ${r} ${r} 0 0 1 ${m} ${a(m + r)}`
    case 1: // superior direito
      return `M ${f} ${a(m + r)} A ${r} ${r} 0 0 1 ${a(f - r)} ${m}`
    case 2: // inferior direito
      return `M ${a(f - r)} ${f} A ${r} ${r} 0 0 1 ${f} ${a(f - r)}`
    default: // inferior esquerdo
      return `M ${m} ${a(f - r)} A ${r} ${r} 0 0 1 ${a(m + r)} ${f}`
  }
}
