import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatShowDate, LOW_SEATS_THRESHOLD, Show } from "../../data/shows";
import { FavouriteButton } from "../favourites/FavouriteButton";
import { colors } from "../../theme/colors";

type Props = {
  show: Show;
  position: number;
  isLastViewed: boolean;
  isFavourite: boolean;
  onPress: (show: Show, position: number) => void;
  onToggleFavourite: (show: Show) => void;
};

export const ShowRow = memo(function ShowRow({
  show,
  position,
  isLastViewed,
  isFavourite,
  onPress,
  onToggleFavourite,
}: Props) {
  const date = formatShowDate(show.night);
  const isLow = show.seatsLeft <= LOW_SEATS_THRESHOLD;
  const seatsLabel = isLow
    ? `Only ${show.seatsLeft} left`
    : `${show.seatsLeft} seats left`;

  return (
    <View style={[styles.row, isLastViewed && styles.rowLastViewed]}>
      <Pressable
        onPress={() => onPress(show, position)}
        accessibilityRole="button"
        accessibilityLabel={`${show.headliner}, ${date}, ${show.venue}, ${seatsLabel}`}
        accessibilityHint="Opens show details and booking"
        style={({ pressed }) => [styles.main, pressed && styles.mainPressed]}
      >
        <Text style={styles.headliner}>{show.headliner}</Text>
        <Text style={styles.meta}>
          {date} · {show.venue}
        </Text>
        <Text style={[styles.seats, isLow && styles.seatsLow]}>
          {seatsLabel}
        </Text>
      </Pressable>
      <FavouriteButton
        isFavourite={isFavourite}
        showName={show.headliner}
        onToggle={() => onToggleFavourite(show)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 8,
    paddingRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  rowLastViewed: { borderColor: colors.accent },
  main: { flex: 1, padding: 14, borderRadius: 14 },
  mainPressed: { backgroundColor: colors.cardPressed },
  headliner: { color: colors.text, fontSize: 17, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  seats: { color: colors.accent, fontSize: 13, marginTop: 4 },
  seatsLow: { color: colors.danger, fontWeight: "700" },
});
