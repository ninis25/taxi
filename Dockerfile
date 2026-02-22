# Build et run depuis la racine : back/ = Node, front/ = fichiers statiques
FROM node:20-alpine

WORKDIR /app

# Dépendances back
COPY back/package.json back/package-lock.json* ./back/
RUN cd back && npm ci --omit=dev 2>/dev/null || cd back && npm install --omit=dev

# Code back + front (server sert front/ et utilise .. pour y accéder)
COPY back/ ./back/
COPY front/ ./front/

WORKDIR /app/back

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
