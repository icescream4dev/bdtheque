import { getDbConnection } from './schema';
import { GoogleBookItem } from '../types/api';

export const addVolumeToLibrary = async (book: GoogleBookItem): Promise<boolean> => {
  try {
    const db = await getDbConnection();

    // Simplification : on utilise l'ID de Google Books comme ID unique
    const volumeId = book.id;
    const title = book.volumeInfo.title || 'Titre inconnu';
    const authors = book.volumeInfo.authors ? book.volumeInfo.authors.join(', ') : '';
    const publishedDate = book.volumeInfo.publishedDate || '';

    // Extraire un ISBN s'il existe
    let isbn = '';
    if (book.volumeInfo.industryIdentifiers) {
      const isbnObj = book.volumeInfo.industryIdentifiers.find(
        id => id.type === 'ISBN_13' || id.type === 'ISBN_10'
      );
      if (isbnObj) isbn = isbnObj.identifier;
    }

    const coverImage = book.volumeInfo.imageLinks?.thumbnail
      ? book.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')
      : null;

    // Attention au schema qui attend un seriesId, on le met à null pour l'instant
    await db.runAsync(
      `INSERT OR REPLACE INTO volumes (id, seriesId, title, publishedDate, isbn, coverImage, isRead) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [volumeId, null, title, publishedDate, isbn, coverImage, 0]
    );

    return true;
  } catch (error) {
    console.error('Erreur lors de l ajout à la bibliothèque :', error);
    return false;
  }
};

export const removeVolumeFromLibrary = async (volumeId: string): Promise<boolean> => {
  try {
    const db = await getDbConnection();
    await db.runAsync('DELETE FROM volumes WHERE id = ?', [volumeId]);
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de la bibliothèque :', error);
    return false;
  }
};
