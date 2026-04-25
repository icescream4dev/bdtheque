import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initDB } from './src/database/schema';

const queryClient = new QueryClient();

export default function App() {
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await initDB();
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return null; // Ou un splash screen
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
