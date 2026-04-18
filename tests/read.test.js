const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const createApp = () => {
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

  app.get('/api/items', (req, res) => {
    res.json(fakeDB);
  });

  app.get('/api/items/:id', (req, res) => {
    const item = fakeDB.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: "Item non trouvé" });
    res.json(item);
  });

  return app;
};

describe('Tests API CRUD - READ', () => {
  let app;
  let createdItemId;
  
  beforeEach(async () => {
    app = createApp();
    
    const response = await request(app)
      .post('/api/items')
      .set('x-api-key', 'mon-api-key-local-1234')
      .send({ name: 'Item Test', price: 99 });
    
    createdItemId = response.body.id;
  });

  describe('GET /api/items - Lister tous les items', () => {
    
    test('Devrait retourner un tableau', async () => {
      const response = await request(app)
        .get('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('Devrait retourner tous les items créés', async () => {
      await request(app)
        .post('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ name: 'Item 2', price: 50 });
      
      const response = await request(app)
        .get('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234');
      
      expect(response.body.length).toBe(2);
    });

    test('Devrait retourner un tableau vide si aucun item', async () => {
      const newApp = createApp();
      
      const response = await request(newApp)
        .get('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234');
      
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/items/:id - Lire un item spécifique', () => {
    
    test('Devrait retourner l\'item avec l\'ID correspondant', async () => {
      const response = await request(app)
        .get(`/api/items/${createdItemId}`)
        .set('x-api-key', 'mon-api-key-local-1234');
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdItemId);
      expect(response.body.name).toBe('Item Test');
      expect(response.body.price).toBe(99);
    });

    test('Devrait retourner 404 si l\'ID n\'existe pas', async () => {
      const response = await request(app)
        .get('/api/items/id-inexistant')
        .set('x-api-key', 'mon-api-key-local-1234');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Item non trouvé');
    });

    test('Devrait retourner 401 sans clé API', async () => {
      const response = await request(app)
        .get(`/api/items/${createdItemId}`);
      
      expect(response.status).toBe(401);
    });
  });
});