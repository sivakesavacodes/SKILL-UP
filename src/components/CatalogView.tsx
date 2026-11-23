import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import {
  LOW_SEATS_LIMIT,
  Workshop,
  formatMoney,
  getWorkshopStatus,
} from '../types/skillup';

interface CatalogViewProps {
  workshops: Workshop[];
  onQuickRegister: (workshopId: number) => void;
}

type CategoryFilter = 'All' | 'Technical' | 'Soft Skill' | 'Career';

const CATEGORIES: CategoryFilter[] = ['All', 'Technical', 'Soft Skill', 'Career'];

export function CatalogView({ workshops, onQuickRegister }: CatalogViewProps) {
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [query, setQuery] = useState('');

  const filteredWorkshops = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return workshops.filter((w) => {
      const matchesCategory = category === 'All' || w.category === category;
      if (!matchesCategory) {
        return false;
      }
      if (!trimmed) {
        return true;
      }
      return (
        w.name.toLowerCase().includes(trimmed) ||
        String(w.id).includes(trimmed) ||
        w.category.toLowerCase().includes(trimmed)
      );
    });
  }, [workshops, category, query]);

  const totalCapacity = workshops.reduce((sum, w) => sum + w.initialSeats, 0);
  const totalAvailable = workshops.reduce((sum, w) => sum + w.availableSeats, 0);
  const totalBooked = workshops.reduce((sum, w) => sum + w.seatsBooked, 0);
  const lowCount = workshops.filter((w) => w.availableSeats < LOW_SEATS_LIMIT).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Workshops Offered</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {workshops.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">3 tracks active</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Available Seats</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {totalAvailable}
            <span className="text-sm font-normal text-slate-400"> / {totalCapacity}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Across all workshops</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Seats Booked</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {totalBooked}
          </p>
          <p className="mt-1 text-xs text-slate-500">Committed registrations only</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Low Seat Alerts</p>
          <p
            className={`mt-1.5 text-2xl font-semibold font-mono tabular-nums ${
              lowCount > 0 ? 'text-amber-700' : 'text-slate-900'
            }`}
          >
            {lowCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Threshold: below {LOW_SEATS_LIMIT} seats
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md w-fit">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  category === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by ID or workshop..."
              aria-label="Filter workshops"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500">
                <th className="py-3 pl-6 pr-3 text-left font-medium w-20">ID</th>
                <th className="py-3 px-3 text-left font-medium">Workshop</th>
                <th className="py-3 px-3 text-left font-medium w-32">Category</th>
                <th className="py-3 px-3 text-right font-medium w-28">Fee (Rs.)</th>
                <th className="py-3 px-3 text-right font-medium w-24">Seats</th>
                <th className="py-3 px-3 text-right font-medium w-24">Booked</th>
                <th className="py-3 px-3 text-left font-medium w-24">Status</th>
                <th className="py-3 pl-3 pr-6 text-right font-medium w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredWorkshops.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-500">
                    No workshops match your current filter.
                  </td>
                </tr>
              ) : (
                filteredWorkshops.map((w) => {
                  const status = getWorkshopStatus(w.availableSeats);
                  const isLow = status === 'LOW';
                  const isSoldOut = w.availableSeats === 0;

                  return (
                    <tr
                      key={w.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 pl-6 pr-3 font-mono tabular-nums font-medium text-slate-700">
                        {w.id}
                      </td>
                      <td className="py-3.5 px-3 font-medium text-slate-900">
                        {w.name}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">{w.category}</td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-900">
                        {formatMoney(w.fee)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                        {w.availableSeats}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-500">
                        {w.seatsBooked}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs font-semibold">
                        <span
                          className={
                            isSoldOut
                              ? 'text-red-700'
                              : isLow
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                          }
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => onQuickRegister(w.id)}
                          disabled={isSoldOut}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>{isSoldOut ? 'Full' : 'Register'}</span>
                          {!isSoldOut && <ArrowRight className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
