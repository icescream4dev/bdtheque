import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchComics } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { parseBdTitle } from '../database/operations';
import { GoogleBookItem } from '../types/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['searchComics', debouncedQuery],
    queryFn: () => searchComics(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });

  const groupedResults = React.useMemo(() => {
    if (!results) return [];
    const groups: { [key: string]: { seriesTitle: string, thumbnail: string | null, authors: string[], volumes: GoogleBookItem[] } } = {};
    
    results.forEach(item => {
      const { seriesTitle } = parseBdTitle(item.volumeInfo.title || '');
      if (!groups[seriesTitle]) {
        groups[seriesTitle] = {
          seriesTitle,
          thumbnail: item.volumeInfo.imageLinks?.thumbnail || null,
          authors: item.volumeInfo.authors || [],
          volumes: []
        };
      }
      groups[seriesTitle].volumes.push(item);
    });
    
    return Object.values(groups);
  }, [results]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une BD (titre, auteur...)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && <ActivityIndicator size="large" color="#e63946" style={styles.loader} />}

      {error && <Text style={styles.errorText}>Erreur lors de la recherche</Text>}

      {!isLoading && results && results.length === 0 && debouncedQuery.length > 2 && (
        <Text style={styles.emptyText}>Aucune bande dessinée trouvée</Text>
      )}

      <FlatList
        data={groupedResults}
        keyExtractor={(item) => item.seriesTitle}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('SeriesDetail', { 
              seriesTitle: item.seriesTitle, 
              searchVolumes: item.volumes 
            })}
          >
            <View style={styles.bookInfo}>
              {item.thumbnail ? (
                <Image 
                  source={{ uri: item.thumbnail.replace('http:', 'https:') }} 
                  style={styles.coverImage} 
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.coverImage, styles.placeholderImage]}>
                  <Ionicons name="book-outline" size={32} color="#999" />
                </View>
              )}
              <View style={styles.cardContent}>
                <Text style={styles.title} numberOfLines={2}>{item.seriesTitle}</Text>
                <Text style={styles.authors} numberOfLines={1}>{item.authors.join(', ') || 'Auteur inconnu'}</Text>
                <Text style={styles.volumeCount}>{item.volumes.length} tome(s) trouvé(s)</Text>
              </View>
            </View>

            <View style={styles.viewButton}>
              <Text style={styles.viewButtonText}>Voir la série</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0f172a' 
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1e293b', 
    margin: 16, 
    paddingHorizontal: 16, 
    borderRadius: 16, 
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  searchIcon: { marginRight: 12 },
  searchInput: { 
    flex: 1, 
    height: '100%', 
    fontSize: 16, 
    color: '#f8fafc' 
  },
  loader: { marginTop: 32 },
  errorText: { color: '#fb7185', textAlign: 'center', marginTop: 16, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 32, fontSize: 16 },
  listContent: { paddingBottom: 20 },
  card: { 
    backgroundColor: '#1e293b', 
    marginHorizontal: 16, 
    marginBottom: 16, 
    borderRadius: 20, 
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  bookInfo: {
    flexDirection: 'row'
  },
  coverImage: { 
    width: 85, 
    height: 120, 
    borderRadius: 12,
    backgroundColor: '#334155'
  },
  placeholderImage: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cardContent: { 
    flex: 1, 
    marginLeft: 16, 
    justifyContent: 'center'
  },
  title: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#f8fafc',
    lineHeight: 22
  },
  authors: { 
    fontSize: 14, 
    color: '#94a3b8', 
    marginTop: 6,
    fontWeight: '500'
  },
  volumeCount: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600'
  },
  viewButton: {
    backgroundColor: '#e11d48',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    marginRight: 4
  }
});
