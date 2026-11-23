/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  ClipboardPlus,
  Download,
  FileText,
  RotateCcw,
} from 'lucide-react';
import {
  ActiveView,
  OrderLine,
  ParticipantType,
  Registration,
  Workshop,
  computeBillingBreakdown,
  createInitialWorkshops,
  determineHall,
  formatPlainTextReport,
} from './types/skillup';
import { CatalogView } from './components/CatalogView';
import { RegistrationView } from './components/RegistrationView';
import { BillsView } from './components/BillsView';
import { ReportView } from './components/ReportView';

const NAV_ITEMS: {
  id: ActiveView;
  label: string;
  breadcrumb: string;
  subtitle: string;
  icon: typeof BookOpen;
}[] = [
  {
    id: ActiveView.Catalog,
    label: 'Workshop List',
    breadcrumb: 'Workshop Catalog',
    subtitle: 'View available workshops, fees, seat counts, and LOW/OK status.',
    icon: BookOpen,
  },
  {
    id: ActiveView.Register,
    label: 'New Registration',
    breadcrumb: 'New Registration',
    subtitle: 'Register a participant, manage selections with stack undo, and issue a bill.',
    icon: ClipboardPlus,
  },
  {
    id: ActiveView.Bills,
    label: 'View Bills',
    breadcrumb: 'View Bills',
    subtitle: 'Look up any accepted registration bill by Registration ID (e.g. REG1).',
    icon: FileText,
  },
  {
    id: ActiveView.Report,
    label: 'Registration Report',
    breadcrumb: 'Registration Report',
    subtitle: 'Review total registrations, revenue including GST, and most popular workshop.',
    icon: BarChart3,
  },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>(ActiveView.Catalog);
  const [workshops, setWorkshops] = useState<Workshop[]>(createInitialWorkshops);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regCounter, setRegCounter] = useState(1);
  const [tokenCounter, setTokenCounter] = useState(1);
  const [preselectedWorkshopId, setPreselectedWorkshopId] = useState<number | null>(null);
  const [lastCompletedBill, setLastCompletedBill] = useState<Registration | null>(null);
  const [externalNotice, setExternalNotice] = useState<{
    kind: 'error' | 'info' | 'success';
    title: string;
    detail: string;
  } | null>(null);

  const commitRegistration = useCallback(
    (
      participantName: string,
      participantType: ParticipantType,
      lines: OrderLine[]
    ): Registration => {
      const assignedRegId = `REG${regCounter}`;
      const assignedToken = tokenCounter;
      const assignedHall = determineHall(assignedToken);
      const breakdown = computeBillingBreakdown(lines, participantType);

      const newRegistration: Registration = {
        registrationId: assignedRegId,
        tokenNumber: assignedToken,
        hall: assignedHall,
        participantName,
        participantType,
        discountRate: breakdown.discountRate,
        lines,
        subtotal: breakdown.subtotal,
        discount: breakdown.discount,
        amountAfterDiscount: breakdown.amountAfterDiscount,
        gst: breakdown.gst,
        finalTotal: breakdown.finalTotal,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Single place where workshop seats are mutated, strictly after full validation
      setWorkshops((prev) =>
        prev.map((w) => {
          const bookedInReg = lines
            .filter((l) => l.workshopId === w.id)
            .reduce((sum, l) => sum + l.quantity, 0);
          if (bookedInReg === 0) {
            return w;
          }
          return {
            ...w,
            availableSeats: w.availableSeats - bookedInReg,
            seatsBooked: w.seatsBooked + bookedInReg,
          };
        })
      );

      setRegistrations((prev) => [...prev, newRegistration]);
      setRegCounter((c) => c + 1);
      setTokenCounter((t) => t + 1);
      setLastCompletedBill(newRegistration);
      setExternalNotice(null);

      return newRegistration;
    },
    [regCounter, tokenCounter]
  );

  const handleQuickRegister = useCallback((workshopId: number) => {
    setPreselectedWorkshopId(workshopId);
    setExternalNotice(null);
    setActiveView(ActiveView.Register);
  }, []);

  const handleDownloadReport = useCallback(() => {
    const content = formatPlainTextReport(registrations, workshops);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'registration_report.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [registrations, workshops]);

  const runScenario = (scenario: 'TC1' | 'TC2' | 'TC3' | 'TC4') => {
    setActiveView(ActiveView.Register);

    const tryValidateAndCommit = (
      name: string,
      type: ParticipantType,
      requests: { id: number; qty: number }[]
    ) => {
      const builtLines: OrderLine[] = [];
      const chosenMap = new Map<number, number>();

      for (const req of requests) {
        const workshop = workshops.find((w) => w.id === req.id);
        if (!workshop) {
          setLastCompletedBill(null);
          setExternalNotice({
            kind: 'error',
            title: `WorkshopNotFoundException: Workshop id ${req.id} does not exist.`,
            detail:
              'Registration cancelled. No seats were changed, and no REG ID or token was consumed.',
          });
          return;
        }
        const alreadyChosen = chosenMap.get(workshop.id) ?? 0;
        const remaining = workshop.availableSeats - alreadyChosen;
        if (req.qty > remaining) {
          setLastCompletedBill(null);
          setExternalNotice({
            kind: 'error',
            title: `SeatsNotAvailableException: Only ${workshop.availableSeats} seats available for ${workshop.name}, but ${req.qty} requested.`,
            detail:
              'Registration cancelled. No seats were changed, and no REG ID or token was consumed.',
          });
          return;
        }
        chosenMap.set(workshop.id, alreadyChosen + req.qty);
        builtLines.push({
          lineId: `${Date.now()}-${workshop.id}-${builtLines.length}`,
          workshopId: workshop.id,
          workshopName: workshop.name,
          fee: workshop.fee,
          quantity: req.qty,
        });
      }

      commitRegistration(name, type, builtLines);
    };

    if (scenario === 'TC1') {
      tryValidateAndCommit('Asha', ParticipantType.Student, [
        { id: 101, qty: 2 },
        { id: 105, qty: 1 },
      ]);
    } else if (scenario === 'TC2') {
      tryValidateAndCommit('Ravi', ParticipantType.Professional, [
        { id: 102, qty: 3 },
        { id: 106, qty: 2 },
      ]);
    } else if (scenario === 'TC3') {
      tryValidateAndCommit('Meena', ParticipantType.Student, [{ id: 102, qty: 41 }]);
    } else if (scenario === 'TC4') {
      tryValidateAndCommit('Kiran', ParticipantType.Student, [{ id: 999, qty: 1 }]);
    }
  };

  const handleResetSession = () => {
    setWorkshops(createInitialWorkshops());
    setRegistrations([]);
    setRegCounter(1);
    setTokenCounter(1);
    setLastCompletedBill(null);
    setExternalNotice(null);
    setActiveView(ActiveView.Catalog);
  };

  const currentNav = NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      <aside className="no-print w-full md:w-64 shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between">
        <div>
          <div className="h-16 px-6 flex items-center border-b border-slate-200">
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              SkillUp
            </span>
          </div>

          <nav aria-label="Primary navigation" className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveView(item.id);
                    if (item.id !== ActiveView.Register) {
                      setExternalNotice(null);
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-blue-700' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === ActiveView.Bills && registrations.length > 0 && (
                    <span className="font-mono text-xs tabular-nums text-slate-500">
                      {registrations.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 px-4 pt-4 border-t border-slate-200">
            <p className="px-2 text-xs font-medium text-slate-500 mb-2">
              Quick Test Cases
            </p>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-1">
              <button
                type="button"
                onClick={() => runScenario('TC1')}
                className="text-left px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <span className="font-mono font-semibold text-slate-900 mr-1.5">TC1</span>
                <span>Student · Rs. 1793.60</span>
              </button>
              <button
                type="button"
                onClick={() => runScenario('TC2')}
                className="text-left px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <span className="font-mono font-semibold text-slate-900 mr-1.5">TC2</span>
                <span>Pro · Rs. 4956.00</span>
              </button>
              <button
                type="button"
                onClick={() => runScenario('TC3')}
                className="text-left px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <span className="font-mono font-semibold text-slate-900 mr-1.5">TC3</span>
                <span>41 seats error</span>
              </button>
              <button
                type="button"
                onClick={() => runScenario('TC4')}
                className="text-left px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <span className="font-mono font-semibold text-slate-900 mr-1.5">TC4</span>
                <span>ID 999 not found</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleResetSession}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Session</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="no-print h-16 px-6 lg:px-8 bg-white border-b border-slate-200 flex items-center justify-between gap-8 shrink-0">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-slate-500 whitespace-nowrap">SkillUp</span>
            <span className="text-slate-300" aria-hidden="true">
              /
            </span>
            <span className="font-medium text-slate-900 truncate">
              {currentNav.breadcrumb}
            </span>
          </div>

          <div className="shrink-0">
            {activeView === ActiveView.Report ? (
              <button
                type="button"
                onClick={handleDownloadReport}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLastCompletedBill(null);
                  setExternalNotice(null);
                  setActiveView(ActiveView.Register);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                New Registration
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="no-print">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {currentNav.breadcrumb}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{currentNav.subtitle}</p>
          </div>

          {activeView === ActiveView.Catalog && (
            <CatalogView
              workshops={workshops}
              onQuickRegister={handleQuickRegister}
            />
          )}

          {activeView === ActiveView.Register && (
            <RegistrationView
              workshops={workshops}
              nextRegistrationNumber={regCounter}
              nextTokenNumber={tokenCounter}
              registrationCount={registrations.length}
              preselectedWorkshopId={preselectedWorkshopId}
              onClearPreselected={() => setPreselectedWorkshopId(null)}
              onCommitRegistration={commitRegistration}
              externalNotice={externalNotice}
              onClearExternalNotice={() => setExternalNotice(null)}
              lastCompletedBill={lastCompletedBill}
              onClearLastCompletedBill={() => setLastCompletedBill(null)}
            />
          )}

          {activeView === ActiveView.Bills && (
            <BillsView
              registrations={registrations}
              onGoToRegister={() => {
                setLastCompletedBill(null);
                setActiveView(ActiveView.Register);
              }}
            />
          )}

          {activeView === ActiveView.Report && (
            <ReportView
              workshops={workshops}
              registrations={registrations}
              onDownloadReport={handleDownloadReport}
            />
          )}
        </main>
      </div>
    </div>
  );
}
