import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getDbConnection } from '../database/schema';
import { GoogleBookItem } from '../types/api';
import { parseBdTitle, addVolumeToLibrary, removeVolumeFromLibrary } from '../database/operations';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type SeriesDetailRouteProp = RouteProp<RootStackParamList, 'SeriesDetail'>;

export default function SeriesDetailScreen() {
  const route = useRoute<SeriesDetailRouteProp>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { seriesId, seriesTitle, searchVolumes } = route.params;

  // 1. Récupérer les infos de la série (locale ou recherche)
  const { data: series, isLoading: isLoadingSeries } = useQuery({
    queryKey: ['seriesInfo', seriesId || seriesTitle],
    queryFn: async () => {
      if (seriesId) {
        const db = await getDbConnection();
        const result = await db.getAllAsync('SELECT * FROM series WHERE id = ?', [seriesId]);
        return result[0] as any;
      }
      if (searchVolumes && searchVolumes.length > 0) {
        const firstVol = searchVolumes[0];
        const { seriesTitle: title } = parseBdTitle(firstVol.volumeInfo.title || '');
        return {
          id: null,
          title: title,
          authors: firstVol.volumeInfo.authors?.join(', '),
          description: firstVol.volumeInfo.description,
          coverImage: firstVol.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:')
        };
      }
      return null;
    }
  });

  // 2. Liste des IDs déjà possédés dans cette série
  const { data: ownedVolumeIds = [] } = useQuery({
    queryKey: ['ownedVolumes', seriesId || seriesTitle],
    queryFn: async () => {
      const db = await getDbConnection();
      const query = seriesId 
        ? 'SELECT id FROM volumes WHERE seriesId = ?'
        : 'SELECT id FROM volumes WHERE title LIKE ?';
      const params = seriesId ? [seriesId] : [`%${seriesTitle}%`];
      const result = await db.getAllAsync(query, params);
      return (result as any[]).map(r => r.id);
    }
  });

  // 3. Préparation de la liste des volumes à afficher
  const volumesToDisplay = React.useMemo(() => {
    if (seriesId) return null; 
    return searchVolumes?.map(v => {
      const { volumeNumber } = parseBdTitle(v.volumeInfo.title || '');
      return {
        id: v.id,
        title: v.volumeInfo.title,
        volumeNumber,
        coverImage: v.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
        isOwned: ownedVolumeIds.includes(v.id),
        googleData: v
      };
    }) || [];
  }, [seriesId, searchVolumes, ownedVolumeIds]);

  // Fetch des volumes locaux si on est en mode bibliothèque
  const { data: localVolumes = [], isLoading: isLoadingVolumes } = useQuery({
    queryKey: ['seriesVolumes', seriesId],
    queryFn: async () => {
      if (!seriesId) return [];
      const db = await getDbConnection();
      const result = await db.getAllAsync('SELECT * FROM volumes WHERE seriesId = ? ORDER BY volumeNumber ASC', [seriesId]);
      return result as any[];
    },
    enabled: !!seriesId
  });

  const displayList = seriesId 
    ? localVolumes.map(v => ({ ...v, isOwned: true })) 
    : volumesToDisplay;

  // Mutations
  const toggleReadMutation = useMutation({
    mutationFn: async ({ volumeId, currentStatus }: { volumeId: string, currentStatus: number }) => {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const db = await getDbConnection();
      await db.runAsync('UPDATE volumes SET isRead = ? WHERE id = ?', [newStatus, volumeId]);
      return newStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesVolumes', seriesId] });
      queryClient.invalidateQueries({ queryKey: ['ownedVolumes'] });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (book: GoogleBookItem) => {
      return await addVolumeToLibrary(book);
    },
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['seriesVolumes', seriesId] });
        queryClient.invalidateQueries({ queryKey: ['ownedVolumes'] });
        queryClient.invalidateQueries({ queryKey: ['librarySeries'] });
      }
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (volumeId: string) => {
      return await removeVolumeFromLibrary(volumeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesVolumes', seriesId] });
      queryClient.invalidateQueries({ queryKey: ['ownedVolumes'] });
      queryClient.invalidateQueries({ queryKey: ['librarySeries'] });
    }
  });

  if (isLoadingSeries || isLoadingVolumes) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  if (!series) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Série introuvable.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={displayList}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            {series.coverImage ? (
              <Image source={{ uri: series.coverImage }} style={styles.seriesCover} />
            ) : (
              <View style={[styles.seriesCover, styles.placeholderImage]}>
                 <Ionicons name="book-outline" size={40} color="#475569" />
              </View>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.title}>{series.title}</Text>
              <Text style={styles.authors}>{series.authors || 'Auteur inconnu'}</Text>
              <Text style={styles.description} numberOfLines={5}>{series.description || 'Pas de description disponible.'}</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.volumeRow}>
            <TouchableOpacity 
              style={styles.volumeMainInfo}
              onPress={() => navigation.navigate('VolumeDetail', { 
                volumeId: item.isOwned ? item.id : undefined,
                googleBook: !item.isOwned ? item.googleData : undefined,
                context: item.isOwned ? 'library' : 'search' 
              })}
            >
              {item.coverImage ? (
                <Image source={{ uri: item.coverImage }} style={styles.volumeThumb} />
              ) : (
                <View style={[styles.volumeThumb, styles.placeholderImage]}>
                  <Ionicons name="book-outline" size={20} color="#475569" />
                </View>
              )}
              <View style={styles.volumeTextContainer}>
                <Text style={styles.volumeTitle} numberOfLines={1}>Tome {item.volumeNumber}</Text>
                <Text style={styles.volumeSubTitle} numberOfLines={1}>{item.title}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.volumeActions}>
              {item.isOwned ? (
                <>
                  <TouchableOpacity 
                    onPress={() => toggleReadMutation.mutate({ volumeId: item.id, currentStatus: item.isRead })}
                    style={[styles.miniButton, item.isRead === 1 ? styles.readActive : styles.readInactive]}
                  >
                    <Ionicons name={item.isRead === 1 ? "checkmark-circle" : "eye-outline"} size={20} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => {
                      Alert.alert("Retirer", "Voulez-vous retirer ce tome de votre collection ?", [
                        { text: "Annuler", style: "cancel" },
                        { text: "Retirer", style: "destructive", onPress: () => removeMutation.mutate(item.id) }
                      ]);
                    }}
                    style={[styles.miniButton, styles.removeBtn]}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  onPress={() => addMutation.mutate(item.googleData)}
                  style={[styles.miniButton, styles.addBtn]}
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  errorText: { color: '#f8fafc', textAlign: 'center', marginTop: 50, fontSize: 18 },
  listContent: { paddingBottom: 40 },
  header: { 
    flexDirection: 'row', 
    padding: 20, 
    backgroundColor: '#1e293b', 
    borderBottomWidth: 1, 
    borderBottomColor: '#334155',
    marginBottom: 20
  },
  seriesCover: { width: 100, height: 140, borderRadius: 8 },
  headerInfo: { flex: 1, marginLeft: 15 },
  title: { fontSize: 22, fontWeight: '900', color: '#f8fafc', marginBottom: 4 },
  authors: { fontSize: 14, color: '#94a3b8', marginBottom: 8, fontWeight: '600' },
  description: { fontSize: 13, color: '#cbd5e1', lineHeight: 18 },
  volumeRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  volumeMainInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  volumeThumb: { width: 50, height: 70, borderRadius: 4, backgroundColor: '#1e293b' },
  volumeTextContainer: { marginLeft: 12, flex: 1 },
  volumeTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  volumeSubTitle: { color: '#94a3b8', fontSize: 13 },
  volumeActions: { flexDirection: 'row', alignItems: 'center' },
  miniButton: { padding: 8, borderRadius: 8, marginLeft: 8 },
  readActive: { backgroundColor: '#10b981' },
  readInactive: { backgroundColor: '#334155' },
  removeBtn: { backgroundColor: '#e11d48' },
  addBtn: { backgroundColor: '#10b981' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' }
});
