import type { LocalizedText } from '../i18n'
import { optionIdAt } from '../optionIds'
import type { Rng } from '../rng'
import type { SpatialSpec } from '../schema'
import type { Difficulty } from '../taxonomy'
import {
  type Familia,
  type FamiliaQualquer,
  sortearUtilizavel,
} from './figuras/index'
import { matrizParaSpec, sequenciaParaSpec } from './layout'

/**
 * As formas de pergunta do raciocínio espacial.
 *
 * A separação que organiza o módulo: a FAMÍLIA (em `figuras/`) decide como a
 * figura é desenhada; a FORMA, aqui, decide o que se pergunta sobre ela. Toda
 * forma é genérica sobre `Familia<F>` e não sabe se está olhando arcos num
 * quadrado ou ponteiros num mostrador.
 *
 * É o que produz variedade de verdade: seis formas × cinco vocabulários, em vez
 * das cinco perguntas sobre o mesmo desenho que existiam antes.
 */

export interface QuestaoEspacial {
  subtipo: string
  familia: string
  /** sempre em inglês: a CCAT é aplicada em inglês */
  stem: string
  stemSpatial?: SpatialSpec
  options: { id: string; spatial: SpatialSpec }[]
  answerId: string
  explanation: LocalizedText
  /** assinatura da figura de cada alternativa, na ordem exibida */
  assinaturasDasOpcoes: string[]
  /**
   * Toda assinatura que satisfaz a regra da questão.
   *
   * O gate exige que EXATAMENTE UMA alternativa esteja neste conjunto. Repare
   * que é um conjunto, não um valor: em "qual é a figura girada?" qualquer
   * rotação serviria como resposta — a questão só é válida porque apenas uma
   * delas foi colocada entre as alternativas.
   */
  assinaturasCorretas: string[]
}

export type FormaDePergunta = <F>(
  fam: Familia<F>,
  rng: Rng,
  nivel: Difficulty,
) => QuestaoEspacial

// --- Utilidades --------------------------------------------------------------

function quantasAlternativas(nivel: Difficulty): number {
  return nivel <= 2 ? 4 : 5
}

/** Todas as rotações distintas de uma figura. */
function rotacoes<F>(fam: Familia<F>, f: F): F[] {
  return Array.from({ length: fam.passosNoCiclo }, (_, k) => fam.rotate(f, k))
}

function assinaturasDe<F>(fam: Familia<F>, fs: F[]): string[] {
  return fs.map((f) => fam.assinatura(f))
}

/**
 * Todo o espaço alcançável a partir de uma figura: cada rotação combinada com
 * cada passo do eixo de atributo, mais o reflexo.
 *
 * Serve de reserva para quando os distratores "erro típico" colapsam entre si.
 * Isso acontece de verdade: em `atributos`, que é aquiral, o reflexo e mais de
 * uma rotação são a MESMA figura, e a lista escrita à mão rendia três
 * alternativas onde a questão precisava de cinco.
 */
function poolDeDistratores<F>(fam: Familia<F>, base: F): F[] {
  const pool: F[] = []
  for (let k = 0; k < fam.passosNoCiclo; k++) {
    for (let a = 0; a < fam.passosSecundarios; a++) {
      pool.push(fam.avancarSecundario(fam.rotate(base, k), a))
      pool.push(fam.avancarSecundario(fam.rotate(fam.reflect(base), k), a))
    }
  }
  return pool
}

function ehRotacaoDe<F>(fam: Familia<F>, a: F, b: F): boolean {
  const alvo = fam.assinatura(a)
  return rotacoes(fam, b).some((r) => fam.assinatura(r) === alvo)
}

/**
 * Monta as alternativas: embaralha a correta entre os distratores, descartando
 * qualquer candidato que repita uma assinatura já escolhida.
 *
 * Deduplicar por assinatura em vez de por identidade é o que impede duas
 * alternativas com o mesmo desenho — o defeito que tornava algumas questões
 * antigas irrespondíveis.
 */
