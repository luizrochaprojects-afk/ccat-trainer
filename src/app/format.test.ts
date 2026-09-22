import { describe, expect, it } from 'vitest'
import { marcoDoRelogio } from './format'

const EXAME = 900_000 // 15 min
const DRILL = 18_000

describe('marcoDoRelogio', () => {
  it('não anuncia nada enquanto nenhum marco foi cruzado', () => {
    expect(marcoDoRelogio(EXAME, EXAME)).toBeNull()
    expect(marcoDoRelogio(301_000, EXAME)).toBeNull()
  })

  it('devolve o marco no instante em que ele é cruzado', () => {
    expect(marcoDoRelogio(300_000, EXAME)).toBe(300_000)
    expect(marcoDoRelogio(120_000, EXAME)).toBe(120_000)
    expect(marcoDoRelogio(60_000, EXAME)).toBe(60_000)
    expect(marcoDoRelogio(30_000, EXAME)).toBe(30_000)
    expect(marcoDoRelogio(10_000, EXAME)).toBe(10_000)
  })

  /**
   * A propriedade que sustenta o `aria-live`: entre dois marcos o valor não se
   * mexe. É isso que impede o leitor de tela de repetir a contagem quatro vezes
   * por segundo — o nó só muda de conteúdo quando a faixa muda.
   */
  it('mantém o mesmo valor ao longo de toda a faixa', () => {
    expect(marcoDoRelogio(299_000, EXAME)).toBe(300_000)
    expect(marcoDoRelogio(121_000, EXAME)).toBe(300_000)
    expect(marcoDoRelogio(59_000, EXAME)).toBe(60_000)
    expect(marcoDoRelogio(31_000, EXAME)).toBe(60_000)
  })

  it('desce por todos os marcos, sem pular', () => {
    const vistos = new Set<number>()
    for (let restante = EXAME; restante >= 0; restante -= 250) {
      const m = marcoDoRelogio(restante, EXAME)
      if (m !== null) vistos.add(m)
    }
    expect([...vistos].sort((a, b) => b - a)).toEqual([300_000, 120_000, 60_000, 30_000, 10_000])
  })

  /**
   * O treino tem 18 segundos de orçamento: marcos de minuto nunca seriam
   * cruzados e a questão inteira passaria muda. Abaixo de um minuto os marcos
   * viram fração.
   */
  it('usa fração do orçamento quando ele é curto', () => {
    expect(marcoDoRelogio(DRILL, DRILL)).toBeNull()
    expect(marcoDoRelogio(9_000, DRILL)).toBe(9_000)
    expect(marcoDoRelogio(4_500, DRILL)).toBe(4_500)
    expect(marcoDoRelogio(1_000, DRILL)).toBe(4_500)
  })

  it('não inclui marcos maiores que o próprio orçamento', () => {
    // Um orçamento de 2 minutos não tem marco de 5 minutos, e com 119s
    // restantes o de 1 minuto ainda não chegou.
    expect(marcoDoRelogio(119_000, 120_000)).toBeNull()
    expect(marcoDoRelogio(59_000, 120_000)).toBe(60_000)
  })

  it('devolve null para orçamento inválido em vez de dividir por zero', () => {
    expect(marcoDoRelogio(0, 0)).toBeNull()
  })
})
