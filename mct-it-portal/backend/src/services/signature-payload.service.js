const SIGNATURE_STYLES = new Set([
  'Dancing Script',
  'Great Vibes',
  'Alex Brush',
  'Pacifico',
  'Caveat',
  'Satisfy',
]);

const MAX_SIGNATURE_IMAGE_LENGTH = 500_000;
const PNG_DATA_URL_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
const INITIALS_PATTERN = /^[A-ZÀ-ÖØ-Þ0-9]{1,4}$/u;
const PNG_MAGIC_HEX = '89504e470d0a1a0a';

function normalizeOptionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseSignaturePayload(body = {}) {
  const signatureStyle = normalizeOptionalString(body.signatureStyle);
  const signatureImage = normalizeOptionalString(body.signatureImage);
  const signatureInitials = normalizeOptionalString(body.signatureInitials)?.toUpperCase() || null;

  if (signatureStyle && !SIGNATURE_STYLES.has(signatureStyle)) {
    throw new Error('Style de signature invalide.');
  }

  if (signatureImage) {
    if (signatureImage.length > MAX_SIGNATURE_IMAGE_LENGTH) {
      throw new Error('L’image de signature dépasse la taille maximale autorisée.');
    }
    if (!PNG_DATA_URL_PATTERN.test(signatureImage)) {
      throw new Error('L’image de signature doit être un PNG encodé en base64.');
    }
    const imageBytes = Buffer.from(signatureImage.slice(signatureImage.indexOf(',') + 1), 'base64');
    if (imageBytes.length < 8 || imageBytes.subarray(0, 8).toString('hex') !== PNG_MAGIC_HEX) {
      throw new Error('Le contenu de l’image de signature n’est pas un fichier PNG valide.');
    }
  }

  if (signatureInitials && !INITIALS_PATTERN.test(signatureInitials)) {
    throw new Error('Les initiales de signature sont invalides.');
  }

  return { signatureStyle, signatureImage, signatureInitials };
}

module.exports = {
  SIGNATURE_STYLES,
  MAX_SIGNATURE_IMAGE_LENGTH,
  parseSignaturePayload,
};
