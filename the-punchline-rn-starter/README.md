# The Punchline — React Native

A landing experience for **The Punchline**, a fictional comedy club. The app has two screens:

- **Home**: a live joke card that you can refresh by hand and that also refreshes itself every 30 s, plus a list of upcoming shows with tabs for **Soonest**, **Fewest seats** and **Saved**.
- **Show Details**: details for one show, a save button in the header, and a booking form.

Saved shows are kept on the device and survive an app restart (Part 2).

Supporting documents:

- [`FINDINGS.md`](./FINDINGS.md): every issue fixed in the starter, with its symptom, root cause, fix and how it was verified.
- [`AI_USAGE_LOG.md`](./AI_USAGE_LOG.md): how AI tools were used on this work.
- [`ASSIGNMENT.md`](./ASSIGNMENT.md): the original brief.

## Run it

The project is an **Expo (SDK 57)** app. It does not need Xcode or Android Studio to run: the JS bundle is served by Metro and loaded into the **Expo Go** app.

**Tested on:** a physical iPhone 13 with Expo Go, Node 22.

### Prerequisites

| What | Version | Notes |
|---|---|---|
| Node.js | **22.13 or newer** | Pinned in `.nvmrc`. With nvm, run `nvm install && nvm use` in the project folder. |
| npm | Comes with Node | |
| Expo Go | Must support **SDK 57** | From the App Store or Google Play, on a phone. Or use a simulator (see below). |
| Network | Same Wi-Fi | The phone must reach your computer on port 8081. Otherwise use `--tunnel`. |

### Step by step

```bash
# 1. Go to the project folder. It is the folder that contains package.json, not its parent.
cd the-punchline-rn-starter

# 2. Use the pinned Node version
nvm use                        # reads .nvmrc → Node 22

# 3. Install dependencies
npm install

# 4. Add the Amplitude key (optional: without it, events are only logged in the terminal)
cp .env.example .env.local
#    then edit .env.local:  EXPO_PUBLIC_AMPLITUDE_API_KEY=<key>

# 5. Start the dev server (-c clears Metro's cache; needed after .env changes)
npx expo start -c
```

Then open the app in **one** of these ways:

- **Physical phone (tested).** Scan the QR code shown in the terminal.
  - iPhone: use the Camera app, then tap the banner that opens Expo Go.
  - Android: use the scanner inside Expo Go.
- **iOS Simulator** (needs Xcode). Press `i` in the terminal. Expo installs a matching Expo Go into the simulator automatically.
- **Android Emulator** (needs Android Studio with an emulator running). Press `a` in the terminal.

Useful keys in the running terminal: `r` reloads the app, `j` opens the JS debugger, `m` toggles the dev menu.

Analytics events are printed in this terminal as `[analytics] <event> {props}`. That is the quickest way to watch tracking while you click through the app.

### Troubleshooting

| Problem | Fix |
|---|---|
| `ConfigError: The expected package.json path ... does not exist` | You are in the parent folder. Run `cd the-punchline-rn-starter` first. |
| `expo` complains about the Node version | Run `nvm use`. Expo SDK 57 needs Node ≥ 22.13. |
| "Could not connect to development server" on the phone | 1. iOS: allow **Settings → Expo Go → Local Network**. 2. Put the phone and computer on the same Wi-Fi, and turn off VPN. 3. Restart with `npx expo start --tunnel -c`, which works across networks. |
| "Project is incompatible with this version of Expo Go" | The store's Expo Go only supports the newest SDK. Use the simulator (`i`), which installs the right Expo Go, or build a dev client with `npx expo run:ios` / `npx expo run:android` (needs Xcode or Android Studio). |
| Amplitude events don't arrive | Check `.env.local` has the key and restart with `-c`. Env values are inlined at bundle time, so a reload is not enough. |
| Strange bundling errors after changing dependencies | Run `rm -rf node_modules && npm install && npx expo start -c`. |

### Checks

```bash
npm run typecheck              # tsc --noEmit
npx expo-doctor                # dependency and config sanity (21/21 checks pass)
```

### Why Expo (and not bare RN 0.77)

The starter expected a bare RN 0.77 project, which needs Xcode or Android Studio to build. The machine this was built on had neither, and too little disk space to install them in the timebox. The README allows "a different but equivalent setup", so the app runs in **Expo Go, SDK 57 (React Native 0.86, React 19, Reanimated 4)**.

Only two pieces of the app code are Expo-specific:

- `registerRootComponent` in `index.js`;
- `EXPO_PUBLIC_*` env inlining.

