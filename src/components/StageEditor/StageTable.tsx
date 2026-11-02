import React from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Stage } from '../../types/preset';

interface StageTableProps {
  stages: Stage[];
  onUpdateStages: (newStages: Stage[]) => void;
  onSaveToBrowser: () => void;
}

export const StageTable: React.FC<StageTableProps> = ({
  stages,
  onUpdateStages,
  onSaveToBrowser
}) => {
  const updateField = (index: number, field: keyof Stage, value: any) => {
    const updated = stages.map((s, idx) => {
      if (idx !== index) return s;
      return {
        ...s,
        [field]: field === 'label' ? (value || `Stage ${idx + 1}`) : (isNaN(value) ? 10 : value)
      };
    });
    onUpdateStages(updated);
  };

  const addStage = () => {
    const last = stages[stages.length - 1] || { endBeat: 10.0, endCarrier: 180.0 };
    const prevEndBeat = typeof last.endBeat === 'number' ? last.endBeat : 10.0;
    const prevEndCarrier = typeof last.endCarrier === 'number' ? last.endCarrier : 180.0;

    const newStage: Stage = {
      label: `Stage ${stages.length + 1}`,
      durationMin: 15,
      startBeat: prevEndBeat,
      endBeat: prevEndBeat,
      startCarrier: prevEndCarrier,
      endCarrier: prevEndCarrier
    };
    onUpdateStages([...stages, newStage]);
  };

  const removeStage = (index: number) => {
    if (stages.length <= 1) return;
    onUpdateStages(stages.filter((_, idx) => idx !== index));
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400">
          Custom Sequence Stage Builder
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={addStage}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stage</span>
          </button>
          <button
            onClick={onSaveToBrowser}
            className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition flex items-center gap-1"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save to Browser</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono">
              <th className="py-2 px-2">#</th>
              <th className="py-2 px-2">Stage Name</th>
              <th className="py-2 px-2">Duration (Min)</th>
              <th className="py-2 px-2">Start Beat (Hz)</th>
              <th className="py-2 px-2">End Beat (Hz)</th>
              <th className="py-2 px-2">Start Carrier (Hz)</th>
              <th className="py-2 px-2">End Carrier (Hz)</th>
              <th className="py-2 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {stages.map((stage, i) => (
              <tr key={i}>
                <td className="py-2 px-2 text-slate-500">{i + 1}</td>
                <td className="py-1.5 px-2">
                  <input
                    type="text"
                    value={stage.label}
                    onChange={(e) => updateField(i, 'label', e.target.value)}
                    className="w-32 sm:w-40 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min="0.5"
                    max="300"
                    step="1"
                    value={stage.durationMin}
                    onChange={(e) => updateField(i, 'durationMin', parseFloat(e.target.value))}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sky-300 text-xs focus:outline-none focus:border-sky-500"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min="0.2"
                    max="40"
                    step="0.1"
                    value={stage.startBeat}
                    onChange={(e) => updateField(i, 'startBeat', parseFloat(e.target.value))}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-300 text-xs focus:outline-none focus:border-sky-500"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min="0.2"
                    max="40"
                    step="0.1"
                    value={stage.endBeat}
                    onChange={(e) => updateField(i, 'endBeat', parseFloat(e.target.value))}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 text-xs focus:outline-none focus:border-sky-500"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min="60"
                    max="500"
                    step="0.5"
                    value={stage.startCarrier}
                    onChange={(e) => updateField(i, 'startCarrier', parseFloat(e.target.value))}
                    className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-indigo-300 text-xs focus:outline-none focus:border-sky-500"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min="60"
                    max="500"
                    step="0.5"
                    value={stage.endCarrier}
                    onChange={(e) => updateField(i, 'endCarrier', parseFloat(e.target.value))}
                    className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-purple-300 text-xs focus:outline-none focus:border-sky-500"
                  />
                </td>
                <td className="py-1.5 px-2 text-right">
                  <button
                    onClick={() => removeStage(i)}
                    disabled={stages.length <= 1}
                    aria-label={`Remove stage ${i + 1}`}
                    className="text-rose-400 hover:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
