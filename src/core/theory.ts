import { SUBTIPOS, TIPOS, type AnySubtipo, type Tipo } from './taxonomy'

/**
 * Teoria e macetes por tipo (PRD §4.15, §4.16).
 *
 * Estruturado em TS, não em markdown: o conteúdo é curto e altamente
 * padronizado, e assim o teste consegue exigir que TODO subtipo tenha verbete.
 * Uma teoria faltando é um link quebrado na tela de resultado, bem no momento
 * em que a pessoa errou e quer entender por quê.
 */

export interface SubtipoTheory {
  subtipo: AnySubtipo
  titulo: string
  /** o que a questão pede, em uma frase */
  oQuePede: string
  /** o passo a passo que resolve */
  metodo: string[]
  /** o erro que a prova quer induzir */
  armadilha: string
}

export interface TipoTheory {
  tipo: Tipo
  titulo: string
  resumo: string
  /** a dica de ritmo específica do tipo — a CCAT é cronometrada */
  ritmo: string
  subtipos: SubtipoTheory[]
}

export const THEORY: Record<Tipo, TipoTheory> = {
  verbal_analogy: {
    tipo: 'verbal_analogy',
    titulo: 'Analogias',
    resumo:
      'Você recebe um par de palavras e precisa achar outro par ligado pela mesma relação. ' +
      'O que se testa não é vocabulário isolado, e sim a capacidade de nomear a relação entre duas ideias.',
    ritmo:
      'Alvo de 12 a 15 segundos. Analogia é dos tipos mais rápidos de resolver quando você ' +
      'monta a frase-ponte antes de olhar as alternativas — e dos mais lentos quando não monta.',
    subtipos: [
      {
        subtipo: 'analogia_simples',
        titulo: 'Analogia simples',
        oQuePede: 'Achar o par que repete a mesma relação do par do enunciado.',
        metodo: [
          'Monte uma frase que ligue as duas palavras: "um PÉTALA é parte de uma FLOR".',
          'Leia a frase substituindo pelas palavras de cada alternativa.',
          'A alternativa em que a frase continua verdadeira é a resposta.',
          'Se duas alternativas passarem, refine a frase até ela ser mais específica.',
        ],
        armadilha:
          'Escolher pelo assunto em vez da relação. "cachorro : filhote" e "cachorro : coleira" ' +
          'falam ambos de cachorro, mas só o primeiro é adulto→filhote.',
      },
      {
        subtipo: 'analogia_dupla',
        titulo: 'Analogia dupla',
        oQuePede: 'O mesmo, com vocabulário mais difícil dos dois lados.',
        metodo: [
          'Se não conhece uma das palavras, trabalhe pela que conhece.',
          'Elimine as alternativas cuja relação você consegue nomear e que claramente difere.',
          'Entre as restantes, escolha a de relação mais específica.',
        ],
        armadilha:
          'Travar porque não conhece a palavra. Na CCAT, chutar entre duas e seguir vale mais ' +
          'que gastar 40 segundos numa questão só.',
      },
    ],
  },

  verbal_vocab: {
    tipo: 'verbal_vocab',
    titulo: 'Vocabulário',
    resumo:
      'Antônimos, sinônimos e completar frase. É o tipo que mais depende de repertório — e o que ' +
      'mais responde a treino, porque as palavras cobradas se repetem.',
    ritmo:
      'Alvo de 10 segundos. Ou você conhece a palavra, ou não: hesitar não melhora a chance. ' +
      'Não sabendo, elimine o que der e siga.',
    subtipos: [
      {
        subtipo: 'antonimo',
        titulo: 'Antônimo',
        oQuePede: 'A palavra de sentido mais OPOSTO à do enunciado.',
        metodo: [
          'Leia a palavra OPPOSITE antes de olhar as alternativas — é onde a prova pega.',
          'Defina a palavra do enunciado com suas palavras.',
          'Negue a definição e procure a alternativa que chega mais perto dessa negação.',
        ],
        armadilha:
          'A prova quase sempre coloca um SINÔNIMO entre as alternativas. Sob pressão, ' +
          'o olho reconhece a palavra "parecida" e marca.',
      },
      {
        subtipo: 'sinonimo',
        titulo: 'Sinônimo',
        oQuePede: 'A palavra de sentido mais PRÓXIMO à do enunciado.',
        metodo: [
          'Confirme que o enunciado pede SIMILAR, não OPPOSITE.',
          'Defina a palavra do enunciado.',
          'Escolha a alternativa que caberia na mesma frase sem mudar o sentido.',
        ],
        armadilha: 'Simétrica à do antônimo: o antônimo está ali entre as alternativas.',
      },
      {
        subtipo: 'completar_frase',
        titulo: 'Completar frase',
        oQuePede: 'A palavra que a lógica da frase exige na lacuna.',
        metodo: [
          'Antes de olhar as alternativas, decida se a lacuna pede algo positivo ou negativo.',
          'Procure o conectivo: "although", "despite" e "unlike" anunciam contraste; ' +
            '"because" e os dois-pontos anunciam continuidade.',
          'Preveja a palavra você mesmo e só então procure a mais parecida entre as opções.',
        ],
        armadilha:
          'Ler só o pedaço da frase em volta da lacuna. A pista costuma estar na outra metade.',
      },
    ],
  },

  verbal_logic: {
    tipo: 'verbal_logic',
    titulo: 'Lógica verbal',
    resumo:
      'Duas premissas e uma pergunta: o que OBRIGATORIAMENTE se segue? Não é sobre o mundo ' +
      'ser assim, é sobre a conclusão ser inescapável a partir do que foi dito.',
    ritmo:
      'Alvo de 20 a 25 segundos — é o tipo mais lento e vale gastar. Um diagrama mal feito ' +
      'aqui custa mais que a questão.',
    subtipos: [
      {
        subtipo: 'deducao',
        titulo: 'Dedução',
        oQuePede: 'A conclusão que é obrigatória, não a que é plausível.',
        metodo: [
          'Desenhe dois círculos por premissa: contido, separado ou sobreposto.',
          'Para cada alternativa, tente imaginar um cenário em que as premissas valem e ' +
            'ela é falsa. Conseguiu? Então não se segue.',
          'Sobra uma alternativa para a qual esse cenário é impossível: é a resposta.',
        ],
        armadilha:
          'Duas, e ambas caem muito: (1) inverter — "All X are Y" NÃO dá "All Y are X"; ' +
          '(2) concluir "Some" a partir de "All" — dizer que todos os X são Y não garante ' +
          'que exista algum X.',
      },
    ],
  },

  math_series: {
    tipo: 'math_series',
    titulo: 'Séries numéricas',
    resumo:
      'Uma sequência e a pergunta: qual vem depois? O trabalho é achar a regra, não fazer conta.',
    ritmo:
      'Alvo de 15 segundos. Se em 20 segundos a regra não apareceu, chute entre as duas mais ' +
      'plausíveis e siga — o custo de insistir é perder duas questões fáceis lá na frente.',
    subtipos: [
      {
        subtipo: 'serie_simples',
        titulo: 'Série simples',
        oQuePede: 'O próximo termo de uma progressão de regra única.',
        metodo: [
          'Calcule a diferença entre termos vizinhos. Constante? É aritmética, acabou.',
          'Não sendo, divida um termo pelo anterior. Constante? É geométrica.',
          'Nem uma nem outra: calcule a diferença DAS diferenças. Constante? É quadrática.',
          'Ainda não: teste se cada termo é a soma dos dois anteriores (Fibonacci).',
        ],
        armadilha:
          'Parar na primeira hipótese sem conferir com todos os termos exibidos. A regra ' +
          'precisa funcionar do primeiro ao último.',
      },
      {
        subtipo: 'serie_alternada',
        titulo: 'Série alternada',
        oQuePede: 'O próximo termo quando duas séries estão trançadas.',
        metodo: [
          'Se a sequência sobe e desce sem padrão, suspeite de trança.',
          'Olhe um termo sim, um termo não: 1º, 3º, 5º formam uma série.',
          'Faça o mesmo com 2º, 4º, 6º.',
          'Veja em qual das duas cai a vaga que falta e continue só ela.',
        ],
        armadilha:
          'Continuar a série errada. Conte a posição da lacuna antes de responder.',
      },
      {
        subtipo: 'serie_dois_passos',
        titulo: 'Série de dois passos',
        oQuePede: 'O próximo termo quando duas operações se alternam.',
        metodo: [
          'Se nem a diferença nem a razão são constantes, teste se elas se ALTERNAM.',
          'Confira: soma, multiplicação, soma, multiplicação…',
          'Identifique qual operação cabe na posição que falta.',
        ],
        armadilha:
          'Aplicar a operação errada na vez errada — é meio ponto de atenção que decide a questão.',
      },
    ],
  },

  math_word: {
    tipo: 'math_word',
    titulo: 'Problemas matemáticos',
    resumo:
      'Aritmética, razão, porcentagem e taxa em forma de texto. A conta é simples; a ' +
      'dificuldade é traduzir a frase e não responder a pergunta errada.',
    ritmo:
      'Alvo de 20 segundos. Leia a PERGUNTA antes do enunciado: você lê o texto já sabendo ' +
      'o que procurar.',
    subtipos: [
      {
        subtipo: 'aritmetica',
        titulo: 'Aritmética',
        oQuePede: 'Um valor obtido por uma sequência curta de operações.',
        metodo: [
          'Leia a pergunta primeiro e sublinhe o que ela pede.',
          'Liste os números com o que cada um significa.',
          'Faça as operações na ordem da história.',
          'Confira se respondeu o que foi perguntado, não o passo intermediário.',
        ],
        armadilha:
          'Parar no passo do meio. O enunciado dá o total e pede o que sobrou — e o total ' +
          'está entre as alternativas.',
      },
      {
        subtipo: 'razao_proporcao',
        titulo: 'Razão e proporção',
        oQuePede: 'Um valor que escala junto com outro.',
        metodo: [
          'Escreva a razão na ordem em que o enunciado cita as grandezas.',
          'Descubra quantos "grupos" cabem no valor conhecido.',
          'Multiplique pelo outro lado da razão.',
        ],
        armadilha:
          'Inverter a razão. "A razão entre camisas e calças é 3:5" não é o mesmo que 5:3 — ' +
          'confira qual grandeza vem primeiro.',
      },
      {
        subtipo: 'porcentagem',
        titulo: 'Porcentagem',
        oQuePede: 'Um valor após desconto, acréscimo ou uma fração do todo.',
        metodo: [
          'Desconto de X%: multiplique direto por (100 − X)/100 e pule uma etapa.',
          'Acréscimo de X%: multiplique por (100 + X)/100.',
          'Confira se a pergunta quer o valor final ou só o valor do desconto.',
        ],
        armadilha:
          'Devolver o desconto em vez do preço final — e ele está sempre entre as alternativas.',
      },
      {
        subtipo: 'taxa',
        titulo: 'Taxa e velocidade',
        oQuePede: 'Um valor proporcional ao tempo, à quantidade de pessoas ou a ambos.',
        metodo: [
          'Reduza a UMA unidade: quanto por hora, quanto por pessoa.',
          'Multiplique pela quantidade pedida.',
          'Se houver dois fatores (pessoas E horas), multiplique pelos dois.',
        ],
        armadilha:
          'Multiplicar por só um dos fatores. Conte quantas grandezas o enunciado empilha.',
      },
    ],
  },

  spatial: {
    tipo: 'spatial',
    titulo: 'Raciocínio espacial',
    resumo:
      'Figuras que giram, espelham e se repetem em padrão. É o tipo mais pesado da prova ' +
      '(cerca de um terço das questões) e o que mais melhora com treino.',
    ritmo:
      'Alvo de 15 segundos. O segredo é nunca tentar girar a figura inteira na cabeça: ' +
      'escolha um detalhe e acompanhe só ele.',
    subtipos: [
      {
        subtipo: 'rotacao',
        titulo: 'Rotação',
        oQuePede: 'Qual alternativa é a mesma figura, apenas girada.',
        metodo: [
          'Fixe um vértice de referência — o ponto preenchido serve.',
          'Percorra os outros vértices a partir dele, no sentido horário.',
          'Girar preserva essa ordem; espelhar inverte.',
          'A alternativa que mantém a ordem é a resposta.',
        ],
        armadilha:
          'Os distratores são a imagem ESPELHADA. De relance parecem iguais; a ordem dos ' +
          'vértices é o que denuncia.',
      },
      {
        subtipo: 'reflexao',
        titulo: 'Reflexão',
        oQuePede: 'Qual alternativa é a imagem espelhada da figura.',
        metodo: [
          'Fixe o mesmo vértice de referência do enunciado (o ponto preenchido).',
          'Percorra os vértices a partir dele e anote o sentido: horário ou anti-horário.',
          'Procure a alternativa em que esse sentido está INVERTIDO.',
          'Cuidado: ela também pode estar girada — inversão de sentido é o único critério.',
        ],
        armadilha: 'As alternativas erradas são rotações da figura original — as "certas demais".',
      },
      {
        subtipo: 'odd_one_out',
        titulo: 'Qual não pertence',
        oQuePede: 'A figura que não é rotação das outras.',
        metodo: [
          'Não compare as figuras duas a duas: são muitas combinações.',
          'Escolha um detalhe assimétrico e veja onde ele aparece do lado oposto.',
          'Essa é a intrusa.',
        ],
        armadilha:
          'Tentar comparar tudo com tudo e estourar o relógio. Um detalhe só resolve.',
      },
      {
        subtipo: 'serie_formas',
        titulo: 'Série de formas',
        oQuePede: 'A figura que continua a sequência.',
        metodo: [
          'Acompanhe UM vértice ao longo dos quadros.',
          'Conte de quantos passos ele anda de um quadro para o outro.',
          'Aplique o mesmo passo a partir do último quadro.',
        ],
        armadilha:
          'Tentar visualizar a figura inteira girando. Um ponto de referência resolve em ' +
          'metade do tempo.',
      },
      {
        subtipo: 'matriz',
        titulo: 'Matriz',
        oQuePede: 'A figura que completa a grade 3×3.',
        metodo: [
          'Leia da esquerda para a direita, linha a linha, como um texto.',
          'Ache o passo entre casas vizinhas.',
          'Confira o mesmo padrão pela coluna: se fecha nos dois sentidos, é a regra certa.',
        ],
        armadilha:
          'Ler só a última linha. A regra costuma ficar evidente na primeira, que está completa.',
      },
    ],
  },
}

export function theoryFor(tipo: Tipo): TipoTheory {
  return THEORY[tipo]
}

export function subtipoTheory(tipo: Tipo, subtipo: string): SubtipoTheory | undefined {
  return THEORY[tipo].subtipos.find((s) => s.subtipo === subtipo)
}

/** Todos os tipos, para a tela de referência ("a cola"). */
export const ALL_THEORY: TipoTheory[] = TIPOS.map((t) => THEORY[t])

/** Usado pelo teste de cobertura: nenhum subtipo pode ficar sem teoria. */
export function subtiposSemTeoria(): string[] {
  const faltando: string[] = []
  for (const tipo of TIPOS) {
    for (const subtipo of SUBTIPOS[tipo] as readonly string[]) {
      if (!subtipoTheory(tipo, subtipo)) faltando.push(`${tipo}/${subtipo}`)
    }
  }
  return faltando
}