function montar<F>(
  fam: Familia<F>,
  rng: Rng,
  correta: F,
  candidatos: F[],
  assinaturasCorretas: string[],
  quantas: number,
): Pick<QuestaoEspacial, 'options' | 'answerId' | 'assinaturasDasOpcoes' | 'assinaturasCorretas'> {
  const corretas = new Set(assinaturasCorretas)
  if (!corretas.has(fam.assinatura(correta))) {
    throw new Error('forma inconsistente: a resposta não satisfaz a própria regra')
  }

  const escolhidos: F[] = [correta]
  const vistas = new Set([fam.assinatura(correta)])

  for (const c of candidatos) {
    if (escolhidos.length >= quantas) break
    const k = fam.assinatura(c)
    // Um distrator que satisfaz a regra daria uma segunda resposta certa.
    if (vistas.has(k) || corretas.has(k)) continue
    vistas.add(k)
    escolhidos.push(c)
  }

  if (escolhidos.length < quantas) {
    throw new Error(
      `família "${fam.id}": só consegui ${escolhidos.length} alternativas de ${quantas}`,
    )
  }

  const embaralhadas = rng.shuffle(escolhidos.map((f, i) => ({ f, correta: i === 0 })))

  return {
    options: embaralhadas.map((o, i) => ({
      id: optionIdAt(i) as string,
      spatial: fam.toSpec(o.f),
    })),
    answerId: optionIdAt(embaralhadas.findIndex((o) => o.correta)) as string,
    assinaturasDasOpcoes: embaralhadas.map((o) => fam.assinatura(o.f)),
    assinaturasCorretas,
  }
}

// --- As formas ---------------------------------------------------------------

/**
 * "Qual opção mostra a figura acima GIRADA?"
 *
 * Os distratores são a figura ESPELHADA, em várias rotações. É o par
 * rotação-versus-reflexo, o teste espacial clássico, e só funciona em família
 * quiral — daí a tabela de compatibilidade no fim do arquivo.
 */
export function rotacao<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): QuestaoEspacial {
  const f = sortearUtilizavel(fam, rng, nivel)
  const passos = rng.int(1, fam.passosNoCiclo - 1)
  const correta = fam.rotate(f, passos)
  const espelho = fam.reflect(f)

  return {
    subtipo: 'rotacao',
    familia: fam.id,
    stem: 'Which option shows the figure above rotated — not mirrored?',
    stemSpatial: fam.toSpec(f),
    explanation: {
      en: 'Four options are mirror images of the figure: flipping it swaps left and right in a way no rotation can undo. Only the correct option keeps the same handedness, turned a quarter at a time.',
      pt: 'Quatro alternativas são o reflexo da figura: espelhar troca esquerda e direita de um jeito que nenhuma rotação desfaz. Só a alternativa correta mantém a mesma "mão", girada de um quarto em um quarto.',
    },
    ...montar(
      fam,
      rng,
      correta,
      rng.shuffle(rotacoes(fam, espelho)),
      assinaturasDe(fam, rotacoes(fam, f)),
      quantasAlternativas(nivel),
    ),
  }
}

/** "Qual opção é o REFLEXO da figura acima?" — o espelho do caso anterior. */
export function reflexao<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): QuestaoEspacial {
  const f = sortearUtilizavel(fam, rng, nivel)
  const espelho = fam.reflect(f)
  // O reflexo aparece pouco girado: a questão é reconhecer o espelho, não
  // acumular uma rotação grande por cima dele.
  const correta = fam.rotate(espelho, rng.pick([0, 1]))

  return {
    subtipo: 'reflexao',
    familia: fam.id,
    stem: 'Which option is the mirror image of the figure above?',
    stemSpatial: fam.toSpec(f),
    explanation: {
      en: 'The other options are the same figure simply turned. The mirror image is the one you cannot reach by rotating: left and right have swapped.',
      pt: 'As outras alternativas são a mesma figura apenas girada. O reflexo é aquele que você não alcança girando: esquerda e direita trocaram de lado.',
    },
    ...montar(
      fam,
      rng,
      correta,
      rng.shuffle(rotacoes(fam, f)),
      assinaturasDe(fam, rotacoes(fam, espelho)),
      quantasAlternativas(nivel),
    ),
  }
}

/** "Qual não pertence?" — todas são a mesma figura girada, menos uma. */
export function oddOneOut<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): QuestaoEspacial {
  const f = sortearUtilizavel(fam, rng, nivel)
  const intrusa = acharIntrusa(fam, rng, f)
  const quantas = quantasAlternativas(nivel)

  const iguais = rng.shuffle(rotacoes(fam, f)).slice(0, quantas - 1)

  return {
    subtipo: 'odd_one_out',
    familia: fam.id,
    stem: 'All but one of these are the same figure rotated. Which one is different?',
    stemSpatial: undefined,
    explanation: fam.suportaReflexao
      ? {
          en: 'Every other option is the same figure turned by a quarter. The odd one is its mirror image — no amount of turning will line it up with the rest.',
          pt: 'Todas as outras alternativas são a mesma figura girada um quarto de volta. A intrusa é o reflexo dela — nenhuma rotação a alinha com as demais.',
        }
      : {
          en: 'Every other option is the same figure turned. The odd one had one of its features changed, so no rotation makes it match.',
          pt: 'Todas as outras são a mesma figura girada. A intrusa teve uma característica alterada, então nenhuma rotação a faz coincidir.',
        },
    ...montar(
      fam,
      rng,
      intrusa,
      iguais,
      [fam.assinatura(intrusa)],
      quantas,
    ),
  }
}

