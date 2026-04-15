# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de l'application
COPY package*.json ./
COPY logic-apps-simulator.js ./
COPY workflows/ ./workflows/

# Installer les dépendances
RUN npm install

# Exposer le port
EXPOSE 3000

# Démarrer le simulateur Logic Apps
CMD ["node", "logic-apps-simulator.js"]