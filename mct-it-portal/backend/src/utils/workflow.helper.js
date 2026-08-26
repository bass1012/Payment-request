const { getWorkflowSteps } = require('../config/departments');
const { ROLES, ADMIN_ROLES } = require('../config/roles');
const { REQUEST_STATUSES } = require('../config/request.constants');

/**
 * Valide si l'email de l'utilisateur correspond aux e-mails attendus du validateur.
 * Supporte les listes d'emails séparées par des virgules et les formats Display Name.
 * Exemple: "Aziz Kone <aziz.kone@mct.ci>, Aziz DG <aziz.dg@mct.ci>" ou "pierre.adom@mct.ci"
 */
function isValidatorEmailMatch(expectedEmailsStr, userEmail, delegatorEmails = []) {
  if (!expectedEmailsStr || !userEmail) return false;
  
  const candidateEmails = [userEmail, ...(delegatorEmails || [])].map(e => e.toLowerCase().trim());
  
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = expectedEmailsStr.match(emailRegex);
  
  if (!matches) {
    const expectedList = expectedEmailsStr.split(',').map(e => e.trim().toLowerCase());
    return candidateEmails.some(candidate => expectedList.includes(candidate));
  }
  
  const expectedList = matches.map(e => e.toLowerCase().trim());
  return candidateEmails.some(candidate => expectedList.includes(candidate));
}

/**
 * Retourne vrai si le rôle de l'utilisateur fait partie des rôles d'administration globale
 */
function isGlobalAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

/**
 * Vérifie si l'utilisateur a accès en lecture à une demande
 */
function canAccessRequest(request, user, delegatorEmails = []) {
  const { role, id: userId, email: userEmail } = user;

  if (request.status === REQUEST_STATUSES.DRAFT) {
    return request.requesterId === userId;
  }

  if (isGlobalAdminRole(role) || role === ROLES.IT) {
    return true;
  }

  const emailLower = userEmail.toLowerCase().trim();
  const isRequester = request.requesterId === userId;
  
  const hasValidated = request.validations && request.validations.some(v => 
    v.validatorId === userId || 
    (v.validatorEmail && v.validatorEmail.toLowerCase().trim() === emailLower)
  );

  const steps = getWorkflowSteps(request.type, request.department);
  const currentStepDef = steps[request.currentStep - 1];
  const isCurrentValidator = currentStepDef && currentStepDef.email && isValidatorEmailMatch(currentStepDef.email, userEmail, delegatorEmails);

  const isMoyensGenerauxAccess = role === ROLES.MOYENS_GENERAUX
    && (
      request.status === REQUEST_STATUSES.PROCESSING
      || request.status === REQUEST_STATUSES.CLOSED
    );

  return isRequester || hasValidated || isCurrentValidator || isMoyensGenerauxAccess;
}

/**
 * Vérifie si l'utilisateur est autorisé à valider l'étape courante de la demande
 */
function canValidateCurrentStep(request, user, delegatorEmails = []) {
  const { role, email: userEmail } = user;
  
  if (ADMIN_ROLES.includes(role)) {
    return true;
  }

  const steps = getWorkflowSteps(request.type, request.department);
  const currentStepDef = steps[request.currentStep - 1];
  
  return !!(currentStepDef && currentStepDef.email && isValidatorEmailMatch(currentStepDef.email, userEmail, delegatorEmails));
}


module.exports = {
  isValidatorEmailMatch,
  isGlobalAdminRole,
  canAccessRequest,
  canValidateCurrentStep,
};