/**
 * A intrusa não pode ser, ela mesma, uma rotação da figura base — senão a
 * questão passa a ter zero respostas certas em vez de uma.
 */
function acharIntrusa<F>(fam: Familia<F>, rng: Rng, f: F): F {
  if (fam.suportaReflexao) return fam.rotate(fam.reflect(f), rng.int(0, fam.passosNoCiclo - 1))

  for (let tentativa = 0; tentativa < 500; tentativa++) {
    const c = fam.variar(f, rng)
    if (!ehRotacaoDe(fam, c, f)) return c
  }
  throw new Error(`família "${fam.id}": não achei uma intrusa que não fosse rotação da base`)
}

/** "Qual figura vem a seguir?" — progressão de rotação, e de atributo nos níveis altos. */
export function serieFormas<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): QuestaoEspacial {
  const f = sortearUtilizavel(fam, rng, nivel)
  const visiveis = nivel <= 2 ? 3 : 4
  const passo = rng.pick([1, fam.passosNoCiclo > 4 ? 2 : 1])
  // Nos níveis altos o atributo avança junto com a rotação: duas regras ao
  // mesmo tempo, como na imagem de referência da série de triângulos.
  const passoAtributo = nivel >= 4 && fam.passosSecundarios > 1 ? 1 : 0

  const naPosicao = (i: number): F =>
    fam.avancarSecundario(fam.rotate(f, i * passo), i * passoAtributo)

  const celulas = Array.from({ length: visiveis }, (_, i) => fam.toSpec(naPosicao(i)))
  const correta = naPosicao(visiveis)

  // Erros típicos primeiro: parar um passo antes, andar um a mais, esquecer o
  // atributo. O pool sistemático vem atrás, como reserva, porque em algumas
  // famílias os erros típicos coincidem entre si.
  const candidatos = [
    naPosicao(visiveis - 1),
    naPosicao(visiveis + 1),
    fam.rotate(f, visiveis * passo),
    fam.avancarSecundario(correta, 1),
    ...poolDeDistratores(fam, correta),
  ]

  return {
    subtipo: 'serie_formas',
    familia: fam.id,
    stem: 'Which figure continues the sequence?',
    stemSpatial: sequenciaParaSpec([...celulas, null]),
    explanation:
      passoAtributo > 0
        ? {
            en: 'Two things change at once: the figure turns by a fixed step each time, and its attribute advances as well. The answer applies both changes one more time.',
            pt: 'Duas coisas mudam ao mesmo tempo: a figura gira um passo fixo a cada casa e o atributo também avança. A resposta aplica as duas mudanças mais uma vez.',
          }
        : {
            en: 'The figure turns by the same fixed step at every position. Pick a single feature and follow where it lands next.',
            pt: 'A figura gira sempre o mesmo passo a cada posição. Escolha um detalhe só e acompanhe onde ele vai parar em seguida.',
          },
    ...montar(fam, rng, correta, candidatos, [fam.assinatura(correta)], quantasAlternativas(nivel)),
  }
}

