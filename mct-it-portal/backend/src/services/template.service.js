/**
 * Service de modèles de documents par type de demande.
 *
 * Chaque type de demande a un modèle document avec des champs dynamiques
 * qui pré-remplissent le formulaire de création et génèrent un PDF modèle.
 */
const { safeParseJSON } = require('./pdf-templates/pdf-base-layout');

/**
 * Définition des modèles par type de demande.
 * Chaque modèle décrit les champs attendus, leurs types, et si ils sont obligatoires.
 */
const DOCUMENT_TEMPLATES = {
  EMAIL: {
    code: 'ENR.SI.005',
    title: 'Demande de création d\'adresse électronique',
    description: 'Formulaire de demande de création d\'adresse électronique pour un collaborateur.',
    version: '01',
    versionDate: '16 mai 2019',
    fields: [
      { key: 'memoNumber', label: 'Numéro Mémo', type: 'text', required: false, placeholder: 'Ex: MEMO-2026-001' },
      { key: 'description', label: 'Objet de la demande', type: 'textarea', required: true, placeholder: 'Décrivez l\'objet de la demande d\'adresse email' },
    ],
    sections: ['Informations demandeur', 'Numéro Mémo', 'Date & Visa'],
  },

  PRINT: {
    code: 'ENR.SI.006',
    title: 'Demande d\'impression couleur',
    description: 'Formulaire de demande d\'impression couleur avec format et nombre de copies.',
    version: '01',
    versionDate: '27 mai 2019',
    fields: [
      { key: 'printObject', label: 'Objet de l\'impression', type: 'textarea', required: true, placeholder: 'Décrivez le document à imprimer' },
      { key: 'copiesA4', label: 'Nombre de copies A4', type: 'number', required: true, min: 1, placeholder: '10' },
      { key: 'copiesA3', label: 'Nombre de copies A3', type: 'number', required: false, min: 0, placeholder: '0' },
    ],
    sections: ['Objet', 'Nombre de copies', 'Demandeur & Validation'],
  },

  ASSET: {
    code: 'ENR.SI.008',
    title: 'Demande d\'actifs informatiques',
    description: 'Formulaire de demande de matériel informatique, licences et accès réseau.',
    version: '01',
    versionDate: '03 mai 2024',
    fields: [
      { key: 'itAssets', label: 'Matériel informatique demandé', type: 'textarea', required: true, placeholder: 'Décrivez le matériel souhaité (type, quantité, spécifications)' },
      { key: 'softwareLicenses', label: 'Licences / Applications / Logiciels', type: 'textarea', required: false, placeholder: 'Listez les logiciels ou licences nécessaires' },
      { key: 'accessPrivileges', label: 'Accès et privilèges réseau', type: 'textarea', required: false, placeholder: 'Décrivez les accès réseau nécessaires' },
      { key: 'requestReason', label: 'Motif de la demande', type: 'textarea', required: true, placeholder: 'Expliquez pourquoi ce matériel est nécessaire' },
    ],
    sections: ['Informations demandeur', 'Demandes informatiques', 'Licences & Logiciels', 'Accès réseau', 'Motif', 'Date et Signature'],
  },

  CASH: {
    code: 'ENR.RF.002',
    title: 'Bon de Caisse',
    description: 'Formulaire de demande de décaissement avec pièces justificatives obligatoires.',
    version: '05',
    versionDate: '24 avril 2026',
    fields: [
      { key: 'motif', label: 'Motif de la dépense', type: 'textarea', required: true, placeholder: 'Décrivez le motif de la demande de caisse' },
      { key: 'amount', label: 'Montant demandé (FCFA)', type: 'number', required: true, min: 0, placeholder: '150000' },
    ],
    sections: ['Informations', 'Motif', 'Tableau des Frais', 'Signatures', 'Trésorerie', 'Bénéficiaire'],
    requirements: [
      'PDF du Bon de Caisse rempli (ENR.RF.002)',
      'Au moins 1 pièce justificative',
      'Montant ≤ 250 000 FCFA (sauf dérogation DGOF/DG)',
    ],
  },

  SUPPLY: {
    code: 'ENR.GA.003',
    title: 'Fiche de demande d\'approvisionnement',
    description: 'Formulaire de demande d\'approvisionnement avec articles, fournisseurs et devis.',
    version: '01',
    versionDate: '20 janvier 2019',
    fields: [
      { key: 'allocationSection', label: 'Rubrique d\'imputation', type: 'select', required: true, options: [
        'Frais commun Direction Générale', 'Frais commun Siège', 'Frais Travaux neufs',
        'Frais commun S.A.V', 'Magasin', 'Garage / Véhicule', 'Atelier S.A.V',
        'Travaux neufs', 'Contrat (0)', 'Dépannage (1)', 'Garantie totale (2)',
      ]},
      { key: 'expenseNature', label: 'Nature Dépenses', type: 'multi-checkbox', required: true, options: [
        'Fournitures Consommables', 'Outillage', 'Travaux Sous Traité', 'Investissements', 'Autres',
      ]},
      { key: 'items', label: 'Articles à commander', type: 'dynamic-table', required: true, columns: [
        { key: 'designation', label: 'Désignation', type: 'text', required: true },
        { key: 'quantity', label: 'Quantité', type: 'number', required: true, min: 1 },
        { key: 'price', label: 'Prix unitaire (FCFA)', type: 'number', required: true, min: 0 },
      ]},
      { key: 'supplier1', label: 'Fournisseur 1', type: 'text', required: true, placeholder: 'Ex: CFAO Motors' },
      { key: 'supplier2', label: 'Fournisseur 2', type: 'text', required: false },
      { key: 'supplier3', label: 'Fournisseur 3', type: 'text', required: false },
      { key: 'deliveryAddress', label: 'Adresse de livraison', type: 'textarea', required: true, placeholder: 'Ex: Bureau MCT Marcory, Zone 4...' },
      { key: 'offersAmount', label: 'Montant Offres (FCFA)', type: 'number', required: true, min: 0 },
    ],
    sections: ['Informations', 'Imputation', 'Nature Dépenses', 'Articles', 'Fournisseurs', 'Livraison', 'Signatures'],
    requirements: [
      'Devis ou proforma obligatoire',
      'Au moins 1 fournisseur',
      'Montant total calculé automatiquement',
    ],
  },

  OTHER: {
    code: 'AUTRE',
    title: 'Autre demande informatique',
    description: 'Formulaire générique pour les demandes IT non couvertes par les formulaires spécifiques.',
    version: '',
    versionDate: '',
    fields: [
      { key: 'description', label: 'Description de la demande', type: 'textarea', required: true, placeholder: 'Décrivez votre demande en détail' },
    ],
    sections: ['Identification du demandeur', 'Description', 'Date et Signature'],
  },
};

