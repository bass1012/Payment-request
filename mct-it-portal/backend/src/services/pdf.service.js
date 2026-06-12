/**
 * Template HTML — ENR.SI.008 — Demande des actifs informatiques
 * Fidèle au format officiel MCT
 */
function generateENR_SI_008(data) {
  const { request, requester, department, validations } = data;
  const fd = request.formData || {};

  const steps = [
    { label: 'Demandeur', key: 'requester' },
    { label: 'Chef de département / Service', key: 'chef_dept' },
    { label: 'DO / DMBD / DRH / DAF', key: 'director' },
    { label: 'Directeur Général', key: 'dg' },
  ];

  function getValidation(types) {
    const v = validations?.find(v => types.includes(v.stepLabel?.toLowerCase()) || types.some(t => v.stepLabel?.toLowerCase().includes(t)));
    if (!v || v.action !== 'APPROVED') return { name: '', date: '' };
    return {
      name: v.validatorName || '',
      date: v.createdAt ? new Date(v.createdAt).toLocaleDateString('fr-FR') : '',
    };
  }

  const val1 = { name: `${requester.firstName} ${requester.lastName}`, date: new Date(request.createdAt).toLocaleDateString('fr-FR') };
  const val2 = getValidation(['chef', 'department', 'service']);
  const val3 = getValidation(['do', 'dmbd', 'drh', 'daf', 'director', 'direction']);
  const val4 = getValidation(['général', 'dg', 'general']);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 15mm; }
  .header-table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
  .header-table td { border: 1px solid #000; padding: 6px; vertical-align: middle; }
  .logo-cell { width: 80px; text-align: center; font-weight: bold; font-size: 16px; color: #1a3c6e; }
  .title-cell { text-align: center; }
  .title-main { font-weight: bold; font-size: 13px; color: #1a3c6e; }
  .smq-band { background: #1a3c6e; color: #fff; text-align: center; font-weight: bold; font-size: 11px; padding: 4px; }
  .ref-band { display: flex; justify-content: space-between; border: 1px solid #000; border-top: none; font-size: 10px; }
  .ref-band span { padding: 3px 8px; border-right: 1px solid #000; }
  .ref-band span:last-child { border-right: none; }
  .section-title { background: #d0d0d0; font-weight: bold; padding: 5px 8px; margin-top: 10px; border: 1px solid #000; font-size: 11px; }
  .field-table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
  .field-table td { border: 1px solid #000; padding: 6px; }
  .field-label { font-weight: bold; width: 35%; background: #f0f0f0; }
  .text-area-block { border: 1px solid #000; border-top: none; padding: 8px; min-height: 60px; font-size: 11px; white-space: pre-wrap; }
  .validation-table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
  .validation-table th { background: #d0d0d0; border: 1px solid #000; padding: 5px; text-align: center; font-size: 10px; }
  .validation-table td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 10px; min-height: 50px; vertical-align: top; }
  .val-name { font-weight: bold; font-size: 11px; margin-bottom: 4px; }
  .val-date { color: #555; font-size: 10px; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; margin-left: 8px; }
  .status-closed { background: #27ae60; color: #fff; }
  .status-rejected { background: #c0392b; color: #fff; }
  .status-pending { background: #e67e22; color: #fff; }
</style>
</head>
<body>
<div class="page">

  <!-- En-tête officiel MCT -->
  <table class="header-table">
    <tr>
      <td class="logo-cell" rowspan="2">M.C.T.</td>
      <td class="title-cell">
        <div class="smq-band">SYSTEME DE MANAGEMENT QUALITE &nbsp;&nbsp; ENR.SI.008</div>
        <div class="title-main" style="margin-top:6px;">DEMANDE DES ACTIFS INFORMATIQUES</div>
      </td>
      <td style="width:120px;text-align:center;font-size:9px;">MCT Électricité<br>MCT Climatisation<br>MCT Maintenance</td>
    </tr>
  </table>
  <div class="ref-band">
    <span>Statut : Applicable</span>
    <span>Version 01 du 03 mai 2024</span>
    <span>Page 1 sur 1</span>
    <span>Référence : <strong>${request.reference}</strong>${getStatusBadge(request.status)}</span>
  </div>

  <!-- Identité demandeur -->
  <div class="section-title">IDENTIFICATION DU DEMANDEUR</div>
  <table class="field-table">
    <tr>
      <td class="field-label">Matricule</td>
      <td>${requester.matricule || '&nbsp;'}</td>
      <td class="field-label">Département / Service</td>
      <td>${department?.name || '&nbsp;'}</td>
    </tr>
    <tr>
      <td class="field-label">Nom et Prénom</td>
      <td>${requester.firstName} ${requester.lastName}</td>
      <td class="field-label">Fonction</td>
      <td>${requester.fonction || fd.fonction || '&nbsp;'}</td>
    </tr>
  </table>

  <!-- Demandes informatiques -->
  <div class="section-title">DEMANDES INFORMATIQUES</div>
  <div class="text-area-block">${fd.demandesInformatiques || '&nbsp;'}</div>

  <!-- Licences / Applications / Logiciels -->
  <div class="section-title">LICENCES - APPLICATIONS - LOGICIELS</div>
  <div class="text-area-block">${fd.licencesApplications || '&nbsp;'}</div>

  <!-- Accès et privilèges -->
  <div class="section-title">ACCÈS ET PRIVILÈGE DE L'UTILISATEUR SUR SON ORDINATEUR ET LE RÉSEAU</div>
  <div class="text-area-block">${fd.accesPrivileges || '&nbsp;'}</div>

  <!-- Motif -->
  <div class="section-title">MOTIF DE LA DEMANDE</div>
  <div class="text-area-block">${fd.motif || '&nbsp;'}</div>

  <!-- Validation -->
  <div class="section-title">DATE ET SIGNATURE</div>
  <table class="validation-table">
    <tr>
      <th>Demandeur</th>
      <th>Chef de département / Service</th>
      <th>DO / DMBD / DRH / DAF</th>
      <th>Directeur Général</th>
    </tr>
    <tr>
      <td><div class="val-name">${val1.name}</div><div class="val-date">${val1.date}</div></td>
      <td><div class="val-name">${val2.name}</div><div class="val-date">${val2.date}</div></td>
      <td><div class="val-name">${val3.name}</div><div class="val-date">${val3.date}</div></td>
      <td><div class="val-name">${val4.name}</div><div class="val-date">${val4.date}</div></td>
    </tr>
  </table>

</div>
</body></html>`;
}

/**
 * Template HTML — ENR.SI.005 — Création d'adresse électronique
 */
function generateENR_SI_005(data) {
  const { request, requester, department, validations } = data;
  const fd = request.formData || {};

  function getVal(types) {
    const v = validations?.find(v => v.action === 'APPROVED' && types.some(t => v.stepLabel?.toLowerCase().includes(t)));
    if (!v) return { name: '', date: '' };
    return { name: v.validatorName || '', date: v.createdAt ? new Date(v.createdAt).toLocaleDateString('fr-FR') : '' };
  }

  const val1 = getVal(['superviseur', 'chef', 'department', 'service']);
  const val2 = getVal(['ressources humaines', 'drh']);
  const val3 = getVal(['opérations', 'do']);
  const val4 = getVal(['général', 'dg']);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 15mm; }
  .header-table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
  .header-table td { border: 1px solid #000; padding: 6px; vertical-align: middle; }
  .logo-cell { width: 80px; text-align: center; font-weight: bold; font-size: 16px; color: #1a3c6e; }
  .smq-band { background: #1a3c6e; color: #fff; text-align: center; font-weight: bold; font-size: 11px; padding: 4px; }
  .title-main { font-weight: bold; font-size: 13px; color: #1a3c6e; text-align: center; margin-top: 6px; }
  .ref-band { display: flex; justify-content: space-between; border: 1px solid #000; border-top: none; font-size: 10px; }
  .ref-band span { padding: 3px 8px; border-right: 1px solid #000; }
  .ref-band span:last-child { border-right: none; }
  .section-title { background: #d0d0d0; font-weight: bold; padding: 5px 8px; margin-top: 10px; border: 1px solid #000; font-size: 11px; }
  .field-table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
  .field-table td { border: 1px solid #000; padding: 6px; }
  .field-label { font-weight: bold; width: 35%; background: #f0f0f0; }
  .memo-row td { padding: 8px; border: 1px solid #000; }
  .validation-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-top: 10px; }
  .validation-table th { background: #d0d0d0; border: 1px solid #000; padding: 5px; text-align: center; font-size: 10px; }
  .validation-table td { border: 1px solid #000; padding: 8px; text-align: center; min-height: 50px; vertical-align: top; }
  .val-name { font-weight: bold; font-size: 11px; margin-bottom: 4px; }
  .val-date { color: #555; font-size: 10px; }
</style>
</head>
<body>
<div class="page">
  <table class="header-table">
    <tr>
      <td class="logo-cell">M.C.T.</td>
      <td>
        <div class="smq-band">SYSTEME DE MANAGEMENT QUALITE &nbsp;&nbsp; ENR.SI.005</div>
        <div class="title-main">CRÉATION D'ADRESSE ÉLECTRONIQUE</div>
      </td>
      <td style="width:120px;text-align:center;font-size:9px;">MCT Électricité<br>MCT Climatisation<br>MCT Maintenance</td>
    </tr>
  </table>
  <div class="ref-band">
    <span>Statut : Applicable</span>
    <span>Version 01 du 16 mai 2019</span>
    <span>Page 1 sur 1</span>
    <span>Référence : <strong>${request.reference}</strong>${getStatusBadge(request.status)}</span>
  </div>

  <div class="section-title">INFORMATIONS DEMANDEUR</div>
  <table class="field-table">
    <tr>
      <td class="field-label">Matricule</td>
      <td>${requester.matricule || fd.matricule || '&nbsp;'}</td>
      <td class="field-label">Division</td>
      <td>${department?.name || fd.division || '&nbsp;'}</td>
    </tr>
    <tr>
      <td class="field-label">Nom & Prénoms</td>
      <td colspan="3">${requester.firstName} ${requester.lastName}</td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-top:8px;">
    <tr class="memo-row">
      <td style="border:1px solid #000;padding:6px;font-weight:bold;background:#f0f0f0;width:35%;">Numéro Mémo</td>
      <td style="border:1px solid #000;padding:6px;">${fd.numeroMemo || '&nbsp;'}</td>
    </tr>
  </table>

  <div class="section-title" style="margin-top:20px;">DATE & VISA</div>
  <table class="validation-table">
    <tr>
      <th>Superviseur de l'Utilisateur</th>
      <th>Ressources Humaines</th>
      <th>Directeur des Opérations</th>
      <th>Direction Générale</th>
    </tr>
    <tr>
      <td><div class="val-name">${val1.name}</div><div class="val-date">${val1.date}</div></td>
      <td><div class="val-name">${val2.name}</div><div class="val-date">${val2.date}</div></td>
      <td><div class="val-name">${val3.name}</div><div class="val-date">${val3.date}</div></td>
      <td><div class="val-name">${val4.name}</div><div class="val-date">${val4.date}</div></td>
    </tr>
  </table>
</div>
</body></html>`;
}

/**
 * Template HTML — ENR.SI.006 — Demande d'impression couleur
 */
function generateENR_SI_006(data) {
  const { request, requester, department, validations } = data;
  const fd = request.formData || {};

  function getVal(types) {
    const v = validations?.find(v => v.action === 'APPROVED' && types.some(t => v.stepLabel?.toLowerCase().includes(t)));
    if (!v) return { name: '', date: '' };
    return { name: v.validatorName || '', date: v.createdAt ? new Date(v.createdAt).toLocaleDateString('fr-FR') : '' };
  }

  const val1 = getVal(['chef', 'service', 'department']);
  const val2 = getVal(['daf', 'financière', 'administrative']);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 15mm; }
  .header-table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
  .header-table td { border: 1px solid #000; padding: 6px; vertical-align: middle; }
  .logo-cell { width: 80px; text-align: center; font-weight: bold; font-size: 16px; color: #1a3c6e; }
  .smq-band { background: #1a3c6e; color: #fff; text-align: center; font-weight: bold; font-size: 11px; padding: 4px; }
  .title-main { font-weight: bold; font-size: 13px; color: #1a3c6e; text-align: center; margin-top: 6px; }
  .ref-band { display: flex; justify-content: space-between; border: 1px solid #000; border-top: none; font-size: 10px; }
  .ref-band span { padding: 3px 8px; border-right: 1px solid #000; }
  .ref-band span:last-child { border-right: none; }
  .section-title { background: #d0d0d0; font-weight: bold; padding: 5px 8px; margin-top: 10px; border: 1px solid #000; font-size: 11px; }
  .objet-block { border: 1px solid #000; border-top: none; padding: 12px; min-height: 80px; font-size: 11px; white-space: pre-wrap; }
  .copies-table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
  .copies-table th { background: #d0d0d0; border: 1px solid #000; padding: 5px; text-align: center; }
  .copies-table td { border: 1px solid #000; padding: 8px; text-align: center; }
  .demandeur-table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
  .demandeur-table th { background: #d0d0d0; border: 1px solid #000; padding: 5px; text-align: center; font-size: 10px; }
  .demandeur-table td { border: 1px solid #000; padding: 8px; text-align: center; min-height: 50px; vertical-align: top; font-size: 10px; }
  .val-name { font-weight: bold; font-size: 11px; margin-bottom: 4px; }
  .val-date { color: #555; font-size: 10px; }
  .no-renseigner { color: #888; font-style: italic; }
</style>
</head>
<body>
<div class="page">
  <table class="header-table">
    <tr>
      <td class="logo-cell">M.C.T.</td>
      <td>
        <div class="smq-band">SYSTEME DE MANAGEMENT QUALITE &nbsp;&nbsp; ENR.SI.006</div>
        <div class="title-main">DEMANDE D'IMPRESSION COULEUR</div>
      </td>
      <td style="width:120px;text-align:center;font-size:9px;">MCT Électricité<br>MCT Climatisation<br>MCT Maintenance</td>
    </tr>
  </table>
  <div class="ref-band">
    <span>Statut : Applicable</span>
    <span>Version 01 du 27 mai 2019</span>
    <span>Page 1 sur 1</span>
    <span>Référence : <strong>${request.reference}</strong>${getStatusBadge(request.status)}</span>
  </div>

  <div class="section-title">OBJET</div>
  <div class="objet-block">${fd.objet || '&nbsp;'}</div>

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
      <td>${department?.name || fd.division || '&nbsp;'}</td>
      <td>${request.reference}</td>
      <td><div class="val-name">${requester.firstName} ${requester.lastName}</div></td>
      <td><div class="val-name">${val1.name}</div><div class="val-date">${val1.date}</div></td>
      <td><div class="val-name">${val2.name}</div><div class="val-date">${val2.date}</div></td>
    </tr>
  </table>
</div>
</body></html>`;
}

/**
 * Template HTML — Autre demande IT
 */
function generateAUTRE(data) {
  const { request, requester, department, validations } = data;
  const fd = request.formData || {};

  function getVal(types) {
    const v = validations?.find(v => v.action === 'APPROVED' && types.some(t => v.stepLabel?.toLowerCase().includes(t)));
    if (!v) return { name: '', date: '' };
    return { name: v.validatorName || '', date: v.createdAt ? new Date(v.createdAt).toLocaleDateString('fr-FR') : '' };
  }

  const val1 = getVal(['chef', 'service', 'department']);
  const val2 = getVal(['direction', 'director', 'do', 'daf', 'drh', 'dg', 'mbd']);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 15mm; }
  .header-table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
  .header-table td { border: 1px solid #000; padding: 6px; vertical-align: middle; }
  .logo-cell { width: 80px; text-align: center; font-weight: bold; font-size: 16px; color: #1a3c6e; }
  .smq-band { background: #1a3c6e; color: #fff; text-align: center; font-weight: bold; font-size: 11px; padding: 4px; }
  .title-main { font-weight: bold; font-size: 13px; color: #1a3c6e; text-align: center; margin-top: 6px; }
  .ref-band { display: flex; justify-content: space-between; border: 1px solid #000; border-top: none; font-size: 10px; }
  .ref-band span { padding: 3px 8px; border-right: 1px solid #000; }
  .ref-band span:last-child { border-right: none; }
  .section-title { background: #d0d0d0; font-weight: bold; padding: 5px 8px; margin-top: 10px; border: 1px solid #000; font-size: 11px; }
  .field-table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
  .field-table td { border: 1px solid #000; padding: 6px; }
  .field-label { font-weight: bold; width: 35%; background: #f0f0f0; }
  .text-area-block { border: 1px solid #000; border-top: none; padding: 10px; min-height: 80px; white-space: pre-wrap; }
  .validation-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-top: 10px; }
  .validation-table th { background: #d0d0d0; border: 1px solid #000; padding: 5px; text-align: center; font-size: 10px; }
  .validation-table td { border: 1px solid #000; padding: 8px; text-align: center; min-height: 50px; vertical-align: top; }
  .val-name { font-weight: bold; font-size: 11px; margin-bottom: 4px; }
  .val-date { color: #555; font-size: 10px; }
</style>
</head>
<body>
<div class="page">
  <table class="header-table">
    <tr>
      <td class="logo-cell">M.C.T.</td>
      <td>
        <div class="smq-band">SYSTEME DE MANAGEMENT QUALITE</div>
        <div class="title-main">AUTRE DEMANDE INFORMATIQUE</div>
      </td>
      <td style="width:120px;text-align:center;font-size:9px;">MCT Électricité<br>MCT Climatisation<br>MCT Maintenance</td>
    </tr>
  </table>
  <div class="ref-band">
    <span>Statut : Applicable</span>
    <span>Date : ${new Date(request.createdAt).toLocaleDateString('fr-FR')}</span>
    <span>Page 1 sur 1</span>
    <span>Référence : <strong>${request.reference}</strong>${getStatusBadge(request.status)}</span>
  </div>

  <div class="section-title">IDENTIFICATION DU DEMANDEUR</div>
  <table class="field-table">
    <tr>
      <td class="field-label">Nom et Prénom</td>
      <td>${requester.firstName} ${requester.lastName}</td>
      <td class="field-label">Département / Service</td>
      <td>${department?.name || '&nbsp;'}</td>
    </tr>
    <tr>
      <td class="field-label">Fonction</td>
      <td>${requester.fonction || fd.fonction || '&nbsp;'}</td>
      <td class="field-label">Date</td>
      <td>${new Date(request.createdAt).toLocaleDateString('fr-FR')}</td>
    </tr>
  </table>

  <div class="section-title">DESCRIPTION DE LA DEMANDE</div>
  <div class="text-area-block">${fd.description || fd.objet || '&nbsp;'}</div>

  <div class="section-title">DATE ET SIGNATURE</div>
  <table class="validation-table">
    <tr>
      <th>Demandeur</th>
      <th>Chef de Département</th>
      <th>Direction concernée</th>
      <th>Service Informatique</th>
    </tr>
    <tr>
      <td><div class="val-name">${requester.firstName} ${requester.lastName}</div><div class="val-date">${new Date(request.createdAt).toLocaleDateString('fr-FR')}</div></td>
      <td><div class="val-name">${val1.name}</div><div class="val-date">${val1.date}</div></td>
      <td><div class="val-name">${val2.name}</div><div class="val-date">${val2.date}</div></td>
      <td>&nbsp;</td>
    </tr>
  </table>
</div>
</body></html>`;
}

function getStatusBadge(status) {
  const map = {
    CLOSED: '<span style="background:#27ae60;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">CLÔTURÉE</span>',
    REJECTED: '<span style="background:#c0392b;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">REJETÉE</span>',
    IN_PROGRESS_IT: '<span style="background:#2980b9;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">EN COURS IT</span>',
    SUBMITTED: '<span style="background:#e67e22;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">SOUMISE</span>',
    VALIDATION_N1: '<span style="background:#e67e22;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">VALIDATION N+1</span>',
    VALIDATION_N2: '<span style="background:#e67e22;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">VALIDATION N+2</span>',
    VALIDATION_DG: '<span style="background:#e67e22;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">VALIDATION DG</span>',
  };
  return map[status] || '';
}

/**
 * Sélectionne le bon template selon le type de demande
 */
function generatePdfHtml(data) {
  switch (data.request.type) {
    case 'ENR_SI_008': return generateENR_SI_008(data);
    case 'ENR_SI_005': return generateENR_SI_005(data);
    case 'ENR_SI_006': return generateENR_SI_006(data);
    case 'AUTRE':       return generateAUTRE(data);
    default: throw new Error(`Type inconnu: ${data.request.type}`);
  }
}

module.exports = { generatePdfHtml };
