const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Créer une instance de l'API pour les tests
const createApp = () => {
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

  // CREATE
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

  // READ ALL
  app.get('/api/items', (req, res) => {
    res.json(fakeDB);
  });

  // READ ONE
  app.get('/api/items/:id', (req, res) => {
    const item = fakeDB.find(i => i.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Item non trouvé" });
    }
    res.json(item);
  });

  // UPDATE
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

  // DELETE
  app.delete('/api/items/:id', (req, res) => {
    const index = fakeDB.findIndex(i => i.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Item non trouvé" });
    }
    
    fakeDB.splice(index, 1);
    res.status(204).send();
  });

  return app;
};

describe('Tests API CRUD - CREATE', () => {
  let app;
  
  beforeEach(() => {
    app = createApp();
  });

  describe('POST /api/items - Création d\'items', () => {
    
    test('Devrait créer un item avec des données valides', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({
          name: 'Chaise ergonomique',
          price: 89.99
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Chaise ergonomique');
      expect(response.body.price).toBe(89.99);
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
    });

    test('Devrait générer un ID unique pour chaque item', async () => {
      const response1 = await request(app)
        .post('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ name: 'Item 1', price: 10 });
      
      const response2 = await request(app)
        .post('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ name: 'Item 2', price: 20 });
      
      expect(response1.body.id).not.toBe(response2.body.id);
    });

    test('Devrait retourner 400 si name est manquant', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ price: 89.99 });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name est requis');
    });

    test('Devrait retourner 400 si name est vide', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ name: '', price: 89.99 });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name est requis');
    });

    test('Devrait retourner 400 si price est manquant', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ name: 'Chaise' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('price doit être un nombre > 0');
    });

    test('Devrait retourner 400 si price est négatif', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ name: 'Chaise', price: -10 });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('price doit être un nombre > 0');
    });

    test('Devrait retourner 400 si price est zéro', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234')
        .send({ name: 'Chaise', price: 0 });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('price doit être un nombre > 0');
    });

    test('Devrait retourner 401 sans clé API', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: 'Chaise', price: 89.99 });
      
      expect(response.status).toBe(401);
    });

    test('Devrait retourner 401 avec mauvaise clé API', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('x-api-key', 'mauvaise-clé')
        .send({ name: 'Chaise', price: 89.99 });
      
      expect(response.status).toBe(401);
    });
  });
});