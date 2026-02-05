 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { FileDown, Loader2 } from "lucide-react";
 import { useToast } from "@/hooks/use-toast";
 import jsPDF from "jspdf";
 
 export const AdminGuideGenerator = () => {
   const [isGenerating, setIsGenerating] = useState(false);
   const { toast } = useToast();
 
   const generatePDF = async () => {
     setIsGenerating(true);
 
     try {
       const doc = new jsPDF();
       const pageWidth = doc.internal.pageSize.getWidth();
       const pageHeight = doc.internal.pageSize.getHeight();
       const margin = 20;
       const contentWidth = pageWidth - margin * 2;
       let yPosition = margin;
 
       const addHeader = (text: string, size: number = 16) => {
         if (yPosition > pageHeight - 40) {
           doc.addPage();
           yPosition = margin;
         }
         doc.setFontSize(size);
         doc.setFont("helvetica", "bold");
         doc.setTextColor(139, 69, 19);
         doc.text(text, margin, yPosition);
         yPosition += size * 0.5 + 4;
       };
 
       const addSubHeader = (text: string) => {
         if (yPosition > pageHeight - 30) {
           doc.addPage();
           yPosition = margin;
         }
         doc.setFontSize(12);
         doc.setFont("helvetica", "bold");
         doc.setTextColor(60, 60, 60);
         doc.text(text, margin, yPosition);
         yPosition += 8;
       };
 
       const addParagraph = (text: string) => {
         doc.setFontSize(10);
         doc.setFont("helvetica", "normal");
         doc.setTextColor(40, 40, 40);
         const lines = doc.splitTextToSize(text, contentWidth);
         for (const line of lines) {
           if (yPosition > pageHeight - 20) {
             doc.addPage();
             yPosition = margin;
           }
           doc.text(line, margin, yPosition);
           yPosition += 5;
         }
         yPosition += 3;
       };
 
       const addBulletPoint = (text: string, indent: number = 0) => {
         if (yPosition > pageHeight - 20) {
           doc.addPage();
           yPosition = margin;
         }
         doc.setFontSize(10);
         doc.setFont("helvetica", "normal");
         doc.setTextColor(40, 40, 40);
         const bulletX = margin + indent;
         doc.text("•", bulletX, yPosition);
         const textLines = doc.splitTextToSize(text, contentWidth - indent - 8);
         doc.text(textLines, bulletX + 5, yPosition);
         yPosition += textLines.length * 5 + 2;
       };
 
       const addTip = (text: string) => {
         if (yPosition > pageHeight - 30) {
           doc.addPage();
           yPosition = margin;
         }
         doc.setFillColor(255, 248, 220);
         doc.roundedRect(margin, yPosition - 4, contentWidth, 18, 2, 2, "F");
         doc.setFontSize(9);
         doc.setFont("helvetica", "italic");
         doc.setTextColor(139, 69, 19);
         doc.text("💡 Conseil: " + text, margin + 5, yPosition + 5);
         yPosition += 22;
       };
 
       const addSpacer = (height: number = 10) => {
         yPosition += height;
       };
 
       const addPageNumber = () => {
         const totalPages = doc.getNumberOfPages();
         for (let i = 1; i <= totalPages; i++) {
           doc.setPage(i);
           doc.setFontSize(8);
           doc.setFont("helvetica", "normal");
           doc.setTextColor(128, 128, 128);
           doc.text(
             `Page ${i} / ${totalPages}`,
             pageWidth / 2,
             pageHeight - 10,
             { align: "center" }
           );
         }
       };
 
       // Cover Page
       doc.setFillColor(139, 69, 19);
       doc.rect(0, 0, pageWidth, 80, "F");
       doc.setFontSize(28);
       doc.setFont("helvetica", "bold");
       doc.setTextColor(255, 255, 255);
       doc.text("Paola Beauty Glam", pageWidth / 2, 40, { align: "center" });
       doc.setFontSize(16);
       doc.text("Guide d'Administration", pageWidth / 2, 55, { align: "center" });
 
       yPosition = 100;
       doc.setFontSize(12);
       doc.setTextColor(60, 60, 60);
       doc.text("Ce guide vous accompagne dans l'utilisation", pageWidth / 2, yPosition, { align: "center" });
       yPosition += 7;
       doc.text("complète du tableau de bord administrateur.", pageWidth / 2, yPosition, { align: "center" });
 
       yPosition = 140;
       doc.setFontSize(11);
       doc.setFont("helvetica", "bold");
       doc.text("Table des matières", margin, yPosition);
       yPosition += 10;
 
       const sections = [
         "1. Rendez-vous",
         "2. Disponibilités",
         "3. Patterns Récurrents",
         "4. Services",
         "5. Galerie de Transformations",
         "6. Messages",
         "7. Notes et Avis",
         "8. Analytics",
         "9. Gestion Utilisateurs",
         "10. Journal d'Activité",
         "11. Historique Notifications",
         "12. Paramètres du Site",
         "13. Politique d'Annulation"
       ];
 
       doc.setFont("helvetica", "normal");
       doc.setFontSize(10);
       sections.forEach((section) => {
         doc.text(section, margin + 10, yPosition);
         yPosition += 6;
       });
 
       // Section 1: Rendez-vous
       doc.addPage();
       yPosition = margin;
       addHeader("1. Rendez-vous (Appointments)", 18);
       addSpacer(5);
       addParagraph("Cette section vous permet de gérer tous les rendez-vous de vos clients. Vous pouvez voir, filtrer, modifier et exporter les données.");
 
       addSubHeader("Voir les rendez-vous");
       addBulletPoint("Accédez à l'onglet 'Appointments' dans le menu");
       addBulletPoint("Utilisez les filtres pour afficher par statut: Tous, En attente, Confirmé, Terminé, Annulé");
       addBulletPoint("Les compteurs affichent le nombre de rendez-vous par statut");
 
       addSubHeader("Changer le statut d'un rendez-vous");
       addBulletPoint("Cliquez sur le menu d'actions (trois points) à droite du rendez-vous");
       addBulletPoint("Sélectionnez le nouveau statut souhaité");
       addBulletPoint("Le client recevra une notification automatique du changement");
 
       addSubHeader("Reprogrammer un rendez-vous");
       addBulletPoint("Cliquez sur 'Reprogrammer' dans le menu d'actions");
       addBulletPoint("Sélectionnez un nouveau créneau disponible");
       addBulletPoint("Confirmez le changement - le client sera notifié");
 
       addSubHeader("Exporter les données");
       addBulletPoint("Cliquez sur le bouton 'Exporter CSV' ou 'Exporter PDF'");
       addBulletPoint("Les données filtrées seront téléchargées");
 
       addTip("Vérifiez régulièrement les rendez-vous en attente pour les confirmer rapidement.");
 
       // Section 2: Disponibilités
       doc.addPage();
       yPosition = margin;
       addHeader("2. Disponibilités (Availability)", 18);
       addSpacer(5);
       addParagraph("Gérez les créneaux horaires pendant lesquels les clients peuvent prendre rendez-vous.");
 
       addSubHeader("Créer un créneau manuellement");
       addBulletPoint("Cliquez sur 'Ajouter un créneau'");
       addBulletPoint("Sélectionnez la date, l'heure de début et l'heure de fin");
       addBulletPoint("Définissez la capacité (nombre de clients simultanés)");
       addBulletPoint("Validez pour créer le créneau");
 
       addSubHeader("Création en masse (Bulk)");
       addBulletPoint("Cliquez sur 'Création en masse'");
       addBulletPoint("Sélectionnez une plage de dates");
       addBulletPoint("Définissez les heures et la capacité");
       addBulletPoint("Tous les créneaux seront créés automatiquement");
 
       addSubHeader("Modifier ou supprimer un créneau");
       addBulletPoint("Cliquez sur le créneau dans le calendrier");
       addBulletPoint("Modifiez les informations ou supprimez-le");
       addBulletPoint("Attention: un créneau avec réservation ne peut pas être supprimé");
 
       addSubHeader("Dupliquer un créneau");
       addBulletPoint("Sélectionnez un créneau existant");
       addBulletPoint("Cliquez sur 'Dupliquer' et choisissez la nouvelle date");
 
       addTip("Utilisez les patterns récurrents pour automatiser la création de créneaux hebdomadaires.");
 
       // Section 3: Patterns Récurrents
       doc.addPage();
       yPosition = margin;
       addHeader("3. Patterns Récurrents", 18);
       addSpacer(5);
       addParagraph("Automatisez la création de créneaux avec des modèles récurrents qui génèrent automatiquement vos disponibilités.");
 
       addSubHeader("Créer un pattern récurrent");
       addBulletPoint("Cliquez sur 'Nouveau pattern'");
       addBulletPoint("Donnez un nom au pattern (ex: 'Semaine standard')");
       addBulletPoint("Sélectionnez les jours de la semaine concernés");
       addBulletPoint("Définissez l'heure de début et de fin");
       addBulletPoint("Indiquez la capacité par créneau");
       addBulletPoint("Définissez le nombre de semaines à l'avance");
 
       addSubHeader("Activer/Désactiver un pattern");
       addBulletPoint("Utilisez le toggle à côté de chaque pattern");
       addBulletPoint("Un pattern désactivé ne génère plus de créneaux");
       addBulletPoint("Les créneaux déjà créés restent actifs");
 
       addTip("Créez différents patterns pour les périodes creuses et les périodes de forte activité.");
 
       // Section 4: Services
       doc.addPage();
       yPosition = margin;
       addHeader("4. Services", 18);
       addSpacer(5);
       addParagraph("Gérez votre catalogue de services proposés aux clients.");
 
       addSubHeader("Ajouter un nouveau service");
       addBulletPoint("Cliquez sur 'Ajouter un service'");
       addBulletPoint("Renseignez le nom du service");
       addBulletPoint("Indiquez le prix en euros");
       addBulletPoint("Choisissez une catégorie (Maquillage, Coiffure, Soins, etc.)");
       addBulletPoint("Ajoutez une description détaillée");
       addBulletPoint("Uploadez une image représentative");
 
       addSubHeader("Modifier un service");
       addBulletPoint("Cliquez sur le service à modifier");
       addBulletPoint("Mettez à jour les informations souhaitées");
       addBulletPoint("Sauvegardez les modifications");
 
       addSubHeader("Supprimer un service");
       addBulletPoint("Cliquez sur l'icône de suppression");
       addBulletPoint("Confirmez la suppression");
       addBulletPoint("Note: les rendez-vous existants ne seront pas affectés");
 
       addTip("Ajoutez des images de qualité pour mettre en valeur vos services.");
 
       // Section 5: Galerie
       doc.addPage();
       yPosition = margin;
       addHeader("5. Galerie de Transformations", 18);
       addSpacer(5);
       addParagraph("Présentez vos réalisations avec des photos avant/après pour attirer de nouveaux clients.");
 
       addSubHeader("Ajouter une transformation");
       addBulletPoint("Cliquez sur 'Ajouter une transformation'");
       addBulletPoint("Uploadez l'image 'Avant'");
       addBulletPoint("Uploadez l'image 'Après'");
       addBulletPoint("Ajoutez un titre et une description");
       addBulletPoint("Sélectionnez la catégorie");
 
       addSubHeader("Upload en masse");
       addBulletPoint("Cliquez sur 'Upload en masse'");
       addBulletPoint("Sélectionnez plusieurs paires d'images");
       addBulletPoint("Associez les images avant/après");
       addBulletPoint("Validez l'upload groupé");
 
       addSubHeader("Recadrer les images");
       addBulletPoint("Cliquez sur l'icône de recadrage");
       addBulletPoint("Ajustez le cadrage de l'image");
       addBulletPoint("Sauvegardez le recadrage");
 
       addTip("Les transformations spectaculaires attirent plus de clientes potentielles!");
 
       // Section 6: Messages
       doc.addPage();
       yPosition = margin;
       addHeader("6. Messages", 18);
       addSpacer(5);
       addParagraph("Consultez et gérez les messages envoyés par les visiteurs via le formulaire de contact.");
 
       addSubHeader("Voir les messages");
       addBulletPoint("Les nouveaux messages apparaissent en premier");
       addBulletPoint("Les messages non lus sont mis en évidence");
       addBulletPoint("Cliquez sur un message pour voir les détails");
 
       addSubHeader("Marquer comme lu/non lu");
       addBulletPoint("Cliquez sur l'icône d'enveloppe pour changer le statut");
       addBulletPoint("Les messages lus passent en gris");
 
       addSubHeader("Supprimer un message");
       addBulletPoint("Cliquez sur l'icône de suppression");
       addBulletPoint("Confirmez la suppression");
 
       addTip("Répondez rapidement aux messages pour montrer votre professionnalisme.");
 
       // Section 7: Ratings
       doc.addPage();
       yPosition = margin;
       addHeader("7. Notes et Avis (Ratings)", 18);
       addSpacer(5);
       addParagraph("Gérez les avis laissés par vos clients après leurs rendez-vous.");
 
       addSubHeader("Voir les avis");
       addBulletPoint("Tous les avis sont listés avec la note (étoiles)");
       addBulletPoint("Filtrez par note ou par service");
       addBulletPoint("Voyez les photos uploadées par les clients");
 
       addSubHeader("Répondre à un avis");
       addBulletPoint("Cliquez sur 'Répondre' sous l'avis");
       addBulletPoint("Rédigez votre réponse professionnelle");
       addBulletPoint("Votre réponse sera visible publiquement");
 
       addSubHeader("Supprimer un avis inapproprié");
       addBulletPoint("Cliquez sur 'Supprimer' si l'avis est inapproprié");
       addBulletPoint("Confirmez la suppression");
       addBulletPoint("Note: utilisez avec parcimonie");
 
       addTip("Répondez toujours aux avis négatifs de manière professionnelle et constructive.");
 
       // Section 8: Analytics
       doc.addPage();
       yPosition = margin;
       addHeader("8. Analytics", 18);
       addSpacer(5);
       addParagraph("Analysez les performances de votre activité avec des statistiques détaillées.");
 
       addSubHeader("Statistiques de réservations");
       addBulletPoint("Nombre total de rendez-vous par période");
       addBulletPoint("Répartition par statut (confirmés, annulés, etc.)");
       addBulletPoint("Services les plus populaires");
 
       addSubHeader("Graphiques de revenus");
       addBulletPoint("Évolution du chiffre d'affaires");
       addBulletPoint("Revenus par service");
       addBulletPoint("Comparaison mensuelle/annuelle");
 
       addSubHeader("Comparaison entre périodes");
       addBulletPoint("Sélectionnez deux périodes à comparer");
       addBulletPoint("Voyez l'évolution en pourcentage");
       addBulletPoint("Identifiez les tendances");
 
       addSubHeader("Export des rapports");
       addBulletPoint("Exportez en CSV pour Excel");
       addBulletPoint("Exportez en PDF pour archivage");
 
       addTip("Consultez les analytics chaque semaine pour suivre votre croissance.");
 
       // Section 9: Users
       doc.addPage();
       yPosition = margin;
       addHeader("9. Gestion Utilisateurs", 18);
       addSpacer(5);
       addParagraph("Gérez les comptes utilisateurs et les rôles administrateurs.");
 
       addSubHeader("Voir la liste des utilisateurs");
       addBulletPoint("Tous les utilisateurs inscrits sont listés");
       addBulletPoint("Recherchez par nom ou email");
       addBulletPoint("Voyez la date d'inscription");
 
       addSubHeader("Ajouter le rôle admin");
       addBulletPoint("Trouvez l'utilisateur concerné");
       addBulletPoint("Cliquez sur 'Ajouter admin'");
       addBulletPoint("L'utilisateur aura accès au dashboard");
 
       addSubHeader("Retirer le rôle admin");
       addBulletPoint("Cliquez sur 'Retirer admin'");
       addBulletPoint("L'utilisateur perdra l'accès au dashboard");
       addBulletPoint("Attention: ne vous retirez pas vous-même!");
 
       addSubHeader("Exporter la liste");
       addBulletPoint("Cliquez sur 'Exporter CSV'");
       addBulletPoint("Téléchargez la liste complète des utilisateurs");
 
       addTip("Limitez le nombre d'administrateurs pour plus de sécurité.");
 
       // Section 10: Activity Log
       doc.addPage();
       yPosition = margin;
       addHeader("10. Journal d'Activité", 18);
       addSpacer(5);
       addParagraph("Suivez toutes les actions effectuées dans le système pour un historique complet.");
 
       addSubHeader("Consulter les logs");
       addBulletPoint("Toutes les actions sont enregistrées avec date et heure");
       addBulletPoint("Filtrez par type d'action");
       addBulletPoint("Filtrez par utilisateur");
 
       addSubHeader("Types d'actions enregistrées");
       addBulletPoint("Création/modification/suppression de rendez-vous");
       addBulletPoint("Changements de statut");
       addBulletPoint("Modifications des services");
       addBulletPoint("Actions administratives");
 
       addTip("Consultez le journal en cas de problème pour comprendre ce qui s'est passé.");
 
       // Section 11: Notifications
       doc.addPage();
       yPosition = margin;
       addHeader("11. Historique Notifications", 18);
       addSpacer(5);
       addParagraph("Consultez l'historique de tous les emails et SMS envoyés aux clients.");
 
       addSubHeader("Types de notifications");
       addBulletPoint("Confirmations de rendez-vous");
       addBulletPoint("Rappels avant le rendez-vous");
       addBulletPoint("Notifications de changement de statut");
       addBulletPoint("Confirmations de paiement");
 
       addSubHeader("Statut des notifications");
       addBulletPoint("Envoyé: notification transmise avec succès");
       addBulletPoint("Échec: problème lors de l'envoi");
       addBulletPoint("En attente: notification programmée");
 
       addTip("Vérifiez régulièrement les notifications en échec.");
 
       // Section 12: Site Settings
       doc.addPage();
       yPosition = margin;
       addHeader("12. Paramètres du Site", 18);
       addSpacer(5);
       addParagraph("Modifiez les informations affichées sur le site sans toucher au code.");
 
       addSubHeader("Coordonnées");
       addBulletPoint("Numéro de téléphone affiché dans le footer");
       addBulletPoint("Adresse email de contact");
       addBulletPoint("Ces informations apparaissent sur toutes les pages");
 
       addSubHeader("Adresse");
       addBulletPoint("Adresse du salon");
       addBulletPoint("Ville et code postal");
 
       addSubHeader("Réseaux sociaux");
       addBulletPoint("Lien Instagram");
       addBulletPoint("Lien Facebook");
       addBulletPoint("Les icônes apparaissent dans le footer");
 
       addSubHeader("Heures d'ouverture");
       addBulletPoint("Définissez les horaires par jour");
       addBulletPoint("Indiquez les jours de fermeture");
 
       addTip("Mettez à jour vos horaires avant les jours fériés.");
 
       // Section 13: Cancellation Policy
       doc.addPage();
       yPosition = margin;
       addHeader("13. Politique d'Annulation", 18);
       addSpacer(5);
       addParagraph("Configurez les règles de remboursement en cas d'annulation par le client.");
 
       addSubHeader("Créer un niveau de remboursement");
       addBulletPoint("Cliquez sur 'Ajouter une règle'");
       addBulletPoint("Définissez le nombre d'heures avant le rendez-vous");
       addBulletPoint("Indiquez le pourcentage de remboursement");
       addBulletPoint("Exemple: 100% si annulation > 48h avant");
 
       addSubHeader("Modifier une règle");
       addBulletPoint("Cliquez sur la règle à modifier");
       addBulletPoint("Ajustez les heures ou le pourcentage");
       addBulletPoint("Sauvegardez les changements");
 
       addSubHeader("Activer/Désactiver une règle");
       addBulletPoint("Utilisez le toggle pour activer/désactiver");
       addBulletPoint("Les règles désactivées ne s'appliquent plus");
 
       addSubHeader("Exemple de configuration");
       addBulletPoint("Plus de 48h avant: 100% de remboursement");
       addBulletPoint("Entre 24h et 48h: 50% de remboursement");
       addBulletPoint("Moins de 24h: pas de remboursement (0%)");
 
       addTip("Une politique claire réduit les annulations de dernière minute.");
 
       // Add page numbers
       addPageNumber();
 
       // Save the PDF
       doc.save("Guide_Administration_Paola_Beauty_Glam.pdf");
 
       toast({
         title: "PDF généré avec succès",
         description: "Le guide d'administration a été téléchargé.",
       });
     } catch (error) {
       console.error("Error generating PDF:", error);
       toast({
         title: "Erreur",
         description: "Impossible de générer le PDF",
         variant: "destructive",
       });
     } finally {
       setIsGenerating(false);
     }
   };
 
   return (
     <Button
       onClick={generatePDF}
       disabled={isGenerating}
       variant="outline"
       className="gap-2"
     >
       {isGenerating ? (
         <Loader2 className="h-4 w-4 animate-spin" />
       ) : (
         <FileDown className="h-4 w-4" />
       )}
       {isGenerating ? "Génération..." : "Télécharger le Guide PDF"}
     </Button>
   );
 };