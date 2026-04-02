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

  const { data: recentVolumes = [], isLoading } = useQuery({
    queryKey: ['recentVolumes'],
    queryFn: async () => {
      const db = await getDbConnection();
      const result = await db.getAllAsync('SELECT * FROM volumes ORDER BY id DESC LIMIT 10');
      return result as DBVolume[];
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Ma Bédéthèque</Text>

      {recentVolumes.length === 0 && !isLoading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="library-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Votre bédéthèque est vide.</Text>
          <Text style={styles.emptySubText}>Utilisez la recherche pour ajouter vos premières BD !</Text>
        </View>
      ) : (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Derniers ajouts</Text>
          <FlatList
            horizontal
            data={recentVolumes}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.bookCard}
                onPress={() => navigation.navigate('VolumeDetail', { volumeId: item.id, context: 'library' })}
              >
                {item.coverImage ? (
                  <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
                ) : (
                  <View style={[styles.coverImage, styles.placeholderImage]}>
                    <Ionicons name="book-outline" size={32} color="#999" />
                  </View>
                )}
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                {item.isRead === 1 && (
                  <View style={styles.readBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, color: '#333' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 18, fontWeight: 'bold', marginTop: 16, color: '#666' },
  emptySubText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8 },
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 12, color: '#444' },
  bookCard: { width: 120, marginRight: 16, position: 'relative' },
  coverImage: { width: 120, height: 170, borderRadius: 8, marginBottom: 8, backgroundColor: '#eee' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center' },
  bookTitle: { fontSize: 14, fontWeight: '500', color: '#333', textAlign: 'center' },
  readBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#4CAF50', borderRadius: 12, padding: 2 },
});
