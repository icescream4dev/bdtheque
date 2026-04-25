import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import SeriesDetailScreen from '../screens/SeriesDetailScreen';
import VolumeDetailScreen from '../screens/VolumeDetailScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { GoogleBookItem } from '../types/api';

export type RootStackParamList = {
  Tabs: undefined;
  SeriesDetail: { 
    seriesId?: string; 
    seriesTitle?: string; 
    searchVolumes?: GoogleBookItem[];
  };
  // On unifie la route de détail
  // 'volumeId' est utilisé si on vient de la bibliothèque locale
  // 'googleBook' est passé si on vient de l'écran de recherche (l'objet complet évite un refetch)
  VolumeDetail: {
    volumeId?: string;
    googleBook?: GoogleBookItem;
    context: 'library' | 'search';
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help';
          if (route.name === 'Accueil') {
            iconName = focused ? 'library' : 'library-outline';
          } else if (route.name === 'Recherche') {
            iconName = focused ? 'search' : 'search-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#e11d48',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopWidth: 0,
          elevation: 10,
          height: 60,
          paddingBottom: 8,
        },
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: '900',
        },
      })}
    >
      <Tab.Screen name="Accueil" component={HomeScreen} />
      <Tab.Screen name="Recherche" component={SearchScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: '800',
        },
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SeriesDetail"
        component={SeriesDetailScreen}
        options={{ title: 'Série' }}
      />
      <Stack.Screen
        name="VolumeDetail"
        component={VolumeDetailScreen}
        options={{ title: 'Détails' }}
      />
    </Stack.Navigator>
  );
}
