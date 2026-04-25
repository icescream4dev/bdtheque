import { GoogleBooksApiResponse, GoogleBookItem } from '../types/api';

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

export const searchComics = async (query: string): Promise<GoogleBookItem[]> => {
  if (!query) return [];

  // Recherche élargie pour inclure BD, albums et romans graphiques
  const searchUrl = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query)}&maxResults=20&langRestrict=fr&printType=books`;

  console.log(`[API] Appel Google Books: ${searchUrl}`);

  try {
    const response = await fetch(searchUrl);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[API] Erreur HTTP ${response.status}: ${errorBody}`);
      throw new Error(`Erreur API Google Books (${response.status})`);
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
