const { validationResult } = require('express-validator');

/**
 * Middleware wrapper : exécute les validations express-validator
 * et retourne 400 si des erreurs sont détectées.
 *
 * @param {import('express-validator').ValidationChain[]} chains
 * @returns {Function[]} middleware array
 */
function validate(chains) {
  return [
    ...chains,
    (req, res, next) => {
      const errors = validationResult(req);
      if (errors.isEmpty()) return next();

      const formatted = errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      }));

      return res.status(400).json({
        error: 'Données invalides',
        details: formatted,
      });
    },
  ];
}

module.exports = { validate };