/**
 * Récupère le modèle complet pour un type de demande.
 */
function getDocumentTemplate(type) {
  const normalizedType = (type || '').toUpperCase();
  return DOCUMENT_TEMPLATES[normalizedType] || null;
}

/**
 * Récupère la liste de tous les modèles disponibles.
 */
function getAllTemplates() {
  return Object.entries(DOCUMENT_TEMPLATES).map(([type, template]) => ({
    type,
    code: template.code,
    title: template.title,
    description: template.description,
    fieldCount: template.fields.length,
    requiredFields: template.fields.filter(f => f.required).length,
  }));
}

/**
 * Pré-remplit les champs d'un modèle à partir des données existantes.
 */
function prefillTemplate(type, existingData = {}) {
  const template = getDocumentTemplate(type);
  if (!template) return {};

  const prefilled = {};
  for (const field of template.fields) {
    if (existingData[field.key] !== undefined) {
      prefilled[field.key] = existingData[field.key];
    }
  }
  return prefilled;
}

/**
 * Valide les données soumises contre le modèle.
 */
function validateAgainstTemplate(type, data) {
  const template = getDocumentTemplate(type);
  if (!template) return { valid: true, errors: [] };

  const errors = [];
  for (const field of template.fields) {
    if (field.required) {
      const value = data[field.key];
      if (value === undefined || value === null || value === '') {
        errors.push({ field: field.key, message: `Le champ "${field.label}" est requis` });
      }
    }
    if (field.type === 'number' && data[field.key] !== undefined) {
      const num = Number(data[field.key]);
      if (isNaN(num)) {
        errors.push({ field: field.key, message: `Le champ "${field.label}" doit être un nombre` });
      }
      if (field.min !== undefined && num < field.min) {
        errors.push({ field: field.key, message: `Le champ "${field.label}" doit être ≥ ${field.min}` });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { getDocumentTemplate, getAllTemplates, prefillTemplate, validateAgainstTemplate, DOCUMENT_TEMPLATES };
