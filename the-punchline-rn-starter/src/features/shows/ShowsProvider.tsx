import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { Show, SHOWS } from "../../data/shows";

type ShowsContextValue = {
  shows: Show[];
  getShow: (showId: string) => Show | undefined;
  applyBooking: (showId: string, quantity: number) => void;
};

const ShowsContext = createContext<ShowsContextValue | null>(null);

export function ShowsProvider({ children }: { children: React.ReactNode }) {
  const [shows, setShows] = useState<Show[]>(SHOWS);

  const getShow = useCallback(
    (showId: string) => shows.find((show) => show.id === showId),
    [shows],
  );

  const applyBooking = useCallback((showId: string, quantity: number) => {
    setShows((prev) =>
      prev.map((show) =>
        show.id === showId
          ? { ...show, seatsLeft: Math.max(0, show.seatsLeft - quantity) }
          : show,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({ shows, getShow, applyBooking }),
    [shows, getShow, applyBooking],
  );

  return (
    <ShowsContext.Provider value={value}>{children}</ShowsContext.Provider>
  );
}

export function useShows(): ShowsContextValue {
  const context = useContext(ShowsContext);
  if (!context) {
    throw new Error("useShows must be used inside <ShowsProvider>");
  }
  return context;
}
