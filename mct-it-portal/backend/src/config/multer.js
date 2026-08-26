const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.doc', '.docx', '.xls', '.xlsx',
]);

/**
 * Magic bytes (signatures binaires) pour chaque type MIME.
 * Permet de vérifier le contenu réel du fichier, pas seulement
 * l'extension ou le MIME déclaré par le navigateur.
 */
const MAGIC_BYTES = {
  'application/pdf': [Buffer.from('%PDF')],
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  'image/webp': [Buffer.from('RIFF'), Buffer.from('WEBP', 4)], // offset 8 for WEBP
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
const MAX_FILES_PER_REQUEST = 21;
const QUARANTINE_DIR = 'quarantine';

/**
 * Vérifie la signature binaire d'un buffer.
 * @param {Buffer} buffer - Premiers octets du fichier
 * @param {string} mimetype - MIME déclaré
 * @returns {boolean}
 */
function validateMagicBytes(buffer, mimetype) {
  const expectedSignatures = MAGIC_BYTES[mimetype];
  if (!expectedSignatures) return true; // Pas de signature connue → on autorise (doc, xls)

  return expectedSignatures.some(sig => {
    if (sig.length === 4 && sig[0] === 0x89) {
      // PNG: check first 4 bytes
      return buffer.subarray(0, 4).equals(sig);
    }
    if (sig.toString('ascii') === 'RIFF') {
      // WebP: RIFF....WEBP
      return buffer.subarray(0, 4).equals(sig) && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    }
    return buffer.subarray(0, sig.length).equals(sig);
  });
}

/**
 * Déplace un fichier vers la quarantine en cas de signature invalide.
 */
function moveToQuarantine(filePath, destDir) {
  try {
    const fs = require('fs');
    const quarantinePath = path.join(destDir, QUARANTINE_DIR);
    fs.mkdirSync(quarantinePath, { recursive: true });
    const target = path.join(quarantinePath, path.basename(filePath));
    fs.renameSync(filePath, target);
  } catch {
    // Silently ignore quarantine errors
  }
}

/**
 * Détermine le Content-Disposition approprié pour un type de fichier.
 * Les types potentiellement exécutables ou non fiables sont servis en téléchargement forcé.
 */
function getContentDisposition(filename, mimetype) {
  const FORCED_DOWNLOAD_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]);

  const FORCED_DOWNLOAD_EXTENSIONS = new Set([
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.exe', '.bat', '.cmd', '.sh',
  ]);

  const ext = path.extname(filename).toLowerCase();

  if (FORCED_DOWNLOAD_TYPES.has(mimetype) || FORCED_DOWNLOAD_EXTENSIONS.has(ext)) {
    return `attachment; filename="${filename}"`;
  }

  return `inline; filename="${filename}"`;
}

/**
 * Storage sur disque avec noms uniques (UUID + index + nom original nettoyé).
 */
function createStorage(destDir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const fs = require('fs');
      fs.mkdirSync(destDir, { recursive: true });
      cb(null, destDir);
    },
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueName = `${crypto.randomUUID()}-${Date.now()}-${safeName}`;
      cb(null, uniqueName);
    },
  });
}

/**
 * Filtre MIME + extension + magic bytes.
 */
function createFileFilter(destDir) {
  return function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIMES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error(`Type de fichier non autorisé : ${file.originalname} (${file.mimetype})`));
      return;
    }

    // Pour les types avec magic bytes connus, on vérifie dans le event "after" du middleware
    // Car multer ne lit pas le contenu dans le diskStorage
    // La vérification se fait dans verifyMagicBytes middleware séparé
    cb(null, true);
  };
}

/**
 * Middleware pour vérifier la signature binaire des fichiers uploadés.
 * À placer après multer dans la chaîne middleware.
 */
function verifyMagicBytes(req, res, next) {
  if (!req.files) return next();

  const files = Array.isArray(req.files)
    ? req.files
    : Object.values(req.files).flat();

  const fs = require('fs');

  for (const file of files) {
    const filePath = file.path;
    const mimetype = file.mimetype;

    if (!MAGIC_BYTES[mimetype]) continue; // Pas de signature connue

    try {
      const buffer = Buffer.alloc(16);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);

      if (!validateMagicBytes(buffer, mimetype)) {
        // Déplacer vers quarantine
        moveToQuarantine(filePath, path.dirname(filePath));

        return res.status(422).json({
          error: `Le fichier "${file.originalname}" ne correspond pas au type déclaré (${mimetype}). Signature invalide.`,
          code: 'INVALID_FILE_SIGNATURE',
        });
      }
    } catch {
      // En cas d'erreur de lecture, on laisse passer (error handler global gérera)
    }
  }

  next();
}

/**
 * Upload PDF principal (un seul fichier).
 */
function uploadPdf(destDir) {
  return multer({
    storage: createStorage(destDir),
    fileFilter: createFileFilter(destDir),
    limits: { fileSize: MAX_FILE_SIZE },
  }).single('uploadedPdf');
}

/**
 * Upload pièces justificatives (jusqu'à 20 fichiers).
 */
function uploadAttachments(destDir) {
  return multer({
    storage: createStorage(destDir),
    fileFilter: createFileFilter(destDir),
    limits: { fileSize: MAX_FILE_SIZE, files: 20 },
  }).array('attachments', 20);
}

/**
 * Upload combiné : PDF + pièces jointes en une seule requête multipart.
 */
function uploadFiles(requestsDir, attachmentsDir) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, file, cb) => {
        const fs = require('fs');
        const dest = file.fieldname === 'uploadedPdf' ? requestsDir : attachmentsDir;
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (_req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueName = `${crypto.randomUUID()}-${Date.now()}-${safeName}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: createFileFilter(attachmentsDir),
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES_PER_REQUEST },
  }).fields([
    { name: 'uploadedPdf', maxCount: 1 },
    { name: 'attachments', maxCount: 20 },
  ]);
}

module.exports = {
  uploadPdf,
  uploadAttachments,
  uploadFiles,
  verifyMagicBytes,
  getContentDisposition,
  ALLOWED_MIMES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
};
