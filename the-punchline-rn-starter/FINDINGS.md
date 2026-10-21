# FINDINGS

Each finding gives the **symptom** (what you see on the device or in the Metro log), the
**root cause** (why React Native behaves that way), the **fix**, and the **verification**.

Ordering is by priority: lifecycle and correctness first, then analytics and data quality,
booking, performance, accessibility, and structure.

> **Runtime note:** The starter targets bare RN 0.77. The machine I worked on had no Xcode,
> no Android SDK and almost no free disk space. I ran the app in **Expo Go (SDK 57, RN 0.86,
> React 19)** on a physical **iPhone 13**; the README allows "a different but equivalent setup".
> Nothing below depends on Expo-only APIs except `registerRootComponent` and the
> `EXPO_PUBLIC_` env inlining. See README → "Why Expo".

How each fix was verified:
- **Device:** checked by hand in Expo Go on a physical iPhone 13. Android was not tested on a device.
- **Log:** checked in the Metro console. In dev every analytics event is also printed as
  `[analytics] <name> {props}`.
- **Static:** `npm run typecheck` and `npx expo export` (bundle builds).

---

## 1. The joke auto-refresh timer is never cleared and keeps running off-screen

**Symptom:** You open a show and stay on Show Details. The Metro log still prints a joke
load and a `joke_loaded` event every 30 s, even though the joke card is not visible. You
background the app on Android and requests and events keep firing. You save a file
(Fast Refresh) and the refresh rate doubles, because a second interval stacks on the first.

**Root cause:**
- The `useEffect` called `setInterval` and never returned a cleanup function. The timer ID
  was thrown away.
- JS timers live on the JS thread. They are not tied to any component, so nothing stops
  them.
- In a native stack, the previous screen **stays mounted** when you push a new one on top.
  So "unmount" never even happens when you go to Show Details. A cleanup tied to unmount
  alone would still not be enough.
- iOS suspends the JS thread soon after the app goes to the background. Android keeps it
  running. So on Android the starter kept hitting the network and logging analytics with
  nobody looking.

**Fix:**
- New hook `src/hooks/useIsScreenActive.ts`. It returns
  `useIsFocused() && AppState === 'active'`.
- `src/features/jokes/useJoke.ts` runs the timer only while the screen is active. The
  effect cleanup clears it on blur, on background and on unmount.
- The timer is a self-rescheduling `setTimeout` keyed to `lastRequestedAt`, not a plain
  `setInterval`. This has two effects:
  - When you come back after 10 s, the next refresh fires after the remaining ~20 s.
  - When you come back after more than 30 s, one catch-up refresh fires immediately
    instead of a burst.

**Verification:**
- *Log:* open Show Details and wait 60 s. No `joke_loaded` events appear. Go back and
  `joke_loaded {trigger: "auto"}` resumes on schedule.
- *Device:* background the app for more than 30 s, return, and exactly one fresh joke loads.

## 2. Stale closure: `refresh_count` in analytics is always 0

**Symptom:** Every `joke_loaded` event carried `refresh_count: 0`, no matter how many
times you tapped "New joke".

**Root cause:**
- `loadJoke` read the `refreshCount` state. That function was captured by the mount
  effect (`[]` deps) and by the interval, so the timer kept calling the **first render's**
  `loadJoke`.
- Every function created during a render closes over that render's state. The first
  render's `refreshCount` was 0, so the timer always saw 0.
- The tap path had a related bug. It called `setRefreshCount` and then `loadJoke` in the
  same tick, so it also saw the old value.

**Fix:**
- The async loader reads no React state at all. What it needs is passed in explicitly:
  `load(trigger)`, where trigger is `'initial' | 'manual' | 'auto'`.
- Mutable bookkeeping lives in refs: the in-flight controller and `lastRequestedAt`.
- `load` is a stable `useCallback`.
- The `refresh_count` property is replaced with `trigger`. That is the question the
  business actually asks: do people use the button, or only the timer?

**Verification:** *Log:* each event shows the correct `trigger`. Tapping prints
`trigger: "manual"`, the timer prints `"auto"`, and the first load prints `"initial"`.

