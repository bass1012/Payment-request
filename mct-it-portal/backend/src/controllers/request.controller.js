const {
  listRequests,
  getRequest,
  getStats,
  exportRequestsCSV,
  downloadAuditCertificate,
} = require('./request-query.controller');
const {
  createRequest,
  createDraft,
  getLatestDraft,
  updateDraft,
  submitDraft,
} = require('./request-submission.controller');
const {
  validateRequest,
  closeRequestHandler,
} = require('./request-validation.controller');
const {
  deleteRequest,
  cancelRequest,
  updateRequest,
  reviseRequest,
  serveUploadSecure,
} = require('./request-lifecycle.controller');

module.exports = {
  listRequests,
  getRequest,
  createRequest,
  createDraft,
  getLatestDraft,
  updateDraft,
  submitDraft,
  validateRequest,
  closeRequestHandler,
  getStats,
  exportRequestsCSV,
  downloadAuditCertificate,
  deleteRequest,
  cancelRequest,
  updateRequest,
  reviseRequest,
  serveUploadSecure,
};

