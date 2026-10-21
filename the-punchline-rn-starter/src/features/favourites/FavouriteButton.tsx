import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { colors } from "../../theme/colors";

const FILLED = "♥︎";
const OUTLINE = "♡︎";

type Props = {
  isFavourite: boolean;
  showName: string;
  onToggle: () => void;
};

export function FavouriteButton({ isFavourite, showName, onToggle }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPress = () => {
    scale.value = withSequence(
      withTiming(1.35, { duration: 90 }),
      withSpring(1, { damping: 8 }),
    );
    Haptics.selectionAsync().catch(() => {});
    onToggle();
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        isFavourite ? `Remove ${showName} from saved shows` : `Save ${showName}`
      }
      accessibilityState={{ selected: isFavourite }}
      style={styles.button}
    >
      <Animated.Text
        style={[styles.icon, isFavourite && styles.iconActive, animatedStyle]}
      >
        {isFavourite ? FILLED : OUTLINE}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 24, color: colors.muted },
  iconActive: { color: colors.accent },
});
