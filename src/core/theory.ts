import type { LocalizedText } from './i18n'
import { SUBTIPOS, TIPOS, type AnySubtipo, type Tipo } from './taxonomy'

/**
 * Teoria e macetes por tipo (PRD §4.15, §4.16).
 *
 * Estruturado em TS, não em markdown: o conteúdo é curto e altamente
 * padronizado, e assim o teste consegue exigir que TODO subtipo tenha verbete
 * nos DOIS idiomas. Uma teoria faltando é um link quebrado na tela de
 * resultado, bem no momento em que a pessoa errou e quer entender por quê.
 */

/** Lista de passos que existe nos dois idiomas. */
export interface LocalizedList {
  en: string[]
  pt: string[]
}

export interface SubtipoTheory {
  subtipo: AnySubtipo
  titulo: LocalizedText
  /** o que a questão pede, em uma frase */
  oQuePede: LocalizedText
  /** o passo a passo que resolve */
  metodo: LocalizedList
  /** o erro que a prova quer induzir */
  armadilha: LocalizedText
}

export interface TipoTheory {
  tipo: Tipo
  titulo: LocalizedText
  resumo: LocalizedText
  /** a dica de ritmo específica do tipo — a CCAT é cronometrada */
  ritmo: LocalizedText
  subtipos: SubtipoTheory[]
}

