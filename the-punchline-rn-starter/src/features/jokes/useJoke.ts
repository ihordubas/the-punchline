import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchRandomJoke,
  Joke,
  JokeApiError,
  JokeErrorReason,
} from "../../api/jokes";
import { track } from "../../analytics/analytics";
import type { JokeTrigger } from "../../analytics/events";
import { useIsScreenActive } from "../../hooks/useIsScreenActive";
import { useScreenReaderEnabled } from "../../hooks/useScreenReaderEnabled";

export const AUTO_REFRESH_MS = 30_000;

type UseJokeResult = {
  joke: Joke | null;
  isLoading: boolean;
  error: JokeErrorReason | null;
  autoRefreshEnabled: boolean;
  refresh: () => void;
};

export function useJoke(): UseJokeResult {
  const [joke, setJoke] = useState<Joke | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<JokeErrorReason | null>(null);
  const [scheduleEpoch, setScheduleEpoch] = useState(0);

  const inFlightRef = useRef<AbortController | null>(null);
  const lastRequestedAtRef = useRef(0);
  const isActive = useIsScreenActive();
  const autoRefreshEnabled = !useScreenReaderEnabled();

  const load = useCallback(async (trigger: JokeTrigger) => {
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;
    lastRequestedAtRef.current = Date.now();
    const startedAt = Date.now();
    setIsLoading(true);

    try {
      const next = await fetchRandomJoke(controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      setJoke(next);
      setError(null);
      track("joke_loaded", {
        joke_id: next.id,
        joke_type: next.type,
        trigger,
        latency_ms: Date.now() - startedAt,
      });
    } catch (e) {
      if (controller.signal.aborted) {
        return;
      }
      const reason = e instanceof JokeApiError ? e.reason : "network";
      setError(reason);
      track("joke_load_failed", {
        trigger,
        reason,
        http_status: e instanceof JokeApiError ? e.status : undefined,
      });
    } finally {
      if (inFlightRef.current === controller) {
        inFlightRef.current = null;
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => () => inFlightRef.current?.abort(), []);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    if (!autoRefreshEnabled) {
      if (lastRequestedAtRef.current === 0) {
        load("initial");
      }
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const elapsed = Date.now() - lastRequestedAtRef.current;
      timer = setTimeout(
        () => {
          load(lastRequestedAtRef.current === 0 ? "initial" : "auto");
          scheduleNext();
        },
        Math.max(0, AUTO_REFRESH_MS - elapsed),
      );
    };
    scheduleNext();
    return () => clearTimeout(timer);
  }, [isActive, autoRefreshEnabled, load, scheduleEpoch]);

  const refresh = useCallback(() => {
    load("manual");
    setScheduleEpoch((epoch) => epoch + 1);
  }, [load]);

  return { joke, isLoading, error, autoRefreshEnabled, refresh };
}
