const crypto = require('crypto');
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { TYPE_LABELS } = require('../config/request.constants');
const { ROLE_LABELS } = require('../config/roles');

/**
 * Calcule l'empreinte cryptographique SHA-256 d'une demande
 */
function computeDocumentHash(request, formDataObj = null, pdfBuffer = null) {
  const hash = crypto.createHash('sha256');

  const metadataPayload = {
    id: request.id,
    reference: request.reference,
    type: request.type,
    revision: request.currentRevision || request.revision || 1,
    requesterId: request.requesterId,
    createdAt: request.createdAt ? new Date(request.createdAt).toISOString() : null,
    formData: formDataObj || request.formData,
  };

  hash.update(JSON.stringify(metadataPayload));

  if (pdfBuffer) {
    if (Buffer.isBuffer(pdfBuffer) || pdfBuffer instanceof Uint8Array) {
      hash.update(pdfBuffer);
    } else if (typeof pdfBuffer === 'string' && fs.existsSync(pdfBuffer)) {
      const fileContent = fs.readFileSync(pdfBuffer);
      hash.update(fileContent);
    }
  }

  return hash.digest('hex').toUpperCase();
}

/**
 * Génère la formule légale de consentement du signataire
 */
function generateConsentText(validatorName, validatorRole, reference, action, revision = 1, stepLabel = '') {
  const roleLabel = (validatorRole && ROLE_LABELS[validatorRole]) || validatorRole || 'Valideur';
  const actionLabel = action === 'APPROVED' ? 'APPROBATION' : action === 'REJECTED' ? 'REJET' : action;
  
  return `Je soussigne(e) ${validatorName} (${roleLabel}), certifie avoir me le dossier Ref: ${reference} (Revision ${revision}, Etape: ${stepLabel || 'Validation'}) et valide la decision [${actionLabel}] en donnant mon consentement a l'enregistrement de cette preuve electronique.`;
}

/**
 * Supprime les caractères non ASCII pour la police Helvetica WinAnsi de PDF-Lib
 */
