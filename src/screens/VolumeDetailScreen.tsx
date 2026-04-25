import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getDbConnection } from '../database/schema';
import { addVolumeToLibrary, removeVolumeFromLibrary } from '../database/operations';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type VolumeDetailRouteProp = RouteProp<RootStackParamList, 'VolumeDetail'>;

interface DBVolumeDetail {
  id: string;
  seriesId: string;
  title: string;
  volumeNumber: number;
  publishedDate: string;
  isbn: string;
  coverImage: string | null;
  isRead: number;
}

export default function VolumeDetailScreen() {
  const route = useRoute<VolumeDetailRouteProp>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { volumeId, googleBook, context } = route.params;

  // L'ID à utiliser dépend du contexte
  const currentId = context === 'library' ? volumeId : googleBook?.id;

  // Vérifier si le tome est déjà dans la bibliothèque
  const { data: localVolume, isLoading: isLoadingLocal, refetch } = useQuery({
    queryKey: ['volumeDetail', currentId],
    queryFn: async () => {
      if (!currentId) return null;
      const db = await getDbConnection();
      const result = await db.getAllAsync('SELECT * FROM volumes WHERE id = ?', [currentId]);
      return (result[0] as DBVolumeDetail) || null;
    },
    enabled: !!currentId,
  });

  // Déterminer les données à afficher (priorité aux données locales si existantes, sinon Google Books)
  const displayData = localVolume || (googleBook ? {
    id: googleBook.id,
    title: googleBook.volumeInfo.title,
    authors: googleBook.volumeInfo.authors?.join(', '),
    publishedDate: googleBook.volumeInfo.publishedDate,
    isbn: googleBook.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13' || id.type === 'ISBN_10')?.identifier,
    coverImage: googleBook.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
    isRead: 0,
    description: googleBook.volumeInfo.description,
  } : null);

  const isLocal = !!localVolume;

  // Mutations
  const toggleReadMutation = useMutation({
    mutationFn: async (currentStatus: number) => {
      if (!currentId) return 0;
      const newStatus = currentStatus === 1 ? 0 : 1;
      const db = await getDbConnection();
      await db.runAsync('UPDATE volumes SET isRead = ? WHERE id = ?', [newStatus, currentId]);
      return newStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volumeDetail', currentId] });
      queryClient.invalidateQueries({ queryKey: ['recentVolumes'] });
    },
  });

  const addToLibraryMutation = useMutation({
    mutationFn: async () => {
      if (!googleBook) throw new Error("Données manquantes");
      return await addVolumeToLibrary(googleBook);
    },
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['volumeDetail', currentId] });
        queryClient.invalidateQueries({ queryKey: ['recentVolumes'] });
        Alert.alert("Succès", "La BD a été ajoutée à votre collection.");
      } else {
        Alert.alert("Erreur", "Impossible d'ajouter la BD.");
      }
    }
  });

  const removeFromLibraryMutation = useMutation({
    mutationFn: async () => {
      if (!currentId) throw new Error("ID manquant");
      return await removeVolumeFromLibrary(currentId);
    },
    onSuccess: (success) => {
      console.log("[DEBUG] Mutation removal success:", success);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['volumeDetail', currentId] });
        queryClient.invalidateQueries({ queryKey: ['recentVolumes'] });
        Alert.alert("Succès", "La BD a été retirée de votre collection.");
        navigation.goBack();
      } else {
        Alert.alert("Erreur", "La base de données a refusé la suppression.");
      }
    },
    onError: (error) => {
      console.error("[DEBUG] Mutation removal error:", error);
      Alert.alert("Erreur", "Impossible de supprimer cette BD.");
    }
  });

  if (isLoadingLocal && context === 'library') {
    return <ActivityIndicator size="large" color="#e63946" style={styles.loader} />;
  }

  if (!displayData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Impossible de charger les détails du tome.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {displayData.coverImage ? (
          <Image source={{ uri: displayData.coverImage }} style={styles.coverImage} resizeMode="contain" />
        ) : (
          <View style={[styles.coverImage, styles.placeholderImage]}>
            <Ionicons name="book-outline" size={64} color="#999" />
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title}>{displayData.title}</Text>
        {(displayData as any).authors && (
          <Text style={styles.authors}>{(displayData as any).authors}</Text>
        )}

        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Parution :</Text>
            <Text style={styles.detailValue}>{displayData.publishedDate || 'Inconnue'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ISBN :</Text>
            <Text style={styles.detailValue}>{displayData.isbn || 'Non renseigné'}</Text>
          </View>
        </View>

        {(displayData as any).description && (
          <View style={styles.descriptionBox}>
            <Text style={styles.sectionTitle}>Résumé</Text>
            <Text style={styles.descriptionText}>{(displayData as any).description}</Text>
          </View>
        )}

        {isLocal ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, displayData.isRead === 1 ? styles.readButtonActive : styles.readButtonInactive]}
              onPress={() => toggleReadMutation.mutate(displayData.isRead)}
            >
              <Ionicons
                name={displayData.isRead === 1 ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.actionButtonText}>
                {displayData.isRead === 1 ? 'Marqué comme lu' : 'Marquer comme lu'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={() => {
                console.log("[DEBUG] Clic sur le bouton Retirer, ID:", currentId);
                // Utilisation de confirm() direct sur le web pour éviter les bugs de Alert.alert
                const confirmed = window.confirm ? window.confirm("Voulez-vous vraiment retirer cette BD de votre collection ?") : true;
                if (confirmed) {
                  console.log("[DEBUG] Confirmation reçue, lancement de la mutation");
                  removeFromLibraryMutation.mutate();
                }
              }}
            >
              <Ionicons name="trash-outline" size={24} color="#e63946" style={styles.buttonIcon} />
              <Text style={[styles.actionButtonText, { color: '#e63946' }]}>
                Retirer de la collection
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.addButton]}
            onPress={() => addToLibraryMutation.mutate()}
            disabled={addToLibraryMutation.isPending}
          >
            {addToLibraryMutation.isPending ? (
               <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.actionButtonText}>Ajouter à ma collection</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0f172a' 
  },
  loader: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#0f172a'
  },
  errorText: { 
    fontSize: 16, 
    color: '#fb7185', 
    textAlign: 'center', 
    marginTop: 32,
    fontWeight: '600'
  },
  header: { 
    backgroundColor: '#1e293b', 
    paddingVertical: 40, 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15
  },
  coverImage: { 
    width: 220, 
    height: 310, 
    borderRadius: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 12 }, 
    shadowOpacity: 0.5, 
    shadowRadius: 16, 
    elevation: 10,
    backgroundColor: '#0f172a'
  },
  placeholderImage: { 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  infoContainer: { 
    padding: 24 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#f8fafc', 
    marginBottom: 8,
    lineHeight: 34
  },
  authors: { 
    fontSize: 18, 
    color: '#94a3b8', 
    marginBottom: 24, 
    fontWeight: '600'
  },
  detailsBox: { 
    backgroundColor: '#1e293b', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 24, 
    borderWidth: 1, 
    borderColor: '#334155' 
  },
  detailRow: { 
    flexDirection: 'row', 
    marginBottom: 10 
  },
  detailLabel: { 
    fontWeight: '700', 
    color: '#64748b', 
    width: 110,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  detailValue: { 
    flex: 1, 
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '500'
  },
  descriptionBox: { 
    marginBottom: 32 
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    marginBottom: 12, 
    color: '#e11d48' 
  },
  descriptionText: { 
    fontSize: 16, 
    color: '#94a3b8', 
    lineHeight: 24 
  },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 18, 
    borderRadius: 16, 
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  readButtonInactive: { 
    backgroundColor: '#334155' 
  },
  readButtonActive: { 
    backgroundColor: '#10b981' 
  },
  addButton: { 
    backgroundColor: '#e11d48' 
  },
  removeButton: { 
    backgroundColor: 'transparent', 
    borderWidth: 2, 
    borderColor: '#e11d48',
    marginTop: 20
  },
  buttonIcon: { 
    marginRight: 10 
  },
  actionButtonText: { 
    color: '#fff', 
    fontSize: 17, 
    fontWeight: '800' 
  },
});
