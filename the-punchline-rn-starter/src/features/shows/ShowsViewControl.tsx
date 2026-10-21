import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ShowsView } from "../../data/shows";
import { colors } from "../../theme/colors";

type Props = {
  value: ShowsView;
  savedCount: number;
  onChange: (value: ShowsView) => void;
};

export function ShowsViewControl({ value, savedCount, onChange }: Props) {
  const options: { value: ShowsView; label: string; a11yLabel: string }[] = [
    { value: "date", label: "Soonest", a11yLabel: "Soonest first" },
    { value: "seats", label: "Fewest seats", a11yLabel: "Fewest seats first" },
    {
      value: "saved",
      label: `♥︎ Saved (${savedCount})`,
      a11yLabel: `Saved shows, ${savedCount}`,
    },
  ];

  return (
    <View
      style={styles.container}
      accessibilityRole="tablist"
      accessibilityLabel="Show list view"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.a11yLabel}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  option: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  optionSelected: { backgroundColor: colors.accent },
  label: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  labelSelected: { color: colors.onAccent },
});
