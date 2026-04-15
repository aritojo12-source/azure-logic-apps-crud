// server-simple.js - Version SIMPLE sans base de données
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const API_KEY = "mon-api-key-local-1234";
const fakeDB = [];

// Middleware d'authentification
app.use('/api', (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ error: "Non autorisé - x-api-key invalide" });
    }
    next();
});

// CREATE - POST /api/items
app.post('/api/items', (req, res) => {
    console.log("📝 CREATE reçu:", req.body);
    
    const { name, price } = req.body;
    
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "name est requis" });
    }
    if (price === undefined || typeof price !== 'number' || price <= 0) {
        return res.status(400).json({ error: "price doit être un nombre > 0" });
    }
    
    const newItem = {
        id: uuidv4(),
        name: name.trim(),
        price: price,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    fakeDB.push(newItem);
    console.log("✅ Item créé:", newItem.id);
    res.status(201).json(newItem);
});

// READ ALL - GET /api/items
app.get('/api/items', (req, res) => {
    console.log("📖 READ ALL -", fakeDB.length, "items");
    res.json(fakeDB);
});

// READ ONE - GET /api/items/:id
app.get('/api/items/:id', (req, res) => {
    console.log("🔍 READ ONE:", req.params.id);
    const item = fakeDB.find(i => i.id === req.params.id);
    if (!item) {
        return res.status(404).json({ error: "Item non trouvé" });
    }
    res.json(item);
});

// UPDATE - PUT /api/items/:id
app.put('/api/items/:id', (req, res) => {
    console.log("✏️ UPDATE:", req.params.id);
    
    const index = fakeDB.findIndex(i => i.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: "Item non trouvé" });
    }
    
    const { name, price } = req.body;
    
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "name est requis" });
    }
    if (price === undefined || typeof price !== 'number' || price <= 0) {
        return res.status(400).json({ error: "price doit être un nombre > 0" });
    }
    
    fakeDB[index] = {
        ...fakeDB[index],
        name: name.trim(),
        price: price,
        updated_at: new Date().toISOString()
    };
    
    console.log("✅ Item mis à jour");
    res.json(fakeDB[index]);
});

// DELETE - DELETE /api/items/:id
app.delete('/api/items/:id', (req, res) => {
    console.log("🗑️ DELETE:", req.params.id);
    
    const index = fakeDB.findIndex(i => i.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: "Item non trouvé" });
    }
    
    fakeDB.splice(index, 1);
    console.log("✅ Item supprimé");
    res.status(204).send();
});

// DÉMARRAGE
const PORT = 3000;
app.listen(PORT, () => {
    console.log("\n" + "=".repeat(50));
    console.log("🚀 API CRUD SIMPLE démarrée !");
    console.log("=".repeat(50));
    console.log(`📍 URL: http://localhost:${PORT}/api`);
    console.log(`🔑 API Key: ${API_KEY}`);
    console.log(`💾 Mode: Mémoire (pas de base de données)`);
    console.log("=".repeat(50) + "\n");
});