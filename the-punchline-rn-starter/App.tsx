import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {initAnalytics} from './src/analytics/analytics';
import {FavouritesProvider} from './src/features/favourites/FavouritesProvider';
import {ShowsProvider} from './src/features/shows/ShowsProvider';
import {RootNavigator} from './src/navigation/RootNavigator';

// Module scope: runs once per JS bundle load, before the first render, so the
// first screen_viewed event is never dropped.
initAnalytics();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <ShowsProvider>
        <FavouritesProvider>
          <RootNavigator />
        </FavouritesProvider>
      </ShowsProvider>
    </SafeAreaProvider>
  );
}
