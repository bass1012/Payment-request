const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const crypto = require('crypto');
const { COORDINATES } = require('../config/pdf-coordinates');
const { logger } = require('../utils/logger');

/**
 * Normalise les caractères accentués pour l'encodage Helvetica WinAnsi
 */
function sanitizeAscii(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

const STAMP_BLUE = rgb(0.06, 0.25, 0.65);
const STAMP_TEXT = rgb(0.08, 0.16, 0.45);
const STAMP_META = rgb(0.3, 0.35, 0.5);

function getCellStampBox(column) {
  const horizontalInset = 6;
  const boxWidth = (column.right - column.left) - (horizontalInset * 2);
  return {
    boxX: column.centerX - (boxWidth / 2),
    boxY: COORDINATES.boxY || 328,
    boxWidth,
    boxHeight: COORDINATES.boxHeight || 36,
  };
}

function fitTextSize(font, text, preferredSize, maxWidth, minimumSize = 4.5) {
  let size = preferredSize;
  while (size > minimumSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.25;
  }
  return size;
}

function drawCenteredText(page, text, font, preferredSize, maxWidth, centerX, y, color) {
  const size = fitTextSize(font, text, preferredSize, maxWidth);
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - (width / 2), y, size, font, color });
}

async function drawCertifiedStamp({
  page,
  pdfDoc,
  font,
  fontBold,
  fontOblique,
  boxX,
  boxY,
  boxWidth,
  boxHeight,
  validatorName,
  formattedDate,
  signatureImage,
  headerText = 'Approuve',
  footerExtra = '',
  clearBackground = false,
}) {
  const centerX = boxX + (boxWidth / 2);

  if (clearBackground) {
    page.drawRectangle({
      x: boxX + 1,
      y: boxY + 1,
      width: boxWidth - 2,
      height: boxHeight - 1,
      color: rgb(1, 1, 1),
    });
  }

  page.drawLine({
    start: { x: boxX, y: boxY + boxHeight },
    end: { x: boxX, y: boxY + 4 },
    color: STAMP_BLUE,
    thickness: 1.5,
  });
  page.drawLine({
    start: { x: boxX, y: boxY + 4 },
    end: { x: boxX + 4, y: boxY },
    color: STAMP_BLUE,
    thickness: 1.5,
  });
  page.drawLine({
    start: { x: boxX + 4, y: boxY },
    end: { x: boxX + boxWidth, y: boxY },
    color: STAMP_BLUE,
    thickness: 1.5,
  });

  const safeHeader = sanitizeAscii(headerText);
  const headerSize = fitTextSize(fontBold, safeHeader, 6.5, boxWidth - 10, 4.75);
  page.drawText(safeHeader, {
    x: boxX + 5,
    y: boxY + boxHeight - 8,
    size: headerSize,
    font: fontBold,
    color: STAMP_BLUE,
  });

  let imageDrawn = false;
  if (signatureImage && typeof signatureImage === 'string' && signatureImage.includes('base64,')) {
    try {
      const imageBuffer = Buffer.from(signatureImage.split('base64,')[1], 'base64');
      const embeddedImg = await pdfDoc.embedPng(imageBuffer);
      const maxImgHeight = Math.min(18, boxHeight - 16);
      const scaled = embeddedImg.scaleToFit(boxWidth - 12, maxImgHeight);
      page.drawImage(embeddedImg, {
        x: centerX - (scaled.width / 2),
        y: boxY + 8 + ((maxImgHeight - scaled.height) / 2),
        width: scaled.width,
        height: scaled.height,
      });
      imageDrawn = true;
    } catch (error) {
      logger.error('pdf_signer.image_embed_failed', { error });
    }
  }

  if (!imageDrawn) {
    const displayName = sanitizeAscii(validatorName || '');
    drawCenteredText(
      page,
      displayName,
      fontOblique,
      8,
      boxWidth - 12,
      centerX,
      boxY + 14,
      STAMP_TEXT,
    );
  }

  const footer = sanitizeAscii(`${formattedDate}${footerExtra ? ` | ${footerExtra}` : ''}`);
  drawCenteredText(page, footer, font, 5.5, boxWidth - 10, centerX, boxY + 3, STAMP_META);
}

/**
 * Appose un tampon de signature électronique certifiée style DocuSign
 * (Crochets de sécurité, signature manuscrite/PNG, empreinte SHA-256)
 * 
 * @param {string} pdfPath - Le chemin absolu du fichier PDF
 * @param {string} stepType - Le type de l'étape ('requester', 'chef_dept', 'director', 'daf', 'dgof', 'dg', 'treasury')
 * @param {string} validatorName - Le nom complet du valideur
 * @param {string|Date} validationDate - La date de la validation
 * @param {string} [extraInfo] - Info additionnelle (ex: référence paiement pour la trésorerie)
 * @param {Object|string} [options] - Options de signature (signatureImage base64, signatureStyle, hashTag)
 */
async function signPdf(pdfPath, stepType, validatorName, validationDate, extraInfo = null, options = {}) {
  if (!fs.existsSync(pdfPath)) {
    logger.warn('pdf_signer.file_missing');
    return false;
  }

  try {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const page = pages[COORDINATES.pageIndex || 0];

    const font = await pdfDoc.embedFont('Helvetica');
    const fontBold = await pdfDoc.embedFont('Helvetica-Bold');
    const fontOblique = await pdfDoc.embedFont('Helvetica-Oblique');

    const d = validationDate ? new Date(validationDate) : new Date();
    const dateStr = d.toLocaleDateString('fr-FR');
    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const formattedDate = sanitizeAscii(`${dateStr} à ${timeStr}`);
    const optsObj = typeof options === 'string' ? { signatureImage: options } : options || {};

    if (stepType === 'treasury') {
      const { x, y, width, height } = COORDINATES.treasury;
      await drawCertifiedStamp({
        page,
        pdfDoc,
        font,
        fontBold,
        fontOblique,
        boxX: x,
        boxY: y,
        boxWidth: width,
        boxHeight: height,
        validatorName: validatorName || 'Tresorerie',
        formattedDate,
        signatureImage: optsObj.signatureImage,
        headerText: 'Paye / reglement effectue',
        footerExtra: extraInfo ? `Ref : ${extraInfo}` : '',
        clearBackground: true,
      });

    } else {
      const col = COORDINATES.columns[stepType];
      if (!col) {
        logger.warn('pdf_signer.unknown_step', { stepType });
        return false;
      }

      await drawCertifiedStamp({
        page,
        pdfDoc,
        font,
        fontBold,
        fontOblique,
        ...getCellStampBox(col),
        validatorName,
        formattedDate,
        signatureImage: optsObj.signatureImage,
      });
    }

    const modifiedBytes = await pdfDoc.save();
    fs.writeFileSync(pdfPath, modifiedBytes);
    logger.info('pdf_signer.completed', { stepType });
    return true;
  } catch (err) {
    logger.error('pdf_signer.failed', { stepType, error: err });
    return false;
  }
}

module.exports = { signPdf };
