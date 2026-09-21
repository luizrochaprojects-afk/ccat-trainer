# PRD: CCAT Trainer

## 1. Visão geral

Sistema web para treinar a Criteria Cognitive Aptitude Test (CCAT). O usuário treina tipos específicos de questão ou faz simulações completas de prova (50 questões em 15 min), sempre cronometrado, com banco de centenas de questões por tipo em dificuldade crescente, teoria acessível por tipo, e acompanhamento de performance ao longo do tempo contra as normas oficiais da CCAT.

Problema: a CCAT é cronometrada e mede velocidade de raciocínio sob pressão (~18s por questão, e a maioria não termina as 50). Quem treina sem familiaridade com os tipos e sem estratégia de tempo rende abaixo do próprio teto. O sistema ataca isso com prática por tipo, simulação fiel e progresso medido contra a norma.

## 2. Objetivos

- Permitir prática cronometrada por tipo e simulação completa fiel (50q/15min) desde o dia 0, sem login.
- Manter banco de centenas de questões por tipo, em dificuldade crescente, alimentado por geração via Claude Code e por importação, com gates de qualidade antes de qualquer questão ir ao ar.
- Revisão fácil de teoria e macete por tipo, e explicação por questão após a sessão.
- Acompanhar progresso (score, velocidade, acurácia por tipo) versus normas oficiais da CCAT ao longo do tempo.
- Começar single-user local e evoluir para multiusuário com conta sem reescrever o núcleo.

## 3. User stories

- Como candidato, quero fazer uma simulação de 50q em 15min igual à prova real, para medir onde estou hoje.
- Como candidato, quero treinar só um tipo (ex.: séries numéricas), cronometrado, para atacar meu ponto fraco.
- Como candidato, quero que as questões fiquem mais difíceis conforme avanço, para não estagnar no fácil.
- Como candidato, quero rever a teoria de um tipo em um clique quando erro, para corrigir na hora.
- Como candidato, quero ver minha evolução de score e velocidade ao longo das sessões, comparada à média da CCAT, para saber se estou pronto.
- Como candidato no dia 0, quero usar tudo isso sem criar conta, para começar a treinar imediatamente.

## 4. Requisitos funcionais

### Modos de sessão
1. O sistema deve oferecer dois modos: "Prática por tipo" e "Simulação completa".
2. Toda sessão deve ter cronômetro visível.
3. Simulação completa: 50 questões em 15 min, tipos intercalados, dificuldade crescente, sem voltar, sem feedback até o fim (fiel à prova real). Ao esgotar 15 min, a sessão encerra.
4. Prática por tipo: o usuário escolhe categoria e subtipo e define quantidade de questões e/ou tempo; recebe questões daquele tipo em dificuldade crescente.
5. Prática por tipo deve ter modo aprendizado: feedback e explicação imediatos após cada resposta. Na simulação não há feedback até o fim.
6. Em qualquer modo, clicar numa alternativa registra a resposta; na simulação, avança sem permitir voltar à questão.
7. Sem penalidade por erro; a questão pode ser pulada e conta como não respondida.

### Banco de questões e dificuldade
8. Cada questão tem: tipo, subtipo, nível de dificuldade (1 a 5), enunciado, alternativas, gabarito, explicação, origem e status.
9. O banco deve ter centenas de questões por tipo; a sessão puxa questões em dificuldade crescente e evita repetir questões já vistas pelo usuário na mesma janela.
10. Questões espaciais devem ser geradas por regra e renderizadas em SVG (rotação, odd-one-out, série, matriz, reflexão), com gabarito determinístico pela própria regra.

### Pipeline de conteúdo e gates de qualidade
11. Conteúdo entra por dois caminhos: geração via sessão de Claude Code (offline, em lote) e importação da internet. Nenhum LLM é chamado em runtime.
12. Toda questão nova entra como "draft" e só vai ao ar como "approved" após passar por todos os gates.
13. Gates mínimos: (a) schema e formato válidos; (b) exatamente um gabarito correto, com math e spatial verificados programaticamente e verbal revisado por segundo modelo ou humano; (c) dificuldade atribuída; (d) sem duplicata ou quase-duplicata; (e) 4 a 5 alternativas com distratores plausíveis.
14. O sistema deve registrar origem (claude-code | importado) e status de cada questão, e permitir revisar, aprovar ou reprovar drafts.

