# React Native Exercise: The Punchline

## Context

You are given a rough React Native screen for **The Punchline**, a fictional
comedy club. The business goal is to help visitors enjoy the club, engage with
the page, and move toward booking tickets.

The starter **runs**, but it was thrown together quickly. It has real problems:
some are visible on screen, some only show up when you actually use the app on a
device or simulator, and some are questions of architecture and instrumentation.

Your job is to turn it into something you would be comfortable shipping and
owning as the mobile lead.

You may use any tools you normally use, including AI assistants. See
"Working with AI" below.

## Timebox

Around **3 hours** of focused work. We do not expect perfection. Use your
judgment about what matters most, and be ready to explain what you skipped.

## Part 1 — Get it running, then make it right

1. Get the starter running on an iOS or Android simulator (see `README.md`).
2. **Use the app.** Refresh jokes, let it sit, scroll the shows list, sort it,
   tap around, navigate into a show and back, submit the booking form.
3. Find what is wrong or weak and fix what matters. Areas worth considering:
   - Correctness and runtime behaviour (things that misbehave while you use it).
   - Performance and responsiveness (lists, animation, re-renders).
   - Screen and navigation lifecycle.
   - State management.
   - Analytics quality (see below).
   - Accessibility and UX.
   - Maintainability and structure.

We are intentionally **not** giving you a checklist of bugs. Deciding what is
worth your time is part of the exercise.

The starter is also intentionally **minimal and unstructured**: most of the app
is in one file, analytics calls are inline, and there is no state or analytics
layer. The architecture is yours to define — folder structure, component
boundaries, state management, and how you isolate analytics are all things we
want to see you decide.

## Business requirement: Joke experience

The joke experience must let a visitor:

- See a joke on screen.
- Request a new joke manually.
- Get an automatically refreshed joke every 30 seconds.

Use the **Official Joke API** (`https://github.com/15Dkatz/official_joke_api`).
You decide the endpoint, the response typing, the loading and error states, and
how the interaction is measured. The starter ships a static stub — replace it.

## Business requirement: Amplitude analytics

Ship working Amplitude instrumentation with a real key, so events can be seen
arriving in a project you can show us. Make it clear:

- How Amplitude is initialised.
- Which user actions and system events are tracked, and why.
- What properties each event carries.
- How to verify the events in Amplitude.

Use your judgment on event naming and structure. Be ready to defend your
choices, including what you chose **not** to track.

## Bonus (Part 1): Booking form

If time allows, improve the booking form: validation, error display, submit
behaviour, and whether/how form interactions are measured.

## Part 2 — Extend it

Add one more meaningful piece that shows how you would grow this into a real
feature. Options (pick one, or propose your own):

- A proper **Show Details** experience with its own tracked events and a booking
  entry point.
- A **favourites / saved shows** feature backed by persisted state.
- A polished, reusable animation or gesture interaction that feels native.

We want to see how you move from "fix the mess" to "add something real."

## Deliverables

Submit the project plus:

- **`FINDINGS.md`** — the most important part of your submission. For each issue
  you fixed, write:
  - **Symptom:** what you actually observed on the device/simulator.
  - **Root cause:** why it happened (tie it to how React Native actually works).
  - **Fix:** what you changed.
  - **Verification:** how you confirmed it is fixed.
- **A screen recording** (30–90s) of your final app: the joke experience, the
  list, navigation, and a booking. A short clip is fine.
- **`AI_USAGE_LOG.md`** — see below.
- An updated **`README.md`**: how to run your submission and how to see the
  Amplitude events.

## Working with AI

Use whatever tools you normally use. We are not testing whether you avoid AI —
we are testing whether you own your work. If you use an AI assistant, keep
`AI_USAGE_LOG.md` up to date (the project instruction files describe the format)
and be ready to walk us through what the tool suggested, what you kept, what you
threw away, and why.

## The walkthrough

After you submit, we will do a live session where you share your screen, run the
app, and walk us through your changes. Expect us to ask *why* — about root
causes, thread and lifecycle behaviour, tradeoffs, and what you would do next.
Being able to explain your solution matters as much as the solution.
