import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { PrimaryButton } from "../../components/PrimaryButton";
import { colors } from "../../theme/colors";
import { useJoke } from "./useJoke";

export function JokeCard() {
  const { joke, isLoading, error, autoRefreshEnabled, refresh } = useJoke();

  return (
    <View>
      <View style={styles.card}>
        {joke ? (
          <Animated.View
            key={joke.id}
            entering={FadeInDown.duration(350)}
            accessible
          >
            <Text style={styles.setup}>{joke.setup}</Text>
            <Text style={styles.punchline}>{joke.punchline}</Text>
          </Animated.View>
        ) : (
          <Text style={styles.setup}>
            {error
              ? "The mic cut out. Try another joke."
              : "Warming up the mic…"}
          </Text>
        )}
        {joke && error ? (
          <Text style={styles.error} accessibilityRole="alert">
            Couldn't load a new joke. Showing the last one.
          </Text>
        ) : null}
      </View>

      <PrimaryButton
        label={error && !joke ? "Try again" : "New joke"}
        onPress={refresh}
        loading={isLoading}
        accessibilityHint={
          autoRefreshEnabled
            ? "Loads a different joke. Jokes also refresh every 30 seconds."
            : "Loads a different joke."
        }
        style={styles.refresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    minHeight: 160,
    justifyContent: "center",
  },
  setup: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  punchline: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
    marginTop: 8,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: 12 },
  refresh: { alignSelf: "flex-start", marginTop: 12, minWidth: 120 },
});
