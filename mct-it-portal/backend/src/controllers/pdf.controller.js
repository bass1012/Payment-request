const prisma = require('../config/database');
const { generatePdfHtml } = require('../services/pdf.service');

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

  const html = generatePdfHtml({
    request,
    requester: request.requester,
    department: request.department,
    validations: request.validations,
  });

  // Essayer Puppeteer, fallback HTML si non dispo
  try {
    const puppeteer = require('puppeteer-core');
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="MCT-${request.reference}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    // Fallback : retourner le HTML directement (navigateur peut l'imprimer)
    console.warn('[pdf] Puppeteer non disponible, fallback HTML:', err.message);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}

module.exports = { generatePdf };
