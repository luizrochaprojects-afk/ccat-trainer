# CCAT Trainer

Timed practice for the **Criteria Cognitive Aptitude Test** — 50 questions in 15 minutes.

**[ccat-trainer.vercel.app](https://ccat-trainer.vercel.app)**

The test is short and the clock is the opponent: you get roughly 18 seconds per question
and almost nobody finishes. This app trains exactly that, with full mock tests and
practice by type, and scores you against the test's published norms.

## What's in it

- **Full mock test** — 50 questions, 15 minutes, composed the way the real test is.
- **Practice by type** — short sessions on one type or subtype, at the same per-question
  time budget.
- **Progress against the official norms** — raw score converted to a percentile. A partial
  session becomes a *projection* with a confidence interval instead of comparing someone
  who answered 12 questions with someone who answered 50.
- **Theory per subtype** — what the question asks, the method, and the trap it sets.
- **English and Portuguese** interface. Question content is always English, because the
  test is administered in English.

Data stays in the browser (IndexedDB). No server, no account.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # the whole suite
npm run build      # the content gate runs before the bundle
```

## How the content is made

No question is hand-written, and none is written by a model without verification. Every
question comes from a **deterministic generator**: a function that, given a seed and a
level, returns the question **and the answer key derived from the rule that built it**.
The bank stores only `(generator, seed, level)`, so the gate re-runs the generator and
compares — "verifying the answer key" never degrades into trusting the JSON the generator
wrote about itself.

```bash
npm run content:generate -- --provas 20   # drafts sized for N mock tests
npm run content:gate                      # the five gates
npm run content:promote                   # promotes what passed into the bank
npm run content:assert                    # CI lock: nothing in the bank skipped a gate
```

The five gates: schema (G1), re-executed answer key (G2), declared level (G3), duplicates
(G4), and option integrity (G5).

## The six types

| Type | On the test | How the answer key is proven |
| --- | --- | --- |
| Verbal analogy | 7 | relation extracted from the lexicon |
| Vocabulary | 6 | synonym/antonym from the lexicon |
| Verbal logic | 4 | syllogism validated by **model checking** — 512 finite models over 3 predicates, no existential import |
| Number series | 7 | the series rule itself |
| Math word problems | 10 | symbolic solver |
| Spatial reasoning | 16 | the transformation that built the figure |

## Spatial reasoning

It is a third of the test and has the most elaborate module, in `src/core/spatial/`. The
decision that organizes it is separating **visual vocabulary** from **question form**:

- **Families** (`figuras/`) are the vocabulary — arcs in the corners of a square, hands on
  a dial, shape × fill × direction, concentric shapes, a frame with an X and markers. Each
  implements the same contract: rotate, mirror, sign, draw.
- **Forms** (`formas.ts`) are the question — rotation, reflection, odd one out, series,
  3×3 matrix, visual comparison. Every form is generic over the contract and does not know
  which figure it is looking at.

The product of the two yields 28 generators. A compatibility table blocks the invalid
combinations: the `atributos` family is achiral, so it feeds neither rotation nor
reflection — there, the mirror always coincides with some rotation and the question would
have two correct answers.

The figures are **discrete** on purpose, in small enumerable spaces. That is what makes it
possible to prove by enumeration, rather than by pixel sampling, that different
configurations produce different drawings — the guarantee that the correct option is not
merely correct but distinguishable by eye in 18 seconds.

```bash
npx tsx scripts/preview-spatial.ts 2 matriz   # visual audit, filtered by generator
```

## Layout

```
src/core/      pure rules, no DOM — generators, gates, session engine, norms
src/app/       React screens
src/data/      IndexedDB
scripts/       content pipeline (generate, gate, promote, preview)
content/       approved bank, versioned
tasks/         PRD and backlog
```

`src/core` imports nothing from `src/app`: the same rules run in the tests, in the audit
scripts, and in the app — and a preview that drew differently from the app would prove
nothing.

> Code comments are in Portuguese, the language the project is developed in. The naming
> follows suit: CSS classes, components and hooks use Portuguese identifiers
> (`.questao`, `<Confirmacao>`, `useBotaoVoltar`). They are referenced verbatim below.

## Mobile and Android

The test screen is designed against the fold: on `/sessao` the `.shell` becomes a
viewport-height grid (`100dvh`) with four bands — clock, rule, question, action — and
**only the question band scrolls**. Measured at 375×667 (iPhone SE), the worst case (a 3×3
matrix with five graphic options) fits without scrolling. If you touch the session layout,
measure again: `document.querySelector('.questao')` must not have
`scrollHeight > clientHeight` before the question is answered.

Two accidental exits are behind a confirmation, both through the same `<Confirmacao>`: the
End button and Back (browser and the Android hardware key). React Router's `useBlocker`
only covers in-app navigation — the browser's Back is intercepted with a sentinel history
entry, see `src/app/useBotaoVoltar.ts`.

The router is **hash-based**. Inside the Capacitor WebView, reloading on a deep route would
be a 404 from the local server — a blank screen in the middle of a test.

```bash
npm run icons            # regenerates icons and splash from scripts/icons.ts
npm run android:sync     # web build + cap sync
npm run android:open     # opens in Android Studio
npm run android:bundle   # produces the release AAB
```

`android/` is versioned (the manifest and gradle carry our edits); build artifacts and
**the signing key** are not. To sign, create `android/keystore.properties` — gitignored —
with `storeFile`, `storePassword`, `keyAlias` and `keyPassword`. Without that file the
release build comes out unsigned instead of failing.

Requires JDK 21 and the Android SDK.

### Hosting

`vercel.json` does two things, and both exist because of a defect observed in production:

1. **Rewrite everything to `index.html`.** The router is hash-based, so the app does not
   need this to work — but path-style links (`/progresso`, `/teoria`) were in circulation
   while `main` still used `BrowserRouter`, and without the rewrite they return **404**.
   With it, they land on the Home screen instead of an error page. The rewrite runs
   *after* the filesystem check, so `sw.js`, `manifest.webmanifest`, `privacidade.html`
   and `assets/` are still served as files.
2. **`sw.js` served uncached.** A cached service worker pins users to an old build, and
   the symptom — "I updated and nothing changed" — is expensive to diagnose.

---

CCAT Trainer is an independent study aid and is not affiliated with, endorsed by, or
connected to Criteria Corp. "CCAT" and "Criteria Cognitive Aptitude Test" are trademarks
of their respective owners, used here only to describe what this app helps you practise
for.
