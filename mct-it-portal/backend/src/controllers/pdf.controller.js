const prisma = require('../config/database');
const { generatePdfHtml } = require('../services/pdf.service');
const { canAccessRequest } = require('../utils/workflow.helper');
const { getChromiumExecutablePath } = require('../config/chromium');
const path = require('path');
const { logger } = require('../utils/logger');
const { getSafePath } = require('./request.shared');

/**
 * GET /requests/:id/pdf
 * Génère et retourne le PDF de la fiche officielle MCT
 */
async function generatePdf(req, res) {
  const { id } = req.params;

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      requester: true,
      department: true,
      validations: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!request) {
    return res.status(404).json({ error: 'Demande introuvable' });
  }

  // P1 Autorisations : Utiliser le helper centralisé canAccessRequest
  if (!canAccessRequest(request, req.user)) {
    return res.status(403).json({ error: 'Accès refusé à ce document PDF.' });
  }

  // Si la demande possède un PDF uploade / pré-rempli, le renvoyer directement (il contient les signatures apposées)
  if (request.uploadedPdfPath) {
    const fs = require('fs');
    const pdfPath = getSafePath(request.uploadedPdfPath);
    if (fs.existsSync(pdfPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="MCT-${request.reference}.pdf"`);
      return res.sendFile(pdfPath); // nosemgrep
    }
  }

  const html = generatePdfHtml({
    request,
    requester: request.requester,
    department: request.department,
    validations: request.validations,
  });

  let browser;
  try {
    const puppeteer = require('puppeteer-core');
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: getChromiumExecutablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
      ],
    });
    const page = await browser.newPage();
    // Utiliser domcontentloaded au lieu de networkidle0 pour éviter les timeouts
    // sur les pages sans ressources externes (HTML inline avec CSS embarqué)
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="MCT-${request.reference}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error('pdf.generation_failed', {
      requestId: request.id,
      requestReference: request.reference,
      error: err,
    });
    res.status(503).json({
      error: 'La génération du PDF est temporairement indisponible.',
    });
  } finally {
    if (browser) {
      await browser.close().catch((closeError) => {
        logger.error('pdf.browser_close_failed', { requestId: request.id, error: closeError });
      });
    }
  }
}

module.exports = { generatePdf };
