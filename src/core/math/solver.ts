/**
 * Avaliador aritmético para o gate G2 dos problemas matemáticos.
 *
 * Cada questão de `math_word` carrega a expressão canônica que a resolve
 * (ex.: "8*12-15"). O gate avalia essa expressão e confere contra a alternativa
 * marcada — um segundo caminho, independente do gerador, chegando ao mesmo
 * número. Se os dois discordam, a questão é reprovada.
 *
 * Sem `eval` / `new Function`: o pipeline roda conteúdo gerado por LLM, e
 * executá-lo como código seria entregar a máquina de bandeja. Isto aqui só
 * entende números, + - * / ( ) e três funções de comparação de nome fixo.
 *
 * As funções existem para as questões de comparação ("qual é o menor?", "qual
 * fica mais perto de 1/3?"). Nelas a resposta não sai de uma conta, e sim de
 * escolher entre as alternativas — `min(0.07, 0.009, 0.0081)` prova qual é a
 * menor pelo mesmo caminho independente com que `8*12-15` prova uma conta.
 *
 *  - min(a, b, …)           → o menor argumento
 *  - max(a, b, …)           → o maior argumento
 *  - nearest(alvo, a, b, …) → o argumento mais perto do alvo
 *
 * Empate é erro: se dois candidatos valem o mesmo, a questão tem duas
 * respostas certas e não há gabarito a provar.
 */

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'paren'; value: '(' | ')' }
  | { kind: 'nome'; value: string }
  | { kind: 'virgula' }

const FUNCOES = ['min', 'max', 'nearest'] as const
export type FuncaoDeComparacao = (typeof FUNCOES)[number]

/** Expressão que é inteira uma chamada de comparação, com os argumentos já avaliados. */
export interface Comparacao {
  funcao: FuncaoDeComparacao
  /** em `nearest`, o primeiro argumento */
  alvo?: number
  /** os valores entre os quais se escolhe — numa questão bem formada, as alternativas */
  candidatos: number[]
  valor: number
}

export function evaluateExpression(input: string): number {
  const tokens = tokenize(input)
  const parser = new Parser(tokens, input)
  const valor = parser.parseExpression()
  parser.expectEnd()
  if (!Number.isFinite(valor)) {
    throw new SolverError(`expressão não resultou num número finito: "${input}"`)
  }
  return valor
}

export class SolverError extends Error {}

/**
 * Se a expressão inteira é uma chamada de comparação, devolve a chamada com os
 * argumentos avaliados; senão, null. O gate usa isto para conferir que os
 * candidatos da expressão são exatamente as alternativas da questão — sem essa
 * conferência, `min(1, 2)` "provaria" qualquer alternativa que valesse 1.
 */
export function comparacaoDe(input: string): Comparacao | null {
  const tokens = tokenize(input)
  const [primeiro, segundo] = tokens
  if (primeiro?.kind !== 'nome' || segundo?.kind !== 'paren' || segundo.value !== '(') return null
  const parser = new Parser(tokens, input)
  const chamada = parser.parseChamada()
  // "min(1,2)+1" é uma conta que usa min, não uma questão de comparação.
  return parser.terminou() ? chamada : null
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    const c = input[i] as string

    if (c === ' ' || c === '\t') {
      i++
      continue
    }

    if (c === '(' || c === ')') {
      tokens.push({ kind: 'paren', value: c })
      i++
      continue
    }

    if (c === '+' || c === '-' || c === '*' || c === '/') {
      tokens.push({ kind: 'op', value: c })
      i++
      continue
    }

    if (c === ',') {
      tokens.push({ kind: 'virgula' })
      i++
      continue
    }

    // Só minúsculas, e só para nome de função. Ponto, aspas e sublinhado
    // continuam proibidos: `process.exit` e `__proto__` nem tokenizam.
    if (c >= 'a' && c <= 'z') {
      let j = i
      while (j < input.length && /[a-z]/.test(input[j] as string)) j++
      tokens.push({ kind: 'nome', value: input.slice(i, j) })
      i = j
      continue
    }

    if (c >= '0' && c <= '9') {
      let j = i
      while (j < input.length && /[0-9]/.test(input[j] as string)) j++
      if (input[j] === '.') {
        j++
        while (j < input.length && /[0-9]/.test(input[j] as string)) j++
      }
      const bruto = input.slice(i, j)
      const value = Number(bruto)
      if (!Number.isFinite(value)) {
        throw new SolverError(`número inválido: "${bruto}"`)
      }
      tokens.push({ kind: 'num', value })
      i = j
      continue
    }

    throw new SolverError(`caractere não permitido na expressão: "${c}"`)
  }

  if (tokens.length === 0) throw new SolverError('expressão vazia')
  return tokens
}

