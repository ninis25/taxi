require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const app = express();
const PORT = process.env.PORT || 3000;
const frontDir = path.join(__dirname, '..', 'front');
const imagesDir = path.join(__dirname, '..', 'images');
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Clé publique Stripe (pour référence ; le front l'utilise pour redirectToCheckout)
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51R54KoQA4O745tcxaI41YdQzMx9VhoHAALOSniWP1o0RyLIzpvix5tvMrUyzlFrRRwDzKb6pi9SQv21GmfyGeiSs00lDFzcH7K';

// Transport email (Gmail) — données sensibles via process.env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || process.env.GMAIL_USER,
    pass: process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD
  }
});

// Génère le PDF de facture professionnelle avec tableau
function generateInvoicePDF(data) {
  return new Promise((resolve, reject) => {
    const { invoiceNumber, invoiceDate, nom, email, depart, destination, quantity, unitPrice, totalTTC, logoPath } = data;
    const bufs = [];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.on('data', (c) => bufs.push(c));
    doc.on('end', () => resolve(Buffer.concat(bufs)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100;

    // Logo en haut à gauche
    if (logoPath && fs.existsSync(logoPath)) {
      try { doc.image(logoPath, 50, 40, { width: 70 }); } catch (_) {}
    }

    // Titre FACTURE + infos alignées à droite
    doc.fontSize(24).fillColor('#111827').text('FACTURE', 50, 50, { align: 'right' });
    doc.fontSize(10).fillColor('#6b7280');
    doc.text(`N° ${invoiceNumber}`, 50, 80, { align: 'right' });
    doc.text(`Date : ${invoiceDate}`, 50, 95, { align: 'right' });

    // Ligne de séparation
    doc.moveTo(50, 130).lineTo(50 + pageWidth, 130).strokeColor('#e5e7eb').lineWidth(1).stroke();

    // Infos client
    doc.fontSize(12).fillColor('#111827').text('Informations client', 50, 150);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Nom : ${nom}`, 50, 170);
    doc.text(`Email : ${email}`, 50, 185);

    // Détails du trajet
    doc.fontSize(12).fillColor('#111827').text('Détails du trajet', 50, 220);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Départ : ${depart}`, 50, 240);
    doc.text(`Arrivée : ${destination}`, 50, 255);

    // Tableau des prestations
    const tableTop = 300;
    const col1 = 50;
    const col2 = 280;
    const col3 = 370;
    const col4 = 460;

    // En-tête du tableau
    doc.rect(50, tableTop, pageWidth, 25).fillColor('#111827').fill();
    doc.fontSize(10).fillColor('#ffffff');
    doc.text('Désignation', col1 + 10, tableTop + 8);
    doc.text('Qté', col2, tableTop + 8);
    doc.text('Prix unit. HT', col3, tableTop + 8);
    doc.text('Total TTC', col4, tableTop + 8);

    // Ligne du tableau (prestation)
    const row1 = tableTop + 25;
    doc.rect(50, row1, pageWidth, 30).fillColor('#fafafa').fill();
    doc.moveTo(50, row1).lineTo(50 + pageWidth, row1).strokeColor('#e5e7eb').stroke();
    doc.moveTo(50, row1 + 30).lineTo(50 + pageWidth, row1 + 30).strokeColor('#e5e7eb').stroke();
    
    doc.fontSize(10).fillColor('#111827');
    doc.text('Navette Eurosatory 2026', col1 + 10, row1 + 10);
    doc.text(String(quantity), col2, row1 + 10);
    doc.text(`${unitPrice.toFixed(2)} €`, col3, row1 + 10);
    doc.fillColor('#b3123a').text(`${totalTTC.toFixed(2)} €`, col4, row1 + 10);

    // Ligne Total
    const totalRow = row1 + 50;
    doc.moveTo(col3 - 20, totalRow).lineTo(50 + pageWidth, totalRow).strokeColor('#111827').lineWidth(2).stroke();
    doc.fontSize(12).fillColor('#111827').text('TOTAL TTC', col3, totalRow + 10);
    doc.fontSize(14).fillColor('#b3123a').text(`${totalTTC.toFixed(2)} €`, col4, totalRow + 8);

    // Pied de page
    doc.fontSize(9).fillColor('#9ca3af');
    doc.text('NCP - Transport Premium Paris', 50, 700, { align: 'center', width: pageWidth });
    doc.text('Merci pour votre confiance.', 50, 715, { align: 'center', width: pageWidth });

    doc.end();
  });
}

// Email admin pour toutes les réservations
const ADMIN_EMAIL = 'giroufua@gmail.com';

async function sendAdminNotification(data) {
  const {
    type, // 'stripe' ou 'devis'
    nom,
    email,
    telephone,
    depart,
    destination,
    date,
    heure,
    vehicule,
    passagers,
    message,
    montant,
    statut
  } = data;

  const fromEmail = process.env.EMAIL_USER || process.env.GMAIL_USER;
  if (!fromEmail) {
    console.error('[admin-notif] EMAIL_USER non configuré');
    return;
  }

  const typeLabel = type === 'stripe' ? '💳 Paiement Stripe' : '📝 Demande de réservation';
  const statutLabel = statut || (type === 'stripe' ? `Payé ${montant || '12'}€` : 'En attente de devis');

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Nouvelle Réservation NCP</title></head>
<body style="margin:0; padding:0; background:#f4f4f7; font-family:'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7; padding:24px 0;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.1);">

<!-- Header -->
<tr><td style="padding:24px 32px; background:#111827; color:#fff;">
<h1 style="margin:0; font-size:20px; font-weight:600;">🔔 Nouvelle Réservation</h1>
<p style="margin:8px 0 0; font-size:14px; color:#9ca3af;">${typeLabel}</p>
</td></tr>

<!-- Statut -->
<tr><td style="padding:16px 32px; background:${type === 'stripe' ? '#059669' : '#f59e0b'}; color:#fff;">
<span style="font-size:14px; font-weight:600;">📌 Statut : ${statutLabel}</span>
</td></tr>

<!-- Infos client -->
<tr><td style="padding:24px 32px;">
<h2 style="margin:0 0 16px; font-size:16px; color:#111827; border-bottom:2px solid #e5e7eb; padding-bottom:8px;">👤 Informations Client</h2>
<table width="100%" style="font-size:14px; color:#374151;">
<tr><td style="padding:8px 0; width:40%; color:#6b7280;">Nom</td><td style="padding:8px 0; font-weight:500;">${nom || '—'}</td></tr>
<tr><td style="padding:8px 0; color:#6b7280;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#2563eb;">${email || '—'}</a></td></tr>
${telephone ? `<tr><td style="padding:8px 0; color:#6b7280;">Téléphone</td><td style="padding:8px 0;"><a href="tel:${telephone}" style="color:#2563eb;">${telephone}</a></td></tr>` : ''}
</table>
</td></tr>

<!-- Détails du trajet -->
<tr><td style="padding:0 32px 24px;">
<h2 style="margin:0 0 16px; font-size:16px; color:#111827; border-bottom:2px solid #e5e7eb; padding-bottom:8px;">🚗 Détails du Trajet</h2>
<table width="100%" style="font-size:14px; color:#374151;">
<tr><td style="padding:8px 0; width:40%; color:#6b7280;">Départ</td><td style="padding:8px 0; font-weight:500;">${depart || '—'}</td></tr>
<tr><td style="padding:8px 0; color:#6b7280;">Destination</td><td style="padding:8px 0; font-weight:500;">${destination || '—'}</td></tr>
<tr><td style="padding:8px 0; color:#6b7280;">Date</td><td style="padding:8px 0;">${date || '—'}</td></tr>
<tr><td style="padding:8px 0; color:#6b7280;">Heure</td><td style="padding:8px 0;">${heure || '—'}</td></tr>
${vehicule ? `<tr><td style="padding:8px 0; color:#6b7280;">Véhicule</td><td style="padding:8px 0;">${vehicule}</td></tr>` : ''}
${passagers ? `<tr><td style="padding:8px 0; color:#6b7280;">Passagers</td><td style="padding:8px 0;">${passagers}</td></tr>` : ''}
</table>
</td></tr>

${message ? `
<!-- Message client -->
<tr><td style="padding:0 32px 24px;">
<h2 style="margin:0 0 12px; font-size:16px; color:#111827; border-bottom:2px solid #e5e7eb; padding-bottom:8px;">💬 Message</h2>
<p style="margin:0; font-size:14px; color:#374151; background:#f9fafb; padding:12px; border-radius:8px; border-left:4px solid #b3123a;">${message}</p>
</td></tr>
` : ''}

<!-- Footer -->
<tr><td style="padding:16px 32px; background:#f9fafb; border-top:1px solid #e5e7eb;">
<p style="margin:0; font-size:12px; color:#6b7280;">Email envoyé automatiquement par le système NCP</p>
<p style="margin:4px 0 0; font-size:11px; color:#9ca3af;">${new Date().toLocaleString('fr-FR')}</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"NCP Système" <${fromEmail}>`,
      to: ADMIN_EMAIL,
      subject: `🔔 NOUVELLE RÉSERVATION - ${nom || 'Client'}`,
      html: htmlContent
    });
    console.log('[admin-notif] Notification envoyée à', ADMIN_EMAIL, 'pour', nom);
  } catch (err) {
    console.error('[admin-notif] Erreur envoi:', err.message);
  }
}

// Webhook Stripe : doit recevoir le body brut pour la signature (AVANT bodyParser)
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET manquant');
    return res.status(500).send('Webhook non configuré');
  }
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] Signature invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type !== 'checkout.session.completed') {
    return res.json({ received: true });
  }

  const session = event.data.object;
  const sessionId = session.id;

  try {
    // Récupération des infos Stripe (charge pour receipt_url)
    const sessionWithCharge = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent.latest_charge']
    });
    const receiptUrl = sessionWithCharge.payment_intent?.latest_charge?.receipt_url || null;
    
    // Données client et trajet depuis les metadata
    const customerEmail = session.customer_email || session.customer_details?.email || session.metadata?.reservation_email;
    const nom = session.metadata?.reservation_nom || 'Client';
    const depart = session.metadata?.reservation_depart || '—';
    const destination = session.metadata?.reservation_destination || 'Eurosatory';
    const dateTrajet = session.metadata?.reservation_date || new Date().toLocaleDateString('fr-FR');
    const heureTrajet = session.metadata?.reservation_heure || '—';

    // Config email
    const fromEmail = process.env.EMAIL_USER || process.env.GMAIL_USER;
    if (!fromEmail || !(process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD)) {
      console.error('[webhook] Configuration email manquante (EMAIL_USER/EMAIL_PASS ou GMAIL_USER/GMAIL_APP_PASSWORD)');
      return res.status(500).send('Configuration email manquante');
    }
    if (!customerEmail) {
      console.error('[webhook] Pas d\'email client pour la session', sessionId);
      return res.json({ received: true });
    }

    let logoBase64 = '';
    const logoPath = path.join(imagesDir, 'logo-light.png');
    if (fs.existsSync(logoPath)) {
      logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
    } else {
      const altPath = path.join(frontDir, 'images', 'logo-light.png');
      if (fs.existsSync(altPath)) logoBase64 = fs.readFileSync(altPath, { encoding: 'base64' });
    }
    const logoDataUri = logoBase64 ? `data:image/png;base64,${logoBase64}` : '';

    // ═══════════════════════════════════════════════════════════════
    // MAIL N°1 : Confirmation de réservation (visuel, accueillant)
    // ═══════════════════════════════════════════════════════════════
    const htmlConfirmation = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Votre voyage NCP est confirmé</title></head>
<body style="margin:0; padding:0; background:#f4f4f7; font-family:'Segoe UI',Roboto,sans-serif; color:#141414;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7; padding:32px 0;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 12px 40px rgba(15,23,42,0.12);">

<!-- Header avec logo -->
<tr><td align="center" style="padding:40px 32px 24px; background:linear-gradient(135deg,#050814 0%,#1b0a16 100%);">
${logoDataUri ? `<img src="${logoDataUri}" alt="NCP" width="80" height="80" style="display:block; margin:0 auto 16px; border-radius:20px; box-shadow:0 8px 24px rgba(0,0,0,0.3);" />` : ''}
<p style="margin:0 0 8px 0; font-size:13px; letter-spacing:0.2em; text-transform:uppercase; color:rgba(255,255,255,0.6);">Confirmation de réservation</p>
<h1 style="margin:0; font-size:26px; color:#fff; font-weight:600; line-height:1.3;">🥂 Bienvenue à bord, ${nom} !</h1>
</td></tr>

<!-- Message de bienvenue -->
<tr><td style="padding:32px 32px 16px;">
<p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#374151;">
Votre paiement a été confirmé avec succès. Nous avons hâte de vous accompagner pour votre prochain voyage premium.
</p>
<p style="margin:0; font-size:14px; color:#6b7280;">
Notre équipe vous contactera sous 2h pour confirmer les derniers détails.
</p>
</td></tr>

<!-- Récapitulatif du trajet -->
<tr><td style="padding:0 32px 32px;">
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:linear-gradient(135deg,#fafafa,#f3f4f6); border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
<tr><td colspan="2" style="padding:16px 20px; background:#111827; color:#fff;">
<span style="font-size:12px; letter-spacing:0.15em; text-transform:uppercase; font-weight:600;">📍 Votre trajet</span>
</td></tr>
<tr>
<td style="padding:14px 20px; font-size:13px; color:#6b7280; border-bottom:1px solid #e5e7eb; width:35%;">Date</td>
<td style="padding:14px 20px; font-size:14px; color:#111827; font-weight:500; border-bottom:1px solid #e5e7eb;">${dateTrajet}</td>
</tr>
<tr>
<td style="padding:14px 20px; font-size:13px; color:#6b7280; border-bottom:1px solid #e5e7eb;">Heure</td>
<td style="padding:14px 20px; font-size:14px; color:#111827; font-weight:500; border-bottom:1px solid #e5e7eb;">${heureTrajet}</td>
</tr>
<tr>
<td style="padding:14px 20px; font-size:13px; color:#6b7280; border-bottom:1px solid #e5e7eb;">Lieu de départ</td>
<td style="padding:14px 20px; font-size:14px; color:#111827; font-weight:500; border-bottom:1px solid #e5e7eb;">${depart}</td>
</tr>
<tr>
<td style="padding:14px 20px; font-size:13px; color:#6b7280; border-bottom:1px solid #e5e7eb;">Destination</td>
<td style="padding:14px 20px; font-size:14px; color:#111827; font-weight:500; border-bottom:1px solid #e5e7eb;">${destination}</td>
</tr>
<tr>
<td style="padding:14px 20px; font-size:13px; color:#6b7280;">Montant payé</td>
<td style="padding:14px 20px; font-size:16px; color:#b3123a; font-weight:700;">12,00 €</td>
</tr>
</table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 32px; border-top:1px solid #e5e7eb; background:#f9fafb;">
<p style="margin:0 0 8px; font-size:13px; color:#6b7280;">À très bientôt,</p>
<p style="margin:0; font-size:14px; color:#111827; font-weight:600;">L'équipe NCP</p>
<p style="margin:12px 0 0; font-size:11px; color:#9ca3af;">Transport Premium Paris • contact@ncp.fr</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"NCP Transport" <${fromEmail}>`,
      to: customerEmail,
      subject: '🥂 Votre voyage avec NCP est confirmé !',
      html: htmlConfirmation
    });
    console.log('[webhook] Mail 1 (confirmation) envoyé à', customerEmail);

    // ═══════════════════════════════════════════════════════════════
    // MAIL N°2 : Facture officielle (PDF en pièce jointe)
    // ═══════════════════════════════════════════════════════════════
    const invoiceNumber = `NCP-${Date.now()}`;
    const invoiceDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const quantity = 1;
    const unitPrice = 12.00;
    const totalTTC = quantity * unitPrice;

    // Génération du PDF professionnel avec tableau
    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber,
      invoiceDate,
      nom,
      email: customerEmail,
      depart,
      destination,
      quantity,
      unitPrice,
      totalTTC,
      logoPath
    });

    // Corps du mail sobre et professionnel
    let invoiceBody = `Bonjour ${nom},

Nous vous confirmons que votre paiement de ${totalTTC.toFixed(2)} € a bien été reçu.

Veuillez trouver ci-joint votre facture officielle N° ${invoiceNumber}.`;

    if (receiptUrl) {
      invoiceBody += `

📄 Reçu de paiement Stripe : ${receiptUrl}`;
    }

    invoiceBody += `

Merci pour votre confiance.

Cordialement,
L'équipe NCP
Transport Premium Paris`;

    await transporter.sendMail({
      from: `"NCP Transport" <${fromEmail}>`,
      to: customerEmail,
      subject: `Facture N° ${invoiceNumber} - Votre trajet NCP`,
      text: invoiceBody,
      attachments: [{
        filename: `Facture-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
    console.log('[webhook] Mail 2 (facture PDF) envoyé à', customerEmail);

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATION ADMIN : Copie de la réservation payée
    // ═══════════════════════════════════════════════════════════════
    await sendAdminNotification({
      type: 'stripe',
      nom,
      email: customerEmail,
      depart,
      destination,
      date: dateTrajet,
      heure: heureTrajet,
      montant: '12',
      statut: 'Payé 12€ via Stripe'
    });

    console.log('[webhook] ✅ Tous les emails envoyés pour session', sessionId);
  } catch (err) {
    console.error('[webhook] Erreur traitement checkout.session.completed:', err);
    return res.status(500).send('Erreur traitement webhook');
  }
  res.json({ received: true });
});

// Parser pour JSON et formulaires (application/x-www-form-urlencoded)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Fichiers statiques (CSS, JS, images, etc.) depuis front/
app.use(express.static(frontDir));

// Routes GET pour chaque page (sans extension .html dans l'URL publique)
app.get('/', (req, res) => {
  res.sendFile(path.join(frontDir, 'index.html'));
});

app.get('/reservation', (req, res) => {
  res.sendFile(path.join(frontDir, 'reservation.html'));
});

app.get('/services', (req, res) => {
  res.sendFile(path.join(frontDir, 'services.html'));
});

app.get('/vehicules', (req, res) => {
  res.sendFile(path.join(frontDir, 'vehicules.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(frontDir, 'contact.html'));
});

app.get('/reims', (req, res) => {
  // Conserver les éventuels query strings lors de la redirection
  const query = req.url.split('?')[1];
  const target = query ? `/destinations?${query}` : '/destinations';
  res.redirect(301, target);
});
app.get('/destinations', (req, res) => {
  res.sendFile(path.join(frontDir, 'destinations.html'));
});

app.get('/checkout-eurosatory', (req, res) => {
  res.sendFile(path.join(frontDir, 'checkout-eurosatory.html'));
});

// Handler commun pour la navette Eurosatory (Stripe Checkout 12€ / passager)
async function handleEurosatoryCheckout(req, res) {
  console.log('[eurosatory-checkout] Requête POST reçue', {
    body: req.body,
    headers: req.headers['content-type']
  });

  if (!stripe || !process.env.STRIPE_SECRET_KEY) {
    console.error('[eurosatory-checkout] STRIPE_SECRET_KEY manquant');
    return res.status(500).json({ error: 'Configuration Stripe manquante.' });
  }

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: 'Configuration Stripe manquante (STRIPE_SECRET_KEY).' });
    }

    const passengersRaw = req.body && parseInt(req.body.passengers, 10);
    const passengers = Number.isFinite(passengersRaw) && passengersRaw > 0 ? passengersRaw : 1;
    const hotel = req.body && req.body.hotel;
    const nom = req.body && (req.body.nom || '').trim();
    const email = req.body && (req.body.email || '').trim();
    const depart = req.body && (req.body.depart || '').trim();
    const destination = req.body && (req.body.destination || req.body.arrivee || '').trim();
    const dateTrajet = req.body && (req.body.date || '').trim();
    const heureTrajet = req.body && (req.body.heure || '').trim();

    // Métadonnées : détails du trajet pour les retrouver dans le webhook
    const metadata = {};
    if (nom) metadata.reservation_nom = nom;
    if (email) metadata.reservation_email = email;
    if (depart) metadata.reservation_depart = depart;
    if (destination) metadata.reservation_destination = destination;
    if (dateTrajet) metadata.reservation_date = dateTrajet;
    if (heureTrajet) metadata.reservation_heure = heureTrajet;
    if (hotel) metadata.hotel = hotel;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: passengers,
          price_data: {
            currency: 'eur',
            unit_amount: 1200, // 12 € = 1200 centimes
            product_data: {
              name: 'Navette Eurosatory 2026',
              description: 'Trajet navette premium (Oceania / Nomad → Eurosatory)',
              images: []
            }
          }
        }
      ],
      customer_email: email || undefined,
      success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/reservation.html`,
      metadata: Object.keys(metadata).length ? metadata : undefined
    });

    console.log('[eurosatory-checkout] Session créée', {
      id: session.id,
      url: session.url,
      passengers,
      hotel,
      nom: nom || undefined,
      email: email || undefined
    });
    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[eurosatory-checkout] Erreur Stripe:', err.message);
    return res.status(500).json({
      error: err.message || 'Erreur lors de la création de la session de paiement.'
    });
  }
}

