export type Show = {
  id: string;
  headliner: string;
  night: string;
  venue: string;
  seatsLeft: number;
};

export type ShowSort = "date" | "seats";
export type ShowsView = ShowSort | "saved";

export const SHOWS: Show[] = [
  {
    id: "s1",
    headliner: "Dana Vega",
    night: "2026-11-13T20:00:00Z",
    venue: "Main Room",
    seatsLeft: 12,
  },
  {
    id: "s2",
    headliner: "Marcus Lin",
    night: "2026-11-14T21:30:00Z",
    venue: "Basement",
    seatsLeft: 4,
  },
  {
    id: "s3",
    headliner: "Priya Okafor",
    night: "2026-11-15T20:00:00Z",
    venue: "Main Room",
    seatsLeft: 27,
  },
  {
    id: "s4",
    headliner: "The Open Mic Gauntlet",
    night: "2026-11-16T19:00:00Z",
    venue: "Basement",
    seatsLeft: 40,
  },
  {
    id: "s5",
    headliner: "Sofia Grant",
    night: "2026-11-20T20:00:00Z",
    venue: "Main Room",
    seatsLeft: 8,
  },
  {
    id: "s6",
    headliner: "Late Night Roast Battle",
    night: "2026-11-21T22:00:00Z",
    venue: "Basement",
    seatsLeft: 2,
  },
];

export const LOW_SEATS_THRESHOLD = 5;

export function sortShows(shows: Show[], sortBy: ShowSort): Show[] {
  const sorted = [...shows];
  if (sortBy === "seats") {
    sorted.sort((a, b) => a.seatsLeft - b.seatsLeft);
  } else {
    sorted.sort((a, b) => Date.parse(a.night) - Date.parse(b.night));
  }
  return sorted;
}

const showDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatShowDate(iso: string): string {
  return showDateFormatter.format(new Date(iso));
}