export const THEORY: Record<Tipo, TipoTheory> = {
  verbal_analogy: {
    tipo: 'verbal_analogy',
    titulo: { pt: 'Analogias', en: 'Analogies' },
    resumo: {
      pt:
        'Você recebe um par de palavras e precisa achar outro par ligado pela mesma relação. ' +
        'O que se testa não é vocabulário isolado, e sim a capacidade de nomear a relação entre duas ideias.',
      en:
        'You get a pair of words and have to find another pair joined by the same relation. ' +
        'What is being tested is not vocabulary in isolation, but your ability to name the relation between two ideas.',
    },
    ritmo: {
      pt:
        'Alvo de 12 a 15 segundos. Analogia é dos tipos mais rápidos de resolver quando você ' +
        'monta a frase-ponte antes de olhar as alternativas — e dos mais lentos quando não monta.',
      en:
        'Target 12 to 15 seconds. Analogies are among the fastest questions to solve when you ' +
        'build the bridge sentence before looking at the options — and among the slowest when you do not.',
    },
    subtipos: [
      {
        subtipo: 'analogia_simples',
        titulo: { pt: 'Analogia simples', en: 'Simple analogy' },
        oQuePede: {
          pt: 'Achar o par que repete a mesma relação do par do enunciado.',
          en: 'Find the pair that repeats the same relation as the pair in the prompt.',
        },
        metodo: {
          pt: [
            'Monte uma frase que ligue as duas palavras: "uma PÉTALA é parte de uma FLOR".',
            'Leia a frase substituindo pelas palavras de cada alternativa.',
            'A alternativa em que a frase continua verdadeira é a resposta.',
            'Se duas alternativas passarem, refine a frase até ela ser mais específica.',
          ],
          en: [
            'Build a sentence linking the two words: "a PETAL is part of a FLOWER".',
            'Read that sentence again with each option substituted in.',
            'The option where the sentence stays true is the answer.',
            'If two options pass, sharpen the sentence until it is more specific.',
          ],
        },
        armadilha: {
          pt:
            'Escolher pelo assunto em vez da relação. "cachorro : filhote" e "cachorro : coleira" ' +
            'falam ambos de cachorro, mas só o primeiro é adulto→filhote.',
          en:
            'Choosing by subject matter instead of relation. "dog : puppy" and "dog : collar" ' +
            'are both about dogs, but only the first is adult→young.',
        },
      },
      {
        subtipo: 'analogia_dupla',
        titulo: { pt: 'Analogia dupla', en: 'Double analogy' },
        oQuePede: {
          pt: 'O mesmo, com vocabulário mais difícil dos dois lados.',
          en: 'The same task, with harder vocabulary on both sides.',
        },
        metodo: {
          pt: [
            'Se não conhece uma das palavras, trabalhe pela que conhece.',
            'Elimine as alternativas cuja relação você consegue nomear e que claramente difere.',
            'Entre as restantes, escolha a de relação mais específica.',
          ],
          en: [
            'If you do not know one of the words, work from the one you do know.',
            'Eliminate the options whose relation you can name and that clearly differs.',
            'Among what is left, pick the one with the most specific relation.',
          ],
        },
        armadilha: {
          pt:
            'Travar porque não conhece a palavra. Na CCAT, chutar entre duas e seguir vale mais ' +
            'que gastar 40 segundos numa questão só.',
          en:
            'Freezing because you do not know the word. On the CCAT, guessing between two and ' +
            'moving on is worth more than spending 40 seconds on a single question.',
        },
      },
    ],
  },

  verbal_vocab: {
    tipo: 'verbal_vocab',
    titulo: { pt: 'Vocabulário', en: 'Vocabulary' },
    resumo: {
      pt:
        'Antônimos, sinônimos e completar frase. É o tipo que mais depende de repertório — e o que ' +
        'mais responde a treino, porque as palavras cobradas se repetem.',
      en:
        'Antonyms, synonyms and sentence completion. This is the type that depends most on your ' +
        'word stock — and the one that responds best to practice, because the same words keep coming back.',
    },
    ritmo: {
      pt:
        'Alvo de 10 segundos. Ou você conhece a palavra, ou não: hesitar não melhora a chance. ' +
        'Não sabendo, elimine o que der e siga.',
      en:
        'Target 10 seconds. Either you know the word or you do not: hesitating does not improve ' +
        'your odds. If you do not know it, eliminate what you can and move on.',
    },
    subtipos: [
      {
        subtipo: 'antonimo',
        titulo: { pt: 'Antônimo', en: 'Antonym' },
        oQuePede: {
          pt: 'A palavra de sentido mais OPOSTO à do enunciado.',
          en: 'The word most nearly OPPOSITE in meaning to the one in the prompt.',
        },
        metodo: {
          pt: [
            'Leia a palavra OPPOSITE antes de olhar as alternativas — é onde a prova pega.',
            'Defina a palavra do enunciado com suas palavras.',
            'Negue a definição e procure a alternativa que chega mais perto dessa negação.',
          ],
          en: [
            'Read the word OPPOSITE before looking at the options — that is where the test catches people.',
            'Define the prompt word in your own words.',
            'Negate that definition and look for the option closest to the negation.',
          ],
        },
        armadilha: {
          pt:
            'A prova quase sempre coloca um SINÔNIMO entre as alternativas. Sob pressão, ' +
            'o olho reconhece a palavra "parecida" e marca.',
          en:
            'The test almost always plants a SYNONYM among the options. Under pressure, the eye ' +
            'recognises the "familiar-looking" word and ticks it.',
        },
      },
      {
        subtipo: 'sinonimo',
        titulo: { pt: 'Sinônimo', en: 'Synonym' },
        oQuePede: {
          pt: 'A palavra de sentido mais PRÓXIMO à do enunciado.',
          en: 'The word most nearly SIMILAR in meaning to the one in the prompt.',
        },
        metodo: {
          pt: [
            'Confirme que o enunciado pede SIMILAR, não OPPOSITE.',
            'Defina a palavra do enunciado.',
            'Escolha a alternativa que caberia na mesma frase sem mudar o sentido.',
          ],
          en: [
            'Confirm the prompt asks for SIMILAR, not OPPOSITE.',
            'Define the prompt word.',
            'Pick the option that would fit the same sentence without changing its meaning.',
          ],
        },
        armadilha: {
          pt: 'Simétrica à do antônimo: o antônimo está ali entre as alternativas.',
          en: 'The mirror of the antonym trap: the antonym is sitting right there among the options.',
        },
      },
      {
        subtipo: 'completar_frase',
        titulo: { pt: 'Completar frase', en: 'Sentence completion' },
        oQuePede: {
          pt: 'A palavra que a lógica da frase exige na lacuna.',
          en: 'The word the logic of the sentence demands in the blank.',
        },
        metodo: {
          pt: [
            'Antes de olhar as alternativas, decida se a lacuna pede algo positivo ou negativo.',
            'Procure o conectivo: "although", "despite" e "unlike" anunciam contraste; ' +
              '"because" e os dois-pontos anunciam continuidade.',
            'Preveja a palavra você mesmo e só então procure a mais parecida entre as opções.',
          ],
          en: [
            'Before looking at the options, decide whether the blank needs something positive or negative.',
            'Find the connective: "although", "despite" and "unlike" announce contrast; ' +
              '"because" and the colon announce continuity.',
            'Predict the word yourself, and only then look for the closest match among the options.',
          ],
        },
        armadilha: {
          pt: 'Ler só o pedaço da frase em volta da lacuna. A pista costuma estar na outra metade.',
          en:
            'Reading only the fragment around the blank. The clue is usually in the other half of the sentence.',
        },
      },
    ],
  },

  verbal_logic: {
    tipo: 'verbal_logic',
    titulo: { pt: 'Lógica verbal', en: 'Verbal logic' },
    resumo: {
      pt:
        'Duas premissas e uma pergunta: o que OBRIGATORIAMENTE se segue? Não é sobre o mundo ' +
        'ser assim, é sobre a conclusão ser inescapável a partir do que foi dito.',
      en:
        'Two premises and one question: what MUST follow? It is not about how the world happens ' +
        'to be, it is about the conclusion being inescapable from what was stated.',
    },
    ritmo: {
      pt:
        'Alvo de 20 a 25 segundos — é o tipo mais lento e vale gastar. Um diagrama mal feito ' +
        'aqui custa mais que a questão.',
      en:
        'Target 20 to 25 seconds — this is the slowest type and it is worth the time. A sloppy ' +
        'diagram here costs more than the question itself.',
    },
    subtipos: [
      {
        subtipo: 'deducao',
        titulo: { pt: 'Dedução', en: 'Deduction' },
        oQuePede: {
          pt: 'A conclusão que é obrigatória, não a que é plausível.',
          en: 'The conclusion that is necessary, not the one that is merely plausible.',
        },
        metodo: {
          pt: [
            'Desenhe dois círculos por premissa: contido, separado ou sobreposto.',
            'Para cada alternativa, tente imaginar um cenário em que as premissas valem e ' +
              'ela é falsa. Conseguiu? Então não se segue.',
            'Sobra uma alternativa para a qual esse cenário é impossível: é a resposta.',
          ],
          en: [
            'Draw two circles per premise: contained, separate or overlapping.',
            'For each option, try to imagine a scenario where the premises hold and the option ' +
              'is false. Managed it? Then it does not follow.',
            'One option is left for which that scenario is impossible: that is the answer.',
          ],
        },
        armadilha: {
          pt:
            'Duas, e ambas caem muito: (1) inverter — "All X are Y" NÃO dá "All Y are X"; ' +
            '(2) concluir "Some" a partir de "All" — dizer que todos os X são Y não garante ' +
            'que exista algum X.',
          en:
            'Two, and both show up constantly: (1) flipping — "All X are Y" does NOT give ' +
            '"All Y are X"; (2) concluding "Some" from "All" — saying every X is a Y does not ' +
            'guarantee that any X exists.',
        },
      },
    ],
  },

  math_series: {
    tipo: 'math_series',
    titulo: { pt: 'Séries numéricas', en: 'Number series' },
    resumo: {
      pt: 'Uma sequência e a pergunta: qual vem depois? O trabalho é achar a regra, não fazer conta.',
      en: 'A sequence and one question: what comes next? The work is finding the rule, not doing arithmetic.',
    },
    ritmo: {
      pt:
        'Alvo de 15 segundos. Se em 20 segundos a regra não apareceu, chute entre as duas mais ' +
        'plausíveis e siga — o custo de insistir é perder duas questões fáceis lá na frente.',
      en:
        'Target 15 seconds. If the rule has not surfaced in 20 seconds, guess between the two ' +
        'most plausible options and move on — the cost of digging in is two easy questions later.',
    },
    subtipos: [
      {
        subtipo: 'serie_simples',
        titulo: { pt: 'Série simples', en: 'Simple series' },
        oQuePede: {
          pt: 'O próximo termo de uma progressão de regra única.',
          en: 'The next term of a progression governed by a single rule.',
        },
        metodo: {
          pt: [
            'Calcule a diferença entre termos vizinhos. Constante? É aritmética, acabou.',
            'Não sendo, divida um termo pelo anterior. Constante? É geométrica.',
            'Nem uma nem outra: calcule a diferença DAS diferenças. Constante? É quadrática.',
            'Ainda não: teste se cada termo é a soma dos dois anteriores (Fibonacci).',
          ],
          en: [
            'Take the difference between neighbouring terms. Constant? Arithmetic, done.',
            'If not, divide one term by the previous. Constant? Geometric.',
            'Neither: take the difference OF the differences. Constant? Quadratic.',
            'Still nothing: test whether each term is the sum of the two before it (Fibonacci).',
          ],
        },
        armadilha: {
          pt:
            'Parar na primeira hipótese sem conferir com todos os termos exibidos. A regra ' +
            'precisa funcionar do primeiro ao último.',
          en:
            'Stopping at the first hypothesis without checking it against every term shown. The ' +
            'rule has to work from the first term to the last.',
        },
      },
      {
        subtipo: 'serie_alternada',
        titulo: { pt: 'Série alternada', en: 'Interleaved series' },
        oQuePede: {
          pt: 'O próximo termo quando duas séries estão trançadas.',
          en: 'The next term when two series are interleaved.',
        },
        metodo: {
          pt: [
            'Se a sequência sobe e desce sem padrão, suspeite de trança.',
            'Olhe um termo sim, um termo não: 1º, 3º, 5º formam uma série.',
            'Faça o mesmo com 2º, 4º, 6º.',
            'Veja em qual das duas cai a vaga que falta e continue só ela.',
          ],
          en: [
            'If the sequence rises and falls with no pattern, suspect interleaving.',
            'Read every other term: 1st, 3rd, 5th form one series.',
            'Do the same with 2nd, 4th, 6th.',
            'See which of the two the missing slot belongs to and continue only that one.',
          ],
        },
        armadilha: {
          pt: 'Continuar a série errada. Conte a posição da lacuna antes de responder.',
          en: 'Continuing the wrong series. Count the position of the blank before answering.',
        },
      },
      {
        subtipo: 'serie_dois_passos',
        titulo: { pt: 'Série de dois passos', en: 'Two-step series' },
        oQuePede: {
          pt: 'O próximo termo quando duas operações se alternam.',
          en: 'The next term when two operations alternate.',
        },
        metodo: {
          pt: [
            'Se nem a diferença nem a razão são constantes, teste se elas se ALTERNAM.',
            'Confira: soma, multiplicação, soma, multiplicação…',
            'Identifique qual operação cabe na posição que falta.',
          ],
          en: [
            'If neither the difference nor the ratio is constant, test whether they ALTERNATE.',
            'Check: add, multiply, add, multiply…',
            'Work out which operation belongs in the missing position.',
          ],
        },
        armadilha: {
          pt: 'Aplicar a operação errada na vez errada — é meio ponto de atenção que decide a questão.',
          en: 'Applying the wrong operation at the wrong turn — half a beat of attention decides the question.',
        },
      },
    ],
  },

  math_word: {
    tipo: 'math_word',
    titulo: { pt: 'Problemas matemáticos', en: 'Word problems' },
    resumo: {
      pt:
        'Aritmética, razão, porcentagem e taxa em forma de texto. A conta é simples; a ' +
        'dificuldade é traduzir a frase e não responder a pergunta errada.',
      en:
        'Arithmetic, ratio, percentage and rate in prose. The arithmetic is simple; the ' +
        'difficulty is translating the sentence and not answering the wrong question.',
    },
    ritmo: {
      pt:
        'Alvo de 20 segundos. Leia a PERGUNTA antes do enunciado: você lê o texto já sabendo ' +
        'o que procurar.',
      en:
        'Target 20 seconds. Read the QUESTION before the body: then you read the text already ' +
        'knowing what to look for.',
    },
    subtipos: [
      {
        subtipo: 'aritmetica',
        titulo: { pt: 'Aritmética', en: 'Arithmetic' },
        oQuePede: {
          pt: 'Um valor obtido por uma sequência curta de operações.',
          en: 'A value obtained through a short sequence of operations.',
        },
        metodo: {
          pt: [
            'Leia a pergunta primeiro e sublinhe o que ela pede.',
            'Liste os números com o que cada um significa.',
            'Faça as operações na ordem da história.',
            'Confira se respondeu o que foi perguntado, não o passo intermediário.',
          ],
          en: [
            'Read the question first and underline what it asks for.',
            'List the numbers along with what each one means.',
            'Run the operations in the order the story tells them.',
            'Check that you answered what was asked, not the intermediate step.',
          ],
        },
        armadilha: {
          pt:
            'Parar no passo do meio. O enunciado dá o total e pede o que sobrou — e o total ' +
            'está entre as alternativas.',
          en:
            'Stopping at the middle step. The problem gives you the total and asks what is left ' +
            '— and the total is sitting among the options.',
        },
      },
      {
        subtipo: 'razao_proporcao',
        titulo: { pt: 'Razão e proporção', en: 'Ratio and proportion' },
        oQuePede: {
          pt: 'Um valor que escala junto com outro.',
          en: 'A value that scales together with another.',
        },
        metodo: {
          pt: [
            'Escreva a razão na ordem em que o enunciado cita as grandezas.',
            'Descubra quantos "grupos" cabem no valor conhecido.',
            'Multiplique pelo outro lado da razão.',
          ],
          en: [
            'Write the ratio in the order the problem names the quantities.',
            'Work out how many "groups" fit into the known value.',
            'Multiply by the other side of the ratio.',
          ],
        },
        armadilha: {
          pt:
            'Inverter a razão. "A razão entre camisas e calças é 3:5" não é o mesmo que 5:3 — ' +
            'confira qual grandeza vem primeiro.',
          en:
            'Flipping the ratio. "The ratio of shirts to trousers is 3:5" is not the same as ' +
            '5:3 — check which quantity comes first.',
        },
      },
      {
        subtipo: 'porcentagem',
        titulo: { pt: 'Porcentagem', en: 'Percentage' },
        oQuePede: {
          pt: 'Um valor após desconto, acréscimo ou uma fração do todo.',
          en: 'A value after a discount, an increase, or a fraction of the whole.',
        },
        metodo: {
          pt: [
            'Desconto de X%: multiplique direto por (100 − X)/100 e pule uma etapa.',
            'Acréscimo de X%: multiplique por (100 + X)/100.',
            'Confira se a pergunta quer o valor final ou só o valor do desconto.',
          ],
          en: [
            'An X% discount: multiply straight by (100 − X)/100 and skip a step.',
            'An X% increase: multiply by (100 + X)/100.',
            'Check whether the question wants the final amount or just the discount itself.',
          ],
        },
        armadilha: {
          pt: 'Devolver o desconto em vez do preço final — e ele está sempre entre as alternativas.',
          en:
            'Giving back the discount instead of the final price — and it is always among the options.',
        },
      },
      {
        subtipo: 'taxa',
        titulo: { pt: 'Taxa e velocidade', en: 'Rate and speed' },
        oQuePede: {
          pt: 'Um valor proporcional ao tempo, à quantidade de pessoas ou a ambos.',
          en: 'A value proportional to time, to headcount, or to both.',
        },
        metodo: {
          pt: [
            'Reduza a UMA unidade: quanto por hora, quanto por pessoa.',
            'Multiplique pela quantidade pedida.',
            'Se houver dois fatores (pessoas E horas), multiplique pelos dois.',
          ],
          en: [
            'Reduce to ONE unit: how much per hour, how much per person.',
            'Multiply by the quantity asked for.',
            'If there are two factors (people AND hours), multiply by both.',
          ],
        },
        armadilha: {
          pt: 'Multiplicar por só um dos fatores. Conte quantas grandezas o enunciado empilha.',
          en: 'Multiplying by only one of the factors. Count how many quantities the problem stacks up.',
        },
      },
    ],
  },

  spatial: {
    tipo: 'spatial',
    titulo: { pt: 'Raciocínio espacial', en: 'Spatial reasoning' },
    resumo: {
      pt:
        'Figuras que giram, espelham e se repetem em padrão. É o tipo mais pesado da prova ' +
        '(cerca de um terço das questões) e o que mais melhora com treino.',
      en:
        'Figures that rotate, mirror and repeat in patterns. It is the heaviest type on the ' +
        'test (about a third of the questions) and the one that improves most with practice.',
    },
    ritmo: {
      pt:
        'Alvo de 15 segundos. O segredo é nunca tentar girar a figura inteira na cabeça: ' +
        'escolha um detalhe — um canto, um ponteiro, um marcador — e acompanhe só ele.',
      en:
        'Target 15 seconds. The trick is never to rotate the whole figure in your head: pick ' +
        'one detail — a corner, a hand, a marker — and follow only that.',
    },
    subtipos: [
      {
        subtipo: 'rotacao',
        titulo: { pt: 'Rotação', en: 'Rotation' },
        oQuePede: {
          pt: 'Qual alternativa é a mesma figura, apenas girada.',
          en: 'Which option is the same figure, only rotated.',
        },
        metodo: {
          pt: [
            'Escolha um detalhe único da figura: o canto com o arco maior, o ponteiro longo.',
            'Veja o que vem logo em seguida no sentido horário.',
            'Girar preserva essa vizinhança; espelhar inverte.',
            'A alternativa que mantém a ordem é a resposta.',
          ],
          en: [
            'Pick one unique detail: the corner with the larger arc, the long hand.',
            'Note what comes right after it going clockwise.',
            'Rotation preserves that neighbour; mirroring reverses it.',
            'The option that keeps the order is the answer.',
          ],
        },
        armadilha: {
          pt:
            'Os distratores são a imagem ESPELHADA. De relance parecem iguais; a ordem em que ' +
            'os detalhes se sucedem é o que denuncia.',
          en:
            'The distractors are the MIRROR image. At a glance they look the same; the order in ' +
            'which the details follow one another is what gives them away.',
        },
      },
      {
        subtipo: 'reflexao',
        titulo: { pt: 'Reflexão', en: 'Reflection' },
        oQuePede: {
          pt: 'Qual alternativa é a imagem espelhada da figura.',
          en: 'Which option is the mirror image of the figure.',
        },
        metodo: {
          pt: [
            'Escolha o mesmo detalhe de referência no enunciado.',
            'Anote o sentido em que os outros detalhes se sucedem a partir dele.',
            'Procure a alternativa em que esse sentido está INVERTIDO.',
            'Cuidado: ela também pode estar girada — a inversão é o único critério.',
          ],
          en: [
            'Pick the same reference detail as in the prompt.',
            'Note the direction in which the other details follow from it.',
            'Look for the option where that direction is REVERSED.',
            'Careful: it may also be rotated — the reversal is the only criterion.',
          ],
        },
        armadilha: {
          pt: 'As alternativas erradas são rotações da figura original — as "certas demais".',
          en: 'The wrong options are rotations of the original figure — the ones that look too right.',
        },
      },
      {
        subtipo: 'odd_one_out',
        titulo: { pt: 'Qual não pertence', en: 'Odd one out' },
        oQuePede: {
          pt: 'A figura que não é rotação das outras.',
          en: 'The figure that is not a rotation of the others.',
        },
        metodo: {
          pt: [
            'Não compare as figuras duas a duas: são combinações demais.',
            'Escolha um detalhe assimétrico e veja onde ele aparece do lado oposto.',
            'Essa é a intrusa.',
          ],
          en: [
            'Do not compare the figures pairwise: there are too many combinations.',
            'Pick one asymmetric detail and find where it appears on the opposite side.',
            'That is the odd one.',
          ],
        },
        armadilha: {
          pt: 'Tentar comparar tudo com tudo e estourar o relógio. Um detalhe só resolve.',
          en: 'Trying to compare everything with everything and blowing the clock. One detail settles it.',
        },
      },
      {
        subtipo: 'serie_formas',
        titulo: { pt: 'Série de formas', en: 'Figure series' },
        oQuePede: {
          pt: 'A figura que continua a sequência.',
          en: 'The figure that continues the sequence.',
        },
        metodo: {
          pt: [
            'Acompanhe UM detalhe ao longo dos quadros.',
            'Conte de quantos passos ele anda de um quadro para o outro.',
            'Confira se algo além da posição muda: preenchimento, tamanho, número de anéis.',
            'Aplique as mesmas mudanças a partir do último quadro.',
          ],
          en: [
            'Track ONE detail across the frames.',
            'Count how many steps it moves from one frame to the next.',
            'Check whether anything besides position changes: fill, size, number of rings.',
            'Apply the same changes starting from the last frame.',
          ],
        },
        armadilha: {
          pt:
            'Enxergar só a rotação e perder a segunda regra. Nas séries mais difíceis duas ' +
            'coisas mudam ao mesmo tempo.',
          en:
            'Seeing only the rotation and missing the second rule. In the harder series two ' +
            'things change at once.',
        },
      },
      {
        subtipo: 'matriz',
        titulo: { pt: 'Matriz', en: 'Matrix' },
        oQuePede: {
          pt: 'A figura que completa a grade 3×3.',
          en: 'The figure that completes the 3×3 grid.',
        },
        metodo: {
          pt: [
            'Leia da esquerda para a direita, linha a linha: essa é a regra de rotação.',
            'Depois leia de cima para baixo: essa costuma ser a regra de atributo.',
            'A célula que falta obedece às duas leituras ao mesmo tempo.',
          ],
          en: [
            'Read left to right, row by row: that is the rotation rule.',
            'Then read top to bottom: that is usually the attribute rule.',
            'The missing cell obeys both readings at once.',
          ],
        },
        armadilha: {
          pt:
            'Achar a regra da linha e responder. Entre as alternativas há sempre uma que acerta ' +
            'a rotação e erra o atributo.',
          en:
            'Finding the row rule and answering. There is always an option that gets the rotation ' +
            'right and the attribute wrong.',
        },
      },
      {
        subtipo: 'identical_pair',
        titulo: { pt: 'Comparação visual', en: 'Visual comparison' },
        oQuePede: {
          pt: 'Qual alternativa é exatamente idêntica à figura do enunciado.',
          en: 'Which option is exactly identical to the figure in the prompt.',
        },
        metodo: {
          pt: [
            'Não julgue pela impressão geral: todas foram feitas para parecer iguais.',
            'Escolha UMA posição — o canto superior esquerdo, por exemplo — e compare-a em todas.',
            'Descarte as que já diferem ali e repita com outra posição.',
            'Duas ou três passadas eliminam tudo menos a resposta.',
          ],
          en: [
            'Do not judge by overall impression: they were all built to look alike.',
            'Pick ONE position — the top-left corner, say — and compare it across all options.',
            'Discard the ones that already differ there, then repeat with another position.',
            'Two or three passes eliminate everything but the answer.',
          ],
        },
        armadilha: {
          pt:
            'Voltar ao enunciado a cada alternativa. Guarde uma posição de cada vez e varra as ' +
            'alternativas de uma só vez.',
          en:
            'Going back to the prompt for every option. Hold one position in mind and sweep ' +
            'across the options in a single pass.',
        },
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
