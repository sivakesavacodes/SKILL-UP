import { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, Undo2 } from 'lucide-react';
import {
  GST,
  MAX_ITEMS_PER_REGISTRATION,
  MAX_REGISTRATIONS,
  OrderLine,
  ParticipantType,
  Registration,
  Workshop,
  computeBillingBreakdown,
  determineHall,
  formatMoney,
} from '../types/skillup';
import { BillReceipt } from './BillReceipt';

interface RegistrationViewProps {
  workshops: Workshop[];
  nextRegistrationNumber: number;
  nextTokenNumber: number;
  registrationCount: number;
  preselectedWorkshopId: number | null;
  onClearPreselected: () => void;
  onCommitRegistration: (
    participantName: string,
    participantType: ParticipantType,
    lines: OrderLine[]
  ) => Registration;
  externalNotice: {
    kind: 'error' | 'info' | 'success';
    title: string;
    detail: string;
  } | null;
  onClearExternalNotice: () => void;
  lastCompletedBill: Registration | null;
  onClearLastCompletedBill: () => void;
}

export function RegistrationView({
  workshops,
  nextRegistrationNumber,
  nextTokenNumber,
  registrationCount,
  preselectedWorkshopId,
  onClearPreselected,
  onCommitRegistration,
  externalNotice,
  onClearExternalNotice,
  lastCompletedBill,
  onClearLastCompletedBill,
}: RegistrationViewProps) {
  const [participantName, setParticipantName] = useState('');
  const [participantType, setParticipantType] = useState<ParticipantType>(
    ParticipantType.Student
  );
  const [workshopIdInput, setWorkshopIdInput] = useState('101');
  const [quantityInput, setQuantityInput] = useState('1');
  const [stack, setStack] = useState<OrderLine[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cancellationBanner, setCancellationBanner] = useState<{
    exceptionName: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (preselectedWorkshopId !== null) {
      setWorkshopIdInput(String(preselectedWorkshopId));
      onClearPreselected();
      onClearLastCompletedBill();
    }
  }, [preselectedWorkshopId, onClearPreselected, onClearLastCompletedBill]);

  const isRegistrationFull = registrationCount >= MAX_REGISTRATIONS;

  const getAlreadyChosenForWorkshop = (workshopId: number): number => {
    return stack.reduce(
      (sum, item) => (item.workshopId === workshopId ? sum + item.quantity : sum),
      0
    );
  };

  const handleAddLine = (e: FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setStatusMessage(null);
    setCancellationBanner(null);
    onClearExternalNotice();

    if (isRegistrationFull) {
      setFieldError('Registration limit (250) reached. Cannot accept more registrations.');
      return;
    }

    if (stack.length >= MAX_ITEMS_PER_REGISTRATION) {
      setFieldError(
        `Selection limit (${MAX_ITEMS_PER_REGISTRATION}) reached. Undo last item or finish registration.`
      );
      return;
    }

    const trimmedId = workshopIdInput.trim();
    if (!/^-?\d+$/.test(trimmedId)) {
      setFieldError('Invalid workshop ID. Please enter a whole number.');
      return;
    }
    const parsedId = Number(trimmedId);

    // Lookup workshop FIRST (matches WorkshopCatalog.findById throwing WorkshopNotFoundException)
    const workshop = workshops.find((w) => w.id === parsedId);
    if (!workshop) {
      setStack([]);
      setCancellationBanner({
        exceptionName: 'WorkshopNotFoundException',
        message: `Workshop id ${parsedId} does not exist.`,
      });
      return;
    }

    const trimmedQty = quantityInput.trim();
    if (!/^\d+$/.test(trimmedQty) || Number(trimmedQty) < 1) {
      setFieldError('Quantity must be a whole number of 1 or more.');
      return;
    }
    const quantity = Number(trimmedQty);

    // Overflow-safe cumulative seat check: requested > availableSeats - alreadyChosen (Decision A2)
    const alreadyChosen = getAlreadyChosenForWorkshop(workshop.id);
    const remainingSeats = workshop.availableSeats - alreadyChosen;

    if (quantity > remainingSeats) {
      const detail =
        alreadyChosen === 0
          ? `Only ${workshop.availableSeats} seats available for ${workshop.name}, but ${quantity} requested.`
          : `Only ${remainingSeats} remaining seats available for ${workshop.name} (${alreadyChosen} already chosen), but ${quantity} requested.`;
      // Decision A1: exception cancels the entire current registration; no seats changed
      setStack([]);
      setCancellationBanner({
        exceptionName: 'SeatsNotAvailableException',
        message: detail,
      });
      return;
    }

    const newLine: OrderLine = {
      lineId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      workshopId: workshop.id,
      workshopName: workshop.name,
      fee: workshop.fee,
      quantity,
    };

    setStack((prev) => [...prev, newLine]);
    setStatusMessage(`Added: ${workshop.name} x ${quantity}`);
    setQuantityInput('1');
  };

  const handleUndo = () => {
    setFieldError(null);
    setCancellationBanner(null);
    onClearExternalNotice();

    if (stack.length === 0) {
      setStatusMessage('Nothing to undo.');
      return;
    }
    const removed = stack[stack.length - 1];
    setStack((prev) => prev.slice(0, -1));
    setStatusMessage(`Removed: ${removed.workshopName} x ${removed.quantity}`);
  };

  const handleFinishRegistration = () => {
    setFieldError(null);
    setCancellationBanner(null);
    onClearExternalNotice();

    const trimmedName = participantName.trim();
    if (!trimmedName) {
      setFieldError('Participant name cannot be blank.');
      return;
    }
    if (stack.length === 0) {
      setFieldError('No workshops selected. Registration cancelled.');
      return;
    }

    onCommitRegistration(trimmedName, participantType, stack);
    setParticipantName('');
    setStack([]);
    setStatusMessage(null);
    setWorkshopIdInput('101');
    setQuantityInput('1');
  };

  const preview = computeBillingBreakdown(stack, participantType);
  const discountPercent = Math.round(preview.discountRate * 100);
  const gstPercent = Math.round(GST * 100);
  const previewHall = determineHall(nextTokenNumber);

  if (lastCompletedBill) {
    return (
      <div className="space-y-6">
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg px-6 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Registration {lastCompletedBill.registrationId} confirmed
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Token #{lastCompletedBill.tokenNumber} assigned to Hall{' '}
                {lastCompletedBill.hall}. Workshop seats have been deducted.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearLastCompletedBill}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Start Next Registration
          </button>
        </div>

        <BillReceipt registration={lastCompletedBill} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cancellationBanner && (
        <div
          role="alert"
          className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-5 py-4"
        >
          <AlertCircle className="w-5 h-5 text-red-700 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-red-900">
              {cancellationBanner.exceptionName}: {cancellationBanner.message}
            </p>
            <p className="text-red-700 mt-1">
              Registration cancelled. No seats were changed, and no REG ID or token was
              consumed.
            </p>
          </div>
        </div>
      )}

      {externalNotice && (
        <div
          role="alert"
          className={`flex items-start gap-3 rounded-lg px-5 py-4 border ${
            externalNotice.kind === 'error'
              ? 'bg-red-50 border-red-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <AlertCircle
            className={`w-5 h-5 mt-0.5 shrink-0 ${
              externalNotice.kind === 'error' ? 'text-red-700' : 'text-blue-700'
            }`}
          />
          <div className="text-sm">
            <p
              className={`font-semibold ${
                externalNotice.kind === 'error' ? 'text-red-900' : 'text-blue-900'
              }`}
            >
              {externalNotice.title}
            </p>
            <p
              className={`mt-1 ${
                externalNotice.kind === 'error' ? 'text-red-700' : 'text-blue-800'
              }`}
            >
              {externalNotice.detail}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                1. Participant Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Next assigned: REG{nextRegistrationNumber} · Token #{nextTokenNumber} · Hall{' '}
                {previewHall}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="participant-name"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Participant Name
                </label>
                <input
                  id="participant-name"
                  type="text"
                  value={participantName}
                  onChange={(e) => {
                    setParticipantName(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  placeholder="e.g. Asha"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">
                  Participant Type
                </span>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md">
                  <button
                    type="button"
                    onClick={() => setParticipantType(ParticipantType.Student)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                      participantType === ParticipantType.Student
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Student (20%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setParticipantType(ParticipantType.Professional)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                      participantType === ParticipantType.Professional
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Professional (0%)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddLine} className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                2. Add Workshop Selection
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                Stack {stack.length} / {MAX_ITEMS_PER_REGISTRATION}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label
                  htmlFor="workshop-picker"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Quick Select Workshop
                </label>
                <select
                  id="workshop-picker"
                  value={
                    workshops.some((w) => String(w.id) === workshopIdInput.trim())
                      ? workshopIdInput.trim()
                      : ''
                  }
                  onChange={(e) => {
                    if (e.target.value) {
                      setWorkshopIdInput(e.target.value);
                      setFieldError(null);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value="">Custom ID...</option>
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.id} – {w.name} ({w.availableSeats} left)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="workshop-id-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Workshop ID
                </label>
                <input
                  id="workshop-id-input"
                  type="text"
                  inputMode="numeric"
                  value={workshopIdInput}
                  onChange={(e) => setWorkshopIdInput(e.target.value)}
                  placeholder="101"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="quantity-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Quantity
                </label>
                <input
                  id="quantity-input"
                  type="text"
                  inputMode="numeric"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  placeholder="1"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Line</span>
                </button>
              </div>
            </div>

            {fieldError && (
              <p className="text-xs font-medium text-red-700">{fieldError}</p>
            )}
            {statusMessage && !fieldError && (
              <p className="text-xs font-medium text-slate-600">{statusMessage}</p>
            )}
          </form>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-slate-900">
                3. Selected Workshops (ItemStack)
              </h2>
              <button
                type="button"
                onClick={handleUndo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Undo Last (-1)</span>
              </button>
            </div>

            {stack.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 rounded-md text-sm text-slate-500">
                No workshops in the stack yet. Add a workshop above to begin.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 text-left font-medium w-10">#</th>
                      <th className="py-2 text-left font-medium">Workshop</th>
                      <th className="py-2 text-right font-medium w-16">Qty</th>
                      <th className="py-2 text-right font-medium w-28">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stack.map((item, idx) => {
                      const isTop = idx === stack.length - 1;
                      return (
                        <tr key={item.lineId}>
                          <td className="py-2.5 font-mono text-xs text-slate-400 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 pr-3 font-medium text-slate-900">
                            {item.workshopName}
                            {isTop && (
                              <span className="ml-2 text-xs font-normal text-blue-700">
                                · Top of stack
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums font-medium text-slate-900">
                            Rs. {formatMoney(item.fee * item.quantity)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70">
            <h2 className="text-base font-semibold text-slate-900">Live Bill Summary</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Seats deduct only when registration is finalized
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal (recursive sum)</span>
                <span className="font-mono tabular-nums text-slate-900">
                  Rs. {formatMoney(preview.subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Discount ({discountPercent}%)</span>
                <span className="font-mono tabular-nums text-emerald-700">
                  {preview.discount > 0
                    ? `-Rs. ${formatMoney(preview.discount)}`
                    : `Rs. ${formatMoney(0)}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Amount after discount</span>
                <span className="font-mono tabular-nums text-slate-900">
                  Rs. {formatMoney(preview.amountAfterDiscount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>GST ({gstPercent}%)</span>
                <span className="font-mono tabular-nums text-slate-900">
                  Rs. {formatMoney(preview.gst)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-base font-semibold text-slate-900">
                <span>Final Total</span>
                <span className="font-mono tabular-nums text-blue-700">
                  Rs. {formatMoney(preview.finalTotal)}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleFinishRegistration}
                disabled={isRegistrationFull}
                className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer"
              >
                Finish Registration & Print Bill
              </button>
              <button
                type="button"
                onClick={() => {
                  setStack([]);
                  setFieldError(null);
                  setStatusMessage('Current selections cleared.');
                  setCancellationBanner(null);
                }}
                disabled={stack.length === 0}
                className="w-full py-2 px-4 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Clear Selections
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
