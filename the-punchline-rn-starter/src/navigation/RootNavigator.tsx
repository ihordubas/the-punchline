import React, { useRef } from "react";
import {
  DarkTheme,
  NavigationContainer,
  Theme,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { trackScreen } from "../analytics/analytics";
import { HomeScreen } from "../screens/HomeScreen";
import { ShowDetailsScreen } from "../screens/ShowDetailsScreen";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    primary: colors.accent,
    border: colors.card,
  },
};

export function RootNavigator() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const currentRouteRef = useRef<string | undefined>(undefined);

  const onRouteMaybeChanged = () => {
    const routeName = navigationRef.getCurrentRoute()?.name;
    if (routeName && routeName !== currentRouteRef.current) {
      trackScreen(routeName);
    }
    currentRouteRef.current = routeName;
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={theme}
      onReady={onRouteMaybeChanged}
      onStateChange={onRouteMaybeChanged}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ShowDetails"
          component={ShowDetailsScreen}
          options={{ title: "", headerBackTitle: "Shows" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
