# Site Web Taxi Premium

Site web haut de gamme pour réservation de taxi avec design noir et rouge.

## Images nécessaires

Pour que le site fonctionne correctement, ajoutez les images suivantes dans le dossier `front/images/` :

### Images principales des véhicules

1. **classe-e.png** - Image de la Mercedes Classe E
   - Dimensions recommandées : 800x600px minimum
   - Format : PNG (avec transparence de préférence)
   - Style : Photo professionnelle du véhicule, de préférence sur fond sombre ou élégant

2. **classe-s.png** - Image de la Mercedes Classe S
   - Dimensions recommandées : 800x600px minimum   
   - Format : PNG (avec transparence de préférence)
   - Style : Photo professionnelle du véhicule, de préférence sur fond sombre ou élégant

3. **viano.png** - Image du Mercedes Viano
   - Dimensions recommandées : 800x600px minimum   
   - Format : PNG (avec transparence de préférence)
   - Style : Photo professionnelle du véhicule, de préférence sur fond sombre ou élégant

### Images supplémentaires pour la galerie (optionnelles mais recommandées)

4. **interieur-classe-e.jpg** - Intérieur de la Classe E
   - Dimensions recommandées : 1200x800px
   - Format : JPG ou PNG
   - Style : Photo de l'intérieur premium avec sièges en cuir

5. **interieur-classe-s.jpg** - Intérieur de la Classe S
   - Dimensions recommandées : 1200x800px
   - Format : JPG ou PNG
   - Style : Photo de l'intérieur luxueux avec finitions haut de gamme

6. **interieur-viano.jpg** - Intérieur du Viano
   - Dimensions recommandées : 1200x800px
   - Format : JPG ou PNG
   - Style : Photo de l'intérieur aménagé avec sièges individuels

7. **chauffeur.jpg** - Photo d'un chauffeur professionnel
   - Dimensions recommandées : 800x1000px
   - Format : JPG ou PNG
   - Style : Photo professionnelle d'un chauffeur en tenue formelle

8. **vehicule-action.jpg** - Véhicule en mouvement dans Paris
   - Dimensions recommandées : 1600x900px
   - Format : JPG
   - Style : Photo dynamique d'un véhicule dans les rues de Paris

9. **equipements.jpg** - Équipements premium (WiFi, écrans, etc.)
   - Dimensions recommandées : 1200x800px
   - Format : JPG ou PNG
   - Style : Photo des équipements et technologies à bord

### Image pour la section "À propos" (optionnelle)

10. **equipe.jpg** ou **bureau.jpg** - Photo de l'équipe ou du bureau
    - Dimensions recommandées : 1200x800px
    - Format : JPG ou PNG
    - Style : Photo professionnelle de l'équipe ou des locaux

**Note :** Les images principales (classe-e.png, classe-s.png, viano.png) sont déjà utilisées dans le site. Les autres images sont optionnelles mais amélioreront grandement l'expérience visuelle du site. Des placeholders sont affichés en attendant que vous ajoutiez ces images.

## Structure du dossier front

```
front/
├── index.html          # Page principale
├── reservation.html
├── services.html
├── vehicules.html
├── contact.html
├── style.css           # Styles CSS
├── script.js           # JavaScript
├── images/             # Dossier pour les images (à remplir)
└── README.md           # Ce fichier
```

## Fonctionnalités

- Design moderne et élégant en noir et rouge avec mode sombre/clair
- Section hero avec animations fluides style Apple
- Présentation détaillée des 3 véhicules (Classe E, Classe S, Viano)
- Section "À propos" avec histoire et statistiques
- Section "Comment ça marche" avec processus en 4 étapes
- Section tarifs détaillée avec informations complètes
- Galerie d'images pour présenter la flotte
- Section FAQ interactive avec accordéon
- Formulaire de réservation complet
- Section témoignages clients
- Section garanties et engagements
- Section contact
- Navigation responsive avec menu mobile
- Animations au scroll avec effets de révélation progressifs
- Effets 3D sur les cartes de véhicules
- Parallaxe et effets de blur progressifs
- Design responsive (mobile, tablette, desktop)

## Pour utiliser le site

1. Ajoutez les images dans le dossier `front/images/`
2. Lancez le serveur depuis le dossier `back/` (voir le README à la racine du projet)
3. Ouvrez http://localhost:3000 dans votre navigateur

## Personnalisation

Vous pouvez modifier :
- Les prix dans `index.html` (lignes avec "À partir de XX€")
- Les numéros de téléphone et email dans la section contact
- Les textes et descriptions selon vos besoins
