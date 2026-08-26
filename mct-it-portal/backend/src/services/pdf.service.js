/**
 * PDF Service — Facade
 * Dispatches to the correct template based on request type.
 * All template logic lives in ./pdf-templates/
 */
const { generateENR_SI_005 } = require('./pdf-templates/005');
const { generateENR_SI_006 } = require('./pdf-templates/006');
const { generateENR_SI_008 } = require('./pdf-templates/008');
const { generateENR_GA_003 } = require('./pdf-templates/ga003');
const { generateENR_RF_002 } = require('./pdf-templates/rf002');
const { generateAUTRE } = require('./pdf-templates/autre');
const { getValidationStampByStepType } = require('./pdf-templates/pdf-base-layout');

/**
 * Sélectionne le bon template selon le type de demande
 */
function generatePdfHtml(data) {
  const reqType = (data.request.type || '').toUpperCase();
  if (['CASH_REFUND', 'CASH_ADVANCE', 'CASH', 'ENR_RF_002'].includes(reqType)) {
    return generateENR_RF_002(data);
  }
  switch (reqType) {
    case 'ENR_SI_008':
    case 'ASSET':
      return generateENR_SI_008(data);
    case 'ENR_SI_005':
    case 'EMAIL':
      return generateENR_SI_005(data);
    case 'ENR_SI_006':
    case 'PRINT':
      return generateENR_SI_006(data);
    case 'ENR_GA_003':
    case 'PURCHASE':
      return generateENR_GA_003(data);
    default:
      return generateAUTRE(data);
  }
}

module.exports = { generatePdfHtml, getValidationStampByStepType };
