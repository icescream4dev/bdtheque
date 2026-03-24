const express = require('express');
const cors = require('cors');
const bdRoutes = require('./routes/bdRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/bds', bdRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Bienvenue sur l'API Moteur BD" });
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
