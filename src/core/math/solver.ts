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
 * entende números e + - * / ( ).
 */

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'paren'; value: '(' | ')' }

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

  /** fator := '-'? ( número | '(' expressão ')' ) */
  private parseFactor(): number {
    const t = this.peek()
    if (t === undefined) throw new SolverError(`expressão incompleta: "${this.origem}"`)

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

  expectEnd(): void {
    if (this.pos !== this.tokens.length) {
      throw new SolverError(`sobrou conteúdo na expressão "${this.origem}"`)
    }
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }
}

// --- Formatação e leitura de números em pt-BR --------------------------------

export type NumberFormat = 'plain' | 'brl' | 'percent'

/** Formata para exibição. Precisa ser determinístico: o gate compara strings. */
export function formatNumber(value: number, format: NumberFormat = 'plain'): string {
  switch (format) {
    case 'brl':
      return `R$ ${fixed(value, 2)}`
    case 'percent':
      return `${fixed(value, temDecimal(value) ? 1 : 0)}%`
    case 'plain':
      return fixed(value, temDecimal(value) ? 2 : 0)
  }
}

/** Lê de volta um número exibido em pt-BR ("R$ 1.234,50" → 1234.5). */
export function parseNumberPt(texto: string): number {
  const limpo = texto
    .replace(/R\$/g, '')
    .replace(/%/g, '')
    .replace(/\s| /g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
  const valor = Number(limpo)
  if (!Number.isFinite(valor)) {
    throw new SolverError(`não consegui ler um número em "${texto}"`)
  }
  return valor
}

function fixed(value: number, casas: number): string {
  const arredondado = value.toFixed(casas)
  const [inteiro = '0', decimal] = arredondado.split('.')
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimal ? `${comMilhar},${decimal}` : comMilhar
}

function temDecimal(value: number): boolean {
  return Math.abs(value - Math.round(value)) > 1e-9
}
