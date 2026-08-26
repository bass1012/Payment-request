/**
 * Coordonnées et géométrie de la grille de signatures pour les documents PDF MCT IT.
 * Dimensions A4 standard pdf-lib : 595.275 x 841.89 points.
 */
const COORDINATES = {
  // Page index (0-based)
  pageIndex: 0,

  // Position Y et hauteur de la grille de signatures dans le tableau
  boxY: 328,
  boxHeight: 36,


  // Grille réelle du Bon de Caisse à 6 colonnes. Les bornes suivent
  // exactement les traits verticaux du formulaire A4 officiel.
  columns: {
    // 1- Demandeur
    requester: { left: 35, right: 127.5, centerX: 81.25 },
    // 2- Chef de Service / Chef de département
    chef_dept: { left: 127.5, right: 219.5, centerX: 173.5 },
    // 3- DO / MBD / DRH / DSC / DFM
    director: { left: 219.5, right: 304.5, centerX: 262 },
    director_dept: { left: 219.5, right: 304.5, centerX: 262 },
    // 4- DAF
    daf: { left: 304.5, right: 389.5, centerX: 347 },
    // 5- DGOF
    dgof: { left: 389.5, right: 475.5, centerX: 432.5 },
    // 6- DG
    dg: { left: 475.5, right: 560.5, centerX: 518 },
  },

  // Zone réservée à la signature du Trésorier (en bas à gauche)
  treasury: {
    x: 40,
    y: 45,
    width: 220,
    height: 42,
  },
};

module.exports = { COORDINATES };