/** Matriz 3×3 com a última célula faltando. */
export function matriz<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): QuestaoEspacial {
  const f = sortearUtilizavel(fam, rng, nivel)
  const temAtributo = fam.passosSecundarios > 1

  // Regra por coluna e regra por linha. Com eixo de atributo disponível, as
  // duas regras são de naturezas diferentes — gira ao longo da linha, muda o
  // atributo ao longo da coluna —, que é o formato das matrizes reais.
  const porColuna = rng.pick([1, fam.passosNoCiclo > 4 ? 2 : 1])
  const porLinha = temAtributo ? 0 : rng.pick([1, fam.passosNoCiclo - 1])
  const atributoPorLinha = temAtributo ? 1 : 0

  const celula = (linha: number, coluna: number): F =>
    fam.avancarSecundario(
      fam.rotate(f, coluna * porColuna + linha * porLinha),
      linha * atributoPorLinha,
    )

  const grade: (SpatialSpec | null)[] = []
  for (let l = 0; l < 3; l++) {
    for (let c = 0; c < 3; c++) {
      grade.push(l === 2 && c === 2 ? null : fam.toSpec(celula(l, c)))
    }
  }

  const correta = celula(2, 2)
  // Erros típicos: pegar a célula de cima, a da esquerda, aplicar só uma das
  // duas regras. O pool sistemático entra como reserva.
  const candidatos = [
    celula(1, 2),
    celula(2, 1),
    celula(0, 2),
    fam.avancarSecundario(correta, 1),
    ...poolDeDistratores(fam, correta),
  ]

  return {
    subtipo: 'matriz',
    familia: fam.id,
    stem: 'Which figure completes the grid?',
    stemSpatial: matrizParaSpec(grade),
    explanation: temAtributo
      ? {
          en: 'Read the grid twice. Across each row the figure turns by a fixed step; down each column its attribute changes. The missing cell is the one that obeys both readings.',
          pt: 'Leia a grade duas vezes. Ao longo de cada linha a figura gira um passo fixo; ao longo de cada coluna o atributo muda. A célula que falta é a que obedece às duas leituras.',
        }
      : {
          en: 'The figure turns by a fixed step across each row and by another fixed step down each column. Apply both to the cell before the gap.',
          pt: 'A figura gira um passo fixo ao longo da linha e outro passo fixo ao longo da coluna. Aplique os dois à célula anterior ao vão.',
        },
    ...montar(fam, rng, correta, candidatos, [fam.assinatura(correta)], quantasAlternativas(nivel)),
  }
}

/**
 * "Qual opção é IDÊNTICA à figura acima?" — o tipo comparação visual.
 *
 * Os distratores vêm de `variar`, que faz uma alteração mínima porém discreta:
 * um canto troca de arco, um ponteiro muda de casa. Mínima o bastante para
 * exigir conferência item a item, discreta o bastante para ser visível.
 */
export function parIdentico<F>(fam: Familia<F>, rng: Rng, nivel: Difficulty): QuestaoEspacial {
  const f = sortearUtilizavel(fam, rng, nivel)

  const candidatos: F[] = []
  for (let i = 0; i < 60; i++) {
    const v = fam.variar(f, rng)
    // Uma rotação da base não serve como distrator aqui: a pergunta é sobre
    // ser idêntica, e "a mesma figura girada" é uma discussão diferente.
    if (!ehRotacaoDe(fam, v, f)) candidatos.push(v)
    const w = fam.variar(v, rng)
    if (!ehRotacaoDe(fam, w, f)) candidatos.push(w)
  }

  return {
    subtipo: 'identical_pair',
    familia: fam.id,
    stem: 'Which option is exactly identical to the figure above?',
    stemSpatial: fam.toSpec(f),
    explanation: {
      en: 'Every option differs from the model in at most one detail. Do not judge the overall shape — pick one position at a time and compare it across the options.',
      pt: 'Cada alternativa difere do modelo em no máximo um detalhe. Não julgue pela forma geral — escolha uma posição por vez e compare-a entre as alternativas.',
    },
    ...montar(fam, rng, f, candidatos, [fam.assinatura(f)], quantasAlternativas(nivel)),
  }
}

// --- Tabela de compatibilidade ----------------------------------------------

/**
 * Quais vocabulários cada forma aceita.
 *
 * `atributos` é aquiral de propósito, então fica fora de rotação e reflexão:
 * ali o espelho sempre coincide com alguma rotação e a questão teria duas
 * respostas certas. É o mesmo defeito reportado nas capturas de tela da versão
 * anterior, agora impossível de reintroduzir sem mexer nesta tabela.
 */
export const FORMAS: Record<
  string,
  { fn: FormaDePergunta; exigeQuiralidade: boolean }
> = {
  rotacao: { fn: rotacao as FormaDePergunta, exigeQuiralidade: true },
  reflexao: { fn: reflexao as FormaDePergunta, exigeQuiralidade: true },
  odd_one_out: { fn: oddOneOut as FormaDePergunta, exigeQuiralidade: false },
  serie_formas: { fn: serieFormas as FormaDePergunta, exigeQuiralidade: false },
  matriz: { fn: matriz as FormaDePergunta, exigeQuiralidade: false },
  identical_pair: { fn: parIdentico as FormaDePergunta, exigeQuiralidade: false },
}

export function familiaCombina(forma: string, fam: FamiliaQualquer): boolean {
  const def = FORMAS[forma]
  if (!def) return false
  return def.exigeQuiralidade ? fam.suportaReflexao : true
}