// Ancienne route conservée pour compatibilité
app.post('/create-checkout-session', handleEurosatoryCheckout);

// Nouvelle route API officielle pour Eurosatory
app.post('/api/stripe/eurosatory', handleEurosatoryCheckout);

// POST /api/reservation : reçoit le formulaire et envoie les 2 emails
app.post('/api/reservation', async (req, res) => {
  const { nom, email, telephone, vehicule, date, heure, depart, destination, passagers, message } = req.body;

  if (!nom || !email || !telephone || !vehicule || !date || !heure || !depart || !destination) {
    return res.status(400).json({
      success: false,
      message: 'Champs obligatoires manquants : nom, email, téléphone, véhicule, date, heure, départ, destination.'
    });
  }

  const fromEmail = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const hasPrimaryCreds = process.env.EMAIL_USER && process.env.EMAIL_PASS;
  const hasLegacyCreds = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;

  if (!hasPrimaryCreds && !hasLegacyCreds) {
    console.error('EMAIL_USER/EMAIL_PASS ou GMAIL_USER/GMAIL_APP_PASSWORD doivent être définis (variables d\'environnement).');
    return res.status(500).json({ success: false, message: 'Configuration email manquante.' });
  }

  const details = `
Nouvelle réservation NCP

Nom : ${nom}
Email : ${email}
Téléphone : ${telephone}
Véhicule : ${vehicule}
Date : ${date}
Heure : ${heure}
Lieu de départ : ${depart}
Destination : ${destination}
${passagers ? `Nombre de passagers : ${passagers}` : ''}
${message ? `Message : ${message}` : ''}
  `.trim();

  const confirmationBody = `
Bonjour ${nom},

Nous avons bien reçu votre demande de réservation pour le ${date} à ${heure}.

Récapitulatif :
- Véhicule : ${vehicule}
- Départ : ${depart}
- Destination : ${destination}

Notre équipe vous confirmera votre trajet sous 2 heures maximum par SMS et email avec l'heure exacte, l'immatriculation du véhicule et le nom de votre chauffeur.

À très bientôt,
L'équipe NCP
  `.trim();

  const htmlConfirmationBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Confirmation de réservation - NCP</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#141414;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7; padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 35px rgba(15,23,42,0.15);">
                    <tr>
                        <td align="center" style="padding:28px 32px 12px 32px; background:linear-gradient(135deg,#050814,#1b0a16);">
                            <img src="" alt="NCP - Chauffeur privé" width="80" height="80" style="display:block; border:0; outline:none; text-decoration:none; margin:0 auto 12px auto; border-radius:24px;">
                            <p style="margin:0; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:rgba(255,255,255,0.65);">Confirmation de réservation</p>
                            <h1 style="margin:10px 0 0 0; font-size:22px; line-height:1.3; color:#ffffff; font-weight:600;">Merci pour votre réservation, ${nom}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 32px 8px 32px;">
                            <p style="margin:0 0 12px 0; font-size:14px; line-height:1.6; color:#111827;">
                                Nous avons bien reçu votre demande de trajet premium avec NCP.
                            </p>
                            <p style="margin:0 0 16px 0; font-size:13px; line-height:1.6; color:#374151;">
                                Notre équipe va confirmer votre réservation sous 2&nbsp;heures maximum par SMS et email avec l'heure exacte, l'immatriculation du véhicule et le nom de votre chauffeur.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:8px 32px 24px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#fafafa; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb;">
                                <tr>
                                    <td colspan="2" style="padding:14px 18px; background:#111827; color:#ffffff; font-size:13px; letter-spacing:0.16em; text-transform:uppercase;">
                                        Récapitulatif de votre trajet
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 18px; font-size:13px; color:#6b7280; width:40%;">Date</td>
                                    <td style="padding:10px 18px; font-size:13px; color:#111827;">${date}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 18px; font-size:13px; color:#6b7280;">Heure</td>
                                    <td style="padding:10px 18px; font-size:13px; color:#111827;">${heure}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 18px; font-size:13px; color:#6b7280;">Véhicule</td>
                                    <td style="padding:10px 18px; font-size:13px; color:#111827;">${vehicule}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 18px; font-size:13px; color:#6b7280;">Lieu de départ</td>
                                    <td style="padding:10px 18px; font-size:13px; color:#111827;">${depart}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 18px; font-size:13px; color:#6b7280;">Destination</td>
                                    <td style="padding:10px 18px; font-size:13px; color:#111827;">${destination}</td>
                                </tr>
                                ${passagers ? `
                                <tr>
                                    <td style="padding:10px 18px; font-size:13px; color:#6b7280;">Passagers</td>
                                    <td style="padding:10px 18px; font-size:13px; color:#111827;">${passagers}</td>
                                </tr>` : ''}
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 24px 32px;">
                            <p style="margin:0 0 18px 0; font-size:13px; line-height:1.6; color:#374151;">
                                Si vous avez la moindre question ou une demande spécifique (siège bébé, bagages volumineux, arrêt intermédiaire…), notre équipe est disponible pour ajuster votre trajet.
                            </p>
                            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;">
                                <tr>
                                    <td align="left">
                                        <a href="mailto:contact@ncp.fr?subject=Support%20NCP%20-%20${encodeURIComponent(nom || '')}" style="display:inline-block; background-color:#b3123a; color:#ffffff; padding:10px 20px; font-size:13px; font-weight:600; text-decoration:none; border-radius:999px;">
                                            Contacter le support
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb; background-color:#f9fafb;">
                            <p style="margin:0 0 8px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.16em; color:#6b7280;">Suivez NCP</p>
                            <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280;">
                                Instagram&nbsp;|&nbsp;LinkedIn&nbsp;|&nbsp;Facebook
                            </p>
                            <p style="margin:0; font-size:11px; color:#9ca3af;">
                                Vous recevez cet email car vous avez effectué une demande de réservation auprès de NCP.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();

  try {
    // 1. Email à l'administrateur (contact@ncp.fr)
    await transporter.sendMail({
      from: fromEmail,
      to: 'contact@ncp.fr',
      subject: `[NCP] Nouvelle réservation - ${nom} - ${date} ${heure}`,
      text: details
    });

    // 2. Email de confirmation au client (version HTML premium uniquement)
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: 'NCP - Confirmation de votre réservation',
      html: htmlConfirmationBody
    });

    // 3. Notification admin (giroufua@gmail.com) - réservation gratuite/devis
    await sendAdminNotification({
      type: 'devis',
      nom,
      email,
      telephone,
      depart,
      destination,
      date,
      heure,
      vehicule,
      passagers,
      message,
      statut: 'En attente de devis'
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur envoi email:', err);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi des emails.'
    });
  }
});