function sanitizeAscii(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

/**
 * Génère le PDF de Certificat de Preuve d'Audit de Signature
 */
async function generateAuditCertificatePdf(request, auditLogs = []) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait (pts)
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const primaryColor = rgb(0.06, 0.16, 0.38); // #0f2961 MCT Blue
  const textColor = rgb(0.12, 0.16, 0.22);
  const mutedColor = rgb(0.4, 0.45, 0.55);
  const boxBgColor = rgb(0.96, 0.97, 0.99);

  let y = height - 40;

  // En-tête du Certificat
  page.drawRectangle({
    x: 35,
    y: y - 50,
    width: width - 70,
    height: 60,
    color: primaryColor,
  });

  page.drawText(sanitizeAscii("CERTIFICAT D'AUDIT DE SIGNATURES ELECTRONIQUES"), {
    x: 50,
    y: y - 24,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(sanitizeAscii("ERP NATIF MCT IT - JOURNAL DE PREUVE IMMUABLE SHA-256"), {
    x: 50,
    y: y - 42,
    size: 9,
    font: fontRegular,
    color: rgb(0.85, 0.9, 1),
  });

  y -= 75;

  // Informations sur la demande
  page.drawRectangle({
    x: 35,
    y: y - 75,
    width: width - 70,
    height: 75,
    color: boxBgColor,
    borderColor: rgb(0.85, 0.88, 0.93),
    borderWidth: 1,
  });

  const typeLabel = sanitizeAscii(TYPE_LABELS[request.type] || request.type);
  const requesterName = sanitizeAscii(request.requesterName || request.requester?.email || '-');

  page.drawText(sanitizeAscii(`Reference Dossier : ${request.reference || 'N/A'}`), { x: 50, y: y - 20, size: 10, font: fontBold, color: textColor });
  page.drawText(sanitizeAscii(`Type : ${typeLabel}`), { x: 50, y: y - 36, size: 9, font: fontRegular, color: textColor });
  page.drawText(sanitizeAscii(`Demandeur : ${requesterName}`), { x: 50, y: y - 52, size: 9, font: fontRegular, color: textColor });
  page.drawText(sanitizeAscii(`Statut Actuel : ${request.status}`), { x: 300, y: y - 20, size: 9, font: fontBold, color: textColor });
  page.drawText(sanitizeAscii(`Date de Creation : ${new Date(request.createdAt).toISOString().slice(0, 19).replace('T', ' ')}`), { x: 300, y: y - 36, size: 9, font: fontRegular, color: textColor });
  page.drawText(sanitizeAscii(`Revision Active : N ${request.currentRevision || 1}`), { x: 300, y: y - 52, size: 9, font: fontRegular, color: textColor });

  y -= 95;

  page.drawText(sanitizeAscii("Journal de Preuve et d'Authenticite (Append-Only)"), {
    x: 35,
    y: y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });

  y -= 15;

  if (!auditLogs || auditLogs.length === 0) {
    page.drawText(sanitizeAscii("Aucune signature enregistree dans le journal d'audit pour le moment."), {
      x: 35,
      y: y - 15,
      size: 9,
      font: fontRegular,
      color: mutedColor,
    });
  } else {
    for (let i = 0; i < auditLogs.length; i++) {
      const log = auditLogs[i];

      if (y < 120) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }

      const cardHeight = log.authorizationMode === 'DELEGATED' ? 100 : 85;
      page.drawRectangle({
        x: 35,
        y: y - cardHeight,
        width: width - 70,
        height: cardHeight,
        color: rgb(0.98, 0.98, 1),
        borderColor: rgb(0.8, 0.85, 0.92),
        borderWidth: 1,
      });

      const dateStr = new Date(log.createdAt).toISOString().slice(0, 19).replace('T', ' ');
      const actionBadge = sanitizeAscii(log.action === 'APPROVED' ? '[APPROUVE]' : log.action === 'REJECTED' ? '[REJETE]' : `[${log.action}]`);
      const actionColor = log.action === 'APPROVED' ? rgb(0.1, 0.5, 0.2) : rgb(0.7, 0.1, 0.1);

      let rawStepTitle = `Etape ${log.step} - ${log.stepLabel}`;
      if (rawStepTitle.length > 45) {
        rawStepTitle = `${rawStepTitle.slice(0, 42)}...`;
      }
      const stepTitle = sanitizeAscii(rawStepTitle);

      page.drawText(stepTitle, { x: 45, y: y - 18, size: 9, font: fontBold, color: textColor });
      page.drawText(actionBadge, { x: 345, y: y - 18, size: 9, font: fontBold, color: actionColor });
      page.drawText(dateStr, { x: 440, y: y - 18, size: 8.5, font: fontRegular, color: mutedColor });


      const validatorLine = sanitizeAscii(`Signataire : ${log.validatorName} <${log.validatorEmail}> (${log.validatorRole || 'Valideur'})`);
      page.drawText(validatorLine, {
        x: 45,
        y: y - 34,
        size: 8.5,
        font: fontRegular,
        color: textColor,
      });

      const detailOffset = log.authorizationMode === 'DELEGATED' ? 14 : 0;
      if (log.authorizationMode === 'DELEGATED') {
        const delegationLine = sanitizeAscii(`Delegation : agit pour ${log.delegatorName || '-'} <${log.delegatorEmail || '-'}> [${log.delegationScope || '-'}]`);
        page.drawText(delegationLine, {
          x: 45,
          y: y - 48,
          size: 8,
          font: fontBold,
          color: rgb(0.65, 0.35, 0.05),
        });
      }

      page.drawText(sanitizeAscii(`Adresse IP : ${log.ipAddress || 'Non enregistree'}`), {
        x: 45,
        y: y - 48 - detailOffset,
        size: 8,
        font: fontRegular,
        color: mutedColor,
      });

      const truncatedUserAgent = sanitizeAscii((log.userAgent || '-').slice(0, 65));
      page.drawText(sanitizeAscii(`Agent : ${truncatedUserAgent}`), {
        x: 230,
        y: y - 48 - detailOffset,
        size: 8,
        font: fontRegular,
        color: mutedColor,
      });

      page.drawText(sanitizeAscii(`Empreinte SHA-256 : ${log.documentHash}`), {
        x: 45,
        y: y - 66 - detailOffset,
        size: 7.5,
        font: fontBold,
        color: primaryColor,
      });

      if (log.consentGiven) {
        page.drawText(sanitizeAscii("[OK] Consentement explicite verifie et certifie"), {
          x: 45,
          y: y - 78 - detailOffset,
          size: 7.5,
          font: fontRegular,
          color: rgb(0.1, 0.55, 0.2),
        });
      }

      y -= cardHeight + 12;
    }
  }

  // Pied de page légal
  const footerY = 30;
  page.drawLine({
    start: { x: 35, y: footerY + 15 },
    end: { x: width - 35, y: footerY + 15 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText(sanitizeAscii("Ce certificat atteste de l'integrite et de l'immutabilite des signatures electroniques."), {
    x: 35,
    y: footerY,
    size: 7.5,
    font: fontRegular,
    color: mutedColor,
  });

  page.drawText(sanitizeAscii(`Document genere le ${new Date().toISOString().slice(0, 19).replace('T', ' ')} (UTC)`), {
    x: width - 220,
    y: footerY,
    size: 7.5,
    font: fontRegular,
    color: mutedColor,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = {
  computeDocumentHash,
  generateConsentText,
  generateAuditCertificatePdf,
};
