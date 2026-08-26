const { safeParseJSON, formatDateWithTime, escapeHtml, renderDocuSignHtmlStamp, htmlHead, mctHeader, refBand } = require('./pdf-base-layout');

function generateAUTRE(data) {
  const { request, requester, department, validations } = data;
  const fd = safeParseJSON(request.formData);

  function getVal(types) {
    const v = validations?.find(v => v.action === 'APPROVED' && types.some(t => v.stepLabel?.toLowerCase().includes(t)));
    return { name: v?.validatorName || '', date: v ? formatDateWithTime(v.createdAt) : '', signatureStyle: v?.signatureStyle || null, signatureImage: v?.signatureImage || null };
  }

  const val1 = getVal(['chef', 'service', 'department']);
  const val2 = getVal(['direction', 'director', 'do', 'daf', 'drh', 'dg', 'mbd']);
  const val3 = validations?.find(v => (v.stepLabel || '').toLowerCase().includes('informatique'));

  return `<!DOCTYPE html>
<html lang="fr">
${htmlHead(`
  .field-table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
  .field-table td { border: 1px solid #000; padding: 6px; }
  .field-label { font-weight: bold; width: 35%; background: #f0f0f0; }
  .text-area-block { border: 1px solid #000; border-top: none; padding: 10px; min-height: 80px; white-space: pre-wrap; }
  .validation-table { width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #000; margin-top: 10px; }
  .validation-table th { background: #d0d0d0; border: 1px solid #000; padding: 5px; text-align: center; font-size: 10px; }
  .validation-table td { border: 1px solid #000; padding: 8px; text-align: center; min-height: 50px; vertical-align: top; }
  .val-name { font-weight: bold; font-size: 11px; margin-bottom: 4px; }
  .val-date { color: #555; font-size: 10px; }
`)}
<body>
<div class="page">
  ${mctHeader('SYSTEME DE MANAGEMENT QUALITE', 'AUTRE DEMANDE INFORMATIQUE')}
  ${refBand(request.reference, request.status, '', new Date(request.createdAt).toLocaleDateString('fr-FR'))}

  <div class="section-title">IDENTIFICATION DU DEMANDEUR</div>
  <table class="field-table">
    <tr>
      <td class="field-label">Nom et Prénom</td>
      <td>${escapeHtml(requester.firstName)} ${escapeHtml(requester.lastName)}</td>
      <td class="field-label">Département / Service</td>
      <td>${escapeHtml(department?.name || '&nbsp;')}</td>
    </tr>
    <tr>
      <td class="field-label">Fonction</td>
      <td>${escapeHtml(requester.fonction || fd.fonction || '&nbsp;')}</td>
      <td class="field-label">Date</td>
      <td>${escapeHtml(new Date(request.createdAt).toLocaleDateString('fr-FR'))}</td>
    </tr>
  </table>

  <div class="section-title">DESCRIPTION DE LA DEMANDE</div>
  <div class="text-area-block">${escapeHtml(fd.description || fd.objet || '&nbsp;')}</div>

  <div class="section-title">DATE ET SIGNATURE</div>
  <table class="validation-table">
    <tr>
      <th>Demandeur</th>
      <th>Chef de Département</th>
      <th>Direction concernée</th>
      <th>Service Informatique</th>
    </tr>
    <tr>
      <td>${renderDocuSignHtmlStamp(`${escapeHtml(requester.firstName)} ${escapeHtml(requester.lastName)}`, formatDateWithTime(request.createdAt))}</td>
      <td>${renderDocuSignHtmlStamp(val1.name, val1.date, val1)}</td>
      <td>${renderDocuSignHtmlStamp(val2.name, val2.date, val2)}</td>
      <td>${renderDocuSignHtmlStamp(val3?.validatorName || '', val3 ? formatDateWithTime(val3.createdAt) : '', val3)}</td>
    </tr>
  </table>
</div>
</body></html>`;
}

module.exports = { generateAUTRE };
