import * as amplitude from "@amplitude/analytics-react-native";

import { AMPLITUDE_API_KEY } from "../config/env";
import type { AnalyticsEventName, AnalyticsEvents } from "./events";

let initialized = false;

export function initAnalytics(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  if (!AMPLITUDE_API_KEY) {
    console.warn(
      "[analytics] EXPO_PUBLIC_AMPLITUDE_API_KEY is not set; events are logged locally only.",
    );
    return;
  }

  amplitude.init(AMPLITUDE_API_KEY, undefined, {
    trackingSessionEvents: true,
    logLevel: __DEV__
      ? amplitude.Types.LogLevel.Warn
      : amplitude.Types.LogLevel.None,
  });
}

export function track<E extends AnalyticsEventName>(
  name: E,
  properties: AnalyticsEvents[E],
): void {
  if (__DEV__) {
    console.log(`[analytics] ${name}`, properties);
  }
  if (AMPLITUDE_API_KEY) {
    amplitude.track(name, properties);
  }
}

export function trackScreen(screenName: string): void {
  track("screen_viewed", { screen_name: screenName });
}
