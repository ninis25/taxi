# Site Web NCP - Taxi Premium Paris

Projet séparé en **front** (interface) et **back** (serveur).

## Structure du projet

```
sitewebtaci/
├── front/                 # Front-end (fichiers statiques)
│   ├── index.html
│   ├── reservation.html
│   ├── services.html
│   ├── vehicules.html
│   ├── contact.html
│   ├── style.css
│   ├── script.js
│   ├── images/            # Ajoutez ici les images du site
│   └── README.md
├── back/                  # Back-end (Node.js / Express)
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── .env               # À créer (voir ci-dessous)
└── README.md              # Ce fichier
```

## Lancer le site

1. **Back-end** (serveur + API) :
   ```bash
   cd back
   npm install
   cp .env.example .env    # puis éditez .env avec votre Gmail
   npm start
   ```
   Le site est alors disponible sur **http://localhost:3000**

2. **Images** : placez les images dans `front/images/` (voir `front/README.md` pour la liste).

## Résumé

- **front/** : tout ce qui est envoyé au navigateur (HTML, CSS, JS, images).
- **back/** : serveur Express qui sert le dossier `front/` et gère l’API (réservation, envoi d’emails).
