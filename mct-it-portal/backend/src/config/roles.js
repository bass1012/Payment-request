const ROLES = Object.freeze({
  EMPLOYEE: 'EMPLOYEE',
  CHEF_DEPT: 'CHEF_DEPT',
  DIRECTOR: 'DIRECTOR',
  DG: 'DG',
  RH: 'RH',
  TREASURY: 'TREASURY',
  IT: 'IT',
  MOYENS_GENERAUX: 'MOYENS_GENERAUX',
  DAF: 'DAF',
  DGOF: 'DGOF',
  IT_ADMIN: 'IT_ADMIN',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
});

const VALID_ROLES = Object.freeze(Object.values(ROLES));
const ADMIN_ROLES = Object.freeze([
  ROLES.IT_ADMIN,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
]);

const ROLE_LABELS = Object.freeze({
  [ROLES.EMPLOYEE]: 'Employé',
  [ROLES.CHEF_DEPT]: 'Chef de département',
  [ROLES.DIRECTOR]: 'Directeur de division',
  [ROLES.DG]: 'Directeur Général',
  [ROLES.RH]: 'Ressources Humaines',
  [ROLES.TREASURY]: 'Trésorerie',
  [ROLES.IT]: 'Responsable / Équipe IT',
  [ROLES.MOYENS_GENERAUX]: 'Moyens Généraux',
  [ROLES.DAF]: 'DAF',
  [ROLES.DGOF]: 'DGOF',
  [ROLES.IT_ADMIN]: 'Administrateur IT',
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.SUPER_ADMIN]: 'Super Administrateur',
});

// Les rôles métier ont le même niveau d'attribution. Les rôles
// d'administration sont ordonnés afin d'empêcher toute escalade.
const ROLE_AUTHORITY = Object.freeze({
  [ROLES.EMPLOYEE]: 10,
  [ROLES.CHEF_DEPT]: 10,
  [ROLES.DIRECTOR]: 10,
  [ROLES.DG]: 10,
  [ROLES.RH]: 10,
  [ROLES.TREASURY]: 10,
  [ROLES.IT]: 10,
  [ROLES.MOYENS_GENERAUX]: 10,
  [ROLES.DAF]: 10,
  [ROLES.DGOF]: 10,
  [ROLES.IT_ADMIN]: 50,
  [ROLES.ADMIN]: 80,
  [ROLES.SUPER_ADMIN]: 100,
});

function isValidRole(role) {
  return typeof role === 'string' && VALID_ROLES.includes(role);
}

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

function canAssignRole(actorRole, targetRole) {
  if (!isAdminRole(actorRole) || !isValidRole(targetRole)) {
    return false;
  }

  return ROLE_AUTHORITY[targetRole] <= ROLE_AUTHORITY[actorRole];
}

function canManageUser(actorRole, targetRole) {
  if (!isAdminRole(actorRole) || !isValidRole(targetRole)) {
    return false;
  }

  return ROLE_AUTHORITY[targetRole] <= ROLE_AUTHORITY[actorRole];
}

module.exports = {
  ROLES,
  VALID_ROLES,
  ADMIN_ROLES,
  ROLE_LABELS,
  ROLE_AUTHORITY,
  isValidRole,
  isAdminRole,
  canAssignRole,
  canManageUser,
};

