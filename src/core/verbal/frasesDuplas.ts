import type { Difficulty } from '../taxonomy'
import type { LocalizedText } from '../i18n'

/**
 * Completar frase com DUAS lacunas — o item verbal mais comum da CCAT real.
 *
 * Cada frase tem uma lacuna ancorada por uma pista (o que vem depois dos
 * dois-pontos, "kept close together", "stripped of ornament") e outra
 * amarrada à primeira pelo conectivo ("although", "but", "because", "far
 * from"). Os distratores são pares em que:
 *  - uma palavra serve e a outra não (o candidato resolve uma lacuna e marca);
 *  - as duas servem cada uma no seu pedaço, mas juntas quebram o conectivo;
 *  - as duas estão invertidas.
 * Nenhum par errado sobrevive à frase inteira. Nenhuma palavra se repete entre
 * alternativas (a que aparece mais vezes seria o chute óbvio), e nenhuma
 * lacuna vem depois de "a"/"an".
 */
export interface DoubleFrame {
  /** as duas lacunas são "___" */
  frame: string
  answer: [string, string]
  distractors: [string, string][]
  level: Difficulty
  rationale: LocalizedText
}

export const DOUBLE_FRAMES: DoubleFrame[] = [
  // --- nível 1 ---------------------------------------------------------------
  {
    frame: 'Although the new manager seemed ___ at first, her team soon found her warm and ___.',
    answer: ['aloof', 'approachable'],
    distractors: [['reserved', 'distant'], ['friendly', 'sociable'], ['cheerful', 'hostile'], ['cold', 'unfriendly'], ['punctual', 'careless']],
    level: 1,
    rationale: {
      pt: '"Although" pede que a primeira impressão contraste com "warm": distante. A segunda lacuna acompanha "warm and", então é positiva. "friendly" desfaz o contraste; "distant" e "unfriendly" brigam com "warm".',
      en: '"Although" requires the first impression to contrast with "warm": distant. The second blank goes with "warm and", so it is positive. "friendly" removes the contrast; "distant" and "unfriendly" clash with "warm".',
    },
  },
  {
    frame: 'Critics predicted the play would ___, yet it ran for three sold-out seasons and became a lasting ___.',
    answer: ['flop', 'success'],
    distractors: [['fail', 'disaster'], ['thrive', 'triumph'], ['succeed', 'embarrassment'], ['close', 'failure'], ['tour', 'mystery']],
    level: 1,
    rationale: {
      pt: '"yet" opõe a previsão ao resultado: três temporadas lotadas são sucesso, então a previsão era de fracasso. "thrive" e "succeed" desfazem o "yet"; "disaster" e "failure" contradizem as casas lotadas.',
      en: '"yet" sets the prediction against the result: three sold-out seasons are a success, so the prediction was failure. "thrive" and "succeed" undo the "yet"; "disaster" and "failure" contradict the full houses.',
    },
  },
  {
    frame: 'Because the path was ___, the hikers moved ___ and kept close together.',
    answer: ['treacherous', 'cautiously'],
    distractors: [['dangerous', 'recklessly'], ['safe', 'carefully'], ['scenic', 'hurriedly'], ['slippery', 'carelessly'], ['familiar', 'noisily']],
    level: 1,
    rationale: {
      pt: '"kept close together" mostra cautela, e "because" pede que o caminho a justifique: perigoso. "dangerous" e "slippery" servem na primeira lacuna, mas "recklessly" e "carelessly" contradizem a cautela; "safe" não justifica nada.',
      en: '"kept close together" shows caution, and "because" requires the path to justify it: dangerous. "dangerous" and "slippery" fit the first blank, but "recklessly" and "carelessly" contradict the caution; "safe" justifies nothing.',
    },
  },
  {
    frame: 'The instructions were so ___ that even children could follow them, yet the adults found the task ___.',
    answer: ['simple', 'baffling'],
    distractors: [['clear', 'easy'], ['confusing', 'difficult'], ['complex', 'effortless'], ['brief', 'rewarding'], ['colorful', 'enjoyable']],
    level: 1,
    rationale: {
      pt: '"even children could follow them" fixa a primeira lacuna: simples. "yet" pede o contrário na segunda: os adultos se enrolaram. "clear" acerta a primeira, mas "easy" desfaz o "yet"; "confusing" e "complex" contradizem as crianças.',
      en: '"even children could follow them" fixes the first blank: simple. "yet" calls for the opposite in the second: the adults struggled. "clear" gets the first right, but "easy" undoes the "yet"; "confusing" and "complex" contradict the children.',
    },
  },
  {
    frame: 'Despite his ___ salary, he was known for his ___: he gave away half of what he earned.',
    answer: ['modest', 'generosity'],
    distractors: [['meager', 'greed'], ['enormous', 'charity'], ['large', 'stinginess'], ['weekly', 'honesty'], ['comfortable', 'thrift']],
    level: 1,
    rationale: {
      pt: 'Os dois-pontos definem a segunda lacuna: dar metade do que ganha é generosidade. "Despite" pede que o salário torne isso surpreendente: pequeno. "enormous / charity" acerta a segunda, mas com salário enorme não há "despite"; "meager" serve na primeira, mas "greed" contradiz a doação.',
      en: 'The colon defines the second blank: giving away half one earns is generosity. "Despite" requires the salary to make that surprising: small. "enormous / charity" gets the second right, but with a huge salary there is no "despite"; "meager" fits the first, but "greed" contradicts the giving.',
    },
  },
  {
    frame: 'The first chapter was ___, but the story grew so ___ that I finished the book in one night.',
    answer: ['slow', 'gripping'],
    distractors: [['dull', 'tedious'], ['thrilling', 'exciting'], ['boring', 'confusing'], ['short', 'predictable'], ['brilliant', 'dreary']],
    level: 1,
    rationale: {
      pt: 'Terminar o livro numa noite pede uma história envolvente; "but" pede um começo oposto: lento. "dull / tedious" acerta o começo e erra o resto; "thrilling / exciting" apaga o "but".',
      en: 'Finishing the book in one night calls for a gripping story; "but" calls for an opposite start: slow. "dull / tedious" gets the start right and the rest wrong; "thrilling / exciting" erases the "but".',
    },
  },
  {
    frame: 'Once ___ and half-empty, the town’s streets are now ___ day and night.',
    answer: ['deserted', 'crowded'],
    distractors: [['empty', 'quiet'], ['busy', 'packed'], ['lively', 'silent'], ['narrow', 'dark'], ['clean', 'muddy']],
    level: 1,
    rationale: {
      pt: '"half-empty" ancora a primeira lacuna: vazias. "Once ... now" pede o oposto na segunda: cheias. "empty / quiet" acerta o passado e esquece a mudança; "busy / packed" contradiz o "half-empty".',
      en: '"half-empty" anchors the first blank: empty. "Once ... now" calls for the opposite in the second: full. "empty / quiet" gets the past right and forgets the change; "busy / packed" contradicts "half-empty".',
    },
  },
  {
    frame: 'The medicine is ___ in small doses but can be ___ if you take too much.',
    answer: ['harmless', 'dangerous'],
    distractors: [['safe', 'healthy'], ['toxic', 'deadly'], ['useless', 'helpful'], ['bitter', 'sweet'], ['effective', 'beneficial']],
    level: 1,
    rationale: {
      pt: '"too much" anuncia risco, e "but" pede que a dose pequena seja o contrário: inofensiva. "safe / healthy" acerta a primeira e apaga o risco; "toxic / deadly" não deixa contraste para o "but".',
      en: '"too much" announces a risk, and "but" requires the small dose to be the opposite: harmless. "safe / healthy" gets the first right and erases the risk; "toxic / deadly" leaves no contrast for "but".',
    },
  },
  {
    frame: 'She was ___ about the plan at first, but after seeing the results she became its most ___ supporter.',
    answer: ['skeptical', 'enthusiastic'],
    distractors: [['doubtful', 'reluctant'], ['excited', 'eager'], ['certain', 'hesitant'], ['confident', 'fierce'], ['curious', 'bitter']],
    level: 1,
    rationale: {
      pt: '"most ___ supporter" pede apoio forte, e "but" pede que o começo seja o oposto: desconfiada. "doubtful / reluctant" acerta o começo, mas "reluctant" não é o apoiador mais forte; "excited" apaga o "but".',
      en: '"most ___ supporter" calls for strong support, and "but" requires the start to be the opposite: doubtful. "doubtful / reluctant" gets the start right, but "reluctant" is not the strongest supporter; "excited" erases the "but".',
    },
  },
  {
    frame: 'The storm was so ___ that the old bridge, usually ___, was swept away in minutes.',
    answer: ['fierce', 'sturdy'],
    distractors: [['mild', 'fragile'], ['violent', 'flimsy'], ['gentle', 'solid'], ['brief', 'crowded'], ['calm', 'rickety']],
    level: 1,
    rationale: {
      pt: 'Levar a ponte em minutos exige tempestade forte. "usually" pede que a ponte normalmente resistisse: firme. "violent / flimsy" acerta a tempestade, mas ponte frágil cair não tem nada de "usually"; "gentle" não derruba ponte.',
      en: 'Sweeping the bridge away in minutes takes a fierce storm. "usually" requires the bridge to normally hold: sturdy. "violent / flimsy" gets the storm right, but a flimsy bridge falling leaves nothing for "usually"; a "gentle" storm topples no bridge.',
    },
  },
  {
    frame: 'Although the exam was ___, most students finished it ___, with time to spare.',
    answer: ['lengthy', 'quickly'],
    distractors: [['long', 'slowly'], ['short', 'easily'], ['brief', 'rapidly'], ['difficult', 'late'], ['simple', 'carefully']],
    level: 1,
    rationale: {
      pt: '"with time to spare" fixa a segunda lacuna: rápido. "Although" pede que a prova sugerisse o contrário: longa. "long / slowly" acerta a prova e contradiz a sobra de tempo; "short" e "brief" apagam o "although".',
      en: '"with time to spare" fixes the second blank: quickly. "Although" requires the exam to suggest the opposite: long. "long / slowly" gets the exam right and contradicts the spare time; "short" and "brief" erase the "although".',
    },
  },

  // --- nível 2 ---------------------------------------------------------------
  {
    frame: 'Though the author’s prose is ___, her plots are so ___ that readers rarely notice the plain writing.',
    answer: ['unadorned', 'engrossing'],
    distractors: [['ornate', 'gripping'], ['simple', 'tedious'], ['elaborate', 'dull'], ['flowery', 'captivating'], ['modest', 'predictable']],
    level: 2,
    rationale: {
      pt: '"the plain writing" define a prosa: sem enfeite. "Though" e "rarely notice" pedem enredos que prendem. "ornate" e "flowery" contradizem "plain"; "simple / tedious" acerta a prosa, mas enredo tedioso faria notar a escrita.',
      en: '"the plain writing" defines the prose: unadorned. "Though" and "rarely notice" call for plots that absorb. "ornate" and "flowery" contradict "plain"; "simple / tedious" gets the prose right, but a tedious plot would make the writing noticeable.',
    },
  },
  {
    frame: 'The negotiations were expected to be ___, yet the two sides reached ___ agreement within an hour.',
    answer: ['protracted', 'swift'],
    distractors: [['lengthy', 'slow'], ['brief', 'rapid'], ['short', 'delayed'], ['drawn-out', 'belated'], ['easy', 'hasty']],
    level: 2,
    rationale: {
      pt: '"within an hour" fixa a segunda lacuna: rápido. "yet" pede que a expectativa fosse o contrário: demorada. "lengthy / slow" acerta a expectativa e contradiz a hora; "brief" e "easy" apagam o "yet".',
      en: '"within an hour" fixes the second blank: swift. "yet" requires the expectation to be the opposite: drawn out. "lengthy / slow" gets the expectation right and contradicts the hour; "brief" and "easy" erase the "yet".',
    },
  },
  {
    frame: 'Her tone was ___, but her words were so ___ that several colleagues left the meeting in tears.',
    answer: ['calm', 'cutting'],
    distractors: [['gentle', 'kind'], ['harsh', 'cruel'], ['angry', 'soothing'], ['polite', 'vague'], ['cheerful', 'comforting']],
    level: 2,
    rationale: {
      pt: 'Colegas saindo em lágrimas pedem palavras que ferem; "but" pede um tom oposto: calmo. "gentle / kind" acerta o tom e erra as palavras; "harsh / cruel" acerta as palavras e apaga o "but".',
      en: 'Colleagues leaving in tears call for wounding words; "but" calls for an opposite tone: calm. "gentle / kind" gets the tone right and the words wrong; "harsh / cruel" gets the words right and erases the "but".',
    },
  },
  {
    frame: 'The scientist was ___ about her findings, refusing to announce them until every result had been ___.',
    answer: ['cautious', 'verified'],
    distractors: [['careful', 'ignored'], ['eager', 'published'], ['reckless', 'confirmed'], ['boastful', 'forgotten'], ['hesitant', 'lost']],
    level: 2,
    rationale: {
      pt: 'Recusar-se a anunciar é cautela, e "until" pede o passo que a cautela espera: a verificação. "careful" e "hesitant" servem na primeira, mas "ignored" e "lost" não; "reckless / confirmed" acerta só a segunda.',
      en: 'Refusing to announce is caution, and "until" asks for the step caution waits for: verification. "careful" and "hesitant" fit the first, but "ignored" and "lost" do not; "reckless / confirmed" gets only the second.',
    },
  },
  {
    frame: 'The museum’s collection, once ___, has grown so ___ that it now fills four buildings.',
    answer: ['modest', 'vast'],
    distractors: [['small', 'tiny'], ['enormous', 'huge'], ['meager', 'limited'], ['famous', 'obscure'], ['immense', 'compact']],
    level: 2,
    rationale: {
      pt: 'Encher quatro prédios pede um acervo enorme; "once ... has grown" pede um começo pequeno. "small / tiny" acerta o começo e esquece o crescimento; "enormous / huge" apaga o "once".',
      en: 'Filling four buildings calls for a vast collection; "once ... has grown" calls for a small start. "small / tiny" gets the start and forgets the growth; "enormous / huge" erases the "once".',
    },
  },
  {
    frame: 'Critics called the film ___; audiences, however, found it ___ and stayed away in droves.',
    answer: ['brilliant', 'tedious'],
    distractors: [['dull', 'boring'], ['masterful', 'thrilling'], ['awful', 'captivating'], ['clumsy', 'delightful'], ['superb', 'charming']],
    level: 2,
    rationale: {
      pt: '"stayed away in droves" fixa a opinião do público: chato. "however" pede crítica oposta: elogio. "masterful / thrilling" acerta a crítica e contradiz o público sumindo; "dull / boring" apaga o "however".',
      en: '"stayed away in droves" fixes the audience\'s view: tedious. "however" calls for opposite reviews: praise. "masterful / thrilling" gets the critics right and contradicts the empty seats; "dull / boring" erases the "however".',
    },
  },
  {
    frame: 'Because the evidence was ___, the judge had no choice but to ___ the case.',
    answer: ['insufficient', 'dismiss'],
    distractors: [['lacking', 'pursue'], ['overwhelming', 'drop'], ['conclusive', 'abandon'], ['weak', 'reopen'], ['fabricated', 'publicize']],
    level: 2,
    rationale: {
      pt: '"because ... no choice but to" liga causa e consequência forçada. Prova insuficiente obriga a arquivar. "lacking" e "weak" servem na causa, mas "pursue" e "reopen" não decorrem dela; prova esmagadora não obriga a largar o caso.',
      en: '"because ... no choice but to" links a cause to a forced consequence. Insufficient evidence forces a dismissal. "lacking" and "weak" fit the cause, but "pursue" and "reopen" do not follow from it; overwhelming evidence does not force dropping the case.',
    },
  },
  {
    frame: 'The old radio looked ___, but it still worked ___ after fifty years.',
    answer: ['battered', 'flawlessly'],
    distractors: [['worn', 'poorly'], ['pristine', 'perfectly'], ['shiny', 'badly'], ['broken', 'erratically'], ['antique', 'loudly']],
    level: 2,
    rationale: {
      pt: '"but it still worked" pede que a aparência sugerisse o contrário: gasto. A segunda lacuna completa o "still worked" no positivo. "worn / poorly" acerta a aparência e apaga o "but"; "pristine" não tem o que contrastar.',
      en: '"but it still worked" requires the look to suggest the opposite: battered. The second blank completes "still worked" on the positive side. "worn / poorly" gets the look right and erases the "but"; "pristine" leaves nothing to contrast.',
    },
  },
  {
    frame: 'Initially ___ to the proposal, the board grew ___ once the costs turned out to be modest.',
    answer: ['hostile', 'receptive'],
    distractors: [['opposed', 'resistant'], ['eager', 'furious'], ['friendly', 'alarmed'], ['cold', 'suspicious'], ['supportive', 'doubtful']],
    level: 2,
    rationale: {
      pt: 'Custos modestos amolecem a resistência: o conselho passou a aceitar. "Initially" pede que antes fosse o contrário: contra. "opposed" e "cold" servem no começo, mas "resistant" e "suspicious" não mudam nada; "eager" e "friendly" não têm de onde mudar.',
      en: 'Modest costs soften resistance: the board came round. "Initially" requires the opposite before: against. "opposed" and "cold" fit the start, but "resistant" and "suspicious" change nothing; "eager" and "friendly" have nowhere to change from.',
    },
  },
  {
    frame: 'The coach’s methods were ___, yet his players adored him for his ___.',
    answer: ['demanding', 'fairness'],
    distractors: [['strict', 'cruelty'], ['relaxed', 'kindness'], ['harsh', 'arrogance'], ['easygoing', 'strictness'], ['unusual', 'absence']],
    level: 2,
    rationale: {
      pt: '"adored him for" pede uma qualidade; "yet" pede métodos que tornariam essa adoração inesperada: exigentes. "strict / cruelty" acerta os métodos, mas ninguém adora crueldade; "relaxed" apaga o "yet".',
      en: '"adored him for" calls for a virtue; "yet" calls for methods that make that adoration unexpected: demanding. "strict / cruelty" gets the methods right, but nobody adores cruelty; "relaxed" erases the "yet".',
    },
  },
  {
    frame: 'The hotel advertised ___ rooms, but guests complained that theirs were ___ and barely fit a bed.',
    answer: ['spacious', 'cramped'],
    distractors: [['roomy', 'generous'], ['tiny', 'narrow'], ['luxurious', 'lavish'], ['cozy', 'airy'], ['cheap', 'enormous']],
    level: 2,
    rationale: {
      pt: '"barely fit a bed" fixa a segunda lacuna: apertado. "but" pede que o anúncio prometesse o contrário: amplo. "roomy / generous" acerta o anúncio e contradiz a cama; "tiny" apaga o "but".',
      en: '"barely fit a bed" fixes the second blank: cramped. "but" requires the ad to promise the opposite: spacious. "roomy / generous" gets the ad right and contradicts the bed; "tiny" erases the "but".',
    },
  },

  // --- nível 3 ---------------------------------------------------------------
  {
    frame: 'The diplomat’s statement was so ___ that both sides claimed it ___ their position.',
    answer: ['equivocal', 'supported'],
    distractors: [['vague', 'contradicted'], ['explicit', 'endorsed'], ['blunt', 'undermined'], ['candid', 'weakened'], ['evasive', 'ignored']],
    level: 3,
    rationale: {
      pt: 'Os dois lados só reivindicam a mesma frase se ela admite duas leituras (equívoca) e se cada um a lê a seu favor. "vague" e "evasive" servem na primeira, mas ninguém reivindica o que o contradiz; "explicit" não serve a dois lados opostos.',
      en: 'Both sides can only claim the same statement if it allows two readings (equivocal) and each reads it in its own favor. "vague" and "evasive" fit the first, but nobody claims what contradicts them; an "explicit" statement cannot serve two opposing sides.',
    },
  },
  {
    frame: 'Far from being ___, the new CEO proved remarkably ___, reversing three major decisions in her first month.',
    answer: ['dogmatic', 'adaptable'],
    distractors: [['inflexible', 'stubborn'], ['open-minded', 'pliable'], ['cautious', 'timid'], ['ruthless', 'sentimental'], ['consistent', 'obstinate']],
    level: 3,
    rationale: {
      pt: 'Reverter três decisões mostra disposição a mudar; "Far from" pede o oposto na primeira: apegada a dogmas. "inflexible / stubborn" acerta a primeira e contradiz as reversões; "open-minded" é o que ela provou ser, não o que "far from" nega.',
      en: 'Reversing three decisions shows willingness to change; "Far from" calls for the opposite in the first: dogmatic. "inflexible / stubborn" gets the first right and contradicts the reversals; "open-minded" is what she proved to be, not what "far from" denies.',
    },
  },
  {
    frame: 'The review was ___ in its praise, calling the novel’s achievement ___ and unmatched in a decade.',
    answer: ['effusive', 'singular'],
    distractors: [['lavish', 'ordinary'], ['grudging', 'mediocre'], ['sparing', 'remarkable'], ['measured', 'typical'], ['unstinting', 'derivative']],
    level: 3,
    rationale: {
      pt: '"unmatched in a decade" fixa a segunda lacuna: excepcional. Um elogio assim é caloroso, não contido. "lavish" e "unstinting" servem na primeira, mas "ordinary" e "derivative" contradizem o "unmatched"; "sparing" e "grudging" não combinam com tanto elogio.',
      en: '"unmatched in a decade" fixes the second blank: exceptional. Praise like that is gushing, not restrained. "lavish" and "unstinting" fit the first, but "ordinary" and "derivative" contradict "unmatched"; "sparing" and "grudging" do not match that much praise.',
    },
  },
  {
    frame: 'Although the witness was ___ during the trial, her earlier statements to the police had been remarkably ___.',
    answer: ['reticent', 'forthcoming'],
    distractors: [['silent', 'guarded'], ['talkative', 'candid'], ['evasive', 'secretive'], ['voluble', 'reserved'], ['nervous', 'brief']],
    level: 3,
    rationale: {
      pt: '"Although" pede que o julgamento e o depoimento anterior sejam opostos no mesmo eixo: falar pouco × falar muito. "silent / guarded" e "evasive / secretive" não têm contraste; "voluble / reserved" inverte as duas.',
      en: '"Although" requires the trial and the earlier statements to be opposites on one axis: saying little × saying a lot. "silent / guarded" and "evasive / secretive" have no contrast; "voluble / reserved" reverses both.',
    },
  },
  {
    frame: 'The committee’s ___ approach, which checked every figure twice, made its conclusions nearly ___.',
    answer: ['meticulous', 'unassailable'],
    distractors: [['careful', 'questionable'], ['cursory', 'irrefutable'], ['haphazard', 'dubious'], ['thorough', 'suspect'], ['novel', 'obsolete']],
    level: 3,
    rationale: {
      pt: 'Conferir cada número duas vezes é minúcia, e minúcia torna as conclusões difíceis de atacar. "careful" e "thorough" servem na primeira, mas "questionable" e "suspect" contradizem o efeito; "cursory" contradiz a conferência dupla.',
      en: 'Checking every figure twice is meticulousness, and meticulousness makes conclusions hard to attack. "careful" and "thorough" fit the first, but "questionable" and "suspect" contradict the effect; "cursory" contradicts the double check.',
    },
  },
  {
    frame: 'Once considered ___, the theory is now so widely accepted that questioning it seems ___.',
    answer: ['heretical', 'eccentric'],
    distractors: [['radical', 'reasonable'], ['orthodox', 'absurd'], ['mainstream', 'sensible'], ['controversial', 'natural'], ['obscure', 'mandatory']],
    level: 3,
    rationale: {
      pt: '"Once ... now widely accepted" pede que antes a teoria fosse rejeitada; e, se hoje é aceita, questioná-la parece excêntrico. "radical" e "controversial" servem no passado, mas "reasonable" e "natural" contradizem a aceitação; "orthodox" apaga o "once".',
      en: '"Once ... now widely accepted" requires the theory to have been rejected before; and if it is accepted now, questioning it seems eccentric. "radical" and "controversial" fit the past, but "reasonable" and "natural" contradict the acceptance; "orthodox" erases the "once".',
    },
  },
  {
    frame: 'Instead of calming investors, the CEO’s ___ answers ___ their fears.',
    answer: ['evasive', 'heightened'],
    distractors: [['vague', 'soothed'], ['reassuring', 'eased'], ['clear', 'quieted'], ['hesitant', 'dispelled'], ['confident', 'allayed']],
    level: 3,
    rationale: {
      pt: '"Instead of calming" exige que o medo tenha aumentado, e a causa tem de ser respostas ruins: evasivas. "vague" e "hesitant" servem na primeira, mas "soothed" e "dispelled" são justamente o "calming" que não aconteceu.',
      en: '"Instead of calming" requires the fear to have grown, and the cause must be poor answers: evasive. "vague" and "hesitant" fit the first, but "soothed" and "dispelled" are precisely the calming that did not happen.',
    },
  },
  {
    frame: 'Despite the ___ weather, the festival’s crowds were ___, filling every street.',
    answer: ['dismal', 'enormous'],
    distractors: [['gloomy', 'sparse'], ['glorious', 'huge'], ['sunny', 'thin'], ['dreary', 'orderly'], ['pleasant', 'massive']],
    level: 3,
    rationale: {
      pt: '"filling every street" fixa a multidão: enorme. "Despite" pede um tempo que a tornaria improvável: ruim. "gloomy / sparse" acerta o tempo e contradiz as ruas cheias; "glorious" e "pleasant" apagam o "despite".',
      en: '"filling every street" fixes the crowds: enormous. "Despite" calls for weather that would make them unlikely: dismal. "gloomy / sparse" gets the weather right and contradicts the full streets; "glorious" and "pleasant" erase the "despite".',
    },
  },
  {
    frame: 'His ___ manner concealed how ___ his mind was: beneath the jokes, he was the sharpest strategist in the room.',
    answer: ['flippant', 'formidable'],
    distractors: [['playful', 'mediocre'], ['solemn', 'brilliant'], ['serious', 'shallow'], ['jovial', 'dull'], ['grave', 'keen']],
    level: 3,
    rationale: {
      pt: '"beneath the jokes" fixa o jeito: brincalhão. "sharpest strategist" fixa a mente: temível. "playful" e "jovial" servem na primeira, mas "mediocre" e "dull" contradizem o estrategista; "solemn" e "grave" contradizem as piadas.',
      en: '"beneath the jokes" fixes the manner: flippant. "sharpest strategist" fixes the mind: formidable. "playful" and "jovial" fit the first, but "mediocre" and "dull" contradict the strategist; "solemn" and "grave" contradict the jokes.',
    },
  },
  {
    frame: 'The drought was so ___ that even the river, normally ___, dried to a trickle.',
    answer: ['prolonged', 'torrential'],
    distractors: [['brief', 'shallow'], ['lengthy', 'sluggish'], ['mild', 'raging'], ['extended', 'dry'], ['intermittent', 'powerful']],
    level: 3,
    rationale: {
      pt: '"even ... normally" pede um rio que normalmente jamais secaria: caudaloso. E só uma seca longa seca um rio assim. "lengthy / sluggish" acerta a seca, mas rio lento secar não merece "even"; "brief" e "mild" não secam rio nenhum.',
      en: '"even ... normally" calls for a river that would normally never run dry: torrential. And only a long drought dries a river like that. "lengthy / sluggish" gets the drought right, but a sluggish river drying up does not deserve "even"; a "brief" or "mild" drought dries no river.',
    },
  },
  {
    frame: 'Although the software was marketed as ___, users found it so ___ that most gave up within a week.',
    answer: ['intuitive', 'bewildering'],
    distractors: [['simple', 'straightforward'], ['complex', 'confusing'], ['innovative', 'addictive'], ['clumsy', 'baffling'], ['reliable', 'delightful']],
    level: 3,
    rationale: {
      pt: 'Desistir em uma semana pede um programa que confunde; "Although" pede que a propaganda prometesse o contrário: fácil de usar. "complex" e "clumsy" apagam o "although"; "simple / straightforward" acerta a propaganda e contradiz a desistência.',
      en: 'Giving up within a week calls for software that confuses; "Although" requires the marketing to promise the opposite: easy to use. "complex" and "clumsy" erase the "although"; "simple / straightforward" gets the marketing right and contradicts the giving up.',
    },
  },

  // --- nível 4 ---------------------------------------------------------------
  {
    frame: 'Though famously ___ in private, the professor was so ___ at the lectern that students lined up to hear her.',
    answer: ['taciturn', 'eloquent'],
    distractors: [['reserved', 'halting'], ['garrulous', 'articulate'], ['loquacious', 'stammering'], ['reticent', 'tedious'], ['voluble', 'mesmerizing']],
    level: 4,
    rationale: {
      pt: 'Filas para ouvi-la pedem uma oradora brilhante; "Though" pede que em privado ela fosse o oposto: calada. "reserved" e "reticent" servem na primeira, mas "halting" e "tedious" não atraem filas; "garrulous" e "voluble" apagam o "though".',
      en: 'Queues to hear her call for a brilliant speaker; "Though" requires her to be the opposite in private: taciturn. "reserved" and "reticent" fit the first, but "halting" and "tedious" draw no queues; "garrulous" and "voluble" erase the "though".',
    },
  },
  {
    frame: 'The manager’s praise was so ___ that it rang hollow; staff suspected it was meant to ___ them before the layoffs.',
    answer: ['fulsome', 'placate'],
    distractors: [['effusive', 'alarm'], ['grudging', 'reassure'], ['sparing', 'soothe'], ['sincere', 'pacify'], ['lavish', 'provoke']],
    level: 4,
    rationale: {
      pt: 'Elogio que "soa oco" é exagerado a ponto de parecer falso (fulsome), e antes de demissões ele serviria para acalmar. "effusive" e "lavish" servem na primeira, mas ninguém elogia para alarmar ou provocar; "sincere" contradiz o "hollow".',
      en: 'Praise that "rang hollow" is overdone to the point of insincerity (fulsome), and before layoffs it would serve to placate. "effusive" and "lavish" fit the first, but nobody praises to alarm or provoke; "sincere" contradicts "hollow".',
    },
  },
  {
    frame: 'The report’s conclusions were ___, resting on a single survey that critics had long since ___.',
    answer: ['tenuous', 'discredited'],
    distractors: [['shaky', 'endorsed'], ['robust', 'debunked'], ['sound', 'validated'], ['flimsy', 'praised'], ['cogent', 'dismissed']],
    level: 4,
    rationale: {
      pt: 'Conclusões apoiadas numa única pesquisa já desacreditada são frágeis. "shaky" e "flimsy" servem na primeira, mas pesquisa endossada ou elogiada não enfraqueceria nada; "robust" e "cogent" contradizem a base desacreditada.',
      en: 'Conclusions resting on a single, already discredited survey are tenuous. "shaky" and "flimsy" fit the first, but an endorsed or praised survey would weaken nothing; "robust" and "cogent" contradict the discredited basis.',
    },
  },
  {
    frame: 'Her early work was ___, but her later novels, stripped of ornament, are models of ___.',
    answer: ['florid', 'restraint'],
    distractors: [['ornate', 'excess'], ['spare', 'simplicity'], ['austere', 'extravagance'], ['baroque', 'embellishment'], ['terse', 'verbosity']],
    level: 4,
    rationale: {
      pt: '"stripped of ornament" define a fase tardia: contenção. "but" pede o oposto no começo: rebuscada. "ornate" e "baroque" servem na primeira, mas "excess" e "embellishment" contradizem o "stripped"; "spare" apaga o "but".',
      en: '"stripped of ornament" defines the late phase: restraint. "but" calls for the opposite early on: florid. "ornate" and "baroque" fit the first, but "excess" and "embellishment" contradict "stripped"; "spare" erases the "but".',
    },
  },
  {
    frame: 'The candidate’s ___ answers in the debate contrasted sharply with her ___ campaign ads, which named names and cited figures.',
    answer: ['nebulous', 'pointed'],
    distractors: [['hazy', 'evasive'], ['precise', 'detailed'], ['incisive', 'blunt'], ['cryptic', 'ambiguous'], ['lucid', 'vague']],
    level: 4,
    rationale: {
      pt: 'Anúncios que citam nomes e números são diretos; "contrasted sharply" pede respostas opostas: nebulosas. "hazy" e "cryptic" servem na primeira, mas "evasive" e "ambiguous" contradizem os nomes e números; "precise" e "incisive" apagam o contraste.',
      en: 'Ads that name names and cite figures are pointed; "contrasted sharply" calls for opposite answers: nebulous. "hazy" and "cryptic" fit the first, but "evasive" and "ambiguous" contradict the names and figures; "precise" and "incisive" erase the contrast.',
    },
  },
  {
    frame: 'Because the minister’s reforms were ___ rather than sweeping, even his critics conceded they were ___.',
    answer: ['incremental', 'prudent'],
    distractors: [['gradual', 'reckless'], ['radical', 'sensible'], ['drastic', 'rash'], ['piecemeal', 'disastrous'], ['cautious', 'revolutionary']],
    level: 4,
    rationale: {
      pt: '"rather than sweeping" fixa a primeira lacuna: aos poucos. "even his critics conceded" pede um elogio que até os críticos admitem: sensatas. "gradual" e "piecemeal" servem na primeira, mas crítico não "concede" que algo é imprudente; "radical" contradiz o "rather than sweeping".',
      en: '"rather than sweeping" fixes the first blank: incremental. "even his critics conceded" calls for praise even critics admit: prudent. "gradual" and "piecemeal" fit the first, but critics do not "concede" that something is reckless; "radical" contradicts "rather than sweeping".',
    },
  },
  {
    frame: 'The general, usually ___ in victory, was uncharacteristically ___ after the battle, praising even the enemy’s courage.',
    answer: ['gloating', 'magnanimous'],
    distractors: [['boastful', 'arrogant'], ['gracious', 'generous'], ['humble', 'spiteful'], ['triumphant', 'vindictive'], ['smug', 'petty']],
    level: 4,
    rationale: {
      pt: 'Elogiar a coragem do inimigo é grandeza; "uncharacteristically" pede que o costume fosse o oposto: se vangloriar. "boastful", "triumphant" e "smug" servem na primeira, mas "arrogant", "vindictive" e "petty" contradizem o elogio; "gracious" apaga o "uncharacteristically".',
      en: 'Praising the enemy\'s courage is magnanimity; "uncharacteristically" requires the habit to be the opposite: gloating. "boastful", "triumphant" and "smug" fit the first, but "arrogant", "vindictive" and "petty" contradict the praise; "gracious" erases the "uncharacteristically".',
    },
  },
  {
    frame: 'What critics dismissed as ___ excess, admirers praised as ___ ambition.',
    answer: ['self-indulgent', 'visionary'],
    distractors: [['wasteful', 'reckless'], ['admirable', 'bold'], ['modest', 'petty'], ['restrained', 'timid'], ['grandiose', 'foolish']],
    level: 4,
    rationale: {
      pt: 'O mesmo traço visto por dois lados: "dismissed" pede um rótulo negativo, "praised" um positivo. "wasteful" e "grandiose" servem na primeira, mas "reckless" e "foolish" não são elogio; "admirable" não é o que se usa para descartar.',
      en: 'The same trait seen from two sides: "dismissed" calls for a negative label, "praised" for a positive one. "wasteful" and "grandiose" fit the first, but "reckless" and "foolish" are no praise; "admirable" is not what one dismisses something as.',
    },
  },
  {
    frame: 'The evidence against him was ___ at best, yet the prosecutor spoke as though his guilt were ___.',
    answer: ['circumstantial', 'incontrovertible'],
    distractors: [['indirect', 'doubtful'], ['conclusive', 'certain'], ['damning', 'obvious'], ['flimsy', 'questionable'], ['overwhelming', 'debatable']],
    level: 4,
    rationale: {
      pt: '"at best" pede prova fraca; "yet ... as though" pede que o promotor falasse o contrário: culpa indiscutível. "indirect" e "flimsy" servem na primeira, mas "doubtful" e "questionable" apagam o "yet"; "conclusive" e "damning" não combinam com "at best".',
      en: '"at best" calls for weak evidence; "yet ... as though" requires the prosecutor to speak as if the opposite: guilt beyond dispute. "indirect" and "flimsy" fit the first, but "doubtful" and "questionable" erase the "yet"; "conclusive" and "damning" do not go with "at best".',
    },
  },
  {
    frame: 'The landscape, ___ during the rainy season, becomes ___ and colorless once the rains stop.',
    answer: ['verdant', 'parched'],
    distractors: [['lush', 'vibrant'], ['arid', 'blooming'], ['green', 'flourishing'], ['bleak', 'fertile'], ['dusty', 'luminous']],
    level: 4,
    rationale: {
      pt: 'Com chuva a paisagem é verde; "once the rains stop" e "colorless" pedem o oposto: ressecada. "lush" e "green" servem na primeira, mas "vibrant" e "flourishing" contradizem "colorless"; "arid" e "dusty" não combinam com a estação chuvosa.',
      en: 'With rain the landscape is green; "once the rains stop" and "colorless" call for the opposite: parched. "lush" and "green" fit the first, but "vibrant" and "flourishing" contradict "colorless"; "arid" and "dusty" do not fit the rainy season.',
    },
  },
  {
    frame: 'The negotiator’s ___ offer was designed to ___ the strikers, but it only hardened their resolve.',
    answer: ['conciliatory', 'mollify'],
    distractors: [['generous', 'provoke'], ['hostile', 'appease'], ['insulting', 'pacify'], ['modest', 'antagonize'], ['belligerent', 'inflame']],
    level: 4,
    rationale: {
      pt: '"but it only hardened their resolve" diz que o efeito foi o contrário do planejado: a oferta queria acalmar. Então era conciliadora. "generous" serve na primeira, mas ninguém faz oferta generosa para provocar; "hostile" e "insulting" não acalmam ninguém.',
      en: '"but it only hardened their resolve" says the effect was the opposite of the plan: the offer was meant to calm. So it was conciliatory. "generous" fits the first, but nobody makes a generous offer to provoke; "hostile" and "insulting" calm nobody.',
    },
  },

  // --- nível 5 ---------------------------------------------------------------
  {
    frame: 'The senator’s speech, though ___ in tone, was ___ in substance: beneath the courteous phrasing lay a savage attack.',
    answer: ['urbane', 'excoriating'],
    distractors: [['genial', 'laudatory'], ['truculent', 'vitriolic'], ['boorish', 'anodyne'], ['suave', 'innocuous'], ['acerbic', 'scathing']],
    level: 5,
    rationale: {
      pt: '"courteous phrasing" fixa o tom: polido. "savage attack" fixa o conteúdo: arrasador. "genial" e "suave" servem na primeira, mas "laudatory" e "innocuous" contradizem o ataque; "truculent" e "acerbic" contradizem a cortesia.',
      en: '"courteous phrasing" fixes the tone: urbane. "savage attack" fixes the substance: excoriating. "genial" and "suave" fit the first, but "laudatory" and "innocuous" contradict the attack; "truculent" and "acerbic" contradict the courtesy.',
    },
  },
  {
    frame: 'Critics found the novel’s plot ___, but its prose so ___ that they forgave the thin story.',
    answer: ['threadbare', 'luminous'],
    distractors: [['flimsy', 'pedestrian'], ['intricate', 'mellifluous'], ['labyrinthine', 'leaden'], ['skeletal', 'turgid'], ['convoluted', 'sublime']],
    level: 5,
    rationale: {
      pt: '"the thin story" fixa o enredo: ralo. "forgave" pede uma prosa brilhante o bastante para compensar. "flimsy" e "skeletal" servem na primeira, mas "pedestrian" e "turgid" não redimem nada; "intricate" e "convoluted" contradizem o "thin".',
      en: '"the thin story" fixes the plot: threadbare. "forgave" calls for prose brilliant enough to make up for it. "flimsy" and "skeletal" fit the first, but "pedestrian" and "turgid" redeem nothing; "intricate" and "convoluted" contradict "thin".',
    },
  },
  {
    frame: 'Far from ___ the scandal, the spokesman’s statement ___ it, drawing new reporters to the story.',
    answer: ['defusing', 'inflamed'],
    distractors: [['quelling', 'calmed'], ['stoking', 'exacerbated'], ['igniting', 'allayed'], ['mitigating', 'obscured'], ['containing', 'buried']],
    level: 5,
    rationale: {
      pt: 'Atrair mais repórteres é piorar o escândalo; "Far from" nega o oposto: desarmar. "quelling", "mitigating" e "containing" servem na primeira, mas "calmed", "obscured" e "buried" não atraem repórter; "stoking" contradiz o "far from".',
      en: 'Drawing new reporters means making the scandal worse; "Far from" denies the opposite: defusing. "quelling", "mitigating" and "containing" fit the first, but "calmed", "obscured" and "buried" draw no reporters; "stoking" contradicts "far from".',
    },
  },
  {
    frame: 'The heir’s ___ habits, which once scandalized the family, gave way in middle age to ___ austerity that surprised everyone.',
    answer: ['profligate', 'monastic'],
    distractors: [['spendthrift', 'lavish'], ['abstemious', 'spartan'], ['frugal', 'sybaritic'], ['dissolute', 'opulent'], ['ascetic', 'luxurious']],
    level: 5,
    rationale: {
      pt: '"scandalized" e "gave way to austerity" pedem hábitos esbanjadores antes; a segunda lacuna qualifica a austeridade, então é severa. "spendthrift" e "dissolute" servem na primeira, mas "lavish" e "opulent" contradizem "austerity"; "abstemious" não escandaliza família nenhuma.',
      en: '"scandalized" and "gave way to austerity" call for wasteful habits before; the second blank qualifies the austerity, so it is severe. "spendthrift" and "dissolute" fit the first, but "lavish" and "opulent" contradict "austerity"; "abstemious" scandalizes no family.',
    },
  },
  {
    frame: 'Though the committee’s report was ___, its recommendations were so ___ that nobody could agree on what they required.',
    answer: ['exhaustive', 'nebulous'],
    distractors: [['thorough', 'precise'], ['cursory', 'vague'], ['meticulous', 'explicit'], ['perfunctory', 'lucid'], ['comprehensive', 'unambiguous']],
    level: 5,
    rationale: {
      pt: 'Ninguém concordar sobre o que as recomendações exigem pede recomendações vagas; "Though" pede um relatório que prometia o contrário: completo. "thorough", "meticulous" e "comprehensive" servem na primeira, mas "precise" e "explicit" encerrariam a discussão; "cursory" apaga o "though".',
      en: 'Nobody agreeing on what the recommendations require calls for vague recommendations; "Though" calls for a report that promised the opposite: exhaustive. "thorough", "meticulous" and "comprehensive" fit the first, but "precise" and "explicit" would settle the argument; "cursory" erases the "though".',
    },
  },
  {
    frame: 'The critic, usually ___ in her judgments, was uncharacteristically ___ about the debut, calling it merely “promising.”',
    answer: ['rhapsodic', 'guarded'],
    distractors: [['laudatory', 'enthusiastic'], ['caustic', 'glowing'], ['gushing', 'ecstatic'], ['temperate', 'circumspect'], ['scathing', 'rapturous']],
    level: 5,
    rationale: {
      pt: '"merely promising" é elogio contido; "uncharacteristically" pede que o costume fosse o oposto: arrebatado. "laudatory" e "gushing" servem na primeira, mas "enthusiastic" e "ecstatic" contradizem o "merely"; "temperate / circumspect" não tem nada de incomum.',
      en: '"merely promising" is guarded praise; "uncharacteristically" requires her habit to be the opposite: rhapsodic. "laudatory" and "gushing" fit the first, but "enthusiastic" and "ecstatic" contradict "merely"; "temperate / circumspect" is nothing unusual.',
    },
  },
  {
    frame: 'The magistrate’s reputation for ___ was well earned: she routinely ___ first offenders with nothing more than a warning.',
    answer: ['clemency', 'dismissed'],
    distractors: [['severity', 'released'], ['rigor', 'jailed'], ['harshness', 'excused'], ['indulgence', 'condemned'], ['probity', 'fined']],
    level: 5,
    rationale: {
      pt: 'Os dois-pontos provam a reputação: dispensar réus primários só com advertência é clemência. "severity", "rigor" e "harshness" contradizem a advertência; "indulgence" serve na primeira, mas "condemned" e "jailed" não cabem em "nothing more than a warning".',
      en: 'The colon proves the reputation: letting first offenders go with only a warning is clemency. "severity", "rigor" and "harshness" contradict the warning; "indulgence" fits the first, but "condemned" and "jailed" cannot go with "nothing more than a warning".',
    },
  },
  {
    frame: 'The scholar’s ___ prose, dense with jargon, made even her ___ insights seem impenetrable.',
    answer: ['abstruse', 'elementary'],
    distractors: [['lucid', 'profound'], ['recondite', 'arcane'], ['limpid', 'basic'], ['turgid', 'obscure'], ['pellucid', 'esoteric']],
    level: 5,
    rationale: {
      pt: '"dense with jargon" fixa a prosa: hermética. "even" pede que as ideias fossem as que menos deveriam parecer impenetráveis: básicas. "recondite" e "turgid" servem na primeira, mas "arcane" e "obscure" desfazem o "even"; "lucid" e "limpid" contradizem o jargão.',
      en: '"dense with jargon" fixes the prose: abstruse. "even" requires the insights to be the ones least likely to seem impenetrable: elementary. "recondite" and "turgid" fit the first, but "arcane" and "obscure" undo the "even"; "lucid" and "limpid" contradict the jargon.',
    },
  },
  {
    frame: 'Although the envoy’s manner was ___, his demands were ___: he would accept nothing less than full surrender.',
    answer: ['affable', 'uncompromising'],
    distractors: [['cordial', 'negotiable'], ['brusque', 'intransigent'], ['bellicose', 'flexible'], ['genial', 'modest'], ['hostile', 'adamant']],
    level: 5,
    rationale: {
      pt: '"nothing less than full surrender" fixa as exigências: inegociáveis. "Although" pede um jeito oposto: afável. "cordial" e "genial" servem na primeira, mas "negotiable" e "modest" contradizem a rendição total; "brusque" e "hostile" apagam o "although".',
      en: '"nothing less than full surrender" fixes the demands: uncompromising. "Although" calls for an opposite manner: affable. "cordial" and "genial" fit the first, but "negotiable" and "modest" contradict full surrender; "brusque" and "hostile" erase the "although".',
    },
  },
  {
    frame: 'Initially ___ by the board, the plan was later ___ as the company’s salvation.',
    answer: ['derided', 'hailed'],
    distractors: [['mocked', 'dismissed'], ['lauded', 'acclaimed'], ['ignored', 'abandoned'], ['extolled', 'vilified'], ['scorned', 'disparaged']],
    level: 5,
    rationale: {
      pt: '"as the company’s salvation" pede aclamação no fim; "Initially ... later" pede o oposto no começo: ridicularizado. "mocked", "ignored" e "scorned" servem na primeira, mas "dismissed", "abandoned" e "disparaged" não chamam nada de salvação; "lauded" apaga a virada.',
      en: '"as the company’s salvation" calls for acclaim at the end; "Initially ... later" calls for the opposite at the start: derided. "mocked", "ignored" and "scorned" fit the first, but "dismissed", "abandoned" and "disparaged" call nothing a salvation; "lauded" erases the turn.',
    },
  },
  {
    frame: 'The tenor’s voice, ___ in his youth, had become ___ with age, and critics now winced at every high note.',
    answer: ['mellifluous', 'strident'],
    distractors: [['sweet', 'melodious'], ['grating', 'harsh'], ['shrill', 'dulcet'], ['euphonious', 'sonorous'], ['raucous', 'silken']],
    level: 5,
    rationale: {
      pt: '"critics now winced" pede uma voz que fere o ouvido; "had become" pede que antes fosse o oposto: melodiosa. "sweet" e "euphonious" servem na primeira, mas "melodious" e "sonorous" não fazem ninguém se encolher; "grating" e "shrill" apagam a mudança.',
      en: '"critics now winced" calls for a voice that hurts the ear; "had become" requires it to have been the opposite before: mellifluous. "sweet" and "euphonious" fit the first, but "melodious" and "sonorous" make nobody wince; "grating" and "shrill" erase the change.',
    },
  },
]