Everything else is plain React Native and React Navigation. To produce a store build, run `npx expo prebuild` (or use EAS Build).

## Amplitude

### Setup

1. Get the project **API Key** (not the Secret Key) from Amplitude: Settings → Organization settings → Projects → *project* → General.
2. Put it in `.env.local`, which is git-ignored:
   ```
   EXPO_PUBLIC_AMPLITUDE_API_KEY=<your key>
   ```
3. Restart Metro with `-c`. Env values are inlined at bundle time, so a restart is required.

Without a key, the app runs normally and only logs events to the Metro console.

The project used for this submission is in the **US** data region. An EU project would also need `serverZone: 'EU'` in `initAnalytics()`.

### How it is wired

- The **only** module that imports the Amplitude SDK is `src/analytics/analytics.ts`, which exposes `initAnalytics()`, `track()` and `trackScreen()`. UI code never touches the SDK.
- `src/analytics/events.ts` is the **tracking plan as a TypeScript type**. `track('name', props)` is type-checked against it, so a typo in an event name or property fails `tsc`.
- `initAnalytics()` runs once, at module scope in `App.tsx`, before the first render. Session start/end events are on.
- Screen views are tracked centrally in `src/navigation/RootNavigator.tsx` from navigation state, not inside each screen.
- In development, every event is also printed to the Metro console as `[analytics] <name> {props}`.

### Events

| Event | When | Properties | Why |
|---|---|---|---|
| `session_start` / `session_end` | App foreground session (SDK) | — | Denominator for everything else |
| `screen_viewed` | Route changes | `screen_name` | Navigation funnel |
| `joke_loaded` | A joke is shown | `joke_id`, `joke_type`, `trigger` (`initial`/`manual`/`auto`), `latency_ms` | Engagement (manual vs auto), content exposure, API latency |
| `joke_load_failed` | Joke request fails (not when cancelled) | `trigger`, `reason` (`timeout`/`network`/`http`/`invalid_response`), `http_status` | API reliability as users experience it |
| `shows_view_changed` | List tab changes | `view` (`date`/`seats`/`saved`), `saved_count` | Does scarcity framing get used? Do people return to their saved list? |
| `show_favourited` / `show_unfavourited` | Heart tapped | `show_id`, `source` (`list`/`details`) | Purchase intent, and which entry point drives saves |
| `show_selected` | Show row tapped | `show_id`, `position`, `view`, `seats_left` | List performance, position bias, scarcity effect |
| `show_details_viewed` | Show Details opened | `show_id`, `seats_left` | Funnel step 1 |
| `booking_started` | First interaction with the form | `show_id` | Funnel step 2 |
| `booking_validation_failed` | Submit attempted with errors | `show_id`, `invalid_fields` | Which fields cause friction |
| `booking_submitted` | Booking succeeded | `show_id`, `quantity`, `seats_left` | Conversion |
| `booking_failed` | Booking request failed | `show_id` | Lost conversions |

The booking funnel is `show_details_viewed → booking_started → booking_submitted`, which can be built directly as an Amplitude Funnel chart.

### Deliberately **not** tracked

- **Name, email or any other PII.** Booking contact details go to the booking request only. CRM matching belongs in a server-side join on a booking ID, not in raw email in an analytics tool.
- **Per-render "views"** (e.g. a `joke_viewed` on every render). Render count is a React implementation detail, not user behaviour; `joke_loaded` is the exposure event.
- **Keystrokes, field focus/blur and scroll position.** These are high volume and low signal. `booking_started` and `booking_validation_failed` capture the useful part of form behaviour.
- **Auto refreshes while the screen is not visible.** The timer is paused off-screen, in the background and while a screen reader is on, so `joke_loaded {trigger:auto}` means a joke a user could actually see.
- **Joke text.** `joke_id` is enough to join back to content.
- **Screen-reader status.** Auto refresh is paused while VoiceOver or TalkBack is on (WCAG 2.2.2), but whether someone uses assistive technology is sensitive data and is not sent anywhere.

### Verifying events

1. Run the app with the key set, then use it: refresh a joke, sort the list, open a show, submit a booking.
2. In Amplitude, open **Data → Live Events** (or the **Ingestion Debugger**). Events arrive within a few seconds, because the SDK batches and flushes.
3. Click an event to inspect its properties. Check, for example, that `booking_submitted` has no name or email.
4. For a chart: **Analytics → Funnel** with `show_details_viewed → booking_started → booking_submitted`, or **Segmentation** on `joke_loaded` grouped by `trigger`.
