import React, { useCallback, useMemo, useState } from "react";
import { FlatList, ListRenderItem, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { track } from "../analytics/analytics";
import { Show, ShowsView, sortShows } from "../data/shows";
import { useFavourites } from "../features/favourites/FavouritesProvider";
import { JokeCard } from "../features/jokes/JokeCard";
import { ShowRow } from "../features/shows/ShowRow";
import { useShows } from "../features/shows/ShowsProvider";
import { ShowsViewControl } from "../features/shows/ShowsViewControl";
import type { RootStackScreenProps } from "../navigation/types";
import { colors } from "../theme/colors";

export function HomeScreen({ navigation }: RootStackScreenProps<"Home">) {
  const [view, setView] = useState<ShowsView>("date");
  const [lastViewedShowId, setLastViewedShowId] = useState<string | null>(null);
  const { favouriteIds, toggleFavourite } = useFavourites();
  const { shows: allShows } = useShows();

  const shows = useMemo(() => {
    if (view === "saved") {
      return sortShows(allShows, "date").filter((show) =>
        favouriteIds.has(show.id),
      );
    }
    return sortShows(allShows, view);
  }, [allShows, view, favouriteIds]);

  const onChangeView = useCallback(
    (next: ShowsView) => {
      if (next === view) {
        return;
      }
      setView(next);
      track("shows_view_changed", {
        view: next,
        saved_count: favouriteIds.size,
      });
    },
    [view, favouriteIds.size],
  );

  const onPressShow = useCallback(
    (show: Show, position: number) => {
      setLastViewedShowId(show.id);
      track("show_selected", {
        show_id: show.id,
        position,
        view,
        seats_left: show.seatsLeft,
      });
      navigation.navigate("ShowDetails", { showId: show.id });
    },
    [navigation, view],
  );

  const onToggleFavourite = useCallback(
    (show: Show) => toggleFavourite(show.id, "list"),
    [toggleFavourite],
  );

  const renderItem = useCallback<ListRenderItem<Show>>(
    ({ item, index }) => (
      <ShowRow
        show={item}
        position={index}
        isLastViewed={item.id === lastViewedShowId}
        isFavourite={favouriteIds.has(item.id)}
        onPress={onPressShow}
        onToggleFavourite={onToggleFavourite}
      />
    ),
    [lastViewedShowId, favouriteIds, onPressShow, onToggleFavourite],
  );

  const header = useMemo(
    () => (
      <View>
        <Text style={styles.kicker} accessibilityRole="header">
          THE PUNCHLINE
        </Text>
        <Text style={styles.hero}>
          Comedy that lands. Seats that don't last.
        </Text>
        <JokeCard />
        <Text style={styles.section} accessibilityRole="header">
          Upcoming shows
        </Text>
        <ShowsViewControl
          value={view}
          savedCount={favouriteIds.size}
          onChange={onChangeView}
        />
      </View>
    ),
    [view, onChangeView, favouriteIds.size],
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <FlatList
        data={shows}
        keyExtractor={(show) => show.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No saved shows yet. Tap {"♡︎"} on a show to keep it here.
          </Text>
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 48 },
  kicker: {
    color: colors.accent,
    letterSpacing: 3,
    fontSize: 12,
    fontWeight: "700",
  },
  hero: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 24,
  },
  section: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 32,
    marginBottom: 12,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 24,
    textAlign: "center",
  },
});
