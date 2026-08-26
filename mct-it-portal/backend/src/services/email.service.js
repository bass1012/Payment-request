const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Envoie un email de demande de validation à un valideur
 */
async function sendValidationRequestEmail({ to, validatorName, request, requesterName, departmentName, stepLabel, frontendUrl }) {
  const subject = `[MCT IT] Demande ${request.reference} en attente de votre validation`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #1a3c6e; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; font-size: 13px; opacity: .8; }
  .body { padding: 32px; }
  .info-block { background: #f0f4f8; border-left: 4px solid #1a3c6e; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
  .info-block table { width: 100%; border-collapse: collapse; }
  .info-block td { padding: 4px 0; font-size: 14px; }
  .info-block td:first-child { font-weight: bold; width: 140px; color: #555; }
  .btn { display: inline-block; background: #1a3c6e; color: #fff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 20px 0; }
  .footer { padding: 16px 32px; background: #f0f4f8; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>ERP NATIF MCT</h1>
    <p>Système de gestion des demandes informatiques</p>
  </div>
  <div class="body">
    <p>Bonjour <strong>${validatorName}</strong>,</p>
    <p>Une demande informatique nécessite votre validation à l'étape : <strong>${stepLabel}</strong>.</p>
    <div class="info-block">
      <table>
        <tr><td>Référence</td><td>${request.reference}</td></tr>
        <tr><td>Type</td><td>${getTypeLabel(request.type)}</td></tr>
        <tr><td>Demandeur</td><td>${requesterName}</td></tr>
        <tr><td>Département</td><td>${departmentName || '—'}</td></tr>
        <tr><td>Date de dépôt</td><td>${formatDate(request.createdAt)}</td></tr>
      </table>
    </div>
    ${request.type === 'ENR_SI_008' ? `
      <div style="background: #eef2f7; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #1e3a8a; border-radius: 4px;">
        <strong>NB :</strong> Un délai de 5 jours ouvrés est requis pour la livraison du matériel à compter de la réception de la dernière validation (après la validation de la Direction Générale).
      </div>
    ` : ''}
    <a href="${frontendUrl}/requests/${request.id}" class="btn">Accéder à la demande</a>
    <p style="font-size:13px;color:#666;">Ou copiez ce lien dans votre navigateur :<br>${frontendUrl}/requests/${request.id}</p>
  </div>
  <div class="footer">
    Service Informatique MCT — bassirou.ouedraogo@mct.ci<br>
    Cet email a été généré automatiquement par ERP NATIF MCT.
  </div>
</div>
</body></html>`;

  return sendEmail({ to, subject, html });
}

/**
 * Envoie un email de notification de rejet au demandeur
 */
async function sendRejectionEmail({ to, requesterName, request, rejectorName, rejectionReason, frontendUrl }) {
  const subject = `[MCT IT] Votre demande ${request.reference} a été rejetée`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #c0392b; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 20px; }
  .info-block { background: #fdf0ee; border-left: 4px solid #c0392b; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
  .info-block table { width: 100%; border-collapse: collapse; }
  .info-block td { padding: 4px 0; font-size: 14px; }
  .info-block td:first-child { font-weight: bold; width: 140px; color: #555; }
  .body { padding: 32px; }
  .btn { display: inline-block; background: #1a3c6e; color: #fff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 20px 0; }
  .footer { padding: 16px 32px; background: #f0f4f8; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0; }
</style></head>
<body>
<div class="container">
  <div class="header"><h1>Demande rejetée</h1></div>
  <div class="body">
    <p>Bonjour <strong>${requesterName}</strong>,</p>
    <p>Votre demande <strong>${request.reference}</strong> a été <strong>rejetée</strong> par ${rejectorName}.</p>
    <div class="info-block">
      <table>
        <tr><td>Référence</td><td>${request.reference}</td></tr>
        <tr><td>Type</td><td>${getTypeLabel(request.type)}</td></tr>
        <tr><td>Rejeté par</td><td>${rejectorName}</td></tr>
        <tr><td>Motif</td><td>${rejectionReason || '—'}</td></tr>
      </table>
    </div>
    <p>Vous pouvez soumettre une nouvelle demande corrigée depuis la plateforme.</p>
    <a href="${frontendUrl}/requests/new" class="btn">Nouvelle demande</a>
  </div>
  <div class="footer">Service Informatique MCT — bassirou.ouedraogo@mct.ci</div>
</div>
</body></html>`;

  return sendEmail({ to, subject, html });
}

/**
 * Envoie un email de clôture au demandeur
 */
async function sendClosureEmail({ to, requesterName, request, closureNote, frontendUrl }) {
  const subject = `[MCT IT] Votre demande ${request.reference} a été traitée`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #27ae60; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 20px; }
  .info-block { background: #eafaf1; border-left: 4px solid #27ae60; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
  .info-block table { width: 100%; border-collapse: collapse; }
  .info-block td { padding: 4px 0; font-size: 14px; }
  .info-block td:first-child { font-weight: bold; width: 140px; color: #555; }
  .body { padding: 32px; }
  .btn { display: inline-block; background: #1a3c6e; color: #fff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 20px 0; }
  .footer { padding: 16px 32px; background: #f0f4f8; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0; }
</style></head>
<body>
<div class="container">
  <div class="header"><h1>Demande traitée</h1></div>
  <div class="body">
    <p>Bonjour <strong>${requesterName}</strong>,</p>
    <p>Votre demande <strong>${request.reference}</strong> a été <strong>traitée et clôturée</strong> par le Service Informatique MCT.</p>
    <div class="info-block">
      <table>
        <tr><td>Référence</td><td>${request.reference}</td></tr>
        <tr><td>Type</td><td>${getTypeLabel(request.type)}</td></tr>
        <tr><td>Clôturé le</td><td>${formatDate(new Date())}</td></tr>
        ${closureNote ? `<tr><td>Note</td><td>${closureNote}</td></tr>` : ''}
      </table>
    </div>
    <a href="${frontendUrl}/requests/${request.id}" class="btn">Voir la demande</a>
  </div>
  <div class="footer">Service Informatique MCT — bassirou.ouedraogo@mct.ci</div>
</div>
</body></html>`;

  return sendEmail({ to, subject, html });
}

/**
 * Envoi générique
 */
async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter();
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (err) {
    logger.error('email.send_failed', { error: err });
    return { success: false, error: err.message };
  }
}

/**
 * Envoie un email de notification de paiement effectué à tous les acteurs impliqués
 */
async function sendPaymentCompletedEmail({ toList, request, requesterName, departmentName, paymentAmount, paymentReference, frontendUrl }) {
  const subject = `[MCT PAIEMENT] Règlement effectué pour la demande ${request.reference}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #6c5ce7; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 20px; }
  .body { padding: 32px; }
  .info-block { background: #f8f9fa; border-left: 4px solid #6c5ce7; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
  .info-block table { width: 100%; border-collapse: collapse; }
  .info-block td { padding: 4px 0; font-size: 14px; }
  .info-block td:first-child { font-weight: bold; width: 140px; color: #555; }
  .btn { display: inline-block; background: #6c5ce7; color: #fff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 20px 0; }
  .footer { padding: 16px 32px; background: #f0f4f8; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>Règlement Effectué</h1>
  </div>
  <div class="body">
    <p>Bonjour,</p>
    <p>Nous vous informons que le règlement financier a été <strong>effectué et validé</strong> par la Trésorerie pour la demande suivante :</p>
    <div class="info-block">
      <table>
        <tr><td>Référence</td><td>${request.reference}</td></tr>
        <tr><td>Type</td><td>${getTypeLabel(request.type)}</td></tr>
        <tr><td>Demandeur</td><td>${requesterName}</td></tr>
        <tr><td>Département</td><td>${departmentName || '—'}</td></tr>
        <tr><td>Montant réglé</td><td><strong>${paymentAmount ? paymentAmount.toLocaleString('fr-FR') : '—'} FCFA</strong></td></tr>
        <tr><td>Référence transaction</td><td>${paymentReference || '—'}</td></tr>
        <tr><td>Date du règlement</td><td>${formatDate(new Date())}</td></tr>
      </table>
    </div>
    <a href="${frontendUrl}/requests/${request.id}" class="btn">Consulter le dossier</a>
  </div>
  <div class="footer">
    Service Financier MCT — tvbusiness6@gmail.com<br>
    Cet email a été généré automatiquement par MCT Portal.
  </div>
</div>
</body></html>`;

  const to = toList.join(', ');
  return sendEmail({ to, subject, html });
}

function getTypeLabel(type) {
  const labels = {
    ENR_SI_005: 'Création d\'adresse électronique (ENR.SI.005)',
    ENR_SI_006: 'Demande d\'impression couleur (ENR.SI.006)',
    ENR_SI_008: 'Demande d\'actifs informatiques (ENR.SI.008)',
    ENR_RF_002: 'Bon de Caisse (ENR.RF.002)',
    ENR_GA_003: 'Demande d\'approvisionnement (ENR.GA.003)',
    AUTRE: 'Autre demande IT',
  };
  return labels[type] || type;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function sendSlaNotificationEmail({ to, level, request, stepLabel, overdueBusinessDays, frontendUrl }) {
  const isEscalation = level === 'ESCALATION';
  const subject = isEscalation
    ? `[MCT SLA] Escalade — demande ${request.reference}`
    : `[MCT SLA] Relance — demande ${request.reference}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937">
      <h2>${isEscalation ? 'Escalade de délai' : 'Relance de validation'}</h2>
      <p>La demande <strong>${request.reference}</strong> est en retard de
      <strong>${overdueBusinessDays} jour(s) ouvré(s)</strong>.</p>
      <p>Étape bloquante : <strong>${stepLabel}</strong>.</p>
      <p><a href="${frontendUrl}/requests/${request.id}">Consulter la demande</a></p>
    </div>`;
  return sendEmail({ to, subject, html });
}

module.exports = {
  sendValidationRequestEmail,
  sendRejectionEmail,
  sendClosureEmail,
  sendVerificationEmail,
  sendTreasuryNotificationEmail,
  sendPaymentCompletedEmail,
  sendMemoToMoyensGenerauxEmail,
  sendRequestTreatedNoticeToSigners,
  sendSlaNotificationEmail,
};

/**
 * Envoie un email de vérification de compte
 */
async function sendVerificationEmail({ to, firstName, verifyUrl }) {
  const subject = '[ERP NATIF MCT] Vérifiez votre adresse email';
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #1a3c6e; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 20px; }
  .body { padding: 32px; }
  .btn { display: inline-block; background: #1a3c6e; color: #fff !important; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 24px 0; }
  .footer { padding: 16px 32px; background: #f0f4f8; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0; }
</style></head>
<body>
<div class="container">
  <div class="header"><h1>ERP NATIF MCT</h1></div>
  <div class="body">
    <p>Bonjour <strong>${firstName}</strong>,</p>
    <p>Merci pour votre inscription sur le portail IT de MCT. Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.</p>
    <a href="${verifyUrl}" class="btn">Vérifier mon adresse email</a>
    <p style="color:#888;font-size:13px;">Ce lien est valable <strong>24 heures</strong>. Si vous n'avez pas créé de compte, ignorez cet email.</p>
    <p style="color:#aaa;font-size:12px;word-break:break-all;">Ou copiez ce lien : ${verifyUrl}</p>
  </div>
  <div class="footer">MCT — Maintenance Climatisation Technique</div>
</div>
</body></html>`;

  const t = getTransporter();
  try {
    await t.sendMail({ from: `"ERP NATIF MCT" <${process.env.SMTP_USER}>`, to, subject, html });
    return { success: true };
  } catch (e) {
    logger.error('email.verification_send_failed', { error: e });
    return { success: false, error: e.message };
  }
}

/**
 * Envoie un email de notification de paiement à la Trésorerie
 */
async function sendTreasuryNotificationEmail({ to, treasurerName, request, requesterName, departmentName, frontendUrl }) {
  const subject = `[MCT PAIEMENT] Demande ${request.reference} validée — Prête pour paiement`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #2c3e50; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 20px; }
  .body { padding: 32px; }
  .info-block { background: #f8f9fa; border-left: 4px solid #2c3e50; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
  .info-block table { width: 100%; border-collapse: collapse; }
  .info-block td { padding: 4px 0; font-size: 14px; }
  .info-block td:first-child { font-weight: bold; width: 140px; color: #555; }
  .btn { display: inline-block; background: #2c3e50; color: #fff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 20px 0; }
  .footer { padding: 16px 32px; background: #f0f4f8; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>ERP NATIF MCT — Notification de Paiement</h1>
  </div>
  <div class="body">
    <p>Bonjour <strong>${treasurerName}</strong>,</p>
    <p>Nous vous informons que la demande suivante a reçu <strong>toutes les validations hiérarchiques requises</strong> et est prête pour traitement financier / paiement.</p>
    <div class="info-block">
      <table>
        <tr><td>Référence</td><td>${request.reference}</td></tr>
        <tr><td>Type</td><td>${getTypeLabel(request.type)}</td></tr>
        <tr><td>Demandeur</td><td>${requesterName}</td></tr>
        <tr><td>Département</td><td>${departmentName || '—'}</td></tr>
        <tr><td>Date de dépôt</td><td>${formatDate(request.createdAt)}</td></tr>
      </table>
    </div>
    <a href="${frontendUrl}/requests/${request.id}" class="btn">Consulter la demande</a>
  </div>
  <div class="footer">
    Service Informatique MCT — bassirou.ouedraogo@mct.ci<br>
    Cet email a été généré automatiquement par ERP NATIF MCT.
  </div>
</div>
</body></html>`;

  return sendEmail({ to, subject, html });
}

/**
 * Envoie un mémo d'attribution d'équipement au Responsable des Moyens Généraux
 */
async function sendMemoToMoyensGenerauxEmail({ to, request, memoData, requesterName, departmentName, frontendUrl }) {
  const subject = `[MCT MEMO] Attribution d'actif informatique — Réf: ${request.reference}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #1a3c6e; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; font-size: 13px; opacity: .8; }
  .body { padding: 32px; }
  .info-block { background: #f0f4f8; border-left: 4px solid #1a3c6e; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
  .info-block table { width: 100%; border-collapse: collapse; }
  .info-block td { padding: 6px 0; font-size: 14px; vertical-align: top; }
  .info-block td:first-child { font-weight: bold; width: 180px; color: #555; }
  .btn { display: inline-block; background: #1a3c6e; color: #fff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 20px 0; }
  .footer { padding: 16px 32px; background: #f0f4f8; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>ERP NATIF MCT</h1>
    <p>Mémo d'attribution d'actif informatique</p>
  </div>
  <div class="body">
    <p>Bonjour <strong>Adom Pierre</strong>,</p>
    <p>Le Responsable Informatique a validé l'attribution de l'équipement informatique ci-dessous suite à la demande <strong>${request.reference}</strong>.</p>

    <div class="info-block">
      <table>
        <tr><td>Référence Demande</td><td>${request.reference}</td></tr>
        <tr><td>Attributaire (Demandeur)</td><td>${requesterName}</td></tr>
        <tr><td>Département</td><td>${departmentName || '—'}</td></tr>
        <tr><td>Matériel Attribué</td><td><strong>${memoData.material}</strong></td></tr>
        <tr><td>Caractéristiques</td><td>${memoData.specs ? memoData.specs.replace(/\\n/g, '<br>').replace(/\n/g, '<br>') : '—'}</td></tr>
        <tr><td>Taille Écran (pouces)</td><td>${memoData.screenSize || '—'}</td></tr>
        <tr><td>Accessoires</td><td>${memoData.accessories ? memoData.accessories.replace(/\\n/g, '<br>').replace(/\n/g, '<br>') : '—'}</td></tr>
        <tr><td>Date d'attribution</td><td>${formatDate(new Date())}</td></tr>
      </table>
    </div>

    <p>Veuillez prendre les dispositions nécessaires pour la gestion physique de cet actif.</p>
    <a href="${frontendUrl}/requests/${request.id}" class="btn">Consulter la demande</a>
  </div>
  <div class="footer">
    Service Informatique MCT — bassirou.ouedraogo@mct.ci<br>
    Cet email a été généré automatiquement par ERP NATIF MCT.
  </div>
</div>
</body></html>`;

  return sendEmail({ to, subject, html });
}

/**
 * Envoie un email aux signataires pour les informer que la demande a été traitée et close
 */
async function sendRequestTreatedNoticeToSigners({ to, validatorName, requesterName, request, closureNote, frontendUrl }) {
  const subject = `[MCT IT] Demande traitée et clôturée — Réf: ${request.reference}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #1a3c6e; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; font-size: 13px; opacity: .8; }
  .body { padding: 32px; }
  .info-block { background: #f0f4f8; border-left: 4px solid #1a3c6e; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
  .info-block table { width: 100%; border-collapse: collapse; }
  .info-block td { padding: 6px 0; font-size: 14px; vertical-align: top; }
  .info-block td:first-child { font-weight: bold; width: 180px; color: #555; }
  .btn { display: inline-block; background: #1a3c6e; color: #fff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 20px 0; }
  .footer { padding: 16px 32px; background: #f0f4f8; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>ERP NATIF MCT</h1>
    <p>Demande traitée et clôturée</p>
  </div>
  <div class="body">
    <p>Bonjour <strong>${validatorName}</strong>,</p>
    <p>Nous vous informons que la demande <strong>${request.reference}</strong> (que vous avez validée) a été finalisée et clôturée par le Service Informatique.</p>

    <div class="info-block">
      <table>
        <tr><td>Référence Demande</td><td>${request.reference}</td></tr>
        <tr><td>Type de Demande</td><td>${getTypeLabel(request.type)}</td></tr>
        <tr><td>Demandeur</td><td>${requesterName}</td></tr>
        ${request.type === 'ENR_SI_008' && request.memoMaterial ? `
          <tr><td>Matériel Attribué</td><td><strong>${request.memoMaterial}</strong></td></tr>
          <tr><td>Caractéristiques</td><td>${request.memoSpecs ? request.memoSpecs.replace(/\\n/g, '<br>').replace(/\n/g, '<br>') : '—'}</td></tr>
        ` : ''}
        ${closureNote ? `<tr><td>Note de clôture</td><td>${closureNote.replace(/\\n/g, '<br>').replace(/\n/g, '<br>')}</td></tr>` : ''}
        <tr><td>Date de clôture</td><td>${formatDate(new Date())}</td></tr>
      </table>
    </div>

    <p>La demande est désormais close.</p>
    <a href="${frontendUrl}/requests/${request.id}" class="btn">Consulter la demande</a>
  </div>
  <div class="footer">
    Service Informatique MCT — bassirou.ouedraogo@mct.ci<br>
    Cet email a été généré automatiquement par ERP NATIF MCT.
  </div>
</div>
</body></html>`;

  return sendEmail({ to, subject, html });
}

async function sendOtpEmail({ to, userName, code, expiresInMinutes = 10 }) {
  const subject = `[MCT OTP] ${code} est votre code de validation à usage unique`;
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 500px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #0f2961; color: #fff; padding: 20px 24px; text-align: center; }
  .body { padding: 28px; text-align: center; }
  .code-box { font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f2961; background: #f0f4f8; border: 2px dashed #0f2961; padding: 16px; border-radius: 8px; margin: 20px 0; font-family: monospace; }
  .footer { padding: 16px; background: #f8fafc; font-size: 12px; color: #64748b; text-align: center; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1 style="margin:0;font-size:18px;">Code de Sécurité à Usage Unique (OTP)</h1>
  </div>
  <div class="body">
    <p>Bonjour <strong>${userName}</strong>,</p>
    <p>Voici votre code de validation requis pour signer l'action en cours :</p>
    <div class="code-box">${code}</div>
    <p style="font-size:13px;color:#666;">Ce code est valide pendant <strong>${expiresInMinutes} minutes</strong>. Ne le partagez avec personne.</p>
  </div>
  <div class="footer">ERP Natif MCT IT — Sécurité & Preuve Numérique</div>
</div>
</body>
</html>`;

  return sendEmail({ to, subject, html });
}

module.exports = {
  sendValidationRequestEmail,
  sendRejectionEmail,
  sendClosureEmail,
  sendMemoToMoyensGenerauxEmail,
  sendPaymentCompletedEmail,
  sendTreasuryNotificationEmail,
  sendRequestTreatedNoticeToSigners,
  sendOtpEmail,
};

