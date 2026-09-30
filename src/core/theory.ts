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
      {
        subtipo: 'analogia_lacuna',
        titulo: { pt: 'Analogia com lacuna', en: 'Missing-word analogy' },
        oQuePede: {
          pt: 'Completar o segundo par com UMA palavra: "A está para B assim como C está para ?".',
          en: 'Complete the second pair with ONE word: "A is to B as C is to ?".',
        },
        metodo: {
          pt: [
            'Monte a frase-ponte com o primeiro par: "um CINZEL é a ferramenta do ESCULTOR".',
            'Aplique a mesma frase à palavra C antes de olhar as opções e preveja a resposta.',
            'Escolha a opção que fecha a frase — se a relação é de sinônimo, desconfie do antônimo, e vice-versa.',
          ],
          en: [
            'Build the bridge sentence from the first pair: "a CHISEL is the tool of a SCULPTOR".',
            'Apply the same sentence to word C before looking at the options, and predict the answer.',
            'Pick the option that completes the sentence — if the relation is synonymy, distrust the antonym, and vice versa.',
          ],
        },
        armadilha: {
          pt:
            'Duas: (1) a palavra que tem ALGUMA relação com C, mas não a do primeiro par (POTTER → "kiln", a ferramenta, ' +
            'quando o par pedia o produto); (2) a palavra de som parecido — INEVITABLE puxa "invited", ADEPT puxa ' +
            '"adapted". Parecer não é relação.',
          en:
            'Two of them: (1) the word with SOME relation to C, but not the one in the first pair (POTTER → "kiln", the ' +
            'tool, when the pair asked for the product); (2) the sound-alike — INEVITABLE pulls toward "invited", ADEPT ' +
            'toward "adapted". Looking similar is not a relation.',
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
      {
        subtipo: 'completar_frase_dupla',
        titulo: { pt: 'Completar frase (duas lacunas)', en: 'Two-blank sentence completion' },
        oQuePede: {
          pt: 'O PAR de palavras que, juntas, deixam a frase coerente — as duas lacunas se amarram pelo conectivo.',
          en: 'The PAIR of words that together make the sentence coherent — the two blanks are tied by the connective.',
        },
        metodo: {
          pt: [
            'Ache o conectivo: "although", "despite" e "but" pedem lacunas em sentidos OPOSTOS; "because", "and" e "so" pedem o MESMO sentido.',
            'Resolva primeiro a lacuna mais fácil e elimine todo par cuja palavra naquela posição não serve.',
            'Entre os pares restantes, confira a outra lacuna contra o conectivo — e só então leia a frase inteira com o par.',
          ],
          en: [
            'Find the connective: "although", "despite" and "but" call for blanks pointing in OPPOSITE directions; "because", "and" and "so" call for the SAME direction.',
            'Solve the easier blank first and eliminate every pair whose word in that slot does not fit.',
            'Among the pairs left, check the other blank against the connective — and only then read the whole sentence with the pair.',
          ],
        },
        armadilha: {
          pt:
            'O par em que as duas palavras cabem, cada uma, no pedaço de frase em volta delas, mas juntas contradizem o ' +
            'conectivo. E o par com uma palavra perfeita e a outra só "quase": meia resposta certa é resposta errada.',
          en:
            'The pair where each word fits the fragment around it, but together they contradict the connective. And the ' +
            'pair with one perfect word and the other only "almost": half a right answer is a wrong answer.',
        },
      },
    ],
  },

  verbal_logic: {
    tipo: 'verbal_logic',
    titulo: { pt: 'Lógica verbal', en: 'Verbal logic' },
    resumo: {
      pt:
        'Premissas e uma pergunta: o que OBRIGATORIAMENTE se segue, o que é impossível, quem pode ' +
        'ocupar tal lugar na fila? Não é sobre o mundo ser assim, é sobre o que é inescapável a partir do que foi dito.',
      en:
        'Premises and one question: what MUST follow, what is impossible, who could take a given ' +
        'place in the line? It is not about how the world happens to be, it is about what is inescapable from what was stated.',
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
            '(2) trocar a ordem numa particular negativa — "Some X are not Y" NÃO dá "Some Y ' +
            'are not X". A prova assume que os grupos citados existem; o que ela cobra é o que ' +
            'é obrigatório mesmo assim.',
          en:
            'Two, and both show up constantly: (1) flipping — "All X are Y" does NOT give ' +
            '"All Y are X"; (2) flipping a particular negative — "Some X are not Y" does NOT ' +
            'give "Some Y are not X". The test assumes the groups mentioned exist; what it asks ' +
            'is what must hold even so.',
        },
      },
      {
        subtipo: 'verdadeiro_falso',
        titulo: { pt: 'Verdadeiro, falso ou incerto', en: 'True, false or uncertain' },
        oQuePede: {
          pt: 'Dadas as premissas, dizer se a última frase é obrigatória (True), impossível (False) ou não decidida (Uncertain).',
          en: 'Given the premises, say whether the last statement is forced (True), impossible (False) or left open (Uncertain).',
        },
        metodo: {
          pt: [
            'Esqueça o mundo real: só vale o que as premissas dizem. Em comparações, desenhe a fila; em grupos, os círculos.',
            'Procure um cenário que respeite TODAS as premissas e em que a frase valha; depois, um em que ela falhe.',
            'Achou os dois? Uncertain. Só o primeiro é possível? True. Só o segundo? False.',
            'Regra "Everyone who A B" vale num sentido só: de A sai B, e de "não B" sai "não A" — de B não sai nada.',
          ],
          en: [
            'Forget the real world: only what the premises say counts. For comparisons, draw the line-up; for groups, the circles.',
            'Look for a scenario that respects ALL the premises in which the statement holds; then for one in which it fails.',
            'Found both? Uncertain. Only the first is possible? True. Only the second? False.',
            'A rule "Everyone who A B" works in one direction only: A gives B, and "not B" gives "not A" — B gives nothing.',
          ],
        },
        armadilha: {
          pt:
            'Marcar False quando a frase só "não foi dita". Não dita é Uncertain; False exige que as premissas a ' +
            'contradigam. A irmã dessa: ler "everyone who A B" como "só quem A B". Como na dedução, a prova assume que ' +
            'os grupos citados existem.',
          en:
            'Choosing False when the statement was merely "not stated". Not stated is Uncertain; False requires the ' +
            'premises to contradict it. Its sibling: reading "everyone who A B" as "only those who A B". As in deduction, ' +
            'the test assumes the groups mentioned exist.',
        },
      },
      {
        subtipo: 'ordenacao',
        titulo: { pt: 'Ordenação', en: 'Ordering puzzle' },
        oQuePede: {
          pt: 'Com 5 a 7 pessoas numa fila e algumas regras, dizer quem pode, quem deve ou quem não pode ocupar uma posição.',
          en: 'With 5 to 7 people in a line and a few rules, say who could, who must or who cannot take a position.',
        },
        metodo: {
          pt: [
            'Desenhe as posições (1 a N) e comece pelas regras rígidas: posição fixa, "imediatamente atrás", "não nas pontas".',
            'Junte os blocos ("X logo atrás de Y" vira um bloco YX) e aplique a hipótese da pergunta ("If H is 3rd…") antes de tudo.',
            'Para "could": basta UMA ordem válida com a pessoa ali. Para "must": ela tem de estar ali em TODAS.',
            'Antes de marcar, confira a ordem candidata contra cada regra, uma por uma — é aí que se pega a regra esquecida.',
          ],
          en: [
            'Draw the positions (1 to N) and start with the rigid rules: fixed position, "right behind", "not at either end".',
            'Merge the blocks ("X is right behind Y" becomes one YX block) and apply the question’s supposition ("If H is 3rd…") first.',
            'For "could": ONE valid order with the person there is enough. For "must": they have to be there in ALL of them.',
            'Before answering, check the candidate order against every rule, one by one — that is where the forgotten rule gets caught.',
          ],
        },
        armadilha: {
          pt:
            'Esquecer uma regra no meio do caminho (os distratores são justamente quem seria possível sem ela) e confundir ' +
            '"could" com "must". É a questão mais cara da prova: se passar de 40 segundos, chute e siga.',
          en:
            'Dropping one rule halfway through (the distractors are exactly who would be possible without it) and mixing up ' +
            '"could" and "must". This is the most expensive question on the test: past 40 seconds, guess and move on.',
        },
      },
    ],
  },

  verbal_detail: {
    tipo: 'verbal_detail',
    titulo: { pt: 'Atenção a detalhes', en: 'Attention to detail' },
    resumo: {
      pt:
        'Duas colunas de cinco linhas — nomes, endereços, códigos, números, e-mails — e a ' +
        'pergunta: quantas linhas são exatamente iguais, ou quais têm diferença? Não há ' +
        'raciocínio escondido; a prova mede se você confere rápido sem deixar passar nada.',
      en:
        'Two columns of five rows — names, addresses, codes, numbers, emails — and the ' +
        'question: how many rows are exactly identical, or which ones differ? There is no ' +
        'hidden reasoning; the test measures whether you can check fast without missing anything.',
    },
    ritmo: {
      pt:
        'Alvo de 10 a 15 segundos: é a questão mais barata da prova. Não releia uma linha que ' +
        'já conferiu — marque de cabeça e siga para a próxima.',
      en:
        'Target 10 to 15 seconds: it is the cheapest question on the test. Do not reread a ' +
        'row you already checked — note it mentally and move to the next.',
    },
    subtipos: [
      {
        subtipo: 'comparacao',
        titulo: { pt: 'Comparação de colunas', en: 'Column comparison' },
        oQuePede: {
          pt: 'Contar as linhas idênticas nas duas colunas, ou apontar as que têm diferença.',
          en: 'Count the rows that are identical in both columns, or point out the ones that differ.',
        },
        metodo: {
          pt: [
            'Leia a pergunta primeiro: contar as iguais e apontar as diferentes são respostas opostas.',
            'Compare em blocos de 3 ou 4 caracteres, no mesmo ponto das duas colunas.',
            'Olhe o miolo e o fim da string — o começo é onde todo mundo confere.',
            'Na dúvida entre duas alternativas, reconfira só as linhas em que elas discordam.',
          ],
          en: [
            'Read the question first: counting the identical rows and naming the different ones are opposite answers.',
            'Compare in chunks of 3 or 4 characters, at the same spot in both columns.',
            'Look at the middle and the end of each string — the start is where everyone checks.',
            'If torn between two options, recheck only the rows where they disagree.',
          ],
        },
        armadilha: {
          pt:
            'Ler a palavra inteira: o cérebro corrige "Phillips" e "Philips" para a mesma coisa. ' +
            'As alterações são dígitos vizinhos invertidos, St. no lugar de Dr., um hífen que ' +
            'andou uma casa, O no lugar de 0 — e a resposta "uma a menos" está sempre entre as ' +
            'alternativas.',
          en:
            'Reading the whole word: your brain autocorrects "Phillips" and "Philips" into the ' +
            'same thing. The changes are swapped neighbouring digits, St. instead of Dr., a ' +
            'hyphen moved one place, O instead of 0 — and the "one fewer" answer is always ' +
            'among the options.',
        },
      },
    ],
  },

  math_series: {
    tipo: 'math_series',
    titulo: { pt: 'Séries de números e letras', en: 'Number and letter series' },
    resumo: {
      pt:
        'Uma sequência — de números, de letras ou dos dois — e a pergunta: qual vem depois? O ' +
        'trabalho é achar a regra, não fazer conta. Letra vale a posição no alfabeto.',
      en:
        'A sequence — of numbers, letters, or both — and one question: what comes next? The ' +
        'work is finding the rule, not doing arithmetic. A letter stands for its place in the alphabet.',
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
            'Calcule a diferença entre vizinhos. Se ela cresce de forma regular (+2, +3, +4…), a regra está nas diferenças.',
            'Não fecha? Divida um termo pelo anterior. Quociente constante (inclusive negativo ou 1,5) é geométrica; quociente que cresce (×2, ×3, ×4) também é regra.',
            'Calcule a diferença DAS diferenças. Constante é quadrática; se as diferenças se multiplicam, a regra está nelas.',
            "Ainda nada: teste quadrados e cubos com deslocamento, soma dos dois ou três anteriores e 'multiplica e ajusta' (×2 + 1).",
          ],
          en: [
            'Take the difference between neighbours. If it grows regularly (+2, +3, +4…), the rule lives in the differences.',
            'No luck? Divide a term by the previous one. A constant quotient (even negative or 1.5) is geometric; a growing quotient (×2, ×3, ×4) is a rule too.',
            'Take the difference OF the differences. Constant means quadratic; if the differences multiply, the rule is there.',
            "Still nothing: test squares and cubes with an offset, the sum of the previous two or three, and 'multiply, then adjust' (×2 + 1).",
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
      {
        subtipo: 'serie_letras',
        titulo: { pt: 'Série de letras', en: 'Letter series' },
        oQuePede: {
          pt: 'O próximo termo de uma série de letras, de trios de letras ou de letra com número (A2, C4, E8…).',
          en: 'The next term of a series of letters, letter trios, or letter-and-number pairs (A2, C4, E8…).',
        },
        metodo: {
          pt: [
            'Troque cada letra pela posição no alfabeto (A = 1 … Z = 26). Âncoras poupam contar desde o A: E = 5, J = 10, O = 15, T = 20.',
            'Com uma letra por termo, resolva como série numérica: salto fixo, salto que cresce (+2, +3, +4) ou duas trilhas trançadas.',
            'Com várias letras por termo (CEG, DFH…), leia por COLUNA: a 1ª letra de cada termo é uma série, a 2ª é outra. Cada coluna pode ter regra própria — inclusive ficar parada.',
            'Com letra e número, resolva cada parte separada e depois teste se o número sai da letra (B4, D16, F36: o número é o quadrado da posição).',
          ],
          en: [
            'Swap each letter for its place in the alphabet (A = 1 … Z = 26). Anchors save counting from A: E = 5, J = 10, O = 15, T = 20.',
            'With one letter per term, solve it as a number series: a fixed jump, a growing jump (+2, +3, +4), or two interleaved strands.',
            'With several letters per term (CEG, DFH…), read by COLUMN: the 1st letter of each term is one series, the 2nd is another. Each column may have its own rule — including standing still.',
            'With a letter and a number, solve each part separately, then test whether the number comes from the letter (B4, D16, F36: the number is the square of the position).',
          ],
        },
        armadilha: {
          pt:
            'Errar a contagem por uma letra — contar a letra de partida como um passo — e, nos ' +
            'trios, aplicar a regra de uma coluna nas outras. As alternativas erradas costumam ' +
            'diferir da certa em uma única letra.',
          en:
            'Miscounting by one letter — counting the starting letter as a step — and, in trios, ' +
            'applying one column’s rule to the others. The wrong options usually differ from the ' +
            'right one by a single letter.',
        },
      },
    ],
  },

  math_word: {
    tipo: 'math_word',
    titulo: { pt: 'Problemas matemáticos', en: 'Word problems' },
    resumo: {
      pt:
        'Aritmética, razão, porcentagem e taxa em forma de texto, mais as contas curtas sem ' +
        'história (comparar decimais e frações, "de quê?") e, na segunda metade da prova, uma ' +
        'tabela pequena para cruzar. Nos níveis altos são 3–4 passos: média que muda, ' +
        'percentuais em sequência, taxas combinadas, mistura. O erro quase nunca é de conta; ' +
        'é de base errada, etapa pulada ou célula errada.',
      en:
        'Arithmetic, ratio, percentage and rate in prose, plus short calculations with no ' +
        'story (comparing decimals and fractions, "of what?") and, in the second half of the ' +
        'test, a small table to cross-read. Higher levels take 3–4 steps: shifting averages, ' +
        'successive percentages, combined rates, mixtures. The mistake is rarely arithmetic; ' +
        'it is the wrong base, a skipped step or the wrong cell.',
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
            'confira qual grandeza vem primeiro. Com total, divida pela soma dos termos; mais ' +
            'gente, menos dias; mistura se pondera pelo volume.',
          en:
            'Flipping the ratio. "The ratio of shirts to trousers is 3:5" is not the same as ' +
            '5:3 — check which quantity comes first. With a total, divide by the sum of the ' +
            'terms; more people, fewer days; mixtures are weighted by volume.',
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
          pt:
            'Devolver o desconto em vez do preço final. Percentuais em sequência se multiplicam; o ' +
            'preço original se acha dividindo, não somando o %.',
          en:
            'Giving back the discount instead of the final price. Successive percentages multiply; ' +
            'find the original price by dividing, not by adding the %.',
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
          pt:
            'Somar os tempos em vez das TAXAS. Trabalho conjunto soma taxas; velocidade média é ' +
            'distância total ÷ tempo total.',
          en:
            'Adding the times instead of the RATES. Joint work adds rates; average speed is ' +
            'total distance ÷ total time.',
        },
      },
      {
        subtipo: 'calculo_basico',
        titulo: { pt: 'Cálculo e comparação', en: 'Calculation and comparison' },
        oQuePede: {
          pt: 'Uma conta curta sem história ("616 is 70% of what?", "3/8 of 2/3 of 96") ou qual de cinco números é o menor, o maior ou o mais perto de um alvo.',
          en: 'A short calculation with no story ("616 is 70% of what?", "3/8 of 2/3 of 96") or which of five numbers is the smallest, the largest, or the closest to a target.',
        },
        metodo: {
          pt: [
            'Decimais: complete com zeros até todos terem as mesmas casas e compare como inteiros. Na multiplicação, some as casas dos fatores; na divisão, mova a vírgula dos dois números.',
            '"De" é vezes: fração de fração e % de % se multiplicam. Multiplique e simplifique antes de aplicar ao número.',
            '"X é p% de quê?": divida X por p/100 e confira de volta — p% do resultado precisa dar X.',
            'Frações coladas em 1/2: compare quanto cada uma passa (ou falta) de 1/2, (2a − b)/(2b). Sem referência, use o produto cruzado: a/b > c/d quando a·d > c·b.',
          ],
          en: [
            'Decimals: pad with zeros until they all have the same places and compare them as whole numbers. When multiplying, add up the factors’ places; when dividing, move the point in both numbers.',
            '"Of" means times: a fraction of a fraction and a % of a % multiply. Multiply and cancel before applying it to the number.',
            '"X is p% of what?": divide X by p/100 and check backwards — p% of the result must give X.',
            'Fractions hugging 1/2: compare how far each one is above (or below) 1/2, (2a − b)/(2b). With no benchmark, cross-multiply: a/b > c/d when a·d > c·b.',
          ],
        },
        armadilha: {
          pt:
            'Achar que número com mais algarismos é maior (0.00779 contra 0.0077) e errar a casa ' +
            'decimal por um — as alternativas 10× maiores e menores estão lá de propósito. Em ' +
            '"de quê?", aplicar o percentual à parte em vez de desfazê-lo.',
          en:
            'Assuming a number with more digits is bigger (0.00779 against 0.0077) and slipping ' +
            'the decimal point by one — the options 10× bigger and smaller are there on purpose. ' +
            'In "of what?", applying the percentage to the part instead of undoing it.',
        },
      },
      {
        subtipo: 'tabela',
        titulo: { pt: 'Leitura de tabela', en: 'Table reading' },
        oQuePede: {
          pt: 'Um valor ou uma linha que sai de cruzar poucas células de uma tabela.',
          en: 'A value, or a row, that comes from combining a few cells of a table.',
        },
        metodo: {
          pt: [
            'Leia a pergunta antes da tabela e grife a métrica: total, por funcionário, variação %, margem.',
            'Ache as células que a métrica usa — as outras colunas estão lá para distrair.',
            'Faça a conta só nessas células; em "qual linha", calcule a métrica de cada linha e compare.',
            'Confira o filtro: "mais de 20" não inclui a linha que tem exatamente 20.',
          ],
          en: [
            'Read the question before the table and pin down the metric: total, per employee, % change, margin.',
            'Find the cells that metric uses — the other columns are there to distract.',
            'Do the arithmetic on those cells only; for "which row", compute the metric on every row and compare.',
            'Check the filter: "more than 20" does not include the row with exactly 20.',
          ],
        },
        armadilha: {
          pt:
            'Responder pela métrica errada: a loja que mais vende não é a que mais vende POR ' +
            'funcionário, e o produto de maior margem por unidade não é o de maior lucro total. ' +
            'Variação do total não é a média das variações das linhas.',
          en:
            'Answering with the wrong metric: the store that sells the most is not the one that ' +
            'sells the most PER employee, and the product with the biggest per-unit margin is ' +
            'not the one with the biggest total profit. The change in the total is not the ' +
            'average of the row changes.',
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
            'Há dois tipos de distrator: o reflexo da figura e versões com um detalhe trocado — ' +
            'algumas também espelhadas. Confira a ordem dos detalhes E cada detalhe.',
          en:
            "There are two kinds of distractor: the figure's mirror image and versions with one " +
            'detail changed — some of them mirrored too. Check the order of the details AND each detail.',
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
          pt:
            'As erradas são a figura original girada — as "certas demais" — e versões com um ' +
            'detalhe trocado, espelhadas ou não.',
          en:
            'The wrong options are the original figure turned — the ones that look too right — and ' +
            'versions with one detail changed, mirrored or not.',
        },
      },
      {
        subtipo: 'odd_one_out',
        titulo: { pt: 'Qual não pertence', en: 'Odd one out' },
        oQuePede: {
          pt: 'A figura que não é a mesma das outras, apenas girada.',
          en: 'The figure that is not the same as the others, merely turned.',
        },
        metodo: {
          pt: [
            'Não compare as figuras duas a duas: são combinações demais.',
            'Escolha um detalhe assimétrico e veja onde ele aparece do lado oposto.',
            'Essa é a intrusa.',
            'Nos níveis altos a intrusa pode não ser o reflexo: pode ter um único detalhe diferente. Se a ordem dos detalhes bate em todas, compare detalhe por detalhe.',
          ],
          en: [
            'Do not compare the figures pairwise: there are too many combinations.',
            'Pick one asymmetric detail and find where it appears on the opposite side.',
            'That is the odd one.',
            'At higher levels the odd one may not be the mirror image: it may differ in a single detail. If the order of the details matches in all of them, compare detail by detail.',
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
            'Enxergar só a rotação e perder a segunda regra: toda série muda duas coisas. Nos ' +
            'níveis altos o giro também muda de tamanho — alterna entre dois passos ou cresce um ' +
            'passo por casa — e o atributo pode mudar só a cada duas casas.',
          en:
            'Seeing only the rotation and missing the second rule: every series changes two ' +
            'things. At higher levels the turn changes size too — it alternates between two steps ' +
            'or grows by one step each time — and the attribute may change only every second step.',
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
