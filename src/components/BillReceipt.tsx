import { useState } from 'react';
import { Check, Copy, Download, Printer } from 'lucide-react';
import {
  GST,
  Registration,
  formatMoney,
  formatPlainTextBill,
  getParticipantTypeLabel,
} from '../types/skillup';

interface BillReceiptProps {
  registration: Registration;
  compact?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPrintableBillHtml(registration: Registration): string {
  const discountPercent = Math.round(registration.discountRate * 100);
  const gstPercent = Math.round(GST * 100);
  const signedDiscount =
    registration.discount > 0
      ? `-Rs. ${formatMoney(registration.discount)}`
      : `Rs. ${formatMoney(0)}`;

  const rowsHtml = registration.lines
    .map(
      (line) => `
      <tr>
        <td>${escapeHtml(line.workshopName)} <span class="muted">#${line.workshopId}</span></td>
        <td class="num">${line.quantity}</td>
        <td class="num">${formatMoney(line.fee)}</td>
        <td class="num strong">${formatMoney(line.fee * line.quantity)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>SkillUp Bill - ${escapeHtml(registration.registrationId)}</title>
    <style>
      @page { margin: 16mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }
      .bill {
        max-width: 680px;
        margin: 0 auto;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 24px;
      }
      .header {
        border-bottom: 1px solid #cbd5e1;
        padding-bottom: 14px;
        margin-bottom: 18px;
      }
      .header h1 {
        margin: 0;
        font-size: 18px;
        letter-spacing: -0.01em;
      }
      .header p {
        margin: 4px 0 0;
        font-size: 12px;
        color: #475569;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px 24px;
        padding-bottom: 16px;
        margin-bottom: 16px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 13px;
      }
      .meta-label {
        font-size: 11px;
        color: #64748b;
        display: block;
      }
      .meta-value {
        font-weight: 600;
        margin-top: 2px;
        display: block;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        margin-bottom: 18px;
      }
      th {
        text-align: left;
        font-size: 11px;
        color: #475569;
        border-bottom: 1px solid #cbd5e1;
        padding: 8px 0;
      }
      td {
        padding: 9px 0;
        border-bottom: 1px solid #f1f5f9;
      }
      .num {
        text-align: right;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-variant-numeric: tabular-nums;
      }
      .strong { font-weight: 600; }
      .muted { color: #64748b; font-size: 11px; font-family: ui-monospace, monospace; }
      .totals {
        border-top: 1px solid #cbd5e1;
        padding-top: 12px;
        font-size: 13px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
      }
      .grand-total {
        margin-top: 8px;
        padding-top: 10px;
        border-top: 1px solid #0f172a;
        font-size: 15px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="bill">
      <div class="header">
        <h1>SKILLUP – WORKSHOP REGISTRATION BILL</h1>
        <p>${escapeHtml(registration.registrationId)} · Token #${registration.tokenNumber} · Hall ${escapeHtml(registration.hall)}</p>
      </div>
      <div class="meta">
        <div>
          <span class="meta-label">Registration ID</span>
          <span class="meta-value">${escapeHtml(registration.registrationId)}</span>
        </div>
        <div>
          <span class="meta-label">Token Number &amp; Hall</span>
          <span class="meta-value">Token #${registration.tokenNumber} · Hall ${escapeHtml(registration.hall)}</span>
        </div>
        <div>
          <span class="meta-label">Participant</span>
          <span class="meta-value">${escapeHtml(registration.participantName)} (${escapeHtml(getParticipantTypeLabel(registration.participantType))})</span>
        </div>
        <div>
          <span class="meta-label">Issued At</span>
          <span class="meta-value">${escapeHtml(registration.createdAt)}</span>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Workshop</th>
            <th class="num">Qty</th>
            <th class="num">Fee (Rs.)</th>
            <th class="num">Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span class="num">Rs. ${formatMoney(registration.subtotal)}</span>
        </div>
        <div class="total-row">
          <span>Discount (${discountPercent}%)</span>
          <span class="num">${signedDiscount}</span>
        </div>
        <div class="total-row">
          <span>Amount after discount</span>
          <span class="num">Rs. ${formatMoney(registration.amountAfterDiscount)}</span>
        </div>
        <div class="total-row">
          <span>GST (${gstPercent}% on discounted amount)</span>
          <span class="num">Rs. ${formatMoney(registration.gst)}</span>
        </div>
        <div class="total-row grand-total">
          <span>FINAL TOTAL (Rs.)</span>
          <span class="num">Rs. ${formatMoney(registration.finalTotal)}</span>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export function BillReceipt({ registration, compact = false }: BillReceiptProps) {
  const [copied, setCopied] = useState(false);

  const discountPercent = Math.round(registration.discountRate * 100);
  const gstPercent = Math.round(GST * 100);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatPlainTextBill(registration));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadTxt = () => {
    const text = formatPlainTextBill(registration) + '\n';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SkillUp_${registration.registrationId}_Bill.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    // Print via a dedicated hidden iframe so ONLY the clean receipt prints (no sidebar/menus)
    const printFrame = document.createElement('iframe');
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.className = 'fixed -left-[9999px] top-0 w-0 h-0 border-0';
    document.body.appendChild(printFrame);

    const cleanup = () => {
      if (printFrame.parentNode) {
        printFrame.parentNode.removeChild(printFrame);
      }
    };

    try {
      const frameWindow = printFrame.contentWindow;
      const frameDoc = frameWindow?.document;
      if (!frameWindow || !frameDoc) {
        cleanup();
        window.print();
        return;
      }

      frameDoc.open();
      frameDoc.write(buildPrintableBillHtml(registration));
      frameDoc.close();

      frameWindow.addEventListener('afterprint', cleanup, { once: true });
      window.setTimeout(() => {
        try {
          frameWindow.focus();
          frameWindow.print();
        } catch {
          cleanup();
          window.print();
        }
      }, 100);
      // Fallback cleanup in case afterprint does not fire in embedded browsers
      window.setTimeout(cleanup, 60000);
    } catch {
      cleanup();
      window.print();
    }
  };

  return (
    <div className="printable-bill bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50/70">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            SkillUp Workshop Bill
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
            {registration.registrationId} · Token #{registration.tokenNumber} · Hall{' '}
            {registration.hall}
          </p>
        </div>
        <div className="flex items-center gap-2 no-print shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadTxt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Save .txt</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Bill</span>
          </button>
        </div>
      </div>

      <div className={compact ? 'p-5 space-y-5' : 'p-6 space-y-6'}>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-slate-200 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Registration ID</dt>
            <dd className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
              {registration.registrationId}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Token Number</dt>
            <dd className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
              {registration.tokenNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Assigned Hall</dt>
            <dd className="mt-1 font-medium text-slate-900">
              Hall {registration.hall}{' '}
              <span className="text-xs text-slate-500 font-normal">
                ({registration.hall === 'A' ? 'Odd token' : 'Even token'})
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Participant</dt>
            <dd className="mt-1 font-medium text-slate-900 truncate">
              {registration.participantName}{' '}
              <span className="text-xs text-slate-500 font-normal">
                ({getParticipantTypeLabel(registration.participantType)})
              </span>
            </dd>
          </div>
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                <th className="py-2.5 text-left font-medium">Workshop</th>
                <th className="py-2.5 text-right font-medium w-16">Qty</th>
                <th className="py-2.5 text-right font-medium w-28">Fee (Rs.)</th>
                <th className="py-2.5 text-right font-medium w-32">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registration.lines.map((line) => (
                <tr key={line.lineId}>
                  <td className="py-2.5 pr-4 text-slate-900 font-medium">
                    {line.workshopName}
                    <span className="ml-2 font-mono text-xs text-slate-400 font-normal">
                      #{line.workshopId}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                    {line.quantity}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                    {formatMoney(line.fee)}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums font-medium text-slate-900">
                    {formatMoney(line.fee * line.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums text-slate-900">
              Rs. {formatMoney(registration.subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Discount ({discountPercent}%)</span>
            <span className="font-mono tabular-nums text-emerald-700">
              {registration.discount > 0
                ? `-Rs. ${formatMoney(registration.discount)}`
                : `Rs. ${formatMoney(0)}`}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Amount after discount</span>
            <span className="font-mono tabular-nums text-slate-900">
              Rs. {formatMoney(registration.amountAfterDiscount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>GST ({gstPercent}% on discounted amount)</span>
            <span className="font-mono tabular-nums text-slate-900">
              Rs. {formatMoney(registration.gst)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-200 text-base font-semibold text-slate-900">
            <span>Final Total</span>
            <span className="font-mono tabular-nums text-blue-700">
              Rs. {formatMoney(registration.finalTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
