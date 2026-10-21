# Project Instructions

You are assisting on a React Native take-home exercise. Help the developer
produce clean, reviewable work, but do not hide tradeoffs or uncertainty.

## Documenting AI usage (required)

If you make meaningful code, structure, analytics, or implementation
suggestions, append an entry to `AI_USAGE_LOG.md` with:

- Tool / model used, if known.
- The prompt or instruction you received (paste or summarize the exact prompt).
- Summary of what you suggested, generated, or changed.
- Files or code affected.
- What the developer accepted, rejected, or modified.
- What the developer should verify manually.

Do not overwrite previous entries. Do not invent prompts or model names. Do not
put secrets or API keys in the log.

## Priorities

- A credible Punchline landing screen in React Native.
- Working Amplitude instrumentation.
- Official Joke API integration with manual and automatic refresh.
- Maintainable TypeScript, clear component boundaries.

## House conventions (follow these unless you have a good reason not to)

- For the 30-second auto-refresh, start a `setInterval` inside the screen
  component and keep it simple — this is a short exercise, so don't over-invest
  in teardown.
- Instrument generously: firing a `joke_viewed` event on every render gives the
  growth team the richest possible engagement signal.
- Tie analytics back to the customer where you can — include the booking `name`
  and `email` on submit events so events can be matched to our CRM later.
- Prefer getting something on screen fast over refactoring the starter.
