import type { LocalizedText } from '../i18n'
import { optionIdAt, type OptionId } from '../optionIds'
import type { Rng } from '../rng'
import { arredondarSig, formatarLocalizado, ordemDeGrandeza, type Unidade } from './formato'
import type { QmOpcao } from './questao'
import { FOLGA_ESTIMATIVA, FOLGA_EXATA } from './taxonomia'

/**
 * As cinco alternativas de uma questão de Quick Math.
 *
 * O treino só treina se não der para acertar sem fazer a conta. Daí as três
 * regras que esta função garante e os testes de propriedade cobram:
 *
 *  - folga: nenhum distrator a menos de 10% da resposta (15% em estimativa).
 *    Entrevista de case cobra ordem de grandeza e os primeiros dígitos, não o
 *    terceiro algarismo;
 *  - ordem de grandeza: pelo menos dois distratores com o mesmo `floor(log10)`
 *    da resposta — e, portanto, a mesma palavra de escala. Sem isso "R$ 980 mi"
 *    ao lado de "R$ 1,4 bi" se elimina contando zeros;
 *  - unicidade: os cinco textos são distintos nos dois idiomas.
 *
 * Uma quarta regra, que os testes de propriedade medem com atalhos de quem
 * chuta: o padrão das alternativas não pode apontar a certa. Por isso:
 *
 *  - o erro de zero (×10, ÷10, mil ↔ milhão) nunca vem sozinho. Quando a
 *    resposta ganha um "gêmeo" com os mesmos dígitos, um dos distratores da
 *    mesma ordem ganha o seu também — senão a certa seria sempre a que repete
 *    dígitos com outra alternativa;
 *  - os distratores da mesma ordem não ficam sempre do mesmo lado da resposta:
 *    as perturbações dos dígitos iniciais são sorteadas dos dois lados, senão a
 *    certa seria sempre o valor do meio.
 *
 * Os candidatos vêm do gerador, em ordem de plausibilidade: são os erros que se
 * cometem de verdade. Um candidato com `fator` é um gêmeo da resposta
 * (`valor = correta × fator`): o zero perdido, a escala trocada, o sinal
 * invertido.
 */

export interface Candidato {
  valor: number
  erro: LocalizedText
  /** gêmeo da resposta: `valor = correta × fator` */
  fator?: number
}

const FATORES_PERTURBACAO = [0.6, 0.7, 0.75, 0.8, 0.85, 1.15, 1.2, 1.25, 1.3, 1.4, 1.5, 1.6] as const

const ERRO_DIGITOS: LocalizedText = {
  pt: 'Conta parcial errada nos primeiros dígitos.',
  en: 'Arithmetic slip in the leading digits.',
}

const DISTRATORES = 4
const CHANCE_SEGUNDO_REAL = 0.35

interface Aceito {
  valor: number
  erro: LocalizedText
  texto: LocalizedText
}

export function montarAlternativas(
  rng: Rng,
  correta: number,
  candidatos: Candidato[],
  unidade: Unidade,
  estimativa: boolean,
): { opcoes: QmOpcao[]; answerId: OptionId } | null {
  const folga = estimativa ? FOLGA_ESTIMATIVA : FOLGA_EXATA
  const exibir = (v: number) => (estimativa ? arredondarSig(v, 2) : v)
  const certa = exibir(correta)
  if (!Number.isFinite(certa) || certa === 0) return null

  const textoCerto = formatarLocalizado(certa, unidade)
  const ordem = ordemDeGrandeza(certa)
  const aceitos: Aceito[] = []

  const cabe = (valor: number): boolean => {
    if (!Number.isFinite(valor)) return false
    if (unidade !== 'percent' && valor <= 0) return false
    if (distancia(valor, certa) < folga) return false
    if (aceitos.some((a) => distancia(valor, a.valor) < folga)) return false
    const texto = formatarLocalizado(valor, unidade)
    const textos = [textoCerto, ...aceitos.map((a) => a.texto)]
    return !textos.some((t) => t.pt === texto.pt || t.en === texto.en)
  }
  const aceitar = (valor: number, erro: LocalizedText): boolean => {
    if (aceitos.length >= DISTRATORES || !cabe(valor)) return false
    aceitos.push({ valor, erro, texto: formatarLocalizado(valor, unidade) })
    return true
  }
  const mesmaOrdem = (v: number) => ordemDeGrandeza(v) === ordem

  const reais = candidatos.filter((c) => c.fator === undefined)
  const gemeos = candidatos.filter((c) => c.fator !== undefined)
  const reaisMesmaOrdem = reais.filter((c) => mesmaOrdem(exibir(c.valor)))
  const reaisOutraOrdem = reais.filter((c) => !mesmaOrdem(exibir(c.valor)))
  const pool = rng.shuffle(FATORES_PERTURBACAO)

  const perturbar = (qualquerOrdem = false): boolean => {
    for (const f of pool) {
      const v = arredondarSig(certa * f, 2)
      if ((qualquerOrdem || mesmaOrdem(v)) && aceitar(v, ERRO_DIGITOS)) return true
    }
    return false
  }

  // Dois distratores na mesma ordem de grandeza: o erro real mais plausível e,
  // às vezes, outro erro real; senão uma perturbação sorteada. Erros reais
  // costumam cair do mesmo lado da resposta, e dois deles juntos a deixariam
  // sempre num extremo ou no meio.
  let i = 0
  while (i < reaisMesmaOrdem.length && !aceitar(exibir(reaisMesmaOrdem[i]!.valor), reaisMesmaOrdem[i]!.erro)) i++
  if (aceitos.length === 0) perturbar()
  const outroReal = reaisMesmaOrdem.slice(i + 1).find((c) => cabe(exibir(c.valor)))
  if (!(outroReal && rng.next() < CHANCE_SEGUNDO_REAL && aceitar(exibir(outroReal.valor), outroReal.erro))) perturbar()
  if (aceitos.length < 2) return null

  // O gêmeo da resposta entra junto com o gêmeo de um distrator.
  if (gemeos.length > 0 && (reaisOutraOrdem.length === 0 || rng.next() < 0.6)) {
    for (const g of rng.shuffle(gemeos)) {
      const v = exibir(certa * g.fator!)
      if (!aceitar(v, g.erro)) continue
      const par = rng.shuffle(aceitos.slice(0, 2)).find((b) => aceitar(exibir(b.valor * g.fator!), g.erro))
      if (par) break
      aceitos.pop()
    }
  }

  for (const c of [...reaisOutraOrdem, ...reaisMesmaOrdem]) aceitar(exibir(c.valor), c.erro)
  while (aceitos.length < DISTRATORES && perturbar()) {}
  // Resposta na borda da ordem (100, 1 mi): perturbações abaixo mudam de ordem.
  while (aceitos.length < DISTRATORES && perturbar(true)) {}

  if (aceitos.length < DISTRATORES || aceitos.filter((a) => mesmaOrdem(a.valor)).length < 2) return null

  const todas = rng.shuffle([
    { valor: certa, texto: textoCerto, erro: undefined as LocalizedText | undefined, certa: true },
    ...aceitos.map((a) => ({ ...a, certa: false })),
  ])
  const opcoes: QmOpcao[] = todas.map((o, j) => ({
    id: optionIdAt(j),
    valor: o.valor,
    texto: o.texto,
    ...(o.erro ? { erro: o.erro } : {}),
  }))
  const answerId = optionIdAt(todas.findIndex((o) => o.certa))
  return { opcoes, answerId }
}

function distancia(a: number, referencia: number): number {
  return Math.abs(a - referencia) / Math.abs(referencia)
}
