import type { Rng } from '../../rng'
import type { SpatialSpec } from '../../schema'
import type { Difficulty } from '../../taxonomy'
import { arred, LADO, TINTA, TRACO, type Familia } from './contrato'

/**
 * Quadrado com arcos de quarto de círculo nos cantos.
 *
 * É o vocabulário mais comum das matrizes 3×3 de raciocínio espacial — o caso
 * das imagens de referência 9 e 11. Cada canto está vazio ou traz um arco
 * pequeno ou grande, centrado no próprio canto.
 *
 * Cantos em ordem horária a partir do superior esquerdo, que é o que torna a
 * rotação de 90° um simples deslocamento cíclico:
 *
 *     0 ── 1
 *     │    │
 *     3 ── 2
 */

/** 0 = canto vazio, 1 = arco pequeno, 2 = arco grande. */
export type Arco = 0 | 1 | 2

/** Sempre 4 posições, na ordem dos cantos. */
export type FiguraArcos = readonly [Arco, Arco, Arco, Arco]

const RAIO: Record<Exclude<Arco, 0>, number> = { 1: 26, 2: 46 }

export const familiaArcos: Familia<FiguraArcos> = {
  id: 'arcos',
  passosNoCiclo: 4,
  suportaReflexao: true,

  sortear(rng: Rng, nivel: Difficulty): FiguraArcos {
    // Os três valores SEMPRE aparecem: vazio, arco pequeno e arco grande.
    //
    // Restringir os níveis fáceis a duas opções parecia mais legível, mas um
    // arranjo binário de quatro cantos é sempre aquiral — refletir coincide
    // com alguma rotação — e a família não geraria nenhuma questão de
    // reflexão. É o terceiro valor que quebra a simetria.
    const cantos = rng.shuffle([0, 1, 2, 3])
    const f: Arco[] = [0, 0, 0, 0]
    f[cantos[0] as number] = 0
    f[cantos[1] as number] = 1
    f[cantos[2] as number] = 2
    // A dificuldade está no quarto canto: vazio deixa o desenho esparso e
    // fácil de guardar; repetido exige olhar canto a canto.
    f[cantos[3] as number] = nivel <= 2 ? 0 : rng.pick([1, 2] as Arco[])
    return f as unknown as FiguraArcos
  },

  passosSecundarios: 2,

  avancarSecundario(f, passos) {
    // Troca o tamanho dos arcos presentes, sem mexer nos cantos vazios.
    // É uma renomeação de valores, então comuta com a rotação (que mexe em
    // posições) e preserva a quiralidade.
    if (((passos % 2) + 2) % 2 === 0) return f
    return f.map((v) => (v === 1 ? 2 : v === 2 ? 1 : 0)) as unknown as FiguraArcos
  },
  rotate(f, passos) {
    // Girar 90° no sentido horário leva o canto i para o canto i+1.
    const p = ((passos % 4) + 4) % 4
    return [f[(4 - p) % 4], f[(5 - p) % 4], f[(6 - p) % 4], f[(7 - p) % 4]] as FiguraArcos
  },

  reflect(f) {
    // Espelho no eixo vertical: esquerda troca com direita, em cima e embaixo.
    return [f[1], f[0], f[3], f[2]] as FiguraArcos
  },

  assinatura(f) {
    return f.join('')
  },

  variar(f, rng) {
    // Troca um canto por outro valor: diferença mínima, mas discreta e visível.
    const i = rng.int(0, 3)
    const alternativas: Arco[] = ([0, 1, 2] as Arco[]).filter((v) => v !== f[i])
    const copia = [...f] as Arco[]
    copia[i] = rng.pick(alternativas)
    return copia as unknown as FiguraArcos
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

    f.forEach((arco, canto) => {
      if (arco === 0) return
      shapes.push({
        kind: 'path',
        d: caminhoDoArco(canto, RAIO[arco]),
        fill: 'none',
        stroke: TINTA,
        strokeWidth: TRACO,
      })
    })

    return { width: LADO, height: LADO, shapes }
  },

  todasAsConfiguracoes() {
    const valores: Arco[] = [0, 1, 2]
    const todas: FiguraArcos[] = []
    for (const a of valores) {
      for (const b of valores) {
        for (const c of valores) {
          for (const d of valores) todas.push([a, b, c, d] as const)
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