### Teoria e dicas
15. Cada tipo e subtipo deve ter uma página curta de teoria e macete, acessível a qualquer momento e linkada a partir da explicação da questão e da tela de resultado.
16. Deve existir uma referência única navegável com todos os tipos (a "cola").

### Progresso versus benchmark
17. Ao fim de cada sessão, o sistema mostra: score bruto, questões alcançadas dentro do tempo, acurácia por tipo e tempo médio por questão.
18. O sistema converte o score bruto da simulação em percentil usando as normas oficiais da CCAT (média 24,2, mediana 24, desvio-padrão 8,58).
19. O sistema mostra a evolução ao longo das sessões: tendência de score e percentil das simulações, acurácia por tipo, tempo médio por questão, e destaca o tipo mais fraco.
20. O benchmark de comparação é a norma oficial da CCAT, não outros usuários.

### Persistência e contas (faseado)
21. Fase 0 (dia 0): tudo funciona single-user, sem login, com dados salvos localmente no navegador (IndexedDB).
22. Fase posterior: autenticação e conta, com sincronização em nuvem e migração dos dados locais. A modelagem deve prever user_id desde a Fase 0 para não exigir reescrita.

## 5. Fora de escopo (v1)

- Autenticação, contas e sincronização em nuvem (entram em fase posterior).
- Comparação com outros usuários ou ranking.
- Geração de questões por API em runtime.
- App mobile nativo (web responsiva basta).
- Dificuldade adaptativa em tempo real (v1 usa ramp por nível fixo).
- Pagamento e monetização.

## 6. Considerações de design

- Web responsiva. A tela de questão deve ser limpa e legível em ~18s: enunciado, alternativas grandes clicáveis, cronômetro e contador (ex.: 12/50).
- Espaciais em SVG por regra, tema claro, alto contraste.
- Atalhos de teclado (A-E e 1-5) para responder rápido, já que velocidade é o alvo.
- A referência de teoria reaproveita o formato da cola de bolso já feita (colunas densas, por tipo).

## 7. Considerações técnicas

- Runtime sem LLM e sem chamada externa: o app lê um banco de questões local. Isso mantém a Fase 0 barata, offline e sem credencial.
- Pipeline de conteúdo separado do app: scripts rodados via Claude Code geram lotes, os gates validam, e o resultado aprovado é escrito no banco de questões versionado no repositório.
- Seed determinístico para as espaciais, para o gabarito ser sempre reprodutível a partir da regra.
- Modelagem com user_id desde o início (mesmo com um usuário local fixo), para a fase de contas não exigir migração de schema.
- Stack sugerida, não obrigatória: SPA em React/TS, IndexedDB na Fase 0, backend e auth apenas na fase de contas.

## 8. Métricas de sucesso

- Dia 0: o usuário consegue fazer uma simulação completa cronometrada e ver score e percentil vs norma, sem login.
- Banco com ao menos X questões aprovadas por tipo (definir X) em dificuldade crescente.
- 100% das questões no ar passaram pelos gates; nenhuma "draft" é servida ao usuário.
- O usuário consegue ver, em uma tela, a evolução de score e percentil e o tipo mais fraco.
- Espaciais renderizam por SVG com gabarito correto por construção (zero erro de gabarito em amostra auditada).

## 9. Perguntas em aberto

- Quantas questões por tipo definem "pronto" para o v1 (o X acima)?
- Fontes de importação da internet: quais são aceitáveis quanto a direito de uso? Copiar bancos proprietários de prep é risco; preferir gerar.
- Gate de verbal: revisão por segundo modelo automatizada basta, ou exige olho humano antes de aprovar?
- Dificuldade: níveis atribuídos manualmente na geração, por heurística, ou calibrados pelo desempenho real depois?
- Na prática por tipo, o tempo é por questão (ritmo de 18s) ou um tempo total configurável?
