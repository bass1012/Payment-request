const { safeParseJSON, formatDateWithTime, escapeHtml, getValidationStampByStepType, renderDocuSignHtmlStamp, htmlHead, mctHeader, refBand } = require('./pdf-base-layout');
const { getWorkflowSteps } = require('../../config/departments');

function generateENR_SI_005(data) {
  const { request, requester, department } = data;
  const fd = safeParseJSON(request.formData);
  const workflowSteps = getWorkflowSteps(request.type, department);
  // Pour les services DG, l'étape direction est remplacée par DSC
  const directionStep = workflowSteps.find(step => step.type === 'dsc' || step.type === 'director');
  const val1 = getValidationStampByStepType(data, 'chef_dept');
  const val2 = getValidationStampByStepType(data, 'rh');
  const val3 = getValidationStampByStepType(data, 'dsc') || getValidationStampByStepType(data, 'director');
  const val4 = getValidationStampByStepType(data, 'dgof');
  const val5 = getValidationStampByStepType(data, 'dg');
  const val6 = getValidationStampByStepType(data, 'it');

  return `<!DOCTYPE html>
<html lang="fr">
${htmlHead(`
  .memo-row td { padding: 8px; border: 1px solid #000; }
`)}
<body>
<div class="page">
  ${mctHeader('ENR.SI.005', "CRÉATION D'ADRESSE ÉLECTRONIQUE")}
  ${refBand(request.reference, request.status, 'Version 01 du 16 mai 2019')}

  <div class="section-title">INFORMATIONS DEMANDEUR</div>
  <table class="field-table">
    <tr>
      <td class="field-label">Matricule</td>
      <td>${escapeHtml(requester.matricule || fd.matricule || '&nbsp;')}</td>
      <td class="field-label">Division</td>
      <td>${escapeHtml(department?.name || fd.division || '&nbsp;')}</td>
    </tr>
    <tr>
      <td class="field-label">Nom & Prénoms</td>
      <td colspan="3">${escapeHtml(requester.firstName)} ${escapeHtml(requester.lastName)}</td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-top:8px;">
    <tr class="memo-row">
      <td style="border:1px solid #000;padding:6px;font-weight:bold;background:#f0f0f0;width:35%;">Numéro Mémo</td>
      <td style="border:1px solid #000;padding:6px;">${escapeHtml(fd.memoNumber || fd.numeroMemo || '&nbsp;')}</td>
    </tr>
  </table>

  <div class="section-title" style="margin-top:20px;">DATE & VISA</div>
  <table class="validation-table">
    <tr>
      <th>Superviseur de l'Utilisateur</th>
      <th>Ressources Humaines</th>
      <th>${escapeHtml(directionStep?.label || 'Direction concernée (DO / DFM / MBD / DSC / DAF)')}</th>
      <th>DGOF</th>
      <th>Direction Générale</th>
      <th>Responsable Informatique</th>
    </tr>
    <tr>
      <td>${renderDocuSignHtmlStamp(val1.name, val1.date, val1)}</td>
      <td>${renderDocuSignHtmlStamp(val2.name, val2.date, val2)}</td>
      <td>${renderDocuSignHtmlStamp(val3.name, val3.date, val3)}</td>
      <td>${renderDocuSignHtmlStamp(val4.name, val4.date, val4)}</td>
      <td>${renderDocuSignHtmlStamp(val5.name, val5.date, val5)}</td>
      <td>${renderDocuSignHtmlStamp(val6.name, val6.date, val6)}</td>
    </tr>
  </table>
</div>
</body></html>`;
}

module.exports = { generateENR_SI_005 };