## 3. A manual refresh is followed almost immediately by an auto refresh

**Symptom:** You tap "New joke" at second 29 of the cycle. One second later the timer
replaces the joke you just asked for, before you can read it.

**Root cause:** The interval period was fixed when the effect mounted. A manual refresh
did not reset it.

**Fix:** A manual refresh bumps `scheduleEpoch`, which is a dependency of the timer effect.
The effect tears down and reschedules, so the next auto refresh comes a full 30 s after the
user's own refresh.

**Verification:** *Log/Device:* tap "New joke" and time it. The next `trigger: "auto"`
arrives about 30 s later.

## 4. Static stub replaced with the Official Joke API

**Symptom:** The stub always returned the same joke, so "New joke" appeared to do nothing.

**Fix:** `src/api/jokes.ts` calls `GET https://official-joke-api.appspot.com/random_joke`.

- **Endpoint:** `/random_joke` returns exactly one `{id, type, setup, punchline}`, which
  is what one card needs. `/jokes/ten` would allow prefetching, but needs queue logic that
  a 30 s cadence does not justify.
- **Typing:** the response is `unknown` until a type guard (`isJoke`) has validated it. A
  malformed payload becomes a typed `invalid_response` error, not a crash in render.
- **Errors:** `JokeApiError` with `reason`: `timeout` (8 s, via `AbortController`),
  `network`, `http` (with status), or `invalid_response`.
- **Caching:** the request sends `Cache-Control: no-cache`. The API sends an ETag, so
  without this iOS's `NSURLCache` may revalidate or serve a cached body, and "new" jokes
  can repeat.
- **UI states:**
  - Loading: spinner inside the button, which is disabled to prevent tap-spam.
  - First-load failure: a message plus a "Try again" button.
  - Failure after a joke is already shown: the previous joke stays, with an inline
    "Couldn't load a new joke" note.
- **Measurement:** `joke_loaded {joke_id, joke_type, trigger, latency_ms}` and
  `joke_load_failed {trigger, reason, http_status}`. Together these give engagement,
  API latency and error rate.

**Verification:**
- *Static:* `curl` against the endpoint confirms the shape.
- *Device:* real jokes load.
- *Device:* airplane mode, then tap: the error state appears. Turn the network back on
  and "Try again" recovers.

## 5. Race conditions between overlapping joke requests

**Symptom (latent):** A manual tap while an auto request is in flight starts two
requests. Whichever **resolves last** wins, so an older joke can overwrite a newer one.
Responses that arrived after unmount still called `setState`.

**Root cause:** Each `fetch` resolves independently. Nothing tied a response to "the
latest request".

**Fix:**
- Every load aborts the previous one through `AbortController`. Only the current
  controller may write state, and aborted requests exit silently: no error UI and no
  failure event.
- The unmount effect aborts any in-flight request.

**Verification:** *Log:* tap "New joke" rapidly (the button disables while loading, so this
needs a slow network). Only one `joke_loaded` is logged per completed request, and no
`joke_load_failed` appears for cancelled ones.

## 6. The joke card animation only ran once

**Symptom:** The card faded in on first mount. After that, new jokes swapped in abruptly.

**Root cause:** The shared value animated `0 → 1` once in the mount effect. Nothing ever
reset it, so later jokes had no transition.

**Fix:** The joke content is an `Animated.View` keyed by `joke.id` with
`entering={FadeInDown}`.
- The new key remounts the content, so the layout animation plays for every joke.
- Reanimated runs layout animations on the **UI thread**, so they stay smooth even if the
  JS thread is busy handling the network response.
- Reanimated's default `ReduceMotion.System` respects the OS "Reduce Motion" setting.

**Verification:** *Device:* every new joke slides in. With iOS Settings → Accessibility →
Reduce Motion on, it appears without motion.

## 7. Every joke refresh re-rendered the whole home screen; history grew forever

**Symptom (perf):**
- Every 30 s the whole screen re-rendered: list rows, the booking form, everything.
  React DevTools "highlight updates" shows it.
- `history` grew by one joke per refresh and was never read.

