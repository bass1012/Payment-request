import type { RequestType } from '../types'

export interface RequestFormSectionDefinition {
  id: string
  label: string
  description: string
  fields: string[]
}

const PROFILE_SECTION: RequestFormSectionDefinition = {
  id: 'profile',
  label: 'Profil',
  description: 'Identité et service',
  fields: ['matricule', 'department', 'firstName', 'lastName', 'position'],
}

const DOCUMENTS_SECTION: RequestFormSectionDefinition = {
  id: 'documents',
  label: 'Documents',
  description: 'Pièces et récapitulatif',
  fields: ['uploadedPdf', 'attachments'],
}

export const REQUEST_FORM_SECTIONS: Record<RequestType, RequestFormSectionDefinition[]> = {
  EMAIL: [
    PROFILE_SECTION,
    {
      id: 'details',
      label: 'Détails',
      description: 'Référence du mémo',
      fields: ['memoNumber'],
    },
    DOCUMENTS_SECTION,
  ],
  OTHER: [
    PROFILE_SECTION,
    {
      id: 'details',
      label: 'Description',
      description: 'Besoin à traiter',
      fields: ['description'],
    },
    DOCUMENTS_SECTION,
  ],
  PRINT: [
    PROFILE_SECTION,
    {
      id: 'details',
      label: 'Impression',
      description: 'Objet, formats et quantités',
      fields: ['printObject', 'copiesA4', 'copiesA3'],
    },
    DOCUMENTS_SECTION,
  ],
  ASSET: [
    PROFILE_SECTION,
    {
      id: 'details',
      label: 'Besoins IT',
      description: 'Matériel, accès et motif',
      fields: ['itAssets', 'softwareLicenses', 'accessPrivileges', 'requestReason'],
    },
    DOCUMENTS_SECTION,
  ],
  CASH: [
    PROFILE_SECTION,
    {
      id: 'financial',
      label: 'Détails financiers',
      description: 'Montant et motif',
      fields: ['paymentAmount', 'requestReason'],
    },
    {
      id: 'cash-pdf',
      label: 'Bon de caisse',
      description: 'Document PDF rempli',
      fields: ['uploadedPdf'],
    },
    {
      ...DOCUMENTS_SECTION,
      fields: ['attachments'],
    },
  ],
  SUPPLY: [
    PROFILE_SECTION,
    {
      id: 'allocation',
      label: 'Imputation',
      description: 'Rubrique, nature et actifs liés',
      fields: ['allocationSection', 'expenseNature'],
    },
    {
      id: 'items',
      label: 'Articles',
      description: 'Désignations, quantités et prix',
      fields: ['items'],
    },
    {
      id: 'consultation',
      label: 'Consultation',
      description: 'Fournisseurs et sous-traitants',
      fields: [
        'supplier1',
        'supplier2',
        'supplier3',
        'subcontractor1',
        'subcontractor2',
        'subcontractor3',
      ],
    },
    {
      id: 'delivery',
      label: 'Livraison',
      description: 'Adresse, budget et devis',
      fields: ['deliveryAddress', 'offersAmount', 'attachments'],
    },
  ],
}

export function findSectionForField(type: RequestType, field: string) {
  return REQUEST_FORM_SECTIONS[type].find((section) => section.fields.includes(field))
}
