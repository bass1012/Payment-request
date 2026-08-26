const { getWorkflowSteps } = require('../../config/departments');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeParseJSON(str) {
  if (!str) return {};
  if (typeof str === 'object') return str;
  try { return JSON.parse(str); } catch { return {}; }
}

function formatDateWithTime(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const dateStr = d.toLocaleDateString('fr-FR');
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} à ${timeStr}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toValidationStamp(validation) {
  if (!validation || validation.action !== 'APPROVED') {
    return { name: '', date: '', signatureStyle: null, signatureImage: null };
  }
  return {
    name: validation.validatorName || '',
    date: formatDateWithTime(validation.createdAt),
    signatureStyle: validation.signatureStyle || null,
    signatureImage: validation.signatureImage || null,
  };
}

// ─── Signature PNG detection ─────────────────────────────────────────────────

const ALLOWED_SIGNATURE_STYLES = new Set([
  'Dancing Script', 'Great Vibes', 'Alex Brush', 'Pacifico', 'Caveat', 'Satisfy',
]);
const PNG_SIGNATURE_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;

function getPngDimensions(dataUrl) {
  try {
    const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    if (bytes.length < 24 || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  } catch { return null; }
}

// ─── Stamp rendering ─────────────────────────────────────────────────────────

function renderDocuSignHtmlStamp(name, date, signature = {}) {
  if (!name || !name.trim()) return '&nbsp;';

  const signatureOptions = signature && typeof signature === 'object' ? signature : {};
  const signatureImage = typeof signatureOptions.signatureImage === 'string'
    && PNG_SIGNATURE_PATTERN.test(signatureOptions.signatureImage)
    ? signatureOptions.signatureImage : null;
  const selectedStyle = ALLOWED_SIGNATURE_STYLES.has(signatureOptions.signatureStyle)
    ? signatureOptions.signatureStyle : null;
  const imageDimensions = signatureImage ? getPngDimensions(signatureImage) : null;
  const isLegacyTypedCanvas = Boolean(
    selectedStyle && imageDimensions?.width === 400 && imageDimensions?.height === 100
  );
  const signatureVisual = signatureImage
    ? `<div style="height:26px; width:calc(100% - 2px); max-width:100%; min-width:0; overflow:hidden; display:flex; align-items:center; justify-content:flex-start; margin:1px 0 1px 2px;">
        <img src="${signatureImage}" alt="Signature de ${escapeHtml(name)}" style="display:block; width:${isLegacyTypedCanvas ? '100%' : 'auto'}; max-width:100%; min-width:0; height:${isLegacyTypedCanvas ? '26px' : 'auto'}; max-height:26px; object-fit:${isLegacyTypedCanvas ? 'fill' : 'contain'}; object-position:left center;${isLegacyTypedCanvas ? ' transform:scaleY(1.45); transform-origin:center;' : ''}" />
      </div>`
    : `<div style="font-family:${selectedStyle ? `'${selectedStyle}', ` : ''}cursive, sans-serif; font-size:10px; font-style:italic; color:#0a1c4a; margin:1px 0 1px 2px; line-height:1; max-width:100%; max-height:22px; overflow:hidden; white-space:normal; overflow-wrap:anywhere;">${escapeHtml(name)}</div>`;

  return `<div style="border-left:2px solid #0f42a6; border-bottom:2px solid #0f42a6; border-bottom-left-radius:8px; padding:2px 3px 4px 4px; text-align:left; margin:0; width:100%; max-width:100%; min-width:0; overflow:hidden; box-sizing:border-box;">
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 7.5px; font-weight: bold; color: #0f42a6; line-height: 1.1; margin-bottom: 1px;">Approuve</div>
    ${signatureVisual}
    <div style="font-family:Arial, Helvetica, sans-serif; font-size:5.5px; color:#475569; margin-left:4px; line-height:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(date)}</div>
  </div>`;
}

// ─── Status badge ────────────────────────────────────────────────────────────

function getStatusBadge(status) {
  const map = {
    CLOSED: '<span style="background:#27ae60;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">CLÔTURÉE</span>',
    REJECTED: '<span style="background:#c0392b;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">REJETÉE</span>',
    IN_PROGRESS_IT: '<span style="background:#2980b9;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">EN COURS IT</span>',
    PROCESSING: '<span style="background:#2980b9;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">EN COURS DE TRAITEMENT</span>',
    SUBMITTED: '<span style="background:#e67e22;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">SOUMISE</span>',
    VALIDATION_N1: '<span style="background:#e67e22;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">VALIDATION N+1</span>',
    VALIDATION_N2: '<span style="background:#e67e22;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">VALIDATION N+2</span>',
    VALIDATION_DG: '<span style="background:#e67e22;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;margin-left:6px;">VALIDATION DG</span>',
  };
  return map[status] || '';
}

// ─── Workflow validation lookup ──────────────────────────────────────────────

function getValidationStampByStepType(data, stepType) {
  const emptyStamp = toValidationStamp(null);
  try {
    const workflowStep = getWorkflowSteps(data.request.type, data.department)
      .find(step => step.type === stepType);
    if (!workflowStep) return emptyStamp;
    const revision = data.request.currentRevision || 1;
    const validation = [...(data.validations || [])]
      .reverse()
      .find(item => (
        item.action === 'APPROVED'
        && item.step === workflowStep.step
        && (item.revision || 1) === revision
      ));
    return toValidationStamp(validation);
  } catch { return emptyStamp; }
}

// ─── Shared CSS ──────────────────────────────────────────────────────────────

/**
 * Common CSS base shared by all PDF templates.
 * Templates only need to append their own unique styles.
 */
const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 15mm; }
  .header-table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
  .header-table td { border: 1px solid #000; padding: 6px; vertical-align: middle; }
  .logo-cell { width: 80px; text-align: center; font-weight: bold; font-size: 16px; color: #1a3c6e; }
  .title-cell { text-align: center; }
  .title-main { font-weight: bold; font-size: 13px; color: #1a3c6e; text-align: center; margin-top: 6px; }
  .smq-band { background: #1a3c6e; color: #fff; text-align: center; font-weight: bold; font-size: 11px; padding: 4px; }
  .ref-band { display: flex; justify-content: space-between; border: 1px solid #000; border-top: none; font-size: 10px; }
  .ref-band span { padding: 3px 8px; border-right: 1px solid #000; }
  .ref-band span:last-child { border-right: none; }
  .section-title { background: #d0d0d0; font-weight: bold; padding: 5px 8px; margin-top: 10px; border: 1px solid #000; font-size: 11px; }
  .field-table { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
  .field-table td { border: 1px solid #000; padding: 6px; }
  .field-label { font-weight: bold; width: 35%; background: #f0f0f0; }
  .text-area-block { border: 1px solid #000; border-top: none; padding: 10px; min-height: 60px; font-size: 11px; white-space: pre-wrap; }
  .validation-table { width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #000; margin-top: 10px; }
  .validation-table th { background: #d0d0d0; border: 1px solid #000; padding: 5px; text-align: center; font-size: 10px; }
  .validation-table td { border: 1px solid #000; padding: 8px; text-align: center; min-height: 50px; vertical-align: top; }
  .val-name { font-weight: bold; font-size: 11px; margin-bottom: 4px; }
  .val-date { color: #555; font-size: 10px; }
`;

// ─── HTML head helper ────────────────────────────────────────────────────────

function htmlHead(extraCss = '') {
  return `<head><meta charset="UTF-8"><style>${BASE_CSS}\n${extraCss}</style></head>`;
}

// ─── MCT header block ────────────────────────────────────────────────────────

function mctHeader(smqCode, title, extraAttrs = '') {
  return `<table class="header-table">
    <tr>
      <td class="logo-cell" ${extraAttrs}>M.C.T.</td>
      <td class="title-cell">
        <div class="smq-band">SYSTEME DE MANAGEMENT QUALITE &nbsp;&nbsp; ${smqCode}</div>
        <div class="title-main">${escapeHtml(title)}</div>
      </td>
      <td style="width:120px;text-align:center;font-size:9px;">MCT Électricité<br>MCT Climatisation<br>MCT Maintenance</td>
    </tr>
  </table>`;
}

function refBand(reference, status, versionText = 'Version 01', extraLeft = '') {
  return `<div class="ref-band">
    <span>Statut : Applicable</span>
    ${extraLeft ? `<span>${escapeHtml(extraLeft)}</span>` : ''}
    <span>${escapeHtml(versionText)}</span>
    <span>Page 1 sur 1</span>
    <span>Référence : <strong>${escapeHtml(reference)}</strong>${getStatusBadge(status)}</span>
  </div>`;
}

module.exports = {
  safeParseJSON,
  formatDateWithTime,
  escapeHtml,
  toValidationStamp,
  getValidationStampByStepType,
  renderDocuSignHtmlStamp,
  getStatusBadge,
  BASE_CSS,
  htmlHead,
  mctHeader,
  refBand,
};
