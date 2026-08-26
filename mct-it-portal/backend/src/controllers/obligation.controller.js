const {
  createObligation,
  listObligations,
  completeObligation,
} = require('../services/obligation.service');

async function getObligationsHandler(req, res) {
  const { status, requestId } = req.query;
  const obligations = await listObligations({
    assigneeEmail: req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.role === 'IT_ADMIN' ? undefined : req.user.email,
    status,
    requestId,
  });
  return res.json(obligations);
}

async function createObligationHandler(req, res) {
  const { requestId, title, description, assigneeEmail, dueDate } = req.body;
  try {
    const obligation = await createObligation({
      requestId,
      title,
      description,
      assigneeEmail: assigneeEmail || req.user.email,
      dueDate,
    });
    return res.status(201).json(obligation);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function completeObligationHandler(req, res) {
  const updated = await completeObligation(req.params.id);
  return res.json(updated);
}

module.exports = {
  getObligationsHandler,
  createObligationHandler,
  completeObligationHandler,
};
