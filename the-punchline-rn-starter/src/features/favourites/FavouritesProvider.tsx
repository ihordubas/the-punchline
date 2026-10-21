import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { track } from "../../analytics/analytics";
import type { FavouriteSource } from "../../analytics/events";

const STORAGE_KEY = "punchline:favourite-show-ids:v1";

type FavouritesContextValue = {
  favouriteIds: ReadonlySet<string>;
  toggleFavourite: (showId: string, source: FavouriteSource) => void;
};

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

function parseStoredIds(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function FavouritesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [favouriteIds, setFavouriteIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [hydrated, setHydrated] = useState(false);
  const idsRef = useRef<ReadonlySet<string>>(favouriteIds);

  const commit = useCallback((next: ReadonlySet<string>) => {
    idsRef.current = next;
    setFavouriteIds(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!cancelled) {
          commit(new Set([...parseStoredIds(raw), ...idsRef.current]));
        }
      })
      .catch((error) => console.warn("[favourites] failed to load", error))
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [commit]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...favouriteIds])).catch(
      (error) => console.warn("[favourites] failed to save", error),
    );
  }, [favouriteIds, hydrated]);

  const toggleFavourite = useCallback(
    (showId: string, source: FavouriteSource) => {
      const wasFavourite = idsRef.current.has(showId);
      const next = new Set(idsRef.current);
      if (wasFavourite) {
        next.delete(showId);
      } else {
        next.add(showId);
      }
      commit(next);
      track(wasFavourite ? "show_unfavourited" : "show_favourited", {
        show_id: showId,
        source,
      });
    },
    [commit],
  );

  const value = useMemo(
    () => ({ favouriteIds, toggleFavourite }),
    [favouriteIds, toggleFavourite],
  );

  return (
    <FavouritesContext.Provider value={value}>
      {children}
    </FavouritesContext.Provider>
  );
}

export function useFavourites(): FavouritesContextValue {
  const context = useContext(FavouritesContext);
  if (!context) {
    throw new Error("useFavourites must be used inside <FavouritesProvider>");
  }
  return context;
}
