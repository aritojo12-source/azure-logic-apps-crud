// server.js - Version CORRECTE pour Azurite
const express = require('express');
const { TableClient } = require('@azure/data-tables');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// ✅ BONNE configuration pour Azurite (clé corrigée)
const connectionString = "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OGLki1FjN1g+U3RvxG6ZcQ==;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;";
const tableClientOptions = { allowInsecureConnection: true };
const tableName = "items";
const API_KEY = "mon-api-key-local-1234";

let tableClient;

// Initialisation
async function init() {
    try {
        tableClient = TableClient.fromConnectionString(connectionString, tableName, tableClientOptions);
        await tableClient.createTable();
        console.log("✅ Table 'items' prête");
    } catch (err) {
        if (err.statusCode === 409) {
            console.log("📋 Table 'items' existe déjà");
        } else {
            console.log("⚠️ Erreur table:", err.message);
        }
    }
}

// Middleware d'authentification
app.use('/api', (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ error: "Non autorisé" });
    }
    next();
});

// CREATE
app.post('/api/items', async (req, res) => {
    try {
        const { name, price } = req.body;
        
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: "name est requis" });
        }
        if (!price || typeof price !== 'number' || price <= 0) {
            return res.status(400).json({ error: "price doit être un nombre > 0" });
        }
        
        const id = uuidv4();
        const now = new Date().toISOString();
        
        const entity = {
            partitionKey: "item",
            rowKey: id,
            id: id,
            name: name.trim(),
            price: price,
            created_at: now,
            updated_at: now
        };
        
        await tableClient.createEntity(entity);
        
        res.status(201).json({
            id: id,
            name: name.trim(),
            price: price,
            created_at: now,
            updated_at: now
        });
    } catch (err) {
        console.error("Create error:", err.message);
        res.status(500).json({ error: "Erreur interne: " + err.message });
    }
});

// READ ALL
app.get('/api/items', async (req, res) => {
    try {
        const items = [];
        const entities = tableClient.listEntities();
        
        for await (const entity of entities) {
            items.push({
                id: entity.id,
                name: entity.name,
                price: entity.price,
                created_at: entity.created_at,
                updated_at: entity.updated_at
            });
        }
        
        res.json(items);
    } catch (err) {
        console.error("Read all error:", err.message);
        res.status(500).json({ error: "Erreur interne" });
    }
});

// READ ONE
app.get('/api/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        try {
            const entity = await tableClient.getEntity("item", id);
            res.json({
                id: entity.id,
                name: entity.name,
                price: entity.price,
                created_at: entity.created_at,
                updated_at: entity.updated_at
            });
        } catch (err) {
            if (err.statusCode === 404) {
                res.status(404).json({ error: "Item non trouvé" });
            } else {
                throw err;
            }
        }
    } catch (err) {
        console.error("Read one error:", err.message);
        res.status(500).json({ error: "Erreur interne" });
    }
});

// UPDATE
app.put('/api/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price } = req.body;
        
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: "name est requis" });
        }
        if (!price || typeof price !== 'number' || price <= 0) {
            return res.status(400).json({ error: "price doit être un nombre > 0" });
        }
        
        // Vérifier existence
        try {
            await tableClient.getEntity("item", id);
        } catch (err) {
            if (err.statusCode === 404) {
                return res.status(404).json({ error: "Item non trouvé" });
            }
            throw err;
        }
        
        const now = new Date().toISOString();
        
        const entity = {
            partitionKey: "item",
            rowKey: id,
            id: id,
            name: name.trim(),
            price: price,
            updated_at: now
        };
        
        await tableClient.updateEntity(entity, "Merge");
        
        // Récupérer l'item mis à jour
        const updated = await tableClient.getEntity("item", id);
        res.json({
            id: updated.id,
            name: updated.name,
            price: updated.price,
            created_at: updated.created_at,
            updated_at: updated.updated_at
        });
    } catch (err) {
        console.error("Update error:", err.message);
        res.status(500).json({ error: "Erreur interne" });
    }
});

// DELETE
app.delete('/api/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        try {
            await tableClient.deleteEntity("item", id);
            res.status(204).send();
        } catch (err) {
            if (err.statusCode === 404) {
                res.status(404).json({ error: "Item non trouvé" });
            } else {
                throw err;
            }
        }
    } catch (err) {
        console.error("Delete error:", err.message);
        res.status(500).json({ error: "Erreur interne" });
    }
});

// DÉMARRAGE
const PORT = 3000;
init().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 API CRUD démarrée sur http://localhost:${PORT}/api`);
        console.log(`🔑 API Key: ${API_KEY}`);
        console.log(`📦 Table: ${tableName}\n`);
    });
}).catch(err => {
    console.error("❌ Impossible de démarrer:", err);
});