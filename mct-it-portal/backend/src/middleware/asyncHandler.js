/**
 * Wrapper pour capturer automatiquement les erreurs asynchrones
 * des handlers Express async/await et les transmettre au gestionnaire global.
 *
 * Utilisation:
 *   router.get('/path', asyncHandler(myAsyncHandler));
 *
 * Sans ce wrapper, une promesse rejetée dans un handler async
 * provoque un unhandledRejection qui peut faire crasher le process.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
