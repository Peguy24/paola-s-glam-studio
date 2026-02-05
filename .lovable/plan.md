
# Guide d'Administration PDF - Paola Beauty Glam

## Objectif
Créer une page dédiée dans l'application qui génère un PDF téléchargeable contenant les instructions complètes pour utiliser le tableau de bord administrateur.

## Fonctionnalités du guide

Le PDF contiendra des instructions détaillées pour les 13 sections du dashboard admin :

### 1. Rendez-vous (Appointments)
- Voir tous les rendez-vous avec filtres par statut
- Changer le statut (En attente, Confirmé, Terminé, Annulé)
- Reprogrammer un rendez-vous vers un autre créneau
- Exporter en CSV ou PDF

### 2. Disponibilités (Availability)
- Créer des créneaux horaires manuellement
- Créer des créneaux en masse (bulk)
- Modifier ou supprimer des créneaux
- Dupliquer un créneau pour une autre date

### 3. Patterns Récurrents (Recurring)
- Créer des modèles automatiques de créneaux
- Sélectionner les jours de la semaine
- Définir les heures et la capacité
- Activer/Désactiver les patterns

### 4. Services
- Ajouter un nouveau service (nom, prix, catégorie, description, image)
- Modifier un service existant
- Supprimer un service

### 5. Galerie de Transformations
- Uploader des photos avant/après
- Upload en masse
- Recadrer les images
- Organiser par catégorie

### 6. Messages
- Voir les messages de contact des clients
- Marquer comme lu/non lu
- Supprimer des messages

### 7. Notes et Avis (Ratings)
- Voir tous les avis clients
- Répondre aux avis
- Supprimer les avis inappropriés

### 8. Analytics
- Voir les statistiques de réservations
- Graphiques de revenus
- Comparaison entre périodes
- Export des rapports

### 9. Gestion Utilisateurs
- Voir la liste des utilisateurs
- Ajouter/Retirer le rôle admin
- Exporter la liste en CSV

### 10. Journal d'Activité
- Suivre les actions effectuées dans le système

### 11. Historique Notifications
- Voir les emails/SMS envoyés

### 12. Paramètres du Site
- Modifier les coordonnées (téléphone, email)
- Modifier l'adresse
- Liens réseaux sociaux (Instagram, Facebook)
- Heures d'ouverture

### 13. Politique d'Annulation
- Créer des niveaux de remboursement
- Définir les heures avant RDV et % de remboursement
- Activer/Désactiver des règles

---

## Implémentation technique

### Fichier à créer
`src/components/admin/AdminGuideGenerator.tsx`

### Approche
1. Créer un bouton dans le dashboard admin pour télécharger le guide
2. Utiliser jsPDF (déjà installé) pour générer le PDF
3. Structurer le PDF avec:
   - Page de couverture avec logo et titre
   - Table des matières
   - Sections détaillées avec instructions pas à pas
   - Captures d'écran simulées (descriptions textuelles)

### Contenu du PDF
- Format A4
- Police professionnelle
- Numérotation des pages
- En-têtes de section
- Listes à puces pour les étapes
- Conseils et astuces encadrés

### Modifications dans Admin.tsx
- Ajouter un bouton "Télécharger le Guide" en haut du dashboard
- Intégrer le composant de génération PDF
