import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";

type Props = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export function QuantityStepper({ value, min, max, onChange }: Props) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Tickets"
      accessibilityValue={{ min, max, now: value, text: `${value} tickets` }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) =>
        event.nativeEvent.actionName === "increment" ? increment() : decrement()
      }
    >
      <Text style={styles.label}>Tickets</Text>
      <View style={styles.controls}>
        <StepButton symbol="−" onPress={decrement} disabled={value <= min} />
        <Text style={styles.value}>{value}</Text>
        <StepButton symbol="+" onPress={increment} disabled={value >= max} />
      </View>
    </View>
  );
}

function StepButton({
  symbol,
  onPress,
  disabled,
}: {
  symbol: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.step,
        pressed && styles.stepPressed,
        disabled && styles.stepDisabled,
      ]}
    >
      <Text style={styles.stepText}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  label: { color: colors.text, fontSize: 16 },
  controls: { flexDirection: "row", alignItems: "center" },
  value: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "center",
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.cardPressed,
    alignItems: "center",
    justifyContent: "center",
  },
  stepPressed: { opacity: 0.7 },
  stepDisabled: { opacity: 0.35 },
  stepText: { color: colors.accent, fontSize: 22, fontWeight: "700" },
});
