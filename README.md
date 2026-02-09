# SAGL - Système Associatif de Gestion Logistique

Système de gestion d'inventaire et de stock pour association de secourisme.

## Fonctionnalités

- **Gestion des stockages hiérarchiques** : ambulances, sacs, pochettes, sous-pochettes...
- **Templates** : contenu attendu par stockage (quantités minimales)
- **Inventaires mobile-first** : via QR code / lien unique, par secouriste
- **Types d'inventaire** : début de mission, fin de mission, autre
- **Réserve locale** : stock global, décompte automatique lors des réassorts
- **Dates de péremption** optionnelles par unité
- **Notifications admin** : stock faible, épuisé, périmé
- **Historique complet** des inventaires
- **Statistiques** et graphiques
- **Export PDF/CSV**
- **QR Codes** pour chaque stockage

## Stack technique

| Composant | Technologie |
|-----------|------------|
| Backend | PHP (vanilla) |
| Base de données | SQLite (PDO) |
| Frontend | HTML + CSS + JavaScript (vanilla) |
| Auth | JWT (implémentation PHP pure) |
| QR Codes | Génération SVG native (PHP) |

Aucune dépendance externe, aucun framework, aucun npm/composer requis.

## Installation

### Prérequis

- PHP >= 8.1 avec extensions : pdo_sqlite, mbstring
- Apache avec mod_rewrite activé (ou Nginx avec configuration équivalente)

### Installation rapide

```bash
# 1. Cloner le repo
git clone <url-du-repo> sagl
cd sagl

# 2. Lancer le script d'installation (crée la base de données et le compte admin)
php install.php

# 3. C'est prêt !
```

L'application est accessible à la racine du serveur web.

**Identifiants par défaut** : `admin` / `admin`

### Avec le serveur PHP intégré (développement)

```bash
php install.php
php -S localhost:8000
```

Ouvrir `http://localhost:8000/admin/` dans un navigateur.

## Structure du projet

```
├── index.php           # Point d'entrée (redirection)
├── install.php         # Script d'installation de la BDD
├── .htaccess           # Réécriture d'URL (Apache)
├── api/                # API REST en PHP
│   ├── index.php       # Routeur principal
│   ├── config.php      # Configuration BDD et JWT
│   ├── helpers.php     # Fonctions utilitaires
│   ├── auth.php        # Authentification
│   ├── materials.php   # CRUD matériels
│   ├── storages.php    # CRUD stockages + QR codes
│   ├── inventories.php # Historique inventaires
│   ├── notifications.php # Alertes
│   ├── stats.php       # Statistiques
│   ├── exports.php     # Export CSV/PDF
│   └── inventory-public.php # API publique secouriste
├── admin/              # Pages d'administration (HTML)
│   ├── index.html      # Tableau de bord
│   ├── login.html      # Connexion
│   ├── materials.html  # Gestion matériels
│   ├── storages.html   # Gestion stockages
│   ├── storage-detail.html
│   ├── history.html    # Historique
│   ├── inventory-detail.html
│   ├── stats.html      # Statistiques
│   └── settings.html   # Paramètres
├── i/                  # Pages inventaire public
│   ├── index.php       # Routeur
│   ├── start.html      # Formulaire de démarrage
│   ├── form.html       # Formulaire d'inventaire
│   └── complete.html   # Page de confirmation
├── assets/
│   ├── css/style.css   # Styles
│   └── js/
│       ├── api.js      # Client API
│       └── utils.js    # Utilitaires (toasts, icônes, helpers)
└── data/
    └── sagl.db         # Base de données SQLite (créée par install.php)
```

## Déploiement (Apache)

1. Cloner le repo dans le dossier web (ex: `/var/www/html/sagl`)
2. S'assurer que `mod_rewrite` est activé : `a2enmod rewrite && systemctl restart apache2`
3. S'assurer que le dossier `data/` est accessible en écriture : `chmod 755 data/`
4. Exécuter `php install.php`
5. Configurer SSL avec Let's Encrypt si besoin

### Nginx

Pour Nginx, ajouter ces règles dans le bloc `server` :

```nginx
location /api/ {
    try_files $uri /api/index.php$is_args$args;
}

location /i/ {
    try_files $uri /i/index.php$is_args$args;
}

location /data/ {
    deny all;
}

location ~ \.php$ {
    fastcgi_pass unix:/var/run/php/php-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}
```

## Licence

AGPL-3.0
