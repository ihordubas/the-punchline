import type { JokeErrorReason } from "../api/jokes";
import type { ShowsView } from "../data/shows";

export type JokeTrigger = "initial" | "manual" | "auto";
export type FavouriteSource = "list" | "details";

export type AnalyticsEvents = {
  screen_viewed: { screen_name: string };

  joke_loaded: {
    joke_id: number;
    joke_type: string;
    trigger: JokeTrigger;
    latency_ms: number;
  };
  joke_load_failed: {
    trigger: JokeTrigger;
    reason: JokeErrorReason;
    http_status?: number;
  };

  shows_view_changed: { view: ShowsView; saved_count: number };
  show_selected: {
    show_id: string;
    position: number;
    view: ShowsView;
    seats_left: number;
  };

  show_favourited: { show_id: string; source: FavouriteSource };
  show_unfavourited: { show_id: string; source: FavouriteSource };

  show_details_viewed: { show_id: string; seats_left: number };
  booking_started: { show_id: string };
  booking_validation_failed: { show_id: string; invalid_fields: string[] };
  booking_submitted: { show_id: string; quantity: number; seats_left: number };
  booking_failed: { show_id: string };
};

export type AnalyticsEventName = keyof AnalyticsEvents;
