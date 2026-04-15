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

  app.get('/api/items', (req, res) => {
    res.json(fakeDB);
  });

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

describe('Tests API CRUD - DELETE', () => {
  let app;
  let createdItemId;
  
  beforeEach(async () => {
    app = createApp();
    
    const response = await request(app)
      .post('/api/items')
      .set('x-api-key', 'mon-api-key-local-1234')
      .send({ name: 'Item à Supprimer', price: 75 });
    
    createdItemId = response.body.id;
  });

  describe('DELETE /api/items/:id - Supprimer un item', () => {
    
    test('Devrait supprimer un item existant', async () => {
      const response = await request(app)
        .delete(`/api/items/${createdItemId}`)
        .set('x-api-key', 'mon-api-key-local-1234');
      
      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });

    test('L\'item ne doit plus être accessible après suppression', async () => {
      await request(app)
        .delete(`/api/items/${createdItemId}`)
        .set('x-api-key', 'mon-api-key-local-1234');
      
      const response = await request(app)
        .get('/api/items')
        .set('x-api-key', 'mon-api-key-local-1234');
      
      expect(response.body.length).toBe(0);
    });

    test('Devrait retourner 404 si l\'item n\'existe pas', async () => {
      const response = await request(app)
        .delete('/api/items/id-inexistant')
        .set('x-api-key', 'mon-api-key-local-1234');
      
      expect(response.status).toBe(404);
    });

    test('Devrait retourner 401 sans clé API', async () => {
      const response = await request(app)
        .delete(`/api/items/${createdItemId}`);
      
      expect(response.status).toBe(401);
    });

    test('Supprimer deux fois le même item retourne 404', async () => {
      await request(app)
        .delete(`/api/items/${createdItemId}`)
        .set('x-api-key', 'mon-api-key-local-1234');
      
      const secondDelete = await request(app)
        .delete(`/api/items/${createdItemId}`)
        .set('x-api-key', 'mon-api-key-local-1234');
      
      expect(secondDelete.status).toBe(404);
    });
  });
});