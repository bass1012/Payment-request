/**
 * Façade de compatibilité — Configuration organisationnelle MCT.
 *
 * La source de vérité vit désormais dans `./organization.config.js`
 * (données déclaratives) et `./workflow.engine.js` (résolution des circuits).
 * Ce module conserve l'API historique `{ DEPARTMENTS, CONTACTS,
 * getWorkflowSteps }` pour ne pas modifier les consommateurs existants.
 *
 * Pour ajouter un département ou modifier un circuit : éditer
 * `./organization.config.js` uniquement, puis relancer `npm run db:seed`.
 */

const {
  DEPARTMENTS,
  CONTACTS,
  DIRECTIONS,
  WORKFLOW_DEFINITIONS,
  ROLE_BY_EMAIL,
  isDepartmentSelectable,
  getDirectionName,
  DG_EMAIL,
} = require('./organization.config');
const { resolveWorkflowSteps } = require('./workflow.engine');

/**
 * Retourne les étapes de validation selon le type de demande (API historique).
 */
function getWorkflowSteps(requestType, department) {
  return resolveWorkflowSteps(requestType, department);
}

module.exports = {
  DEPARTMENTS,
  CONTACTS,
  DIRECTIONS,
  WORKFLOW_DEFINITIONS,
  ROLE_BY_EMAIL,
  isDepartmentSelectable,
  getDirectionName,
  DG_EMAIL,
  getWorkflowSteps,
};
