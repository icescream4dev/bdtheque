import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchComics } from '../services/api';
import { addVolumeToLibrary } from '../database/operations';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  // Simple debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['searchComics', debouncedQuery],
    queryFn: () => searchComics(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });

  const addToLibraryMutation = useMutation({
    mutationFn: addVolumeToLibrary,
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['recentVolumes'] });
        Alert.alert("Succès", "La BD a été ajoutée à votre collection.");
      } else {
        Alert.alert("Erreur", "Impossible d'ajouter la BD.");
      }
    }
  });

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

      {!isLoading && data && data.length === 0 && debouncedQuery.length > 2 && (
        <Text style={styles.emptyText}>Aucune bande dessinée trouvée</Text>
      )}

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('VolumeDetail', { googleBook: item, context: 'search' })}
          >
            {item.volumeInfo.imageLinks?.thumbnail ? (
              <Image
                source={{ uri: item.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:') }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.coverImage, styles.placeholderImage]}>
                <Ionicons name="book-outline" size={32} color="#999" />
              </View>
            )}

            <View style={styles.cardContent}>
              <View>
                <Text style={styles.title} numberOfLines={2}>{item.volumeInfo.title}</Text>
                {item.volumeInfo.authors && (
                  <Text style={styles.authors} numberOfLines={1}>{item.volumeInfo.authors.join(', ')}</Text>
                )}
                {item.volumeInfo.publishedDate && (
                  <Text style={styles.date}>{item.volumeInfo.publishedDate.substring(0, 4)}</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addToLibraryMutation.mutate(item)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#e63946" />
                <Text style={styles.addButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', height: 48 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 16 },
  loader: { marginTop: 32 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 16 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 16 },
  card: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 8, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  coverImage: { width: 70, height: 100, borderRadius: 4 },
  placeholderImage: { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  authors: { fontSize: 14, color: '#666', marginTop: 4 },
  date: { fontSize: 12, color: '#999', marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  addButtonText: { color: '#e63946', marginLeft: 4, fontWeight: '600' },
});
