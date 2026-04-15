// logic-apps-simulator.js - Simule Azure Logic Apps à partir des workflows JSON
const express = require('express');
const { TableClient } = require('@azure/data-tables');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Configuration
const connectionString = "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OGLki1FjN1g+U3RvxG6ZcQ==;TableEndpoint=http://azurite:10002/devstoreaccount1;";
const tableClientOptions = { allowInsecureConnection: true };
const TABLE_NAME = "items";
const API_KEY = "mon-api-key-local-1234";

let tableClient;

// Initialisation Table Storage
async function initTable() {
    try {
        tableClient = TableClient.fromConnectionString(connectionString, TABLE_NAME, tableClientOptions);
        await tableClient.createTable();
        console.log("✅ Table Storage prête");
    } catch (err) {
        if (err.statusCode === 409) {
            console.log("📋 Table existe déjà");
        } else {
            console.error("❌ Erreur table:", err.message);
        }
    }
}

// ============ SIMULATION DES WORKFLOWS LOGIC APPS ============

// CREATE - Simulation de workflows/create/workflow.json
app.post('/api/items', async (req, res) => {
    console.log("\n📝 [CREATE] Workflow déclenché - POST /items");
    
    // Étape 1: Vérifier API Key (comme dans workflow.json)
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        console.log("❌ [CREATE] API Key invalide");
        return res.status(401).json({ error: "Non autorisé - x-api-key invalide" });
    }
    
    const { name, price } = req.body;
    
    // Étape 2: Valider les données (comme dans workflow.json)
    if (!name || name.trim() === '') {
        console.log("❌ [CREATE] name manquant");
        return res.status(400).json({ error: "name est requis" });
    }
    if (!price || typeof price !== 'number' || price <= 0) {
        console.log("❌ [CREATE] price invalide");
        return res.status(400).json({ error: "price doit être un nombre > 0" });
    }
    
    // Étape 3: Générer ID et timestamp (comme dans workflow.json)
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Étape 4: Sauvegarder dans Table Storage
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
    console.log(`✅ [CREATE] Item créé: ${id}`);
    
    // Étape 5: Retourner 201 (comme dans workflow.json)
    res.status(201).json({
        id: id,
        name: name.trim(),
        price: price,
        created_at: now,
        updated_at: now
    });
});

// READ - Simulation de workflows/read/workflow.json
app.get('/api/items/:id?', async (req, res) => {
    const { id } = req.params;
    
    console.log(`\n📖 [READ] Workflow déclenché - GET /items${id ? '/' + id : ''}`);
    
    // Étape 1: Vérifier API Key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ error: "Non autorisé" });
    }
    
    // Étape 2: Détecter si ID présent (comme dans workflow.json)
    if (!id) {
        // GET /items - Lister tous
        console.log("📖 [READ] Mode: Liste tous les items");
        const items = [];
        const entities = tableClient.listEntities({ queryOptions: { filter: "PartitionKey eq 'item'" } });
        
        for await (const entity of entities) {
            items.push({
                id: entity.id,
                name: entity.name,
                price: entity.price,
                created_at: entity.created_at,
                updated_at: entity.updated_at
            });
        }
        
        console.log(`✅ [READ] ${items.length} items trouvés`);
        return res.json(items);
    }
    
    // GET /items/{id} - Lire un item spécifique
    console.log(`📖 [READ] Mode: Lecture unique - ID: ${id}`);
    
    try {
        const entity = await tableClient.getEntity("item", id);
        console.log(`✅ [READ] Item trouvé: ${entity.name}`);
        res.json({
            id: entity.id,
            name: entity.name,
            price: entity.price,
            created_at: entity.created_at,
            updated_at: entity.updated_at
        });
    } catch (err) {
        if (err.statusCode === 404) {
            console.log(`❌ [READ] Item non trouvé: ${id}`);
            return res.status(404).json({ error: "Item non trouvé" });
        }
        throw err;
    }
});

// UPDATE - Simulation de workflows/update/workflow.json
app.put('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price } = req.body;
    
    console.log(`\n✏️ [UPDATE] Workflow déclenché - PUT /items/${id}`);
    
    // Étape 1: Vérifier API Key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ error: "Non autorisé" });
    }
    
    // Étape 2: Valider les données
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "name est requis" });
    }
    if (!price || typeof price !== 'number' || price <= 0) {
        return res.status(400).json({ error: "price doit être un nombre > 0" });
    }
    
    // Étape 3: Vérifier que l'item existe
    try {
        const existing = await tableClient.getEntity("item", id);
        console.log(`✅ [UPDATE] Item trouvé: ${existing.name}`);
        
        // Étape 4: Mettre à jour (conserve created_at)
        const now = new Date().toISOString();
        const entity = {
            partitionKey: "item",
            rowKey: id,
            id: id,
            name: name.trim(),
            price: price,
            created_at: existing.created_at, // Conserve l'original
            updated_at: now
        };
        
        await tableClient.updateEntity(entity, "Replace");
        console.log(`✅ [UPDATE] Item mis à jour: ${id}`);
        
        res.json({
            id: id,
            name: name.trim(),
            price: price,
            created_at: existing.created_at,
            updated_at: now
        });
    } catch (err) {
        if (err.statusCode === 404) {
            console.log(`❌ [UPDATE] Item non trouvé: ${id}`);
            return res.status(404).json({ error: "Item non trouvé" });
        }
        throw err;
    }
});

// DELETE - Simulation de workflows/delete/workflow.json
app.delete('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    
    console.log(`\n🗑️ [DELETE] Workflow déclenché - DELETE /items/${id}`);
    
    // Étape 1: Vérifier API Key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ error: "Non autorisé" });
    }
    
    // Étape 2: Vérifier que l'item existe
    try {
        await tableClient.getEntity("item", id);
        console.log(`✅ [DELETE] Item trouvé, suppression...`);
        
        // Étape 3: Supprimer avec If-Match: * (simulé)
        await tableClient.deleteEntity("item", id);
        console.log(`✅ [DELETE] Item supprimé: ${id}`);
        
        res.status(204).send();
    } catch (err) {
        if (err.statusCode === 404) {
            console.log(`❌ [DELETE] Item non trouvé: ${id}`);
            return res.status(404).json({ error: "Item non trouvé" });
        }
        throw err;
    }
});

// Démarrer le serveur
const PORT = 3000;
initTable().then(() => {
    app.listen(PORT, () => {
        console.log("\n" + "=".repeat(60));
        console.log("🚀 SIMULATEUR AZURE LOGIC APPS DÉMARRÉ");
        console.log("=".repeat(60));
        console.log(`📍 API: http://localhost:${PORT}/api`);
        console.log(`🔑 API Key: ${API_KEY}`);
        console.log("📋 Workflows chargés:");
        console.log("   ✅ POST   /items     (create/workflow.json)");
        console.log("   ✅ GET    /items     (read/workflow.json)");
        console.log("   ✅ GET    /items/:id (read/workflow.json)");
        console.log("   ✅ PUT    /items/:id (update/workflow.json)");
        console.log("   ✅ DELETE /items/:id (delete/workflow.json)");
        console.log("=".repeat(60) + "\n");
    });
});