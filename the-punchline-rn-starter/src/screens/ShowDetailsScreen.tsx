import React, { useEffect, useLayoutEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";

import { track } from "../analytics/analytics";
import { formatShowDate, LOW_SEATS_THRESHOLD } from "../data/shows";
import { BookingForm } from "../features/booking/BookingForm";
import { FavouriteButton } from "../features/favourites/FavouriteButton";
import { useFavourites } from "../features/favourites/FavouritesProvider";
import { useShows } from "../features/shows/ShowsProvider";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackScreenProps } from "../navigation/types";
import { colors } from "../theme/colors";

export function ShowDetailsScreen({
  navigation,
  route,
}: RootStackScreenProps<"ShowDetails">) {
  const { getShow, applyBooking } = useShows();
  const show = getShow(route.params.showId);
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    if (show) {
      track("show_details_viewed", {
        show_id: show.id,
        seats_left: show.seatsLeft,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show?.id]);

  const { favouriteIds, toggleFavourite } = useFavourites();
  const isFavourite = show ? favouriteIds.has(show.id) : false;

  useLayoutEffect(() => {
    if (!show) {
      return;
    }
    navigation.setOptions({
      headerRight: () => (
        <FavouriteButton
          isFavourite={isFavourite}
          showName={show.headliner}
          onToggle={() => toggleFavourite(show.id, "details")}
        />
      ),
    });
  }, [navigation, show, isFavourite, toggleFavourite]);

  if (!show) {
    return (
      <View style={[styles.root, styles.notFound]}>
        <Text style={styles.title}>Show not found</Text>
        <Text style={styles.body}>
          This show may have been removed or rescheduled.
        </Text>
        <PrimaryButton
          label="Back to shows"
          onPress={() => navigation.goBack()}
          style={styles.cta}
        />
      </View>
    );
  }

  const isLow = show.seatsLeft <= LOW_SEATS_THRESHOLD;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.title} accessibilityRole="header">
          {show.headliner}
        </Text>
        <Text style={styles.meta}>
          {formatShowDate(show.night)} · {show.venue}
        </Text>
        <Text style={[styles.seats, isLow && styles.seatsLow]}>
          {isLow
            ? `Only ${show.seatsLeft} seats left`
            : `${show.seatsLeft} seats left`}
        </Text>
        <Text style={styles.body}>
          Doors open one hour before showtime. Two-drink minimum. No hecklers,
          we know where you sit.
        </Text>

        <Text style={styles.section} accessibilityRole="header">
          Book tickets
        </Text>
        <BookingForm
          show={show}
          onBooked={(quantity) => applyBooking(show.id, quantity)}
          onDone={() => navigation.popTo("Home")}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 48 },
  notFound: { padding: 16, justifyContent: "center" },
  title: { color: colors.text, fontSize: 26, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 15, marginTop: 8 },
  seats: { color: colors.accent, fontSize: 15, marginTop: 4 },
  seatsLow: { color: colors.danger, fontWeight: "700" },
  body: { color: colors.text, fontSize: 16, lineHeight: 24, marginTop: 24 },
  section: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 32,
    marginBottom: 12,
  },
  cta: { marginTop: 24, alignSelf: "flex-start" },
});
