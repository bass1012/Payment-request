const { safeParseJSON, formatDateWithTime, escapeHtml, renderDocuSignHtmlStamp, htmlHead, mctHeader, refBand } = require('./pdf-base-layout');

function generateENR_GA_003(data) {
  const { request, requester, department, validations } = data;
  const fd = safeParseJSON(request.formData);

  function getValidation(types) {
    const v = validations?.find(v => types.some(t => v.stepLabel?.toLowerCase().includes(t)));
    return { name: v?.validatorName || '', date: v ? formatDateWithTime(v.createdAt) : '', signatureStyle: v?.signatureStyle || null, signatureImage: v?.signatureImage || null };
  }

  const val1 = { name: `${requester.firstName} ${requester.lastName}`, date: formatDateWithTime(request.createdAt) };
  const val2 = getValidation(['responsable informatique', 'service informatique', 'it']);
  const val3 = getValidation(['moyens généraux', 'moyens generaux', 'mg']);

  function renderCheck(option, selected) {
    const isChecked = Array.isArray(selected)
      ? selected.some(s => s.toLowerCase().trim() === option.toLowerCase().trim())
      : String(selected || '').toLowerCase().trim() === option.toLowerCase().trim();
    return isChecked
      ? `<span style="font-size: 14px; font-weight: bold; color: #1a3c6e;">&#9745;</span>`
      : `<span style="font-size: 14px; color: #777;">&#9744;</span>`;
  }

  const leftOptions = [
    'Frais commun Direction Générale', 'Frais commun Siège', 'Frais Travaux neufs',
    'Frais commun S.A.V', 'Magasin', 'Garage / Véhicule', 'Atelier S.A.V',
    'Travaux neufs', 'Contrat (0)', 'Dépannage (1)', 'Garantie totale (2)',
  ];

  const rightOptions = [
    'Fournitures Consommables', 'Outillage', 'Travaux Sous Traité',
    'Investissements', 'Autres',
  ];

  const items = fd.items || [];
  const displayRowsCount = Math.max(4, items.length);
  let itemsHtml = '';
  for (let i = 0; i < displayRowsCount; i++) {
    const item = items[i];
    const designation = item ? item.designation : '&nbsp;';
    const quantity = item ? item.quantity : '&nbsp;';
    const price = item && item.price ? `${parseFloat(item.price).toLocaleString('fr-FR')} FCFA` : '&nbsp;';
    itemsHtml += `
      <tr>
        <td style="border: 1px solid #000; padding: 4px 6px; text-align: left;">${escapeHtml(designation)}</td>
        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; width: 100px;">${escapeHtml(quantity)}</td>
        <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; width: 150px;">${escapeHtml(price)}</td>
      </tr>`;
  }

  const suppliers = fd.possibleSuppliers || [];
  const subcontractors = fd.consultedSubcontractors || [];

  return `<!DOCTYPE html>
<html lang="fr">
${htmlHead(`
  .details-container { margin-top: 12px; line-height: 1.5; font-size: 11px; }
  .details-row { display: flex; margin-bottom: 3px; }
  .details-label { font-weight: bold; width: 220px; }
  .details-value { border-bottom: 1px dotted #000; flex-grow: 1; }
  .split-tables { display: flex; justify-content: space-between; margin-top: 12px; gap: 15px; }
  .split-tables table { border-collapse: collapse; border: 1px solid #000; font-size: 10px; }
  .split-tables th { background: #1a3c6e; color: #fff; padding: 5px; font-weight: bold; text-align: left; }
  .split-tables td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
  .main-items-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-top: 12px; font-size: 10px; }
  .main-items-table th { background: #1a3c6e; color: #fff; padding: 6px; font-weight: bold; text-align: center; border: 1px solid #000; }
  .main-items-table td { border: 1px solid #000; padding: 5px 6px; }
  .bottom-info-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-top: 12px; font-size: 9.5px; }
  .bottom-info-table td { border: 1px solid #000; padding: 6px; vertical-align: top; }
  .bottom-label { font-weight: bold; margin-bottom: 4px; text-decoration: underline; }
  .validation-table { width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #000; margin-top: 12px; }
  .validation-table th { background: #d0d0d0; border: 1px solid #000; padding: 5px; text-align: center; font-size: 10px; }
  .validation-table td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 10px; min-height: 50px; vertical-align: top; }
  .val-name { font-weight: bold; font-size: 10.5px; margin-bottom: 2px; }
  .val-date { color: #555; font-size: 9px; }
`)}
<body>
<div class="page">
  <table class="header-table">
    <tr>
      <td class="logo-cell" rowspan="2">M.C.T.</td>
      <td class="title-cell">
        <div class="smq-band">SYSTEME DE MANAGEMENT QUALITE &nbsp;&nbsp; ENR.GA.003</div>
        <div class="title-main" style="margin-top:6px;">FICHE DE DEMANDE D'APPROVISIONNEMENT</div>
      </td>
      <td style="width:120px;text-align:center;font-size:9px; font-weight: bold;">
        M.C.T. Climatisation<br>M.C.T. Maintenance<br>M.C.T. Électricité
      </td>
    </tr>
  </table>
  ${refBand(request.reference, request.status, 'Version 01 du 20 janvier 2019')}

  <div class="details-container">
    <div class="details-row">
      <span class="details-label">DATE :</span>
      <span class="details-value">${escapeHtml(new Date(request.createdAt).toLocaleDateString('fr-FR'))}</span>
    </div>
    <div class="details-row">
      <span class="details-label">DIRECTION , DEPARTEMENT ou SERVICE :</span>
      <span class="details-value">${escapeHtml(department?.name || fd.department || '&nbsp;')}</span>
    </div>
    ${(fd.linkedAssets && fd.linkedAssets.length > 0) ? `
    <div class="details-row">
      <span class="details-label">DEMANDES D'ACTIFS LIÉES :</span>
      <span class="details-value" style="font-family: monospace; font-weight: bold; color: #1a3c6e;">${escapeHtml(fd.linkedAssets.map(a => a.ref).join(', '))}</span>
    </div>` : (fd.linkedAssetRequestRef ? `
    <div class="details-row">
      <span class="details-label">DEMANDE D'ACTIF LIÉE :</span>
      <span class="details-value" style="font-family: monospace; font-weight: bold; color: #1a3c6e;">${escapeHtml(fd.linkedAssetRequestRef)}</span>
    </div>` : '')}
  </div>

  <div class="split-tables">
    <table style="width: 55%;">
      <thead><tr><th colspan="2">Rubrique d'imputation / Section</th></tr></thead>
      <tbody>
        ${leftOptions.map(opt => `
          <tr>
            <td style="width: 30px; text-align: center; font-weight: bold;">${renderCheck(opt, fd.allocationSection)}</td>
            <td>${opt}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <table style="width: 40%; height: fit-content;">
      <thead><tr><th colspan="2">Nature Dépenses</th></tr></thead>
      <tbody>
        ${rightOptions.map(opt => `
          <tr>
            <td style="width: 30px; text-align: center; font-weight: bold;">${renderCheck(opt, fd.expenseNature)}</td>
            <td>${opt}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <table class="main-items-table">
    <thead><tr><th>DESIGNATION</th><th style="width: 100px;">QUANTITE</th><th style="width: 150px;">PRIX</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <table class="bottom-info-table">
    <tr>
      <td style="width: 50%;">
        <div class="bottom-label">Fournisseurs possibles :</div>
        <div style="line-height: 1.6; margin-top: 4px;">
          ${[0, 1, 2].map(idx => `<div>${idx + 1}. ${escapeHtml(suppliers[idx] || '...')}</div>`).join('')}
        </div>
      </td>
      <td style="width: 50%;">
        <div class="bottom-label">Montant Offres (Joindre Devis) :</div>
        <div style="font-size: 12px; font-weight: bold; margin-top: 8px; color: #1a3c6e;">
          ${fd.offersAmount ? `${parseFloat(fd.offersAmount).toLocaleString('fr-FR')} FCFA` : '...'}
        </div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="bottom-label">Sous-traitants consultés :</div>
        <div style="line-height: 1.6; margin-top: 4px;">
          ${[0, 1, 2].map(idx => `<div>${idx + 1}. ${escapeHtml(subcontractors[idx] || '...')}</div>`).join('')}
        </div>
      </td>
      <td>
        <div class="bottom-label">Adresse de livraison :</div>
        <div style="margin-top: 4px; white-space: pre-wrap;">${escapeHtml(fd.deliveryAddress || '...')}</div>
      </td>
    </tr>
  </table>

  <div style="margin-top: 15px; font-size: 10px; font-weight: bold; color: #555; text-align: right;">
    NB : Faire parvenir la Demande d'Approvisionnement au plus tard deux (2) jours avant la date
  </div>

  <table class="validation-table">
    <tr>
      <th>Signature du demandeur</th>
      <th>Signature du Responsable IT</th>
      <th>Signature des Moyens Généraux</th>
    </tr>
    <tr>
      <td>${renderDocuSignHtmlStamp(val1.name, val1.date, val1)}</td>
      <td>${renderDocuSignHtmlStamp(val2.name, val2.date, val2)}</td>
      <td>${renderDocuSignHtmlStamp(val3.name, val3.date, val3)}</td>
    </tr>
  </table>
</div>
</body></html>`;
}

module.exports = { generateENR_GA_003 };
