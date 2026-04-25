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
        Alert.alert("Erreur", "Impossible d'ajouter la BD (Erreur SQL).");
      }
    },
    onError: (error) => {
      console.error("Mutation Error:", error);
      Alert.alert("Erreur", "Une erreur inattendue est survenue lors de l'ajout.");
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
                style={[styles.addButton, addToLibraryMutation.isPending && styles.disabledButton]}
                onPress={() => addToLibraryMutation.mutate(item)}
                disabled={addToLibraryMutation.isPending}
              >
                {addToLibraryMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Ajouter</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0f172a' // Dark Navy background
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
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#1e293b', 
    marginHorizontal: 16, 
    marginBottom: 16, 
    borderRadius: 20, 
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8
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
    justifyContent: 'space-between',
    paddingVertical: 4
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
  date: { 
    fontSize: 12, 
    color: '#64748b', 
    marginTop: 4 
  },
  addButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#e11d48',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10
  },
  addButtonText: { 
    color: '#fff', 
    marginLeft: 6, 
    fontWeight: '700',
    fontSize: 13
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#64748b'
  }
});
