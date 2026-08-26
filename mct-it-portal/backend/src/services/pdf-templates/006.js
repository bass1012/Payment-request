const { safeParseJSON, formatDateWithTime, escapeHtml, renderDocuSignHtmlStamp, htmlHead, mctHeader, refBand } = require('./pdf-base-layout');

function generateENR_SI_006(data) {
  const { request, requester, department, validations } = data;
  const fd = safeParseJSON(request.formData);

  function getVal(types) {
    const v = validations?.find(v => v.action === 'APPROVED' && types.some(t => v.stepLabel?.toLowerCase().includes(t)));
    return { name: v?.validatorName || '', date: v ? formatDateWithTime(v.createdAt) : '', signatureStyle: v?.signatureStyle || null, signatureImage: v?.signatureImage || null };
  }

  const val1 = getVal(['chef', 'service', 'department']);
  const val2 = getVal(['daf', 'financière', 'administrative']);

  return `<!DOCTYPE html>
<html lang="fr">
${htmlHead(`
  .objet-block { border: 1px solid #000; border-top: none; padding: 12px; min-height: 80px; font-size: 11px; white-space: pre-wrap; }
  .copies-table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
  .copies-table th { background: #d0d0d0; border: 1px solid #000; padding: 5px; text-align: center; }
  .copies-table td { border: 1px solid #000; padding: 8px; text-align: center; }
  .demandeur-table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
  .demandeur-table th { background: #d0d0d0; border: 1px solid #000; padding: 5px; text-align: center; font-size: 10px; }
  .demandeur-table td { border: 1px solid #000; padding: 8px; text-align: center; min-height: 50px; vertical-align: top; font-size: 10px; }
  .no-renseigner { color: #888; font-style: italic; }
`)}
<body>
<div class="page">
  ${mctHeader('ENR.SI.006', "DEMANDE D'IMPRESSION COULEUR")}
  ${refBand(request.reference, request.status, 'Version 01 du 27 mai 2019')}

  <div class="section-title">OBJET</div>
  <div class="objet-block">${escapeHtml(fd.printObject || fd.objet || '&nbsp;')}</div>

  <div class="section-title">NOMBRE DE COPIES</div>
  <table class="copies-table">
    <tr>
      <th>Format A4</th>
      <th>Format A3</th>
    </tr>
    <tr>
      <td style="font-size:14px;font-weight:bold;">${fd.copiesA4 || 0}</td>
      <td style="font-size:14px;font-weight:bold;">${fd.copiesA3 || 0}</td>
    </tr>
  </table>

  <div class="section-title">DEMANDEUR &amp; VALIDATION</div>
  <table class="demandeur-table">
    <tr>
      <th>Division</th>
      <th>N° ID <span class="no-renseigner">(Ne pas renseigner)</span></th>
      <th>Nom, Prénoms &amp; Signature</th>
      <th>Chef de Service</th>
      <th>DAF</th>
    </tr>
    <tr>
      <td>${escapeHtml(department?.name || fd.division || '&nbsp;')}</td>
      <td>${escapeHtml(request.reference)}</td>
      <td>${renderDocuSignHtmlStamp(`${escapeHtml(requester.firstName)} ${escapeHtml(requester.lastName)}`, formatDateWithTime(request.createdAt))}</td>
      <td>${renderDocuSignHtmlStamp(val1.name, val1.date, val1)}</td>
      <td>${renderDocuSignHtmlStamp(val2.name, val2.date, val2)}</td>
    </tr>
  </table>
</div>
</body></html>`;
}

module.exports = { generateENR_SI_006 };
