import type { Rng } from '../../rng'
import type { SpatialSpec } from '../../schema'
import type { Difficulty } from '../../taxonomy'
import { arred, girarPonto, LADO, semSimetriaRotacional, TINTA, TRACO, type Familia } from './contrato'

/**
 * Uma forma com atributos independentes — o vocabulário da imagem 10, onde
 * triângulos alternam preenchimento e direção ao longo da sequência.
 *
 * O que se testa aqui não é rotação mental, é rastrear DUAS regras ao mesmo
 * tempo: o preenchimento alterna num ritmo e a direção noutro. Por isso a
 * figura é uma tupla de atributos e não um desenho arbitrário.
 *
 * Família deliberadamente AQUIRAL: um triângulo espelhado é igual a um
 * triângulo girado. Ela alimenta sequências e matrizes, nunca questões de
 * reflexão — a tabela de compatibilidade em `formas.ts` cuida disso. A marca
 * interna preserva isso: ela fica SEMPRE sobre o eixo de simetria da forma.
 */

export type FormaBase = 'triangulo' | 'quadrado' | 'seta' | 'losango' | 'casa'
export type Preenchimento = 'solido' | 'vazado'
export type Tamanho = 'pequeno' | 'grande'
/**
 * Pontos sobre o eixo da forma: perto da ponta, perto da base ou os dois; ou,
 * em 'dupla', um par lado a lado perto da ponta, espelhado em torno do eixo.
 *
 * Quadrado e losango só aceitam 'ponta' e 'dupla': são simétricos por
 * meia-volta, então "ponto na base" seria o MESMO desenho que "ponto na ponta"
 * girado 180° com outra assinatura — duas alternativas idênticas numa questão.
 * As pontudas não aceitam 'dupla': perto da ponta não há largura para dois.
 */
export type Marca = 'nenhuma' | 'ponta' | 'base' | 'ambas' | 'dupla'

export interface FiguraAtributos {
  forma: FormaBase
  preenchimento: Preenchimento
  /** 0 = para cima, 1 = direita, 2 = baixo, 3 = esquerda */
  direcao: number
  tamanho: Tamanho
  marca: Marca
}

const FORMAS: FormaBase[] = ['triangulo', 'quadrado', 'seta', 'losango', 'casa']
const MARCAS: Marca[] = ['nenhuma', 'ponta', 'base', 'ambas']

function marcasPermitidas(forma: FormaBase): Marca[] {
  return forma === 'quadrado' || forma === 'losango' ? ['ponta', 'dupla'] : MARCAS
}

export const familiaAtributos: Familia<FiguraAtributos> = {
  id: 'atributos',
  passosNoCiclo: 4,
  suportaReflexao: false,

  sortear(rng: Rng, nivel: Difficulty): FiguraAtributos {
    // Piso de complexidade: desde o nível 1 há três contornos e uma marca
    // interna. Antes o nível 1 era um triângulo ou uma seta lisos — quadrado e
    // losango constavam da lista, mas são simétricos e nunca passavam do
    // filtro de figura utilizável. Com a marca eles passam a valer.
    const formas: FormaBase[] = nivel <= 1 ? ['triangulo', 'seta', 'casa'] : FORMAS
    const forma = rng.pick(formas)
    const marcas = marcasPermitidas(forma).filter((m) => (nivel <= 3 ? m !== 'ambas' : m !== 'nenhuma'))
    return {
      forma,
      preenchimento: rng.pick(['solido', 'vazado'] as Preenchimento[]),
      direcao: rng.int(0, 3),
      tamanho: nivel <= 3 ? 'grande' : rng.pick(['pequeno', 'grande'] as Tamanho[]),
      marca: rng.pick(marcas.length > 0 ? marcas : marcasPermitidas(forma)),
    }
  },

  passosSecundarios: 2,

  avancarSecundario(f, passos) {
    if (((passos % 2) + 2) % 2 === 0) return f
    return { ...f, preenchimento: f.preenchimento === 'solido' ? 'vazado' : 'solido' }
  },
  rotate(f, passos) {
    return { ...f, direcao: (((f.direcao + passos) % 4) + 4) % 4 }
  },

  reflect(f) {
    // Espelho no eixo vertical: cima e baixo ficam, esquerda e direita trocam.
    return { ...f, direcao: (4 - f.direcao) % 4 }
  },

  assinatura(f) {
    return `${f.forma}|${f.preenchimento}|${f.direcao}|${f.tamanho}|${f.marca}`
  },

  variar(f, rng) {
    // Quase sempre muda a marca: um ponto que troca de ponta, some ou ganha
    // um par. Nunca o preenchimento nem o tamanho — uma figura sólida entre
    // vazadas salta aos olhos antes de qualquer comparação. O contorno muda
    // pouco, e de preferência dentro do grupo de silhueta (pontudas entre si,
    // quadrado com losango): um quadrado entre casinhas era a intrusa de "qual
    // não pertence" achada sem girar nada.
    //
    // O resultado precisa ser assimétrico sob rotação: um quadrado sem marca
    // em duas direções é o mesmo desenho com duas assinaturas, e a questão
    // sairia com duas alternativas idênticas.
    for (let tentativa = 0; tentativa < 50; tentativa++) {
      const outrasMarcas = marcasPermitidas(f.forma).filter((m) => m !== f.marca)
      // Troca de contorno em 1 de 8 variações; no quadrado e no losango, que
      // só têm uma marca alternativa, em metade — senão faltam distratores.
      const trocaContorno = outrasMarcas.length === 0 || rng.int(0, outrasMarcas.length < 2 ? 1 : 7) === 0
      const c = trocaContorno ? variarForma(f, rng) : { ...f, marca: rng.pick(outrasMarcas) }
      if (familiaAtributos.assinatura(c) !== familiaAtributos.assinatura(f) && semSimetriaRotacional(familiaAtributos, c)) {
        return c
      }
    }
    return variarForma(f, rng)
  },

  toSpec(f): SpatialSpec {
    const escala = f.tamanho === 'grande' ? 1 : 0.72
    const solido = f.preenchimento === 'solido'
    const pontos = contorno(f.forma, escala).map((p) => girarPonto(p.x, p.y, f.direcao * 90))

    const shapes: SpatialSpec['shapes'] = [
      {
        kind: 'polygon',
        points: pontos.flatMap((p) => [p.x, p.y]),
        fill: solido ? TINTA : 'none',
        stroke: TINTA,
        strokeWidth: TRACO,
      },
    ]

    // Na forma sólida a marca é um furo branco; na vazada, um ponto preto.
    for (const m of posicoesDaMarca(f.forma, f.marca, escala)) {
      const c = girarPonto(arred(LADO / 2 + m.x), arred(LADO / 2 + m.y), f.direcao * 90)
      shapes.push({
        kind: 'circle',
        cx: c.x,
        cy: c.y,
        r: arred(RAIO_MARCA * escala),
        fill: solido ? '#ffffff' : TINTA,
        stroke: solido ? '#ffffff' : TINTA,
        strokeWidth: 1,
      })
    }

    return { width: LADO, height: LADO, shapes }
  },

  todasAsConfiguracoes() {
    const todas: FiguraAtributos[] = []
    for (const forma of FORMAS) {
      for (const preenchimento of ['solido', 'vazado'] as Preenchimento[]) {
        for (let direcao = 0; direcao < 4; direcao++) {
          for (const tamanho of ['pequeno', 'grande'] as Tamanho[]) {
            for (const marca of marcasPermitidas(forma)) {
              todas.push({ forma, preenchimento, direcao, tamanho, marca })
            }
          }
        }
      }
    }
    return todas
  },
}

