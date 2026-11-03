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
 * Os candidatos vêm do gerador, em ordem de plausibilidade: são os erros que se
 * cometem de verdade. Quando eles não fecham a regra da ordem de grandeza,
 * entram perturbações dos dígitos iniciais — o vai-um esquecido, a conta
 * parcial errada.
 */

export interface Candidato {
  valor: number
  erro: LocalizedText
}

const FATORES_PERTURBACAO = [1.2, 0.8, 1.5, 0.7, 1.3, 0.6, 1.4, 0.85] as const

const ERRO_DIGITOS: LocalizedText = {
  pt: 'Conta parcial errada nos primeiros dígitos.',
  en: 'Arithmetic slip in the leading digits.',
}

const DISTRATORES = 4

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
  const aceitos: { valor: number; erro: LocalizedText; texto: LocalizedText }[] = []

  const cabe = (valor: number): boolean => {
    if (!Number.isFinite(valor)) return false
    if (unidade !== 'percent' && valor <= 0) return false
    if (distancia(valor, certa) < folga) return false
    if (aceitos.some((a) => distancia(valor, a.valor) < folga)) return false
    const texto = formatarLocalizado(valor, unidade)
    const textos = [textoCerto, ...aceitos.map((a) => a.texto)]
    return !textos.some((t) => t.pt === texto.pt || t.en === texto.en)
  }

  const aceitar = (valor: number, erro: LocalizedText) =>
    aceitos.push({ valor, erro, texto: formatarLocalizado(valor, unidade) })

  for (const candidato of candidatos) {
    if (aceitos.length === DISTRATORES) break
    const valor = exibir(candidato.valor)
    if (cabe(valor)) aceitar(valor, candidato.erro)
  }

  const perturbacoes = FATORES_PERTURBACAO.map((f) => arredondarSig(certa * f, 2))
  const mesmaOrdem = () => aceitos.filter((a) => ordemDeGrandeza(a.valor) === ordem).length

  // Abre espaço para os distratores na mesma ordem de grandeza, tirando os de
  // ordem diferente menos plausíveis (os últimos aceitos).
  const faltam = Math.max(0, 2 - mesmaOrdem())
  while (aceitos.length + faltam > DISTRATORES) {
    const i = aceitos.map((a) => ordemDeGrandeza(a.valor) !== ordem).lastIndexOf(true)
    if (i < 0) break
    aceitos.splice(i, 1)
  }
  for (const valor of perturbacoes) {
    if (mesmaOrdem() >= 2 || aceitos.length === DISTRATORES) break
    if (ordemDeGrandeza(valor) === ordem && cabe(valor)) aceitar(valor, ERRO_DIGITOS)
  }
  for (const valor of perturbacoes) {
    if (aceitos.length === DISTRATORES) break
    if (cabe(valor)) aceitar(valor, ERRO_DIGITOS)
  }

  if (aceitos.length < DISTRATORES || mesmaOrdem() < 2) return null

  const todas = rng.shuffle([
    { valor: certa, texto: textoCerto, erro: undefined as LocalizedText | undefined, certa: true },
    ...aceitos.map((a) => ({ ...a, certa: false })),
  ])
  const opcoes: QmOpcao[] = todas.map((o, i) => ({
    id: optionIdAt(i),
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
