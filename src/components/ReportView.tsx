import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import {
  Registration,
  Workshop,
  findMostPopularWorkshop,
  formatMoney,
  formatPlainTextReport,
  getWorkshopStatus,
} from '../types/skillup';

interface ReportViewProps {
  workshops: Workshop[];
  registrations: Registration[];
  onDownloadReport: () => void;
}

export function ReportView({
  workshops,
  registrations,
  onDownloadReport,
}: ReportViewProps) {
  const [copied, setCopied] = useState(false);

  const totalRevenue = registrations.reduce((sum, r) => sum + r.finalTotal, 0);
  const totalSeatsBooked = workshops.reduce((sum, w) => sum + w.seatsBooked, 0);
  const mostPopular = findMostPopularWorkshop(workshops);
  const reportText = formatPlainTextReport(registrations, workshops);

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Total Registrations</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {registrations.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Accepted entries</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Total Revenue (incl. GST)</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            Rs. {formatMoney(totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Final billed totals</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Total Seats Booked</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {totalSeatsBooked}
          </p>
          <p className="mt-1 text-xs text-slate-500">Across 6 workshops</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Most Popular Workshop</p>
          <p className="mt-1.5 text-base font-semibold text-slate-900 truncate">
            {mostPopular ? mostPopular.name : 'No registrations yet'}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {mostPopular ? `${mostPopular.seatsBooked} seats booked` : 'Tie goes to first listed'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900">
              Workshop Seat Utilization
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-3 pl-6 pr-3 text-left font-medium">Workshop</th>
                  <th className="py-3 px-3 text-right font-medium w-20">Booked</th>
                  <th className="py-3 px-3 text-right font-medium w-20">Left</th>
                  <th className="py-3 px-3 text-left font-medium w-36">Occupancy</th>
                  <th className="py-3 pl-3 pr-6 text-left font-medium w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workshops.map((w) => {
                  const pct = Math.round((w.seatsBooked / w.initialSeats) * 100);
                  const status = getWorkshopStatus(w.availableSeats);
                  const isPopular = mostPopular?.id === w.id;

                  return (
                    <tr key={w.id}>
                      <td className="py-3 pl-6 pr-3 font-medium text-slate-900">
                        {w.name}
                        {isPopular && (
                          <span className="ml-2 text-xs font-normal text-blue-700">
                            · Top booked
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900">
                        {w.seatsBooked}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                        {w.availableSeats}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <svg
                            viewBox="0 0 100 6"
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            role="img"
                            aria-label={`${pct}% seats booked`}
                            preserveAspectRatio="none"
                          >
                            <rect x="0" y="0" width="100" height="6" className="fill-slate-100" />
                            <rect x="0" y="0" width={pct} height="6" className="fill-blue-700" />
                          </svg>
                          <span className="text-xs font-mono tabular-nums text-slate-500 w-9 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pl-3 pr-6 font-mono text-xs font-semibold">
                        <span
                          className={
                            status === 'LOW' ? 'text-amber-700' : 'text-emerald-700'
                          }
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900">
              registration_report.txt
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyReport}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={onDownloadReport}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>

          <div className="p-5">
            <pre className="text-xs font-mono leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-md p-4 overflow-x-auto whitespace-pre">
              {reportText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