class Parser {
  private pos = 0

  constructor(
    private readonly tokens: Token[],
    private readonly origem: string,
  ) {}

  /** expressão := termo (('+' | '-') termo)* */
  parseExpression(): number {
    let valor = this.parseTerm()
    for (;;) {
      const t = this.peek()
      if (t?.kind === 'op' && (t.value === '+' || t.value === '-')) {
        this.pos++
        const direita = this.parseTerm()
        valor = t.value === '+' ? valor + direita : valor - direita
      } else {
        return valor
      }
    }
  }

  /** termo := fator (('*' | '/') fator)* */
  private parseTerm(): number {
    let valor = this.parseFactor()
    for (;;) {
      const t = this.peek()
      if (t?.kind === 'op' && (t.value === '*' || t.value === '/')) {
        this.pos++
        const direita = this.parseFactor()
        if (t.value === '/' && direita === 0) {
          throw new SolverError(`divisão por zero em "${this.origem}"`)
        }
        valor = t.value === '*' ? valor * direita : valor / direita
      } else {
        return valor
      }
    }
  }

  /** fator := '-'? ( número | chamada | '(' expressão ')' ) */
  private parseFactor(): number {
    const t = this.peek()
    if (t === undefined) throw new SolverError(`expressão incompleta: "${this.origem}"`)

    if (t.kind === 'nome') return this.parseChamada().valor

    if (t.kind === 'op' && t.value === '-') {
      this.pos++
      return -this.parseFactor()
    }
    if (t.kind === 'op' && t.value === '+') {
      this.pos++
      return this.parseFactor()
    }
    if (t.kind === 'num') {
      this.pos++
      return t.value
    }
    if (t.kind === 'paren' && t.value === '(') {
      this.pos++
      const valor = this.parseExpression()
      const fecha = this.peek()
      if (fecha?.kind !== 'paren' || fecha.value !== ')') {
        throw new SolverError(`parêntese não fechado em "${this.origem}"`)
      }
      this.pos++
      return valor
    }
    throw new SolverError(`token inesperado em "${this.origem}"`)
  }

  /** chamada := nome '(' expressão (',' expressão)* ')' */
  parseChamada(): Comparacao {
    const t = this.peek()
    if (t?.kind !== 'nome' || !(FUNCOES as readonly string[]).includes(t.value)) {
      const nome = t?.kind === 'nome' ? t.value : '?'
      throw new SolverError(`função não permitida "${nome}" em "${this.origem}"`)
    }
    const funcao = t.value as FuncaoDeComparacao
    this.pos++
    const abre = this.peek()
    if (abre?.kind !== 'paren' || abre.value !== '(') {
      throw new SolverError(`"${funcao}" sem parênteses em "${this.origem}"`)
    }
    this.pos++

    const args = [this.parseExpression()]
    while (this.peek()?.kind === 'virgula') {
      this.pos++
      args.push(this.parseExpression())
    }
    const fecha = this.peek()
    if (fecha?.kind !== 'paren' || fecha.value !== ')') {
      throw new SolverError(`parêntese não fechado em "${this.origem}"`)
    }
    this.pos++

    const alvo = funcao === 'nearest' ? args[0] : undefined
    const candidatos = funcao === 'nearest' ? args.slice(1) : args
    if (candidatos.length < 2) {
      throw new SolverError(`"${funcao}" precisa de ao menos dois candidatos em "${this.origem}"`)
    }

    // Nota de cada candidato na função pedida: quanto MENOR, melhor.
    const nota = (v: number): number =>
      funcao === 'min' ? v : funcao === 'max' ? -v : Math.abs(v - (alvo as number))
    const notas = candidatos.map(nota)
    const melhor = Math.min(...notas)
    const vencedores = candidatos.filter((_, i) => Math.abs((notas[i] as number) - melhor) < 1e-12)
    if (vencedores.length !== 1) {
      throw new SolverError(`empate em "${funcao}": a comparação não tem resposta única em "${this.origem}"`)
    }
    return { funcao, ...(alvo !== undefined ? { alvo } : {}), candidatos, valor: vencedores[0] as number }
  }