/** Formas de silhueta parecida: a troca entre elas pede olhar, não salta aos olhos. */
const GRUPOS: FormaBase[][] = [
  ['triangulo', 'seta', 'casa'],
  ['quadrado', 'losango'],
]

function variarForma(f: FiguraAtributos, rng: Rng): FiguraAtributos {
  // O grupo de quadrado e losango tem um membro só além da própria forma; de
  // vez em quando a troca sai do grupo, senão "ache o par idêntico" sobre um
  // quadrado não teria distratores suficientes.
  const grupo = GRUPOS.find((g) => g.includes(f.forma)) as FormaBase[]
  const opcoes = grupo.length > 2 || rng.int(0, 1) === 0 ? grupo : FORMAS
  const forma = rng.pick(opcoes.filter((x) => x !== f.forma))
  const permitidas = marcasPermitidas(forma)
  return { ...f, forma, marca: permitidas.includes(f.marca) ? f.marca : (permitidas[0] as Marca) }
}

const RAIO_MARCA = 4.5

/**
 * Onde ficam os pontos, como deslocamento vertical a partir do centro com a
 * forma apontando para cima. Cada forma tem os seus porque a parte larga muda
 * de lugar: na seta a base é a haste, estreita; na casa é o corpo, largo.
 */
function posicoesDaMarca(forma: FormaBase, marca: Marca, escala: number): { x: number; y: number }[] {
  if (marca === 'nenhuma') return []
  const r = 36 * escala
  const [ponta, base] =
    forma === 'triangulo'
      ? [-0.3, 0.3]
      : forma === 'seta'
        ? [-0.4, 0.45]
        : forma === 'casa'
          ? [-0.4, 0.4]
          : forma === 'losango'
            ? [-0.45, 0.45]
            : [-0.42, 0.42]
  if (marca === 'dupla') {
    // Mais para dentro que o 'ponta': no losango é onde há largura para dois.
    const y = arred(ponta * 0.7 * r)
    const dx = arred(0.22 * r)
    return [
      { x: -dx, y },
      { x: dx, y },
    ]
  }
  const ys = marca === 'ponta' ? [ponta] : marca === 'base' ? [base] : [ponta, base]
  return ys.map((y) => ({ x: 0, y: arred(y * r) }))
}

/** Contorno da forma apontando para cima, centrado na caixa. */
function contorno(forma: FormaBase, escala: number): { x: number; y: number }[] {
  const c = LADO / 2
  const r = 36 * escala
  const p = (x: number, y: number) => ({ x: arred(c + x), y: arred(c + y) })

  switch (forma) {
    case 'triangulo':
      return [p(0, -r), p(r * 0.88, r * 0.62), p(-r * 0.88, r * 0.62)]
    case 'quadrado':
      return [p(-r * 0.76, -r * 0.76), p(r * 0.76, -r * 0.76), p(r * 0.76, r * 0.76), p(-r * 0.76, r * 0.76)]
    case 'losango':
      return [p(0, -r), p(r * 0.68, 0), p(0, r), p(-r * 0.68, 0)]
    case 'casa':
      // Pentágono de telhado: a ponta indica a direção como no triângulo, mas
      // o corpo retangular muda a silhueta o bastante para não confundir.
      return [p(0, -r), p(r * 0.72, -r * 0.2), p(r * 0.72, r * 0.8), p(-r * 0.72, r * 0.8), p(-r * 0.72, -r * 0.2)]
    default:
      // Seta: triângulo com uma haste, para a direção ficar inequívoca.
      return [
        p(0, -r),
        p(r * 0.8, -r * 0.05),
        p(r * 0.3, -r * 0.05),
        p(r * 0.3, r * 0.8),
        p(-r * 0.3, r * 0.8),
        p(-r * 0.3, -r * 0.05),
        p(-r * 0.8, -r * 0.05),
      ]
  }
}
