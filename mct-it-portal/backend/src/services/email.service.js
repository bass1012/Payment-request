const nodemailer = require('nodemailer');

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
    <h1>MCT IT Portal</h1>
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
    <a href="${frontendUrl}/requests/${request.id}" class="btn">Accéder à la demande</a>
    <p style="font-size:13px;color:#666;">Ou copiez ce lien dans votre navigateur :<br>${frontendUrl}/requests/${request.id}</p>
  </div>
  <div class="footer">
    Service Informatique MCT — thierry.kone@mct.ci<br>
    Cet email a été généré automatiquement par MCT IT Portal.
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
  <div class="footer">Service Informatique MCT — thierry.kone@mct.ci</div>
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
  <div class="footer">Service Informatique MCT — thierry.kone@mct.ci</div>
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
    console.error(`[email] Erreur envoi vers ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

function getTypeLabel(type) {
  const labels = {
    ENR_SI_005: 'Création d\'adresse électronique (ENR.SI.005)',
    ENR_SI_006: 'Demande d\'impression couleur (ENR.SI.006)',
    ENR_SI_008: 'Demande d\'actifs informatiques (ENR.SI.008)',
    AUTRE: 'Autre demande IT',
  };
  return labels[type] || type;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

module.exports = { sendValidationRequestEmail, sendRejectionEmail, sendClosureEmail, sendVerificationEmail };

/**
 * Envoie un email de vérification de compte
 */
async function sendVerificationEmail({ to, firstName, verifyUrl }) {
  const subject = '[MCT IT Portal] Vérifiez votre adresse email';
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
  <div class="header"><h1>MCT IT Portal</h1></div>
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
    await t.sendMail({ from: `"MCT IT Portal" <${process.env.SMTP_USER}>`, to, subject, html });
    return { success: true };
  } catch (e) {
    console.error('[email] Erreur vérification vers', to, ':', e.message);
    return { success: false, error: e.message };
  }
}
