# Backend de commandes alimentaires

API NestJS pour une activité indépendante de vente de nourriture sur
précommande. Elle couvre le catalogue, les commandes du soir au matin, la
livraison géolocalisée, les paiements en espèces, les notifications PWA et le
tableau de bord.

## Prérequis

- Node.js 24 ou version LTS compatible ;
- npm ;
- PostgreSQL 17, directement ou avec Docker.

## Démarrage local

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run start:dev
```

Configurer `ADMIN_EMAIL` et `ADMIN_PASSWORD` avant `prisma:seed`. Le mot de
passe initial doit contenir au moins 6 caractères.

- API : `http://localhost:3000/api/v1`
- Swagger : `http://localhost:3000/docs`
- État : `GET /api/v1/health`
- PostgreSQL : `GET /api/v1/health/ready`

## Fonctionnalités et routes

### Boutique et catalogue

- `GET /store/status`
- `GET|PATCH /store/settings` — administratrice
- `GET /catalog`
- `GET|POST /admin/catalog/categories`
- `PATCH|DELETE /admin/catalog/categories/:id`
- `GET|POST /admin/catalog/products`
- `PATCH|DELETE /admin/catalog/products/:id`
- `POST /admin/media/images` — JPEG, PNG ou WebP, 5 Mo maximum

### Livraison et suivi temps réel

- `GET /delivery/zones`
- `POST /delivery/quote`
- `GET|POST /admin/delivery/zones`
- `PATCH|DELETE /admin/delivery/zones/:id`
- `GET|POST /admin/delivery/assignments`
- `GET /driver/delivery/assignments`
- `PATCH /driver/delivery/assignments/:id/start`
- `PATCH /driver/delivery/stops/:id`
- `GET /delivery/tracking/:reference` — compte client propriétaire
- Socket.IO `/delivery`, événement entrant `driver:location`, événement sortant `delivery:location`

Une zone est définie par son centre GPS, son rayon, son tarif et son délai
estimé. Aucun devis de livraison ne peut être inférieur à 500 FCFA. Si des zones actives existent, une livraison doit fournir une position
GPS appartenant à l’une d’elles. L’ordre initial des arrêts utilise le plus
proche voisin et la distance à vol d’oiseau. Les positions reçues pendant la
tournée constituent la trace réelle. Le frontend affiche ces données avec
MapLibre GL JS. Un calcul routier avec routes,
bouchons et ETA exacts demandera ensuite une API d’itinéraires externe.

### Commandes

- `POST /orders` — compte `CUSTOMER` et en-tête `Idempotency-Key` obligatoires
- `GET /orders/me`
- `GET /orders/:reference/status` — propriétaire connecté
- `PATCH /orders/:reference/cancel` — propriétaire connecté
- `GET /admin/orders`
- `GET /admin/orders/:id`
- `PATCH /admin/orders/:id/status`

Les prix, frais et limites de capacité sont recalculés par le serveur. Une
commande est toujours associée au compte client qui l’a créée.

### Paiements

- `GET /payments/pawapay/providers`
- `POST /payments/pawapay/deposits`
- `POST /payments/pawapay/callback`
- `GET /admin/payments`
- `PATCH /admin/payments/:id/confirm-cash`
- `PATCH /admin/payments/:id/refund-cash`

Mobile Money utilise PawaPay v2. Configurer `PAWAPAY_API_TOKEN`, conserver
l’URL sandbox pendant le développement et déclarer le callback public dans le
tableau de bord PawaPay. L’API revérifie chaque callback auprès de PawaPay avant
de marquer un paiement réussi. La boutique refuse encore Mobile Money lorsque
`mobileMoneyEnabled` vaut `false`.

### Utilisateurs et rapports

- `POST /auth/register` — création d’un compte client
- `POST /auth/login`
- `POST /auth/google`
- `GET /auth/me`
- `PATCH /auth/password`
- `GET|POST /admin/users`
- `PATCH /admin/users/:id`
- `POST /admin/users/:id/reset-password`
- `GET /admin/reports/dashboard`

Les rôles sont `ADMIN` (la propriétaire), `DELIVERER` et `CUSTOMER`. Pour
Google, le frontend envoie le Google ID token à `/auth/google`. Le backend
vérifie sa signature, son audience et l’e-mail vérifié. Un nouvel utilisateur
Google devient `CUSTOMER`, sauf si son adresse figure dans
`GOOGLE_ALLOWED_EMAILS`. Un livreur doit d’abord être invité par son e-mail.

Les commandes restent ouvertes à toute heure. `ordersOpenAt` et
`ordersCloseAt` sont uniquement informatifs. Seul `isManuallyClosed`, piloté
par le bouton administrateur, empêche de passer une commande.

### Notifications Push

- `GET /notifications/push/public-key`
- `POST /notifications/push/subscribe-order`
- `DELETE /notifications/push/subscription`
- `POST /admin/notifications/push/subscription`
- `GET /admin/notifications/events`
- `GET /admin/notifications/in-app`
- `PATCH /admin/notifications/in-app/:id/read`
- `PATCH /admin/notifications/in-app/read-all`

Générer les clés VAPID une seule fois et les conserver dans les secrets du
déploiement :

```bash
./node_modules/.bin/web-push generate-vapid-keys
```

Une nouvelle commande crée immédiatement une notification persistante dans le
centre de notifications. Le Web Push, reçu par le service worker même quand la
PWA est fermée, est envoyé depuis une outbox toutes les dix secondes. Le worker
recommence les erreurs temporaires et désactive les abonnements expirés. La
position du livreur, elle, passe par Socket.IO tant que l’écran est ouvert.

## Vérifications

```bash
npm run check
npm run prisma:generate
```

## Déploiement Docker

Renseigner les secrets dans `.env`, puis lancer :

```bash
docker compose up -d --build
docker compose exec api npm run prisma:seed
```

Le conteneur applique automatiquement les migrations avant de démarrer l’API.
Les images produits et les données PostgreSQL utilisent des volumes persistants.

## Sauvegardes

Exemple de sauvegarde :

```bash
docker compose exec -T postgres pg_dump -U food_user -d food_orders -Fc > food_orders.dump
```

Exemple de restauration dans une base vide :

```bash
docker compose exec -T postgres pg_restore -U food_user -d food_orders --clean --if-exists < food_orders.dump
```

Sauvegarder également le volume `uploads_data`, qui contient les images.
