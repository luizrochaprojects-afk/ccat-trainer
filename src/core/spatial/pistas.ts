import type { Familia } from './figuras/contrato'

/**
 * Pistas que entregam a resposta SEM olhar o enunciado.
 *
 * O defeito que motivou este módulo: em "qual é a figura girada?", os quatro
 * distratores eram rotações do MESMO espelho. Sem ver a figura de cima, bastava
 * notar que quatro alternativas eram um desenho só e a quinta era diferente —
 * 60 de 60 questões aprovadas se resolviam assim. A pergunta virava "ache a
 * intrusa", que é outra questão, e muito mais fácil.
 *
 * As heurísticas abaixo são as que um candidato esperto usaria olhando só as
 * alternativas. Todas trabalham sobre CLASSES DE ROTAÇÃO: duas alternativas
 * estão na mesma classe quando uma é a outra girada. É a única informação que
 * as alternativas carregam sem o enunciado, então é por ela que a resposta
 * vazaria.
 */

/**
 * Representante canônico da classe de rotação: a menor assinatura entre todas
 * as rotações da figura. Duas figuras têm a mesma classe se e só se uma é
 * rotação da outra.
 */
export function classeDeRotacao<F>(fam: Familia<F>, f: F): string {
  let menor = fam.assinatura(f)
  for (let k = 1; k < fam.passosNoCiclo; k++) {
    const a = fam.assinatura(fam.rotate(f, k))
    if (a < menor) menor = a
  }
  return menor
}

/** Classe de rotação do espelho — o "enantiômero" da figura. */
export function classeDoEspelho<F>(fam: Familia<F>, f: F): string {
  return classeDeRotacao(fam, fam.reflect(f))
}

export type Pista =
  /** (a) todos os distratores numa classe só, a resposta sozinha em outra */
  | 'classe_unica'
  /** (b) a resposta é a única alternativa da classe mais — ou menos — frequente */
  | 'frequencia'
  /** (c) a resposta é o único membro isolado de um par quiral presente */
  | 'quiralidade'
  /**
   * (d) a "impressão digital" estrutural da resposta — tamanho da própria
   * classe e da classe do espelho entre as alternativas — não se repete em
   * nenhuma outra. Generaliza as três anteriores: se alguma delas aponta a
   * resposta, esta também aponta.
   */
  | 'impressao_digital'

/**
 * Qual heurística sem enunciado isola a resposta, ou `null` se nenhuma isola.
 *
 * Recebe as classes já calculadas (e não as figuras) para servir tanto à
 * geração, que tem as figuras, quanto aos testes, que só têm a questão pronta.
 */
export function pistaSemEnunciado(
  classes: readonly string[],
  classesDoEspelho: readonly string[],
  indiceCorreta: number,
): Pista | null {
  const n = classes.length
  const conta = new Map<string, number>()
  for (const c of classes) conta.set(c, (conta.get(c) ?? 0) + 1)
  const qtd = (c: string): number => conta.get(c) ?? 0
  const correta = classes[indiceCorreta] as string

  // (a)
  const distratores = classes.filter((_, i) => i !== indiceCorreta)
  if (new Set(distratores).size === 1 && distratores[0] !== correta) return 'classe_unica'

  // (b) — "a mais frequente" e "a menos frequente" só apontam alguém quando o
  // conjunto de alternativas nessa frequência extrema tem um elemento só.
  const tamanhos = classes.map(qtd)
  for (const extremo of [Math.min(...tamanhos), Math.max(...tamanhos)]) {
    const nessa = tamanhos.map((t, i) => (t === extremo ? i : -1)).filter((i) => i >= 0)
    if (nessa.length === 1 && nessa[0] === indiceCorreta) return 'frequencia'
  }

  // (c) — pares quirais: a classe e a classe do espelho, ambas presentes e
  // distintas. "O lado do par que tem um membro só" é pista quando aponta uma
  // alternativa só; a versão estrita pede também que o outro lado tenha mais.
  const isoladas = (estrito: boolean): number[] =>
    classes
      .map((c, i) => {
        const e = classesDoEspelho[i] as string
        if (e === c || qtd(e) === 0 || qtd(c) !== 1) return -1
        return !estrito || qtd(e) > 1 ? i : -1
      })
      .filter((i) => i >= 0)
  for (const estrito of [false, true]) {
    const lista = isoladas(estrito)
    if (lista.length === 1 && lista[0] === indiceCorreta) return 'quiralidade'
  }

  // (d)
  const digital = (i: number): string =>
    `${qtd(classes[i] as string)}:${qtd(classesDoEspelho[i] as string)}`
  const minha = digital(indiceCorreta)
  let iguais = 0
  for (let i = 0; i < n; i++) if (digital(i) === minha) iguais++
  if (iguais === 1) return 'impressao_digital'

  return null
}
