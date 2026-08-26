const { safeParseJSON, formatDateWithTime, escapeHtml, toValidationStamp, getValidationStampByStepType, renderDocuSignHtmlStamp, htmlHead, mctHeader, refBand } = require('./pdf-base-layout');

function generateENR_SI_008(data) {
  const { request, requester, department, validations } = data;
  const fd = safeParseJSON(request.formData);

  function getValidation(types) {
    const v = validations?.find(v => types.some(t => v.stepLabel?.toLowerCase().includes(t)));
    return toValidationStamp(v);
  }

  const val1 = { name: `${requester.firstName} ${requester.lastName}`, date: formatDateWithTime(request.createdAt) };
  const val2 = getValidation(['chef de département', 'chef de service']);
  const val3 = getValidation(['direction (', 'do', 'mbd', 'drh', 'dsc', 'dfm']);
  const val4 = getValidationStampByStepType(data, 'dgof');
  const val5 = getValidationStampByStepType(data, 'dg');
  const val6 = getValidationStampByStepType(data, 'it');

  return `<!DOCTYPE html>
<html lang="fr">
${htmlHead(`
  .title-cell { text-align: center; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; margin-left: 8px; }
  .status-closed { background: #27ae60; color: #fff; }
  .status-rejected { background: #c0392b; color: #fff; }
  .status-pending { background: #e67e22; color: #fff; }
`)}
<body>
<div class="page">
  ${mctHeader('ENR.SI.008', 'DEMANDE DES ACTIFS INFORMATIQUES', 'rowspan="2"')}
  ${refBand(request.reference, request.status, 'Version 01 du 03 mai 2024')}

  <!-- Identité demandeur -->
  <div class="section-title">IDENTIFICATION DU DEMANDEUR</div>
  <table class="field-table">
    <tr>
      <td class="field-label">Matricule</td>
      <td>${escapeHtml(requester.matricule || '&nbsp;')}</td>
      <td class="field-label">Département / Service</td>
      <td>${escapeHtml(department?.name || '&nbsp;')}</td>
    </tr>
    <tr>
      <td class="field-label">Nom et Prénom</td>
      <td>${escapeHtml(requester.firstName)} ${escapeHtml(requester.lastName)}</td>
      <td class="field-label">Fonction</td>
      <td>${escapeHtml(requester.fonction || fd.fonction || '&nbsp;')}</td>
    </tr>
  </table>

  <!-- Demandes informatiques -->
  <div class="section-title">DEMANDES INFORMATIQUES</div>
  <div class="text-area-block">${escapeHtml(fd.itAssets || fd.demandesInformatiques || '&nbsp;')}</div>

  <!-- Licences / Applications / Logiciels -->
  <div class="section-title">LICENCES - APPLICATIONS - LOGICIELS</div>
  <div class="text-area-block">${escapeHtml(fd.softwareLicenses || fd.licencesApplications || '&nbsp;')}</div>

  <!-- Accès et privilèges -->
  <div class="section-title">ACCÈS ET PRIVILÈGE DE L'UTILISATEUR SUR SON ORDINATEUR ET LE RÉSEAU</div>
  <div class="text-area-block">${escapeHtml(fd.accessPrivileges || fd.accesPrivileges || '&nbsp;')}</div>

  <!-- Motif -->
  <div class="section-title">MOTIF DE LA DEMANDE</div>
  <div class="text-area-block">${escapeHtml(fd.requestReason || fd.motif || '&nbsp;')}</div>

  <!-- Validation -->
  <div class="section-title">DATE ET SIGNATURE</div>
  <table class="validation-table">
    <tr>
      <th>Demandeur</th>
      <th>Chef de département / Service</th>
      <th>Direction</th>
      <th>DGOF</th>
      <th>DG</th>
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

module.exports = { generateENR_SI_008 };
