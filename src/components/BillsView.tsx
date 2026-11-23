import { FormEvent, useState } from 'react';
import { Search } from 'lucide-react';
import {
  Registration,
  formatMoney,
  getParticipantTypeLabel,
} from '../types/skillup';
import { BillReceipt } from './BillReceipt';

interface BillsViewProps {
  registrations: Registration[];
  onGoToRegister: () => void;
}

export function BillsView({ registrations, onGoToRegister }: BillsViewProps) {
  const [searchId, setSearchId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    registrations.length > 0 ? registrations[registrations.length - 1].registrationId : null
  );
  const [lookupError, setLookupError] = useState<string | null>(null);

  const activeRegistration =
    registrations.find((r) => r.registrationId === selectedId) ??
    (registrations.length > 0 ? registrations[registrations.length - 1] : null);

  const handleLookup = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = searchId.trim();
    if (!trimmed) {
      setLookupError('Please enter a Registration ID (e.g. REG1).');
      return;
    }

    // Case-insensitive trimmed lookup matching RegistrationDesk.findRegistrationById
    const found = registrations.find(
      (r) => r.registrationId.toLowerCase() === trimmed.toLowerCase()
    );

    if (!found) {
      setLookupError(`No registration found with ID: ${trimmed}`);
      return;
    }

    setLookupError(null);
    setSelectedId(found.registrationId);
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleLookup}
        className="no-print bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchId}
            onChange={(e) => {
              setSearchId(e.target.value);
              if (lookupError) setLookupError(null);
            }}
            placeholder="Find bill by Registration ID (e.g. REG1 or reg1)..."
            aria-label="Search Registration ID"
            className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Find Bill
        </button>
      </form>

      {lookupError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-lg px-5 py-3 text-sm text-red-800 font-medium"
        >
          {lookupError}
        </div>
      )}

      {registrations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg py-16 px-6 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            No bills generated yet
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Completed registrations receive a sequential ID (REG1, REG2, ...) and appear
            here for instant lookup and printing.
          </p>
          <button
            type="button"
            onClick={onGoToRegister}
            className="mt-5 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors cursor-pointer"
          >
            Create First Registration
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="no-print lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
              <h2 className="text-sm font-semibold text-slate-900">
                Accepted Registrations ({registrations.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-200">
              {registrations.map((reg) => {
                const isSelected = activeRegistration?.registrationId === reg.registrationId;
                return (
                  <button
                    key={reg.registrationId}
                    type="button"
                    onClick={() => {
                      setSelectedId(reg.registrationId);
                      setLookupError(null);
                    }}
                    className={`w-full text-left px-5 py-3.5 transition-colors flex items-center justify-between gap-4 cursor-pointer ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        <span className="font-mono text-blue-700 mr-2">
                          {reg.registrationId}
                        </span>
                        {reg.participantName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {getParticipantTypeLabel(reg.participantType)} · Token #
                        {reg.tokenNumber} · Hall {reg.hall}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 shrink-0">
                      Rs. {formatMoney(reg.finalTotal)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7">
            {activeRegistration && <BillReceipt registration={activeRegistration} compact />}
          </div>
        </div>
      )}
    </div>
  );
}
