import { getDbConnection } from './schema';
import { GoogleBookItem } from '../types/api';

// Fonction utilitaire pour extraire la série et le tome à partir du titre
const parseBdTitle = (fullTitle: string) => {
  // Regex pour capturer "Série - Tome X" ou "Série (Tome X)" ou "Série, Tome X"
  const regex = /^(.*?)(?:\s*[-–,]\s*|\s+)(?:Tome|T\.|Vol\.)\s*(\d+)(?::\s*(.*))?$/i;
  const match = fullTitle.match(regex);

  if (match) {
    return {
      seriesTitle: match[1].trim(),
      volumeNumber: parseInt(match[2], 10),
      volumeTitle: match[3] ? match[3].trim() : null
    };
  }
  return { seriesTitle: fullTitle.trim(), volumeNumber: 1, volumeTitle: null };
};

export const addVolumeToLibrary = async (book: GoogleBookItem): Promise<boolean> => {
  try {
    const db = await getDbConnection();
    const { seriesTitle, volumeNumber } = parseBdTitle(book.volumeInfo.title || '');
    
    const volumeId = book.id;
    const title = book.volumeInfo.title || 'Titre inconnu';
    const publishedDate = book.volumeInfo.publishedDate || '';
    const description = book.volumeInfo.description || '';

    // 1. Gérer la série
    const seriesId = `series_${seriesTitle.toLowerCase().replace(/\s+/g, '_')}`;
    await db.runAsync(
      `INSERT OR IGNORE INTO series (id, title, description, authors, coverImage) VALUES (?, ?, ?, ?, ?)`,
      [seriesId, seriesTitle, description.substring(0, 500), book.volumeInfo.authors?.join(', ') || '', book.volumeInfo.imageLinks?.thumbnail || null]
    );

    // 2. Extraire un ISBN
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

    console.log(`[DB] Ajout de: ${title} dans la série ${seriesTitle}`);

    // 3. Ajouter le tome lié à la série
    await db.runAsync(
      `INSERT OR REPLACE INTO volumes (id, seriesId, title, volumeNumber, publishedDate, isbn, coverImage, isRead) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [volumeId, seriesId, title, volumeNumber, publishedDate, isbn, coverImage, 0]
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
    console.log(`[DB] Tentative de suppression ID: ${volumeId}`);
    await db.runAsync('DELETE FROM volumes WHERE id = ?', [volumeId]);
    console.log(`[DB] Suppression réussie ID: ${volumeId}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de la bibliothèque :', error);
    return false;
  }
};