**Root cause:**
- The joke state lived in `HomeScreen`, so any change re-rendered the entire tree.
- `renderItem` was an inline arrow and the rows were not memoized, so `FlatList` could
  not skip them.
- `history` was dead state that only consumed memory.

**Fix:**
- State colocation: `JokeCard` owns `useJoke()`, so a refresh re-renders only the card.
- Rows are `memo(ShowRow)` with a `useCallback` `renderItem` and `onPress`.
- `history` is removed.

**Verification:** *Device / React DevTools:* with "highlight updates when components
render" on, an auto refresh highlights only the joke card.

## 8. `FlatList` nested inside a `ScrollView` (virtualization disabled)

**Symptom:** Metro warns *"VirtualizedLists should never be nested inside plain
ScrollViews with the same orientation"*.

**Root cause:**
- The outer `ScrollView` gives its child unbounded height. The inner `FlatList` therefore
  thinks its viewport is infinite and renders **every** row up front.
- That means no windowing and no recycling, and a second scroll responder.
- With 6 fixtures this is invisible. With a real shows feed it means slow mounts and high
  memory.

**Fix:** The home screen is a single `FlatList`. The hero, joke card and section header
are its `ListHeaderComponent`. The booking form moved to Show Details (see #14).

**Verification:** *Log:* the warning is gone. *Device:* scrolling is smooth.

## 9. Index keys and an index-based selection highlight the wrong show after sorting

**Symptom:** Tap "Marcus Lin" (row 1), go back, then switch the sort. The highlight moves
to whatever show is now at index 1.

**Root cause:**
- The highlight stored `selectedIndex`, but the index of a show changes when the data is
  reordered.
- `keyExtractor` also used the index. On reorder, React matches components by key, so
  each row component is reused for a **different** show. That means more work, and any
  local state inside a row would leak to the wrong show.

**Fix:** `keyExtractor={show => show.id}`. The highlight is stored as `lastViewedShowId`.

**Verification:** *Device:* repeat the steps above. The highlight stays on Marcus Lin in
both sort orders.

## 10. Sorting "by date" did not sort, and the toggle label was ambiguous

**Symptom:** "Sort: date" just showed the array order. The label described the current
state, but users read it as the action the button would take.

**Root cause:**
- The default branch returned `SHOWS` as is. It was correct only by accident of fixture
  order.
- `[...SHOWS].sort()` also ran on every render.

**Fix:**
- `sortShows()` sorts explicitly for both modes and is wrapped in `useMemo`.
- A tab control shows every option ("Soonest" / "Fewest seats", plus "Saved" from
  Part 2). The active one is exposed to assistive tech as a `tab` with `selected`.
- `shows_view_changed {view, saved_count}` fires only when the view actually changes.

**Verification:** *Device:* both orders are correct. VoiceOver reads "Fewest seats first,
selected, tab".

## 11. Dates: `toLocaleString()` per row per render, and fixtures in the past

**Symptom:**
- The long, noisy date format differs per device.
- Every "Upcoming" show was dated September 2026, which is in the past at the time of
  writing (October 2026).

**Root cause:**
- `toLocaleString()` builds a new Intl formatter on each call, which is relatively
  expensive on Hermes, and it ran in render.
- The fixture data was simply stale.

**Fix:** One module-level `Intl.DateTimeFormat` (`Sat, 14 Nov, 21:30`). The fixtures are
moved to November 2026. In production, past shows would be filtered server-side.

**Verification:** *Device:* compact dates.

## 12. The booking form bypassed validation entirely

**Symptom:** Tapping "Book now" with empty fields printed "You're on the list" and fired
`booking_submitted`. No validation error ever appeared.

**Root cause:**
- The button called `onBook`, which set `booked = true` directly. It never called
  `formik.handleSubmit`.
- So Yup never ran, and `touched` was never set. The error `<Text>`s are gated on
  `touched`, so they could never render.

**Fix:**
- "Book now" now:
  1. runs `validateForm()`;
  2. tracks `booking_validation_failed {invalid_fields}` if there are errors;
  3. calls `submitForm()`, which marks all fields touched and calls `onSubmit` only when
     the form is valid.
- Errors appear under each field, with a red border, after blur or after a submit attempt.
- `booking_submitted` fires only after the (mock) request succeeds.

**Verification:** *Device:* an empty submit shows "Name is required" and "Email is
required", and no success message. `test@` shows "Enter a valid email".
*Log:* `booking_validation_failed {invalid_fields: ["email","name"]}`.

## 13. Booking analytics sent PII (name and email) to Amplitude

**Symptom:** `booking_submitted` carried the customer's `name` and `email` as event
properties.

**Root cause:** Inline analytics with no rule about what may leave the device. The
provided `CLAUDE.md` even recommended this "to match events to our CRM".

**Fix:**
- Removed. Name and email go only to the booking request. Analytics gets
  `{show_id, quantity, seats_left}`.
- The tracking plan in `src/analytics/events.ts` documents a no-PII rule.
- If CRM matching is needed, the right tool is a server-side join on a booking ID or a
  hashed customer ID set via `setUserId` after consent. Raw email in a third-party
  analytics tool is a GDPR problem and leaks into every export and dashboard.

**Verification:** *Log / Amplitude Live Events:* the `booking_submitted` payload contains
no name or email.

## 14. Booking had no show, a free-text quantity, and no submit state

**Symptom:**
- The form booked "tickets" without saying for which show.
- "Tickets" opened a full text keyboard, accepted `abc` or `100`, and never showed an
  error for it.
- Double-tapping "Book now" fired the submit twice.
- On a phone, the keyboard covered the lower fields.

**Root cause:**
- The form was not connected to a show at all.
- `quantity` was a string field with no `keyboardType`, and its error was never rendered.
- There was no pending state, so nothing blocked a second tap.
- Nothing adjusted the layout for the keyboard.

**Fix:**
- **Booking moved to Show Details** (Part 2), so a booking is always for a specific show.
- Quantity is a **stepper** bounded by `min(6, seatsLeft)`. The per-booking cap of 6
  comes from the starter's own schema. The stepper has no parsing and allows no invalid
  input. Screen readers see one `adjustable` control with increment and decrement
  actions. A sold-out show shows a message instead of the form.
- At the limit, a hint explains **which** limit applies: "Up to 6 tickets per booking" or
  "Only 2 seats left for this show". Without it, "8 seats left" next to a stepper that
  stops at 6 read like a bug. The developer reported exactly that on device.
- The name field uses `autoComplete="name"` and Return moves to Email. The email field
  uses `keyboardType="email-address"`, `autoCapitalize="none"` and `autoComplete="email"`.
- **Double-submit protection, in two layers:**
  - *Visible:* an async mock `submitBooking` means `isSubmitting` disables the button
    and shows a spinner while the request is pending.
  - *Synchronous:* that alone is **not** airtight. `isSubmitting` only takes effect
    after a re-render, and the press handler awaits `validateForm()` before
    `submitForm()` even sets it. A very fast double tap inside that window (a few ms)
    would run `onSubmit` twice, creating two bookings and two `booking_validation_failed`
    events. Formik does not guard against concurrent submits.
  - A `submitInFlightRef` is set synchronously at the start of the press and cleared in
    `finally` after `submitForm()` settles, so a second tap inside the window returns
    immediately.
  - An alternative would be one `submitForm()` call with failure tracking moved into it.
    That shrinks the window, but still relies on a re-render to block the second tap.
- A failure shows an inline error and tracks `booking_failed`.
- `KeyboardAvoidingView`, offset by the native header height, plus
  `keyboardShouldPersistTaps="handled"` and `keyboardDismissMode="interactive"`.
- A confirmation card with "Back to shows" (`popTo('Home')`).
- **Seats go down after a booking.** The developer reported on device that seat counts
  never changed. Shows are now held in a `ShowsProvider`. On success, `applyBooking`
  subtracts the quantity, so Show Details, the list row and the "Fewest seats" order all
  update. Booking the last seats used to replace the confirmation with "sold out",
  because the sold-out check ran first. The confirmation check now runs first.
  `booking_submitted.seats_left` is the count *before* the booking.

**Verification:** *Device:* the stepper stops at the limit (2 for "Late Night Roast
Battle"). A rapid double tap creates one booking (the ref guard is what closes the
sub-render window; a normal-speed double tap is already blocked by the disabled button). Book 3 of Sofia Grant's 8 seats, go back, and
the row reads "Only 5 left". Book both seats of Late Night Roast Battle and you still see
the confirmation, then "sold out" on reopening. *Log:* one `booking_submitted`. The fields stay
visible above the keyboard.

## 15. Amplitude: placeholder key in source, inline SDK calls, no screen tracking

**Symptom:** No events reached Amplitude, because the key was the placeholder string.
SDK calls were scattered through the UI. There was no record of which screens users saw.

**Fix:**
- `src/analytics/analytics.ts` is the **only** importer of the Amplitude SDK. It exposes
  `initAnalytics()`, `track()` and `trackScreen()`.
- `track()` is generic over the typed tracking plan in `src/analytics/events.ts`. An
  unknown event name or a wrong property type fails `tsc`.
- The key comes from `EXPO_PUBLIC_AMPLITUDE_API_KEY` in a git-ignored `.env.local`. It is
  still inlined into the bundle, which is fine for an ingestion key (public by design) but
  not for secrets. Without a key, events are only logged locally.
- `initAnalytics()` runs once, at module scope in `App.tsx`, before the first render, with
  `trackingSessionEvents: true`.
- Screen views are tracked **centrally** in `RootNavigator` from navigation state:
  `screen_viewed {screen_name}`, de-duplicated by route name.
- The full event list, and what is deliberately **not** tracked, is in the README.

**Verification:** *Amplitude:* see README → "Verifying events". Events arrive in Live
Events within seconds.

## 16. Accessibility gaps

**Symptom:** With VoiceOver/TalkBack on:
- buttons were read as plain text;
- the show row read three separate fragments;
- the sort toggle gave no state;
- "‹ Back" was not a button;
- the sort toggle's touch target was about 18 pt tall.

**Fix:**
- A shared `PrimaryButton` has `accessibilityRole="button"`, a label, a hint and
  `accessibilityState {disabled, busy}`, plus a minimum height of 44 pt.
- Each show row is one button with a combined label ("Marcus Lin, Sat 14 Nov 21:30,
  Basement, Only 4 left").
- Section titles have the `header` role. Errors have the `alert` role.
- The native header back button replaces the custom text "Back".
- The low-seats warning uses text as well as colour.

**Verification:** *Device:* VoiceOver pass over the home screen, Show Details and the form.

## 17. Show Details: broken not-found state and a non-native back button

**Symptom:**
- An unknown `showId` rendered "Show" followed by `undefined · undefined seats left`.
- With the header hidden, the "‹ Back" text was the only back affordance, and it had no
  button semantics.

**Fix:**
- An explicit not-found state with a way back.
- The native stack header (title-less, "Shows" back label, dark theme) gives the
  platform back button and swipe-back behaviour.
- The navigation theme is set to the app's dark colours, so the native container behind
  transitions and overscroll is not the default light grey. This is hardening; I did not
  observe a flash on device.

## 18. Structure

**Symptom:**
- One 230-line file mixed data fetching, timers, analytics, list logic, form logic and
  styles.
- Screens imported the param list from `../App`, while `App` imported the screens. This
  is a circular import; it only works because Babel strips the type-only import.

**Fix:**
```
src/
  api/          jokes.ts (Joke API client), bookings.ts (mock)
  analytics/    analytics.ts (only SDK importer), events.ts (tracking plan)
  config/       env.ts
  data/         shows.ts (fixtures, sort, date formatting)
  features/
    jokes/      useJoke.ts (fetch + lifecycle-aware timer), JokeCard.tsx
    shows/      ShowsProvider.tsx (seat availability), ShowRow.tsx (memo), ShowsViewControl.tsx
    booking/    BookingForm.tsx (Formik + Yup), QuantityStepper.tsx
    favourites/ FavouritesProvider.tsx (Context + AsyncStorage), FavouriteButton.tsx
  hooks/        useIsScreenActive.ts, useScreenReaderEnabled.ts
  navigation/   RootNavigator.tsx (theme, screen tracking), types.ts
  screens/      HomeScreen.tsx, ShowDetailsScreen.tsx
  components/   PrimaryButton.tsx
  theme/        colors.ts
```
The rule: screens compose features, features own their state and analytics calls through
the `analytics` facade, and only `api/` talks to the network.

## 19. Auto-refresh changed the joke under screen-reader users

**Symptom:** With VoiceOver on, the joke can be replaced every 30 s while it is being read
aloud or while focus is on it. That violates WCAG 2.2.2 (Pause, Stop, Hide): content that
updates on its own must be controllable.

**Root cause:** The timer ignored accessibility state. React Native exposes screen-reader
status through `AccessibilityInfo`, but nothing used it.

**Fix:**
- New hook `src/hooks/useScreenReaderEnabled.ts`. It reads
  `AccessibilityInfo.isScreenReaderEnabled()` and subscribes to `screenReaderChanged`.
- While a screen reader is on, `useJoke` loads the first joke and then **does not
  schedule** auto refreshes. Manual "New joke" works as normal.
- The button's `accessibilityHint` drops the "refreshes every 30 seconds" sentence when
  auto refresh is off.
- The toggle is live: turning VoiceOver on or off re-runs the timer effect.
- Screen-reader status is deliberately **not** sent to analytics. Assistive-tech usage is
  sensitive personal data.

**Verification:**
- *Device:* turn on VoiceOver (Settings → Accessibility, or triple-click the side button if
  that shortcut is set up). Wait more than 30 s on Home. The Metro log shows no
  `joke_loaded {trigger:"auto"}`, and "New joke" still works.
- Turn VoiceOver off. Auto refresh resumes within 30 s.

## Part 2: Saved shows (persisted favourites)

On top of the tracked Show Details screen with booking (#14, #17), I added **saved shows**.
It is the first feature with state that is shared across screens and persisted. That made
it the natural point to introduce a real state layer.

**What it does:**
- A ♡ on every show row and in the Show Details header saves or unsaves the show. Either
  place updates both screens instantly.
- A third tab on Home, "♥ Saved (n)", next to "Soonest" and "Fewest seats", shows only
  saved shows (soonest first), with an empty state that explains what to do.
- Saved shows survive an app restart.
- The tap gives a selection haptic and a scale "pop" animation. The animation runs on the
  UI thread via Reanimated shared values and respects Reduce Motion.

**How it is built:**
- `src/features/favourites/FavouritesProvider.tsx` holds the state: React Context and
  AsyncStorage.
- **Persistence:**
  - The storage key is versioned (`punchline:favourite-show-ids:v1`).
  - Stored JSON is validated, so corrupt or foreign data loads as empty instead of
    crashing.
  - Writes happen only **after hydration**, so the initial empty set can never overwrite
    what is on disk.
  - If the user taps before loading finishes, the stored and new values are merged.
- **Correctness:** a ref mirrors the set synchronously, so two fast taps never read stale
  state. The analytics call happens outside the state updater, because updaters must be
  pure and can run twice.
- **Performance:**
  - The context value is memoised.
  - Rows receive `isFavourite` as a prop. The provider is not read inside every row, so
    `memo(ShowRow)` re-renders only the toggled row.
- **Accessibility:**
  - The heart is a *sibling* of the row's pressable, not a child. A button inside an
    `accessible` button is merged into it and cannot be reached with VoiceOver.
  - The heart's label is "Save Marcus Lin" or "Remove Marcus Lin from saved shows", with
    `selected` state.
  - The Saved view is a `tab` in the same `tablist` as the sort options.
  - Touch targets are 44 pt.
- **Analytics:**
  - `show_favourited` and `show_unfavourited` with `{show_id, source: list|details}`;
    `source` shows which entry point drives saves.
  - `shows_view_changed` with `{view: date|seats|saved, saved_count}`.
  - A natural next step is a user property `saved_count` via `identify`, to segment
    conversion by intent.

**Bug found on device, and fixed:**
- **Symptom:** "Saved" was first built as a separate toggle chip next to the sort control.
  The two looked like one group of tabs. After switching Saved on, tapping "Soonest" kept
  showing only saved shows.
- **Root cause:** two independent pieces of state (`sortBy` and `savedOnly`) behind UI
  that users read as a single choice.
- **Fix:** one `view: 'date' | 'seats' | 'saved'` value behind one tab control
  (`ShowsViewControl`), which makes the confusing combination impossible. Analytics
  followed: `shows_sorted` and `shows_filtered` became one `shows_view_changed`, and
  `show_selected` now carries `view` instead of `sort_by`.
- **Verification:** *Device:* go Saved → Soonest and the full list returns.

**Verification:**
- *Device:* save two shows from the list and one from Show Details, then go back. All three
  hearts are filled. The "Saved (3)" tab shows exactly those three. Unsave inside the filter and the row
  disappears.
- *Device:* kill the app and reopen it. The saved shows are still there.
- *Log:* `show_favourited {source: "list" | "details"}`.

## State management: what lives where, and why

| State | Where | Why |
|---|---|---|
| Joke, loading, error, timer | `useJoke` inside `JokeCard` | Used by one component. Colocating it means 30 s refreshes re-render only the card (#7). |
| List view (date / seats / saved), last viewed show | `HomeScreen` `useState` | UI state of a single screen. It does not need to survive navigation away from the stack root. |
| Booking form values, errors, submitting | Formik inside `BookingForm` | Form-local. Formik owns touched, validation and submit lifecycle. |
| Saved shows | `FavouritesProvider` (Context) + AsyncStorage | **Shared by two screens and persisted.** This is the first state that justifies something above the navigator. |
| Shows and seat availability | `ShowsProvider` (Context), seeded from `data/shows.ts` | Shared by the list and Show Details, and changed by a booking. It stands in for server state; it is not persisted, so a restart resets it. |

**Why not Redux or Zustand now:** there are two small pieces of shared state, both
changed only on a tap, with very few consumers. Rows still re-render individually,
because a booking replaces only the booked show's object and `memo(ShowRow)` skips the
rest. Context with a memoised value is
enough and adds no dependencies.

**When to switch:**
- **Server data** (shows, seats, bookings) moves to **TanStack Query**, for caching,
  refetch on focus, and optimistic updates when a booking reduces `seatsLeft`.
- If more shared client state appears, or many consumers re-render on unrelated changes,
  move it to **Zustand**, whose selectors avoid that.

---

## Rejected "house conventions" from CLAUDE.md

The provided `CLAUDE.md` asked for three things. I deliberately did not follow them:

| Convention | Why rejected |
|---|---|
| `setInterval` in the screen, "don't over-invest in teardown" | This is finding #1: a leaking timer that runs off-screen and in the background. |
| Fire `joke_viewed` on every render | Render count is a React implementation detail, not user behaviour. It changes with re-render optimisations, Strict Mode and Fast Refresh, so the metric would be noise that inflates event volume and cost. Exposure is measured by `joke_loaded` (one per joke actually shown). |
| Send booking `name` and `email` to analytics | PII in a third-party analytics tool. See #13. |

## Deprioritised (and why)

- **Automated tests.** These are first in line next:
  - `useJoke` with Jest fake timers covering focus, blur, background and manual reset;
  - `sortShows`;
  - the booking schema.

  I chose on-device verification over test scaffolding in the timebox.
- **A visible pause control for auto refresh.** Screen-reader users are covered (#19).
  Sighted users with cognitive or reading needs would benefit from an explicit control.
- **Analytics consent and opt-out** (`setOptOut`), and `appVersion` on events. In Expo Go
  the SDK reports Expo Go's version.
- **More persisted state** (last joke for an offline start), an error boundary,
  crash reporting, venue time zone for show times, and a real bookings backend. Seats
  currently decrease client-side only and reset on restart.
- **Android keyboard handling** uses edge-to-edge defaults. `KeyboardAvoidingView` is only
  applied on iOS and needs a check on an Android device.
