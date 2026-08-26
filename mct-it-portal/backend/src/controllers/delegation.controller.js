const {
  createDelegation,
  listUserDelegations,
  revokeDelegation,
} = require('../services/delegation.service');

async function getDelegationsHandler(req, res) {
  const delegations = await listUserDelegations(req.user.id);
  return res.json(delegations);
}

async function createDelegationHandler(req, res) {
  const { delegateeEmail, startDate, endDate, scope, note } = req.body;

  try {
    const delegation = await createDelegation({
      delegatorId: req.user.id,
      delegateeEmail,
      startDate,
      endDate,
      scope,
      note,
    });
    return res.status(201).json(delegation);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function revokeDelegationHandler(req, res) {
  await revokeDelegation(req.params.id, req.user.id);
  return res.json({ success: true });
}

module.exports = {
  getDelegationsHandler,
  createDelegationHandler,
  revokeDelegationHandler,
};
