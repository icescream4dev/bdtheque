import { searchComics } from '../services/api';

// Mock du global.fetch
global.fetch = jest.fn();

describe('Google Books API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner un tableau vide si la requête est vide', async () => {
    const result = await searchComics('');
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('devrait retourner des bandes dessinées si l API répond avec succès', async () => {
    const mockResponse = {
      items: [
        {
          id: '1',
          volumeInfo: {
            title: 'Astérix',
            authors: ['René Goscinny'],
          },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await searchComics('Astérix');

    expect(result).toHaveLength(1);
    expect(result[0].volumeInfo.title).toBe('Astérix');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=Ast%C3%A9rix+subject:comics')
    );
  });

  it('devrait lancer une erreur si l API renvoie une erreur', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    });

    await expect(searchComics('Astérix')).rejects.toThrow(
      'Erreur lors de la recherche: Internal Server Error'
    );

    consoleSpy.mockRestore();
  });
});