// POST /api/send-confirmation : envoie un email de confirmation simple
// Peut être utilisé pour d'autres formulaires (contact, navettes, etc.)
app.post('/api/send-confirmation', async (req, res) => {
  const { nom, email, sujet, message, contexte } = req.body || {};

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Adresse email manquante.'
    });
  }

  const fromEmail = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const hasPrimaryCreds = process.env.EMAIL_USER && process.env.EMAIL_PASS;
  const hasLegacyCreds = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;

  if (!hasPrimaryCreds && !hasLegacyCreds) {
    console.error('EMAIL_USER/EMAIL_PASS ou GMAIL_USER/GMAIL_APP_PASSWORD doivent être définis (variables d\'environnement).');
    return res.status(500).json({ success: false, message: 'Configuration email manquante.' });
  }

  const displayName = nom || 'Client NCP';
  const subject = sujet || 'NCP - Confirmation de votre demande';

  const textBody = `
Bonjour ${displayName},

Nous avons bien reçu votre demande${contexte ? ` concernant : ${contexte}` : ''}.

${message ? `Message :\n${message}\n\n` : ''}
Notre équipe vous recontactera dans les plus brefs délais pour finaliser les détails.

À très bientôt,
L'équipe NCP
  `.trim();

  const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>${subject}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#141414;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7; padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 35px rgba(15,23,42,0.15);">
                    <tr>
                        <td align="center" style="padding:28px 32px 12px 32px; background:linear-gradient(135deg,#050814,#1b0a16);">
                            <img src="data:image/png;base64,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" alt="NCP - Chauffeur privé" width="80" height="80" style="display:block; border:0; outline:none; text-decoration:none; margin:0 auto 12px auto; border-radius:24px;">
                            <p style="margin:0; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:rgba(255,255,255,0.65);">Confirmation de demande</p>
                            <h1 style="margin:10px 0 0 0; font-size:22px; line-height:1.3; color:#ffffff; font-weight:600;">Merci pour votre message, ${displayName}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 32px 8px 32px;">
                            <p style="margin:0 0 12px 0; font-size:14px; line-height:1.6; color:#111827;">
                                Nous avons bien reçu votre demande${contexte ? ` concernant : <strong>${contexte}</strong>` : ''}.
                            </p>
                            <p style="margin:0 0 16px 0; font-size:13px; line-height:1.6; color:#374151;">
                                Notre équipe vous recontactera dans les plus brefs délais pour finaliser les détails et répondre à vos questions.
                            </p>
                        </td>
                    </tr>
                    ${message ? `
                    <tr>
                        <td style="padding:8px 32px 24px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#fafafa; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb;">
                                <tr>
                                    <td style="padding:14px 18px; background:#111827; color:#ffffff; font-size:13px; letter-spacing:0.16em; text-transform:uppercase;">
                                        Votre message
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 18px; font-size:13px; color:#111827; white-space:pre-line;">
                                        ${message}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>` : ''}
                    <tr>
                        <td style="padding:0 32px 24px 32px;">
                            <p style="margin:0 0 18px 0; font-size:13px; line-height:1.6; color:#374151;">
                                Pour toute précision complémentaire, notre support reste disponible pour ajuster votre demande.
                            </p>
                            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;">
                                <tr>
                                    <td align="left">
                                        <a href="mailto:contact@ncp.fr?subject=Support%20NCP%20-%20${encodeURIComponent(displayName || '')}" style="display:inline-block; background-color:#b3123a; color:#ffffff; padding:10px 20px; font-size:13px; font-weight:600; text-decoration:none; border-radius:999px;">
                                            Contacter le support
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 32px 24px 32px; border-top:1px solid #e5e7eb; background-color:#f9fafb;">
                            <p style="margin:0 0 8px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.16em; color:#6b7280;">Suivez NCP</p>
                            <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280;">
                                Instagram&nbsp;|&nbsp;LinkedIn&nbsp;|&nbsp;Facebook
                            </p>
                            <p style="margin:0; font-size:11px; color:#9ca3af;">
                                Vous recevez cet email car vous avez effectué une demande auprès de NCP.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject,
      html: htmlBody
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur envoi email /api/send-confirmation:', err);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de l\'email de confirmation.'
    });
  }
});

const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Serveur démarré sur http://${HOST}:${PORT}`);
});
