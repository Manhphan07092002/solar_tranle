import React from 'react';
import { Table } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FinancialTableProps {
    rows: Array<{ year: number; production: number; savings: number; maintenance: number; netCashFlow: number; cumulativeCashFlow: number }>;
    netCapex: number;
}

export default function FinancialTable({ rows, netCapex }: FinancialTableProps) {
    return (
        <>
            {/* Annual Savings vs Cost bar chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Annual Savings vs Cost</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rows}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                            <Tooltip cursor={{ fill: '#f1f5f9' }} />
                            <Legend />
                            <Bar dataKey="savings" name="Savings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="maintenance" name="Maintenance" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Cash Flow Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-10">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Table size={18} className="text-slate-500" />
                        Cash Flow Detail
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Year</th>
                                <th className="px-6 py-3 text-right">Production (kWh)</th>
                                <th className="px-6 py-3 text-right">Bill Savings</th>
                                <th className="px-6 py-3 text-right">O&M Cost</th>
                                <th className="px-6 py-3 text-right">Net Flow</th>
                                <th className="px-6 py-3 text-right">Cumulative</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            <tr className="bg-slate-50/50">
                                <td className="px-6 py-3 font-medium">0</td>
                                <td className="px-6 py-3 text-right text-slate-400">-</td>
                                <td className="px-6 py-3 text-right text-slate-400">-</td>
                                <td className="px-6 py-3 text-right text-slate-400">-</td>
                                <td className="px-6 py-3 text-right font-bold text-red-600">${(-netCapex).toFixed(0)}</td>
                                <td className="px-6 py-3 text-right font-bold text-red-600">${(-netCapex).toFixed(0)}</td>
                            </tr>
                            {rows.map((row) => (
                                <tr key={row.year} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 font-medium">{row.year}</td>
                                    <td className="px-6 py-3 text-right text-slate-600">{row.production.toFixed(0)}</td>
                                    <td className="px-6 py-3 text-right text-green-600">+${row.savings.toFixed(0)}</td>
                                    <td className="px-6 py-3 text-right text-red-500">-${row.maintenance.toFixed(0)}</td>
                                    <td className="px-6 py-3 text-right font-bold text-slate-800">${row.netCashFlow.toFixed(0)}</td>
                                    <td className={`px-6 py-3 text-right font-bold ${row.cumulativeCashFlow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        ${row.cumulativeCashFlow.toFixed(0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
