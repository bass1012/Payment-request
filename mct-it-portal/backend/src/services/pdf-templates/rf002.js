const { safeParseJSON, formatDateWithTime, escapeHtml, toValidationStamp, getValidationStampByStepType, renderDocuSignHtmlStamp, htmlHead, mctHeader, refBand } = require('./pdf-base-layout');

function generateENR_RF_002(data) {
  const { request, requester, department, validations } = data;
  const fd = safeParseJSON(request.formData);

  function getValidation(types) {
    const v = validations?.find(v => types.some(t => v.stepLabel?.toLowerCase().includes(t)));
    return toValidationStamp(v);
  }

  const val1 = { name: `${requester.firstName} ${requester.lastName}`, date: formatDateWithTime(request.createdAt) };
  const val2 = getValidation(['chef de département', 'chef de service']);
  const val3 = getValidation(['direction (', 'do', 'mbd', 'drh', 'dsc', 'dfm']);
  const val4 = getValidation(['daf', 'directeur administratif']);
  const val5 = getValidationStampByStepType(data, 'dgof');
  const val6 = getValidationStampByStepType(data, 'dg');

  const valTreasury = validations?.find(v => (v.stepLabel || '').toLowerCase().includes('trésorerie') || (v.stepLabel || '').toLowerCase().includes('paiement'));
  const treasuryName = valTreasury?.validatorName || '';
  const treasuryDate = valTreasury ? formatDateWithTime(valTreasury.createdAt) : '';

  let expenseItems = [];
  if (Array.isArray(fd.expenses) && fd.expenses.length > 0) {
    expenseItems = fd.expenses;
  } else if (Array.isArray(fd.items) && fd.items.length > 0) {
    expenseItems = fd.items;
  } else {
    expenseItems = [{
      nature: fd.motif || fd.description || fd.requestReason || 'Dépense / avance de caisse',
      amount: request.paymentAmount || fd.amount || 0,
    }];
  }
  while (expenseItems.length < 5) expenseItems.push({ nature: '', amount: '' });

  const formattedDate = formatDateWithTime(request.createdAt);
  const totalAmount = request.paymentAmount || fd.amount || (expenseItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0));

  return `<!DOCTYPE html>
<html lang="fr">
${htmlHead(`
  .page { padding: 10mm 12mm; }
  .qse-band { font-weight: bold; font-size: 11px; color: #0f42a6; margin-bottom: 2px; }
  .doc-ref { font-weight: bold; font-size: 10px; margin-bottom: 2px; }
  .main-title { font-weight: bold; font-size: 15px; color: #0a1c4a; letter-spacing: 0.5px; }
  .logos-right { width: 120px; text-align: center; font-size: 8px; font-weight: bold; }
  .version-band { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; font-size: 9.5px; font-weight: bold; margin-bottom: 12px; }
  .version-band td { border: 1px solid #000; padding: 3px 8px; text-align: center; }
  .info-block { margin-bottom: 10px; font-size: 10.5px; line-height: 1.6; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .val-highlight { font-weight: bold; color: #0a1c4a; padding: 0 4px; }
  .motif-section { margin-bottom: 10px; }
  .motif-title { font-weight: bold; font-size: 10.5px; margin-bottom: 4px; }
  .motif-box { border: 1px dotted #666; padding: 6px 8px; min-height: 45px; font-size: 10px; line-height: 1.5; white-space: pre-wrap; background: #fafafa; }
  .frais-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 6px; }
  .frais-table th { background: #e0e0e0; border: 1px solid #000; padding: 4px 6px; font-size: 10px; font-weight: bold; }
  .frais-table td { border: 1px solid #000; padding: 5px 6px; font-size: 10px; height: 22px; }
  .total-cell { font-weight: bold; text-align: right; background: #f5f5f5; }
  .note-text { font-size: 8.5px; font-style: italic; margin-bottom: 8px; line-height: 1.2; }
  .sig-table { width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #000; }
  .sig-table th { background: #e0e0e0; border: 1px solid #000; padding: 3px 2px; font-size: 8.5px; font-weight: bold; text-align: center; height: 24px; vertical-align: middle; }
  .sig-table td { border: 1px solid #000; padding: 4px 2px; text-align: center; vertical-align: middle; height: 48px; width: 16.66%; }
  .red-warning { color: #cc0000; font-size: 8.5px; font-style: italic; text-align: center; margin: 4px 0 10px 0; }
  .tresor-section-title { font-weight: bold; font-size: 11px; text-align: center; text-decoration: underline; margin-bottom: 4px; }
  .tresor-sub { color: #cc0000; font-size: 8.5px; font-style: italic; margin-bottom: 4px; }
  .tresor-grid { display: flex; gap: 10px; align-items: stretch; }
  .pieces-block { flex: 1.3; border: 1px solid #000; padding: 4px; }
  .pieces-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 6px; }
  .pieces-table th { background: #d9d9d9; border: 1px solid #000; padding: 3px; font-size: 8px; font-weight: bold; text-align: center; }
  .pieces-table td { border: 1px solid #000; padding: 3px 4px; font-size: 8.5px; }
  .benef-block { flex: 1; border: 1px solid #0f42a6; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; min-height: 140px; }
  .benef-title { font-weight: bold; font-size: 12px; text-align: center; text-decoration: underline; margin-bottom: 8px; color: #0a1c4a; }
`)}
<body>
<div class="page">
  <table class="header-table">
    <tr>
      <td class="logo-cell"><div style="font-size: 16px; font-weight: bold; color: #1a3c6e;">M.C.T.</div></td>
      <td class="title-cell">
        <div class="qse-band">SYSTEME DE MANAGEMENT QSE</div>
        <div class="doc-ref">ENR.RF.002</div>
        <div class="main-title">BON DE CAISSE</div>
      </td>
      <td class="logos-right">
        <span style="color:#e67e22;">MCT Électricité</span><br>
        <span style="color:#2980b9;">MCT Climatisation</span><br>
        <span style="color:#27ae60;">MCT Maintenance</span>
      </td>
    </tr>
  </table>
  <table class="version-band">
    <tr>
      <td style="width:33%;">Statut : Applicable</td>
      <td style="width:34%;">Version 05 du 24 avril 2026</td>
      <td style="width:33%;">Page 1 sur 1</td>
    </tr>
  </table>

  <div class="info-block">
    <div class="info-row">
      <div>Date : <span class="val-highlight">${formattedDate}</span></div>
      <div>N° d'ordre : <span class="val-highlight">${request.reference}</span></div>
    </div>
    <div class="info-row">
      <div style="width:60%;">Direction / Département : <span class="val-highlight">${escapeHtml(department?.name || fd.direction || fd.department || '...')}</span></div>
      <div style="width:38%;">Service : <span class="val-highlight">${escapeHtml(fd.service || department?.name || '...')}</span></div>
    </div>
    <div class="info-row">
      <div style="width:50%;">Chantier : <span class="val-highlight">${escapeHtml(fd.chantier || fd.site || '...')}</span></div>
      <div style="width:48%;">Chrono (obligatoire) : <span class="val-highlight">${escapeHtml(fd.chrono || request.reference)}</span></div>
    </div>
  </div>

  <div class="motif-section">
    <div class="motif-title">MOTIF (Renseignements à fournir obligatoirement)</div>
    <div class="motif-box">${escapeHtml(fd.motif || fd.description || fd.requestReason || '...')}</div>
  </div>

  <table class="frais-table">
    <thead><tr><th style="text-align:left; width:75%;">NATURE DES FRAIS (joindre justificatifs)</th><th style="text-align:right; width:25%;">MONTANT</th></tr></thead>
    <tbody>
      ${expenseItems.map(item => `
        <tr>
          <td>${escapeHtml(item.nature || item.description || '&nbsp;')}</td>
          <td style="text-align:right; font-weight:bold;">${item.amount ? `${Number(item.amount).toLocaleString('fr-FR')} FCFA` : '&nbsp;'}</td>
        </tr>`).join('')}
      <tr>
        <td class="total-cell">Total</td>
        <td style="text-align:right; font-weight:bold; font-size:11px; color:#0f42a6;">${totalAmount ? `${Number(totalAmount).toLocaleString('fr-FR')} FCFA` : '0 FCFA'}</td>
      </tr>
    </tbody>
  </table>

  <div class="note-text">
    <strong>Note :</strong> Les montants demandés « en espèces » ne doivent pas dépasser la somme de 250.000 FCFA, sauf dérogation préalable du DGOF ou DG avec les justificatifs afférents.
  </div>

  <table class="sig-table">
    <thead><tr>
      <th>DEMANDEUR</th><th>CHEF DE SERVICE / DEPARTEMENT</th><th>DO / MBD / DRH / DSC / DFM</th><th>DAF</th><th>DGOF</th><th>DG</th>
    </tr></thead>
    <tbody><tr>
      <td>${renderDocuSignHtmlStamp(val1.name, val1.date, val1)}</td>
      <td>${renderDocuSignHtmlStamp(val2.name, val2.date, val2)}</td>
      <td>${renderDocuSignHtmlStamp(val3.name, val3.date, val3)}</td>
      <td>${renderDocuSignHtmlStamp(val4.name, val4.date, val4)}</td>
      <td>${renderDocuSignHtmlStamp(val5.name, val5.date, val5)}</td>
      <td>${renderDocuSignHtmlStamp(val6.name, val6.date, val6)}</td>
    </tr></tbody>
  </table>
  <div class="red-warning">Le circuit de validation doit être respecté avec le nom et signature de chaque acteur.</div>

  <div class="tresor-section-title">RESERVEE A LA TRESORERIE</div>
  <div class="tresor-sub">Si achat fournisseur, veuillez-vous conformer à la disposition ci-dessous</div>

  <div class="tresor-grid">
    <div class="pieces-block">
      <div style="font-weight:bold; font-size:9px; text-align:center; background:#d9d9d9; padding:2px; margin-bottom:4px; border:1px solid #000;">SITUATION DES PIECES</div>
      <table class="pieces-table">
        <thead><tr><th style="width:40%;">Pièces *</th><th style="width:20%;">Justificatifs joints</th><th style="width:25%;">Justificatifs à produire sous 72h</th><th style="width:15%;">Statut</th></tr></thead>
        <tbody>
          <tr><td>Demande d'approvisionnement</td><td style="text-align:center;">${fd.hasAppro ? '✓' : ''}</td><td></td><td></td></tr>
          <tr><td>Devis / proforma</td><td style="text-align:center;">${fd.hasDevis ? '✓' : ''}</td><td></td><td></td></tr>
          <tr><td>Bon de commande</td><td style="text-align:center;">${fd.hasBC ? '✓' : ''}</td><td></td><td></td></tr>
          <tr><td>Facture / reçu</td><td style="text-align:center;">${fd.hasFacture ? '✓' : ''}</td><td></td><td></td></tr>
          <tr><td>Bon de livraison</td><td style="text-align:center;">${fd.hasBL ? '✓' : ''}</td><td></td><td></td></tr>
          <tr><td>Décompte / Relevé fournisseur</td><td style="text-align:center;">${fd.hasDecompte ? '✓' : ''}</td><td></td><td></td></tr>
        </tbody>
      </table>
      <div style="font-size:8px; line-height:1.4;">
        Nom : <strong>${treasuryName || '...'}</strong><br>
        Date : ${treasuryDate || '……/……/……'}<br>
        Signature : ${treasuryName ? `<span style="color:#15803d; font-weight:bold; font-size:8px;">✓ PAYÉ / REGLEMENT EFFECTUÉ (${treasuryName})</span>` : '...'}
      </div>
      <div style="font-size:7.5px; color:#cc0000; font-style:italic; margin-top:2px;">*La production des pièces est obligatoire pour la saisie comptable</div>
      <div style="font-size:8.5px; font-weight:bold; margin-top:4px;">SIGNATURE TRESORIER</div>
    </div>
    <div class="benef-block">
      <div class="benef-title">BENEFICIAIRE</div>
      <div style="font-size:10px; font-weight:bold; text-align:center; margin:6px 0;">Espèces reçues par</div>
      <div style="font-size:10.5px; text-align:center; border-bottom:1px dotted #000; padding-bottom:2px; font-weight:bold; color:#0a1c4a;">
        ${requester.firstName} ${requester.lastName}
      </div>
      <div style="font-size:9.5px; margin-top:12px;">
        Date : <strong>${treasuryDate ? treasuryDate.split(' à ')[0] : '……/……/……'}</strong><br>
        Signature : ${treasuryName ? `<span style="font-family:cursive, sans-serif; font-style:italic; color:#0a1c4a; font-weight:bold;">${requester.firstName} ${requester.lastName}</span>` : '...'}
      </div>
    </div>
  </div>
</div>
</body></html>`;
}

module.exports = { generateENR_RF_002 };
