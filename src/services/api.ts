import { GoogleBooksApiResponse, GoogleBookItem } from '../types/api';

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

export const searchComics = async (query: string): Promise<GoogleBookItem[]> => {
  if (!query) return [];

  // Utilisation de mots-clés spécifiques à la BD dans la requête
  const searchUrl = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query)}+subject:comics&maxResults=20&langRestrict=fr`;

  try {
    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new Error(`Erreur lors de la recherche: ${response.statusText}`);
    }

    const data: GoogleBooksApiResponse = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Erreur API Google Books:', error);
    throw error;
  }
};

export const getComicByIsbn = async (isbn: string): Promise<GoogleBookItem | null> => {
  if (!isbn) return null;

  const searchUrl = `${GOOGLE_BOOKS_API_URL}?q=isbn:${encodeURIComponent(isbn)}`;

  try {
    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new Error(`Erreur API ISBN: ${response.statusText}`);
    }

    const data: GoogleBooksApiResponse = await response.json();

    if (data.items && data.items.length > 0) {
      return data.items[0];
    }

    return null;
  } catch (error) {
    console.error('Erreur API Google Books par ISBN:', error);
    throw error;
  }
};
