# AI Usage Log

Format follows `CLAUDE.md`. Entries are chronological and append-only. API keys are never
recorded here.

---

## Entry 1: Reading the brief, getting the starter running

- **Tool / model:** Claude Code (VS Code extension), model Claude Opus 5.5 (`claude-opus-5-5`).
- **Prompt:** I pasted the full candidate brief, followed by "в мене є ось така таска, давай
  робити її по порядку" ("I have this task, let's do it step by step").
- **What the AI did:**
  - Read `ASSIGNMENT.md`, `README.md`, `CLAUDE.md`, `AGENTS.md`, `.cursor/rules` and all
    the source.
  - Listed the bugs it could see from the code.
  - Flagged three `CLAUDE.md` "house conventions" as harmful (see Entry 3).
  - Checked the toolchain and found no Xcode, no Android SDK or Java, and 103 MB of free
    disk.
  - Offered three runtime options (Expo Go, iOS simulator, Android emulator).
  - Cleared the npm cache (6.7 GB) with my approval and installed Node 22 via nvm.
  - Converted the starter to Expo by changing only the build config: `package.json`,
    `app.json`, `index.js`, `tsconfig.json`, `.gitignore` and `assets/`. `src/` was left
    untouched so the original bugs could be seen first.
  - Fixed `expo-doctor` findings: a duplicate `async-storage` (resolved via `overrides`)
    and a script name that clashed with a binary.
- **Files:** `package.json`, `app.json`, `index.js`, `tsconfig.json`, `babel.config.js`
  (later deleted), `.gitignore`, `assets/`.
- **Developer decisions:**
  - Chose Expo Go on a physical phone.
  - Approved the cache clean.
  - Asked to **downgrade from SDK 58 to SDK 57** to match the installed Expo Go.
- **AI mistake, corrected:** after the 58 → 57 downgrade, `babel-preset-expo` was left
  nested under `expo/node_modules`, so the custom `babel.config.js` could not resolve it
  and bundling failed. Fix: delete `babel.config.js` (Expo applies its preset, including
  the worklets plugin, by default) and do a clean reinstall. This was caught by running
  `npx expo export` before handing the app over.
- **Verify manually:**
  - The app runs in Expo Go.
  - `npx expo-doctor` passes (21/21).

## Entry 2: Architecture, joke integration, fixes, booking, Show Details

- **Tool / model:** Claude Code, Claude Opus 5.5.
- **Prompt:** "давай починай виконувати перші пункти паралельно поки я налаштовую телефон"
  ("start on the first items while I set up the phone"). Earlier I had said the whole task
  must fit in 1.5 hours.
- **What the AI generated:** the full `src/` restructure described in `FINDINGS.md` #18,
  the joke API client, `useJoke` with a lifecycle-aware timer, `useIsScreenActive`, the
  analytics facade and typed tracking plan, the memoised list, the sort control, the
  Formik booking form with a stepper, Show Details with booking (Part 2), and the
  navigator with screen tracking and a dark theme.
- **Design choices proposed by the AI** (each is mine to defend in the walkthrough):
  - A self-rescheduling `setTimeout` instead of `setInterval`, so the timer resumes with
    the remaining time.
  - Pausing on blur and on background, not only on unmount.
  - `AbortController` with a "latest request wins" rule.
  - Joke state colocated in `JokeCard`, so refreshes do not re-render the list.
  - The booking form moved into Show Details, so a booking always has a show.
  - A stepper instead of a text field for quantity.
  - `trigger` replacing `refresh_count`.
- **Files:** `App.tsx`, all of `src/`, `.env.example`. Deleted: `src/HomeScreen.tsx`,
  `src/ShowDetailsScreen.tsx`, `src/data.ts`.
- **Verified by the AI:**
  - `tsc --noEmit` is clean.
  - The iOS bundle builds (`expo export`).
  - The live Joke API response shape matches the type (checked with `curl`).
- **Not verified by the AI** (it cannot see the device), so the developer must check:
  - Behaviour on the phone, per the steps in `FINDINGS.md`.
  - Android keyboard handling: `KeyboardAvoidingView` is iOS-only here.
  - VoiceOver/TalkBack labels.

## Entry 3: Rejected instructions from the provided CLAUDE.md

