import React from 'react';
import { Edit2, HelpCircle, PlusCircle, Trash2, Upload } from 'lucide-react';

interface ConsumptionEnergyCostProps {
    consumptionData: any;
    handleChange: (field: string, value: any) => void;
    showIncentives: boolean;
    setShowIncentives: React.Dispatch<React.SetStateAction<boolean>>;
    incentives: any[];
    handleAddIncentive: () => void;
    handleUpdateIncentive: (id: string, updates: any) => void;
    handleRemoveIncentive: (id: string) => void;
    totalIncentives: number;
}

export default function ConsumptionEnergyCost({
    consumptionData, handleChange,
    showIncentives, setShowIncentives,
    incentives, handleAddIncentive, handleUpdateIncentive, handleRemoveIncentive,
    totalIncentives,
}: ConsumptionEnergyCostProps) {
    return (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-wide">Energy Cost</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                {/* Utility Provider */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-500 uppercase">Utility Provider *</label>
                    <div className="relative">
                        <select
                            value={consumptionData.utilityProvider}
                            onChange={(e) => handleChange('utilityProvider', e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700 font-medium"
                        >
                            <option value="solar">solar</option>
                            <option value="custom">Custom Provider</option>
                        </select>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 cursor-pointer hover:underline">Can't find your rate?</p>
                </div>

                {/* Utility Rate */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Utility Rate *</label>
                    <div className="flex gap-2 items-center">
                        <select
                            value={consumptionData.utilityRate}
                            onChange={(e) => handleChange('utilityRate', e.target.value)}
                            className="flex-1 p-2.5 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-700"
                        >
                            <option value="">Select Rate...</option>
                            <option value="f1">Residential Tier 1 ($0.12/kWh)</option>
                            <option value="f2">Residential Tier 2 ($0.15/kWh)</option>
                            <option value="tou">Time-of-Use</option>
                        </select>
                        <button className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-400 cursor-pointer hover:text-blue-600 flex items-center justify-end gap-1">
                            Rate Overview <span className="text-[10px]">▶</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer font-medium">
                    <input
                        type="checkbox"
                        checked={consumptionData.useIndependentExportRate}
                        onChange={(e) => handleChange('useIndependentExportRate', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    Use independent export rate
                    <HelpCircle size={14} className="text-slate-400" />
                </label>
            </div>

            <div>
                <button
                    onClick={() => setShowIncentives(v => !v)}
                    className="flex items-center gap-2 text-sm text-blue-600 font-semibold hover:underline"
                >
                    <PlusCircle size={16} />
                    Add Incentives
                </button>
            </div>

            {(showIncentives || incentives.length > 0) && (
                <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-slate-700">Incentives</div>
                        <button
                            onClick={handleAddIncentive}
                            className="text-xs bg-white border border-slate-300 rounded px-2 py-1 hover:bg-slate-50 font-medium text-slate-700"
                        >
                            Add
                        </button>
                    </div>

                    {incentives.length === 0 ? (
                        <div className="text-sm text-slate-500">No incentives added.</div>
                    ) : (
                        <div className="space-y-3">
                            {incentives.map((inc) => (
                                <div key={inc.id} className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-200 rounded p-2">
                                    <input
                                        value={inc.name}
                                        onChange={(e) => handleUpdateIncentive(inc.id, { name: e.target.value })}
                                        className="col-span-5 p-2 text-sm border border-slate-200 rounded"
                                    />
                                    <select
                                        value={inc.type}
                                        onChange={(e) => handleUpdateIncentive(inc.id, { type: e.target.value as any })}
                                        className="col-span-3 p-2 text-sm border border-slate-200 rounded bg-white"
                                    >
                                        <option value="rebate">Rebate</option>
                                        <option value="tax_credit">Tax Credit</option>
                                        <option value="other">Other</option>
                                    </select>
                                    <div className="col-span-3 flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={Number.isFinite(inc.amount) ? inc.amount : 0}
                                            onChange={(e) => handleUpdateIncentive(inc.id, { amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                            className="w-full p-2 text-sm border border-slate-200 rounded"
                                        />
                                        <span className="text-xs text-slate-400">$</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveIncentive(inc.id)}
                                        className="col-span-1 text-slate-400 hover:text-red-600 flex items-center justify-center"
                                        title="Remove"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}

                            <div className="flex justify-end text-sm font-semibold text-slate-700">
                                Total: ${totalIncentives.toFixed(2)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
