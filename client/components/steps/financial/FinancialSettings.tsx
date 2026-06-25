import React from 'react';
import { Download, FileText, DollarSign, TrendingUp, Percent, Calendar, Table } from 'lucide-react';
import { DesignState } from '../../../types';

interface FinancialSettingsProps {
    designData: DesignState;
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>;
    capacityKWp: number;
    capex: number;
    incentivesTotal: number;
    netCapex: number;
    results: any;
    downloadCsv: () => void;
}

export default function FinancialSettings({
    designData, setDesignData,
    capacityKWp, capex, incentivesTotal, netCapex,
    results, downloadCsv,
}: FinancialSettingsProps) {
    const settings = designData.financialSettings;

    return (
        <>
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Financial Analysis</h2>
                <div className="flex gap-2">
                    <button className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 flex items-center gap-2">
                        <FileText size={18} />
                        Export Report
                    </button>
                    <button
                        onClick={downloadCsv}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Download size={18} />
                        Download CSV
                    </button>
                </div>
            </div>

            {/* Input Fields */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Tariff ($/kWh)</label>
                        <input
                            type="number"
                            value={settings.tariff}
                            onChange={(e) => setDesignData(prev => ({
                                ...prev,
                                financialSettings: { ...prev.financialSettings, tariff: e.target.value === '' ? 0 : parseFloat(e.target.value) }
                            }))}
                            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">System Cost ($/W)</label>
                        <input
                            type="number"
                            value={settings.systemCostPerWatt}
                            onChange={(e) => setDesignData(prev => ({
                                ...prev,
                                financialSettings: { ...prev.financialSettings, systemCostPerWatt: e.target.value === '' ? 0 : parseFloat(e.target.value) }
                            }))}
                            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Discount Rate (%)</label>
                        <input
                            type="number"
                            value={settings.discountRate}
                            onChange={(e) => setDesignData(prev => ({
                                ...prev,
                                financialSettings: { ...prev.financialSettings, discountRate: e.target.value === '' ? 0 : parseFloat(e.target.value) }
                            }))}
                            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Inflation (%)</label>
                        <input
                            type="number"
                            value={settings.electricityInflation}
                            onChange={(e) => setDesignData(prev => ({
                                ...prev,
                                financialSettings: { ...prev.financialSettings, electricityInflation: e.target.value === '' ? 0 : parseFloat(e.target.value) }
                            }))}
                            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-4 text-sm text-slate-700">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-xs text-slate-500">DC Size</div>
                        <div className="font-bold">{capacityKWp.toFixed(2)} kWp</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-xs text-slate-500">CapEx</div>
                        <div className="font-bold">${capex.toFixed(0)}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Incentives</div>
                        <div className="font-bold">-${incentivesTotal.toFixed(0)}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Net CapEx</div>
                        <div className="font-bold">${netCapex.toFixed(0)}</div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 rounded-lg text-green-600"><DollarSign size={20} /></div>
                        <span className="text-slate-500 font-medium text-sm">Lifetime Savings</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">${Math.max(0, results.lifetimeNet).toFixed(0)}</p>
                    <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                        <TrendingUp size={12} />ROI: {results.roi.toFixed(0)}%
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Percent size={20} /></div>
                        <span className="text-slate-500 font-medium text-sm">Internal Rate of Return</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{results.irr === null ? 'N/A' : `${(results.irr * 100).toFixed(1)}%`}</p>
                    <p className="text-xs text-slate-400 mt-1">
                        Payback period: {results.paybackYear === null ? 'N/A' : `${results.paybackYear.toFixed(1)} years`}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Calendar size={20} /></div>
                        <span className="text-slate-500 font-medium text-sm">Payback Period</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{results.paybackYear === null ? 'N/A' : `${results.paybackYear.toFixed(1)} Years`}</p>
                    <p className="text-xs text-slate-400 mt-1">System lifetime: 25 years</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Table size={20} /></div>
                        <span className="text-slate-500 font-medium text-sm">Net Present Value</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">${results.npv.toFixed(0)}</p>
                    <p className="text-xs text-slate-400 mt-1">Discount rate: {settings.discountRate}%</p>
                </div>
            </div>
        </>
    );
}