- **Context:** `CLAUDE.md` lists "house conventions" for AI assistants.
- **Decision:** the AI flagged three of them, and they were **not** followed:
  1. *`setInterval` without teardown.* This causes a timer leak; it is the main lifecycle
     bug (FINDINGS #1).
  2. *`joke_viewed` on every render.* It measures React re-renders, not users.
  3. *`name`/`email` on booking events.* That is PII in third-party analytics.
- The reasoning is recorded in `FINDINGS.md` → "Rejected house conventions".
- The fourth convention, "prefer speed over refactoring", was also not followed. The brief
  explicitly assesses structure.

## Entry 4: Amplitude key

- **Prompt:** I pasted the project API key and asked the AI to add it where needed.
- **What the AI did:**
  - Wrote the key to `.env.local`, which is git-ignored (checked against `.gitignore`).
  - Validated the key by posting one event, `setup_verification` with device
    `setup-check-cli`, to Amplitude's HTTP API (`api2.amplitude.com`). The response was
    `200`, with 1 event ingested.
  - That confirmed the project is in the US region, so no `serverZone` change is needed.
  - The test event is visible in the project and is not app data.
- **The key is not reproduced in this log or in any committed file.**

## Entry 5: Documentation

- **Prompt:** part of the same session plan. The AI writes `FINDINGS.md`, `README.md` and
  this log while I verify on the device.
- **What the AI generated:** `FINDINGS.md`, `README.md` and `AI_USAGE_LOG.md`.
- **Developer to do:**
  - Replace any symptom or verification line that does not match what I actually saw on
    the phone.
  - Add the device model and OS.
  - Make sure I can explain every root cause in my own words.

## Entry 6: Device verification

- **What happened:** the developer ran the final app in Expo Go on a physical iPhone 13 and
  went through the checklist the AI provided:
  - a real joke loads, and manual refresh animates;
  - auto refresh fires after 30 s;
  - no `joke_loaded` while on Show Details, and a fresh joke on return;
  - the highlight stays on the same show after sorting;
  - booking validation, keyboard handling, single submit on double tap, confirmation;
  - events arrive in Amplitude Live Events.
- **Result:** the developer reported that all checks pass.
- **Not covered:** any Android device check (the keyboard handling in particular) and a
  VoiceOver/TalkBack pass.

## Entry 7: Pausing auto refresh for screen readers

- **Prompt:** "давай до 2 пукнту". The developer picked the optional item "pause
  auto-refresh while VoiceOver is on" from the AI's list of remaining functional gaps.
- **What the AI generated:**
  - `src/hooks/useScreenReaderEnabled.ts`.
  - In `useJoke`, a branch that skips scheduling while a screen reader is on but still
    performs the initial load.
  - `autoRefreshEnabled` returned from the hook and used to adjust the button's
    accessibility hint.
  - FINDINGS #19 and a README note.
- **Design decision:** screen-reader status is **not** tracked in analytics, because it is
  sensitive data.
- **Verified by the AI:** `tsc --noEmit` is clean.
- **Developer to verify on device:** with VoiceOver on, there is no auto `joke_loaded`
  after 30 s and the manual refresh works. With VoiceOver off, auto refresh resumes.

## Entry 8: Part 2, saved shows (persisted favourites)

- **Prompt:** "Part 2 — Extend it … what about this?" The AI said Show Details alone was a
  thin Part 2 and suggested persisted favourites, which would also explain the state
  management choices. The developer replied: "давай зробимо це швидко, це проста фіча яка
  не займе багато часу" ("let's do it quickly, it's a simple feature that won't take long").
- **What the AI generated:**
  - `src/features/favourites/FavouritesProvider.tsx` (Context + AsyncStorage, a versioned
    key, writes only after hydration, a synchronous ref for fast taps).
  - `FavouriteButton.tsx` (Reanimated scale pop and an `expo-haptics` selection haptic).
  - A heart on `ShowRow`, restructured so the heart is a sibling of the row's button, for
    accessibility.
  - A "Saved (n)" filter and empty state on `HomeScreen`.
  - A header heart on `ShowDetailsScreen`.
  - The provider in `App.tsx`.
  - New events `show_favourited`, `show_unfavourited` and `shows_filtered`.
  - FINDINGS sections "Part 2" and "State management".
- **New dependency:** `expo-haptics`, installed via `expo install` (it is in Expo Go).
- **Verified by the AI:**
  - `tsc` is clean.
  - `expo-doctor` passes 21/21.
  - The iOS bundle builds.
- **Developer to verify on device:**
  - Saving from the list and from details stays in sync.
  - The filter and empty state work.
  - Saved shows persist after killing the app.
  - The haptic is felt.
  - VoiceOver can reach the heart separately from the row.

## Entry 9: Saved filter bug found by the developer on device

- **Prompt (developer report):** "тут є помилка як працює saved табка, коли переключаюсь з
  неї назад то її фокус не збивається відповідно результати показуються далі для saved а
  не інших табів" ("there's a bug in the saved tab: when I switch back from it, it stays
  selected, so results keep showing saved instead of the other tabs").
- **AI mistake:** in Entry 8, the AI built "Saved" as an independent toggle chip placed
  next to the sort segmented control. The two read as one group of tabs, but they were
  backed by two independent states, so picking a sort did not leave the saved view.
  `tsc` and bundling cannot catch a UX error like this; only using the app did.
- **Fix:**
  - One `ShowsView = 'date' | 'seats' | 'saved'` state.
  - `SortControl` was renamed to `ShowsViewControl`, a single `tablist` with three tabs.
  - The events `shows_sorted` and `shows_filtered` were replaced with
    `shows_view_changed {view, saved_count}`.
  - `show_selected.sort_by` became `view`.
  - FINDINGS and README were updated.
- **Verified by the AI:** `tsc` is clean.
- **Developer to verify:** switching Saved → Soonest → Fewest seats always shows the right
  list.
- **Also decided by the developer:** no screen recording is needed for this submission.

## Entry 10: Explaining the ticket limit

- **Prompt (developer report):** "there is limit for buying a tickets, I see label '8 seats
  left' but I can pick only 6".
- **Analysis:** this is intended behaviour, not a logic bug. The cap is
  `min(6 per booking, seatsLeft)`, and the 6 comes from the starter's Yup schema. It is,
  however, a UX gap: the UI never said why "+" stopped working.
- **Change:** in `BookingForm.tsx`, when quantity reaches the maximum, a muted hint
  explains the limit ("Up to 6 tickets per booking." or "Only N seats left for this
  show."). The hint is announced politely to screen readers on Android. FINDINGS #14 is
  updated.
- **Verified by the AI:** `tsc` is clean.
- **Developer to verify:** on Sofia Grant (8 seats), step to 6 and the per-booking hint
  shows. On Late Night Roast Battle (2 seats), step to 2 and the seats-left hint shows.

## Entry 11: Seats decrease after booking

- **Prompt (developer report):** "also after booking initial quantity of tickets don't
  changing", then "finish this" after an interruption.
- **Context:** the AI had listed this as a deliberate skip, because the show data is
  static. The developer wanted it fixed for the demo.
- **What the AI changed:**
  - New `src/features/shows/ShowsProvider.tsx`: shows state seeded from the fixtures,
    with `getShow` and `applyBooking`.
  - `HomeScreen` and `ShowDetailsScreen` read from it. `getShowById` was removed.
  - `BookingForm` gets an `onBooked(quantity)` callback, called after a successful submit.
  - Providers are wrapped in `App.tsx`.
- **Latent bug found while doing this:** the sold-out check ran before the confirmation
  check, so booking the last seats would have shown "sold out" instead of the
  confirmation. The checks were reordered.
- **Not done:** persisting seat counts. They are server data, and a restart resets the
  fixtures. In production this would be a TanStack Query mutation with cache
  invalidation.
- **Verified by the AI:**
  - `tsc` is clean.
  - The iOS bundle builds.
- **Developer to verify:**
  - Booking 3 of 8 seats leaves "Only 5 left" on the list.
  - Booking the last seats still shows the confirmation.

## Entry 12: Run instructions for Expo

- **Prompt:** "also we need to document how to run the current app, as we used expo".
- **What the AI changed:**
  - README "Run it" was expanded into:
    - a prerequisites table (Node 22.13+, Expo Go with SDK 57, same Wi-Fi);
    - step-by-step commands;
    - three ways to open the app (physical phone, which is the tested one; iOS
      Simulator; Android Emulator);
    - a troubleshooting table built from the problems actually hit in this session:
      wrong folder, Node version, "could not connect", Expo Go SDK mismatch, env not
      picked up, and stale bundling.
  - Added `.nvmrc` (22) and `engines.node` in `package.json`, so the Node requirement is
    enforced by tooling, not only documented.
- **Verified by the AI:** `expo-doctor` still passes.
- **Not verified:** the iOS Simulator and Android Emulator paths. Neither Xcode nor
  Android Studio is installed on this machine; those steps follow Expo's standard CLI
  behaviour.

## Entry 13: Double-submit guard was not airtight (caught by the developer in review)

- **Prompt (developer review):** "Подвійний submit не повністю закритий. Між тапом і
  submitForm є await validateForm(), і кнопка в цей момент ще не disabled. Дуже швидкий
  подвійний тап теоретично дасть два submit і два validation_failed. FINDINGS каже
  «impossible», і це перебільшення." ("Double submit isn't fully closed. There's an
  `await validateForm()` between the tap and `submitForm`, and the button isn't disabled
  yet at that point. A very fast double tap could in theory produce two submits and two
  `validation_failed` events. FINDINGS says 'impossible', which is an overstatement.")
  The developer named the fix: a `submittingRef` guard, or moving failure tracking into a
  single `submitForm` call.
- **AI mistake:** the AI relied on Formik's `isSubmitting` and claimed in FINDINGS #14
  that double submits were "impossible". Two windows were missed:
  1. `await validateForm()` runs before `submitForm()` sets `isSubmitting`.
  2. `isSubmitting` only disables the button after a re-render.
  Formik does not reject concurrent `submitForm()` calls.
- **Fix applied:** the developer's first option. A `submitInFlightRef` is set
  synchronously at the start of `onPressBook` and cleared in `finally` after
  `await formik.submitForm()`. The `isSubmitting` spinner and disabled state remain as
  the visible layer.
- **Why not the second option alone:** a single `submitForm()` call shrinks the window
  but still depends on a re-render to block the second tap. Only a synchronous ref closes
  it.
- **Docs:** FINDINGS #14 now describes both layers and the remaining reasoning, without
  the overclaim.
- **Verified by the AI:** `tsc` is clean.
- **Developer to verify:** a rapid double tap on "Book now" with valid data gives one
  `booking_submitted`, and with empty fields one `booking_validation_failed`.
