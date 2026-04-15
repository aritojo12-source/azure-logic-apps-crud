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

  app.get('/api/items/:id', (req, res) => {
    const item = fakeDB.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: "Item non trouvé" });
    res.json(item);
  });

  app.put('/api/items/:id', (req, res) => {
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
    
    res.json(fakeDB[index]);
  });

  return app;
};

describe('Tests API CRUD - UPDATE', () => {
  let app;
  let createdItemId;
  
  beforeEach(async () => {
    app = createApp();
    
    const response = await request(app)
      .post('/api/items')
      .set('x-api-key', 'mon-api-key-local-1234')
      .send({ name: 'Item Original', price: 100 });
    
    createdItemId = response.body.id;
  });

  describe('PUT /api/items/:id - Mettre à jour un item', () => {
    
    test('Devrait mettre à jour un item existant', async () => {
      const response = await request(app)
        .put(`/api/items/${createdItemId}`)
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ name: 'Item Modifié', price: 150 });
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Item Modifié');
      expect(response.body.price).toBe(150);
      expect(response.body.id).toBe(createdItemId);
    });

    test('Devrait mettre à jour la date updated_at', async () => {
      const beforeUpdate = await request(app)
        .get(`/api/items/${createdItemId}`)
        .set('x-api-key', 'mon-api-key-local-1234');
      
      // Attendre 1 seconde pour être sûr que la date change
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await request(app)
        .put(`/api/items/${createdItemId}`)
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ name: 'Item Modifié', price: 150 });
      
      expect(response.body.updated_at).not.toBe(beforeUpdate.body.updated_at);
    });

    test('Devrait retourner 404 si l\'item n\'existe pas', async () => {
      const response = await request(app)
        .put('/api/items/id-inexistant')
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ name: 'Test', price: 50 });
      
      expect(response.status).toBe(404);
    });

    test('Devrait retourner 400 si name est manquant', async () => {
      const response = await request(app)
        .put(`/api/items/${createdItemId}`)
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ price: 150 });
      
      expect(response.status).toBe(400);
    });

    test('Devrait retourner 400 si price est invalide', async () => {
      const response = await request(app)
        .put(`/api/items/${createdItemId}`)
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ name: 'Test', price: -10 });
      
      expect(response.status).toBe(400);
    });

    test('Devrait retourner 401 sans clé API', async () => {
      const response = await request(app)
        .put(`/api/items/${createdItemId}`)
        .send({ name: 'Test', price: 50 });
      
      expect(response.status).toBe(401);
    });
  });
});