

# Systeme de Vente de Produits avec Backend Custom (Sans Shopify)

## Objectif
Remplacer l'integration Shopify par un systeme complet de gestion de produits, commandes et inventaire utilisant la base de donnees existante et Stripe pour les paiements. Cout mensuel : **0$** (seulement les frais Stripe de 2.9% + 0.30$ par transaction).

## Architecture

```text
+-------------------+     +------------------+     +---------+
|  Admin Dashboard  |---->|  Base de donnees |---->| Stripe  |
|  (Gestion)        |     |  (Produits,      |     | Checkout|
+-------------------+     |   Commandes,     |     +---------+
                          |   Inventaire)    |
+-------------------+     +------------------+
|  Page Produits    |---->|                  |
|  (Client)         |     |                  |
+-------------------+     +------------------+
```

## Nouvelles Tables de Base de Donnees

### 1. `products` - Catalogue de produits
- id, name, description, price, category, image_url
- stock_quantity (inventaire)
- is_active (publier/depublier)
- created_at, updated_at

### 2. `product_variants` - Variantes (taille, couleur, etc.)
- id, product_id, name, price, stock_quantity, is_active

### 3. `orders` - Commandes clients
- id, client_id, status (pending, paid, shipped, delivered, cancelled)
- total_amount, stripe_session_id, payment_status
- shipping_address, tracking_number
- created_at, updated_at

### 4. `order_items` - Articles dans chaque commande
- id, order_id, product_id, variant_id, quantity, unit_price

## Securite (RLS)
- Produits : visibles par tous, modifiables par admins seulement
- Commandes : clients voient leurs propres commandes, admins voient tout
- Variantes : meme politique que produits

## Modifications Cote Admin

### Nouveau tab "Produits" dans le dashboard admin
- Ajouter/modifier/supprimer des produits avec image upload
- Gerer l'inventaire (stock quantity)
- Activer/desactiver des produits
- Gerer les variantes (tailles, couleurs)

### Nouveau tab "Commandes" dans le dashboard admin
- Liste de toutes les commandes avec filtres par statut
- Changer le statut (En attente -> Expedie -> Livre)
- Ajouter un numero de suivi
- Voir les details de chaque commande

## Modifications Cote Client

### Page Produits refaite
- Affiche les produits depuis la base de donnees (remplace Shopify)
- Filtres par categorie
- Grille de produits avec images, prix, disponibilite

### Page Detail Produit refaite
- Selection de variantes
- Ajout au panier
- Indicateur de stock

### Panier et Checkout refaits
- Panier utilise les donnees locales (Zustand reste)
- Checkout via Stripe Checkout Session (edge function)
- Pages de confirmation de paiement existantes reutilisees

## Nouvelle Edge Function

### `create-product-payment`
- Recoit les articles du panier
- Cree une Stripe Checkout Session
- Enregistre la commande dans la base de donnees
- Retourne l'URL de checkout Stripe

### `product-stripe-webhook`
- Ecoute les evenements Stripe (payment_succeeded)
- Met a jour le statut de la commande
- Decremente l'inventaire automatiquement

## Fichiers a Creer/Modifier

### Nouveaux fichiers
- `src/components/admin/ProductManagement.tsx` - CRUD produits admin
- `src/components/admin/OrderManagement.tsx` - Gestion commandes admin
- `supabase/functions/create-product-payment/index.ts` - Checkout Stripe
- `supabase/functions/product-stripe-webhook/index.ts` - Webhook

### Fichiers a modifier
- `src/pages/Products.tsx` - Remplacer "Coming Soon" par le vrai catalogue
- `src/pages/ProductDetail.tsx` - Utiliser la base de donnees au lieu de Shopify
- `src/stores/cartStore.ts` - Adapter pour les produits locaux
- `src/components/CartDrawer.tsx` - Checkout via Stripe direct
- `src/pages/Admin.tsx` - Ajouter tabs "Produits" et "Commandes"
- `src/lib/shopify.ts` - Supprime (plus necessaire)

### Bucket de stockage
- Creer un bucket `product-images` pour les images des produits

## Resultat
- **0$/mois** de frais de plateforme (pas de Shopify)
- Gestion complete des produits, commandes et inventaire dans le dashboard admin
- Paiements securises via Stripe
- Suivi des commandes pour l'admin et les clients

