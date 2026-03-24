const axios = require('axios');

exports.getBdByIsbn = async (req, res) => {
    try {
        const { isbn } = req.params;
        
        if (!isbn || isbn.length < 10) {
            return res.status(400).json({ error: "L'ISBN fourni est invalide." });
        }

        const cleanIsbn = isbn.replace(/-/g, '');
        let bdResult = null;

        try {
            // Tentative 1 : Google Books API
            const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
            const data = response.data;

            if (data.items && data.items.length > 0) {
                const bookInfo = data.items[0].volumeInfo;
                bdResult = {
                    isbn: cleanIsbn,
                    titre: bookInfo.title || 'Titre inconnu',
                    auteurs: bookInfo.authors || ['Auteur inconnu'],
                    editeur: bookInfo.publisher || 'Éditeur inconnu',
                    datePublication: bookInfo.publishedDate || null,
                    description: bookInfo.description || '',
                    imageCouverture: bookInfo.imageLinks && bookInfo.imageLinks.thumbnail ? bookInfo.imageLinks.thumbnail : null,
                    source: "Google Books"
                };
            }
        } catch (e) {
            console.error("Google Books API a échoué (probablement 429):", e.message);
        }

        if (!bdResult) {
            // Tentative 2 : Open Library API (Fallback)
            try {
                const olResponse = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&jscmd=data&format=json`);
                const olData = olResponse.data;
                const bookKey = `ISBN:${cleanIsbn}`;

                if (olData[bookKey]) {
                    const bookInfo = olData[bookKey];
                    bdResult = {
                        isbn: cleanIsbn,
                        titre: bookInfo.title || 'Titre inconnu',
                        auteurs: bookInfo.authors ? bookInfo.authors.map(a => a.name) : ['Auteur inconnu'],
                        editeur: bookInfo.publishers ? bookInfo.publishers.map(p => p.name).join(', ') : 'Éditeur inconnu',
                        datePublication: bookInfo.publish_date || null,
                        description: bookInfo.notes ? (bookInfo.notes.value || bookInfo.notes) : '',
                        imageCouverture: bookInfo.cover ? bookInfo.cover.large || bookInfo.cover.medium : null,
                        source: "Open Library"
                    };
                }
            } catch (e) {
                console.error("Open Library API a échoué:", e.message);
            }
        }

        if (!bdResult) {
            return res.status(404).json({ error: "Aucune bande dessinée trouvée pour cet ISBN (apis testées: Google Books, Open Library)." });
        }

        return res.json(bdResult);

    } catch (error) {
        console.error("Erreur serveur :", error.message);
        return res.status(500).json({ error: "Erreur interne du serveur lors de la communication avec les API sources." });
    }
};

exports.searchBds = async (req, res) => {
    try {
        const query = req.query.q || req.query.titre;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ error: "Veuillez fournir un paramètre de recherche 'q'." });
        }

        let bdResults = [];

        try {
            // Tentative 1 : Google Books API
            const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`);
            const data = response.data;

            if (data.items && data.items.length > 0) {
                bdResults = data.items.map(item => {
                    const bookInfo = item.volumeInfo;
                    return {
                        isbn: bookInfo.industryIdentifiers 
                              ? bookInfo.industryIdentifiers.find(i => i.type.startsWith('ISBN'))?.identifier 
                              : null,
                        titre: bookInfo.title || 'Titre inconnu',
                        auteurs: bookInfo.authors || ['Auteur inconnu'],
                        editeur: bookInfo.publisher || 'Éditeur inconnu',
                        datePublication: bookInfo.publishedDate || null,
                        imageCouverture: bookInfo.imageLinks && bookInfo.imageLinks.thumbnail ? bookInfo.imageLinks.thumbnail : null,
                        source: "Google Books"
                    };
                });
            }
        } catch (e) {
            console.error("Google Books Search API a échoué:", e.message);
        }

        if (bdResults.length === 0) {
            // Tentative 2 : Open Library API
            try {
                const olResponse = await axios.get(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`);
                const olData = olResponse.data;

                if (olData.docs && olData.docs.length > 0) {
                    bdResults = olData.docs.map(doc => ({
                        isbn: doc.isbn ? doc.isbn[0] : null,
                        titre: doc.title || 'Titre inconnu',
                        auteurs: doc.author_name || ['Auteur inconnu'],
                        editeur: doc.publisher ? doc.publisher[0] : 'Éditeur inconnu',
                        datePublication: doc.first_publish_year ? doc.first_publish_year.toString() : null,
                        imageCouverture: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
                        source: "Open Library"
                    }));
                }
            } catch (e) {
                console.error("Open Library Search API a échoué:", e.message);
            }
        }

        return res.json(bdResults);

    } catch (error) {
        console.error("Erreur serveur lors de la recherche:", error.message);
        return res.status(500).json({ error: "Erreur interne du serveur lors de la recherche." });
    }
};
