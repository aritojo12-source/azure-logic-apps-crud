const request = require('supertest');

const createApp = () => {
  const express = require('express');
  const { v4: uuidv4 } = require('uuid');
  
  const app = express();
  app.use(express.json());

  const API_KEY = "mon-api-key-local-1234";
  const fakeDB = [];

  app.use('/api', (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
      return res.status(401).json({ error: "Non autorisé" });
    }
    next();
  });

  app.post('/api/items', (req, res) => {
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
    res.status(201).json(newItem);
  });

  app.get('/api/items', (req, res) => {
    res.json(fakeDB);
  });

  app.get('/api/items/:id', (req, res) => {
    const item = fakeDB.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: "Item non trouvé" });
    res.json(item);
  });

  app.put('/api/items/:id', (req, res) => {
    const index = fakeDB.findIndex(i => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Item non trouvé" });
    const { name, price } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: "name est requis" });
    }
    if (price === undefined || typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: "price doit être un nombre > 0" });
    }
    fakeDB[index] = { ...fakeDB[index], name: name.trim(), price, updated_at: new Date().toISOString() };
    res.json(fakeDB[index]);
  });

  app.delete('/api/items/:id', (req, res) => {
    const index = fakeDB.findIndex(i => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Item non trouvé" });
    fakeDB.splice(index, 1);
    res.status(204).send();
  });

  return app;
};

describe('Tests d\'intégration - Cycle de vie complet CRUD', () => {
  let app;
  
  beforeEach(() => {
    app = createApp();
  });

  test('Cycle complet : Create → Read → Update → Delete', async () => {
    // 1. CREATE
    const createResponse = await request(app)
      .post('/api/items')
      .set('x-api-key', 'mon-api-key-local-1234')
      .send({ name: 'Item Cycle Test', price: 100 });
    
    expect(createResponse.status).toBe(201);
    const itemId = createResponse.body.id;
    
    // 2. READ ONE
    const readResponse = await request(app)
      .get(`/api/items/${itemId}`)
      .set('x-api-key', 'mon-api-key-local-1234');
    
    expect(readResponse.status).toBe(200);
    expect(readResponse.body.name).toBe('Item Cycle Test');
    
    // 3. UPDATE
    const updateResponse = await request(app)
      .put(`/api/items/${itemId}`)
      .set('x-api-key', 'mon-api-key-local-1234')
      .send({ name: 'Item Modifié', price: 200 });
    
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe('Item Modifié');
    expect(updateResponse.body.price).toBe(200);
    
    // 4. DELETE
    const deleteResponse = await request(app)
      .delete(`/api/items/${itemId}`)
      .set('x-api-key', 'mon-api-key-local-1234');
    
    expect(deleteResponse.status).toBe(204);
    
    // 5. Vérifier que l'item n'existe plus
    const verifyResponse = await request(app)
      .get(`/api/items/${itemId}`)
      .set('x-api-key', 'mon-api-key-local-1234');
    
    expect(verifyResponse.status).toBe(404);
  });

  test('Création multiple puis lecture de tous', async () => {
    // Créer 3 items
    const items = [
      { name: 'Item A', price: 10 },
      { name: 'Item B', price: 20 },
      { name: 'Item C', price: 30 }
    ];
    
    for (const item of items) {
      await request(app)
        .post('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234')
        .send(item);
    }
    
    // Lire tous les items
    const readAllResponse = await request(app)
      .get('/api/items')
      .set('x-api-key', 'mon-api-key-local-1234');
    
    expect(readAllResponse.body.length).toBe(3);
  });
});