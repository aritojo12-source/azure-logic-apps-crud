// test-api.js - Test simple pour GitHub Actions
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const API_KEY = "mon-api-key-local-1234";
const fakeDB = [];

// Middleware
app.use('/api', (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ error: "Non autorisé" });
    }
    next();
});

// CREATE
app.post('/api/items', (req, res) => {
    const { name, price } = req.body;
    
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "name est requis" });
    }
    if (!price || typeof price !== 'number' || price <= 0) {
        return res.status(400).json({ error: "price doit être un nombre > 0" });
    }
    
    const item = {
        id: uuidv4(),
        name: name.trim(),
        price: price,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    fakeDB.push(item);
    res.status(201).json(item);
});

// READ ALL
app.get('/api/items', (req, res) => {
    res.json(fakeDB);
});

// READ ONE
app.get('/api/items/:id', (req, res) => {
    const item = fakeDB.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: "Item non trouvé" });
    res.json(item);
});

// UPDATE
app.put('/api/items/:id', (req, res) => {
    const index = fakeDB.findIndex(i => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Item non trouvé" });
    
    const { name, price } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "name est requis" });
    }
    if (!price || typeof price !== 'number' || price <= 0) {
        return res.status(400).json({ error: "price doit être un nombre > 0" });
    }
    
    fakeDB[index] = {
        ...fakeDB[index],
        name: name.trim(),
        price: price,
        updated_at: new Date().toISOString()
    };
    
    res.json(fakeDB[index]);
});

// DELETE
app.delete('/api/items/:id', (req, res) => {
    const index = fakeDB.findIndex(i => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Item non trouvé" });
    
    fakeDB.splice(index, 1);
    res.status(204).send();
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ API test démarrée sur port ${PORT}`);
});

module.exports = app;