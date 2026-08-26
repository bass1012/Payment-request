/**
 * Service de résumé automatique des dossiers.
 *
 * Génère un résumé structuré d'une demande à partir de son type et de ses données formData.
 * Peut être utilisé pour les notifications, le reporting, et l'affichage dans l'interface.
 */
const { safeParseJSON, formatDateWithTime } = require('./pdf-templates/pdf-base-layout');
const { getWorkflowSteps } = require('../config/workflow.engine');

const TYPE_LABELS_MAP = {
  EMAIL: 'Adresse électronique',
  ENR_SI_005: 'Adresse électronique',
  PRINT: 'Impression couleur',
  ENR_SI_006: 'Impression couleur',
  ASSET: 'Actif informatique',
  ENR_SI_008: 'Actif informatique',
  CASH: 'Bon de Caisse',
  ENR_RF_002: 'Bon de Caisse',
  SUPPLY: 'Approvisionnement',
  ENR_GA_003: 'Approvisionnement',
  OTHER: 'Autre demande IT',
  AUTRE: 'Autre demande IT',
};

const STATUS_LABELS = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  VALIDATION_N1: 'Validation N+1',
  VALIDATION_N2: 'Validation N+2',
  VALIDATION_DG: 'Validation DG',
  PENDING_PAYMENT: 'En attente de paiement',
  IN_PROGRESS_IT: 'En cours IT',
  PROCESSING: 'En cours de traitement',
  CLOSED: 'Clôturée',
  REJECTED: 'Rejetée',
};

/**
 * Génère un résumé structuré d'une demande.
 */
function generateSummary(request, department, validations = []) {
  const fd = safeParseJSON(request.formData);
  const typeName = TYPE_LABELS_MAP[request.type] || request.type;
  const statusLabel = STATUS_LABELS[request.status] || request.status;

  const summary = {
    id: request.id,
    reference: request.reference,
    type: typeName,
    typeCode: request.type,
    status: statusLabel,
    statusCode: request.status,
    requester: request.requesterName || `${request.firstName || ''} ${request.lastName || ''}`.trim(),
    department: department?.name || 'Non renseigné',
    createdAt: formatDateWithTime(request.createdAt),
    currentStep: request.currentStep,
  };

  // Type-specific summary
  switch (request.type) {
    case 'EMAIL':
    case 'ENR_SI_005':
      summary.object = `Création adresse email — Mémo: ${fd.memoNumber || 'N/A'}`;
      summary.details = fd.description || fd.objet || '';
      break;

    case 'PRINT':
    case 'ENR_SI_006':
      summary.object = `Impression couleur — ${fd.copiesA4 || 0} A4, ${fd.copiesA3 || 0} A3`;
      summary.details = fd.printObject || fd.objet || '';
      break;

    case 'ASSET':
    case 'ENR_SI_008':
      summary.object = 'Demande d\'actifs informatiques';
      summary.details = [
        fd.itAssets && `Matériel: ${fd.itAssets.substring(0, 100)}`,
        fd.softwareLicenses && `Logiciels: ${fd.softwareLicenses.substring(0, 100)}`,
        fd.requestReason && `Motif: ${fd.requestReason.substring(0, 100)}`,
      ].filter(Boolean).join(' | ');
      break;

    case 'CASH':
    case 'ENR_RF_002':
      summary.object = `Bon de Caisse — ${request.paymentAmount ? Number(request.paymentAmount).toLocaleString('fr-FR') + ' FCFA' : 'Montant non renseigné'}`;
      summary.details = fd.motif || fd.description || fd.requestReason || '';
      break;

    case 'SUPPLY':
    case 'ENR_GA_003': {
      const itemCount = Array.isArray(fd.items) ? fd.items.length : 0;
      const total = fd.offersAmount ? Number(fd.offersAmount).toLocaleString('fr-FR') : '0';
      summary.object = `Approvisionnement — ${itemCount} article(s), ${total} FCFA`;
      summary.details = [
        fd.allocationSection && `Imputation: ${fd.allocationSection}`,
        fd.deliveryAddress && `Livraison: ${fd.deliveryAddress.substring(0, 80)}`,
      ].filter(Boolean).join(' | ');
      break;
    }

    default:
      summary.object = 'Autre demande IT';
      summary.details = fd.description || fd.objet || '';
  }

  // Workflow progress
  try {
    const steps = getWorkflowSteps(request.type, department?.name);
    summary.workflowProgress = steps.map(step => ({
      step: step.step,
      label: step.label,
      type: step.type,
      completed: step.step < request.currentStep,
      current: step.step === request.currentStep,
    }));
  } catch {
    summary.workflowProgress = [];
  }

  // Validation history
  summary.validations = validations
    .filter(v => v.action === 'APPROVED' || v.action === 'REJECTED')
    .map(v => ({
      step: v.step,
      stepLabel: v.stepLabel,
      action: v.action === 'APPROVED' ? 'Approuvé' : 'Rejeté',
      validator: v.validatorName || 'Inconnu',
      date: formatDateWithTime(v.createdAt),
      comment: v.comment || null,
    }));

  return summary;
}

/**
 * Génère un résumé court (une ligne) pour les listes et notifications.
 */
function generateShortSummary(request, department) {
  const fd = safeParseJSON(request.formData);
  const typeName = TYPE_LABELS_MAP[request.type] || request.type;

  switch (request.type) {
    case 'EMAIL':
    case 'ENR_SI_005':
      return `${typeName} — Mémo ${fd.memoNumber || 'N/A'}`;
    case 'PRINT':
    case 'ENR_SI_006':
      return `${typeName} — ${fd.copiesA4 || 0} A4, ${fd.copiesA3 || 0} A3`;
    case 'ASSET':
    case 'ENR_SI_008':
      return `${typeName} — ${(fd.itAssets || '').substring(0, 50)}`;
    case 'CASH':
    case 'ENR_RF_002':
      return `${typeName} — ${request.paymentAmount ? Number(request.paymentAmount).toLocaleString('fr-FR') + ' FCFA' : 'N/A'}`;
    case 'SUPPLY':
    case 'ENR_GA_003':
      return `${typeName} — ${fd.offersAmount ? Number(fd.offersAmount).toLocaleString('fr-FR') + ' FCFA' : 'N/A'}`;
    default:
      return `${typeName} — ${(fd.description || '').substring(0, 50)}`;
  }
}

module.exports = { generateSummary, generateShortSummary };