  terminou(): boolean {
    return this.pos === this.tokens.length
  }

  expectEnd(): void {
    if (this.pos !== this.tokens.length) {
      throw new SolverError(`sobrou conteúdo na expressão "${this.origem}"`)
    }
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }
}

// --- Formatacao e leitura de numeros ----------------------------------------

/**
 * Formatacao en-US, nao pt-BR.
 *
 * O conteudo das questoes e sempre ingles (ver core/i18n.ts), e numero faz
 * parte do conteudo: uma alternativa "R$ 1.234,50" numa prova em ingles esta
 * no idioma errado tanto quanto um enunciado traduzido pela metade. A separacao
 * e milhar por virgula e decimal por ponto, como a CCAT apresenta.
 */
export type NumberFormat = 'plain' | 'currency' | 'percent'

/** Formata para exibicao. Precisa ser deterministico: o gate compara strings. */
export function formatNumber(value: number, format: NumberFormat = 'plain'): string {
  switch (format) {
    case 'currency':
      return `$${fixed(value, 2)}`
    case 'percent':
      return `${fixed(value, temDecimal(value) ? 1 : 0)}%`
    case 'plain':
      return fixed(value, temDecimal(value) ? 2 : 0)
  }
}

/**
 * Le de volta um numero exibido ("$1,234.50" -> 1234.5). Fracao simples
 * ("7/13") tambem e numero: nas questoes de comparacao ela e a propria
 * alternativa, e o gate precisa do valor dela.
 */
export function parseNumber(texto: string): number {
  const limpo = limparNumero(texto)
  const fracao = /^(-?\d+)\/(\d+)$/.exec(limpo)
  if (fracao) {
    const den = Number(fracao[2])
    if (den === 0) throw new SolverError(`fracao com denominador zero em "${texto}"`)
    return Number(fracao[1]) / den
  }
  const valor = Number(limpo)
  if (!Number.isFinite(valor)) {
    throw new SolverError(`nao consegui ler um numero em "${texto}"`)
  }
  return valor
}

/**
 * Quanto o valor exibido pode se afastar do exato e ainda ser a mesma
 * resposta: meia unidade da ultima casa mostrada, com teto de 0.005.
 *
 * O teto e o limite antigo do gate, pensado para centavos, e segue valendo ate
 * duas casas. Com mais casas o limite aperta junto: entre 0.0077 e 0.00779 a
 * diferenca e 0.00009, e uma tolerancia fixa de 0.005 aprovaria a alternativa
 * errada numa questao de "qual e o menor". Fracao e exata.
 */
export function toleranciaDe(texto: string): number {
  const limpo = limparNumero(texto)
  if (limpo.includes('/')) return 1e-9
  const casas = limpo.split('.')[1]?.length ?? 0
  return Math.min(0.005, 0.5 * 10 ** -casas)
}

function limparNumero(texto: string): string {
  return texto
    .replace(/\$/g, '')
    .replace(/%/g, '')
    .replace(/\s| /g, '')
    .replace(/,/g, '')
}

function fixed(value: number, casas: number): string {
  const arredondado = value.toFixed(casas)
  const [inteiro = '0', decimal] = arredondado.split('.')
  const negativo = inteiro.startsWith('-')
  const digitos = negativo ? inteiro.slice(1) : inteiro
  const comMilhar = digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const corpo = negativo ? `-${comMilhar}` : comMilhar
  return decimal ? `${corpo}.${decimal}` : corpo
}

function temDecimal(value: number): boolean {
  return Math.abs(value - Math.round(value)) > 1e-9
}
