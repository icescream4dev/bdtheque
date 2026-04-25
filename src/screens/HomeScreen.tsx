import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getDbConnection } from '../database/schema';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DBVolume {
  id: string;
  title: string;
  coverImage: string | null;
  isRead: number;
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  const { data: librarySeries = [], isLoading } = useQuery({
    queryKey: ['librarySeries'],
    queryFn: async () => {
      const db = await getDbConnection();
      // On récupère les séries qui ont au moins un tome dans la collection
      const result = await db.getAllAsync(`
        SELECT DISTINCT s.* FROM series s
        JOIN volumes v ON v.seriesId = s.id
        ORDER BY s.title ASC
      `);
      return result as any[];
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Ma Bédéthèque</Text>

      {librarySeries.length === 0 && !isLoading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="library-outline" size={64} color="#94a3b8" />
          <Text style={styles.emptyText}>Votre bédéthèque est vide.</Text>
          <Text style={styles.emptySubText}>Utilisez la recherche pour ajouter vos premières séries !</Text>
        </View>
      ) : (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Mes Séries</Text>
          <FlatList
            horizontal
            data={librarySeries}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.bookCard}
                onPress={() => navigation.navigate('SeriesDetail', { seriesId: item.id })}
              >
                {item.coverImage ? (
                  <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
                ) : (
                  <View style={[styles.coverImage, styles.placeholderImage]}>
                    <Ionicons name="book-outline" size={32} color="#475569" />
                  </View>
                )}
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0f172a', 
    padding: 20 
  },
  headerTitle: { 
    fontSize: 34, 
    fontWeight: '900', 
    marginBottom: 28, 
    color: '#f8fafc',
    letterSpacing: -0.5
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 32,
    opacity: 0.8
  },
  emptyText: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginTop: 20, 
    color: '#f8fafc',
    textAlign: 'center'
  },
  emptySubText: { 
    fontSize: 15, 
    color: '#94a3b8', 
    textAlign: 'center', 
    marginTop: 10,
    lineHeight: 22
  },
  sectionContainer: { 
    marginBottom: 32 
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    marginBottom: 16, 
    color: '#e11d48' // Accent red
  },
  bookCard: { 
    width: 140, 
    marginRight: 20, 
    position: 'relative' 
  },
  coverImage: { 
    width: 140, 
    height: 200, 
    borderRadius: 16, 
    marginBottom: 12, 
    backgroundColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10
  },
  placeholderImage: { 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  bookTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#f8fafc', 
    textAlign: 'left',
    lineHeight: 18
  },
  readBadge: { 
    position: 'absolute', 
    top: 10, 
    right: 10, 
    backgroundColor: '#10b981', 
    borderRadius: 12, 
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },
});
