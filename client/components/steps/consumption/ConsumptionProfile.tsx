import React from 'react';
import { BarChart3, Upload } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ConsumptionProfileProps {
    consumptionData: any;
    handleChange: (field: string, value: any) => void;
    monthlyData: Array<{ month: string; kwh: number }>;
}

export default function ConsumptionProfile({ consumptionData, handleChange, monthlyData }: ConsumptionProfileProps) {
    return (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-wide">Consumption Profile</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                {/* Annual Consumption */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-500">Annual consumption</label>
                    <div className="flex items-center border-b border-slate-300 pb-1 focus-within:border-blue-500">
                        <input
                            type="number"
                            value={consumptionData.annualConsumption || ''}
                            onChange={(e) => handleChange('annualConsumption', e.target.value)}
                            className="w-full bg-transparent focus:outline-none text-slate-800 font-medium"
                            placeholder="0"
                        />
                        <span className="text-sm text-slate-400">kWh</span>
                    </div>
                </div>

                {/* Current Monthly Bill */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-500">Current Monthly Bill</label>
                    <div className="flex items-center border-b border-slate-300 pb-1 focus-within:border-blue-500">
                        <input
                            type="number"
                            value={consumptionData.monthlyBill || ''}
                            onChange={(e) => handleChange('monthlyBill', e.target.value)}
                            className="w-full bg-transparent focus:outline-none text-slate-800 font-medium"
                            placeholder="0"
                        />
                        <span className="text-sm text-slate-400">$</span>
                    </div>
                </div>

                {/* Profile Selection */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-500">Select Consumption Profile</label>
                    <div className="relative">
                        <select
                            value={consumptionData.consumptionProfile}
                            onChange={(e) => handleChange('consumptionProfile', e.target.value)}
                            className="w-full bg-transparent border-b border-slate-300 pb-1 focus:outline-none focus:border-blue-500 text-slate-800 font-medium appearance-none"
                        >
                            <option value="">Select Profile</option>
                            <option value="typical_family">Typical Family (Evening Peak)</option>
                            <option value="wfh">Work From Home (Day Peak)</option>
                            <option value="commercial">Commercial (9-5)</option>
                        </select>
                        <Upload size={16} className="absolute right-0 top-1 text-slate-400" />
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <BarChart3 size={16} className="text-indigo-500" />
                        Monthly Consumption (kWh)
                    </div>
                    <div className="text-xs text-slate-500">
                        Total: {(consumptionData.annualConsumption || 0).toLocaleString()} kWh/yr
                    </div>
                </div>

                <div className="h-56 bg-white rounded border border-slate-200 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [`${val} kWh`, 'Consumption']} />
                            <Bar dataKey="kwh" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {!consumptionData.monthlyConsumption && (
                    <div className="mt-3 text-xs text-slate-500">
                        Enter annual consumption to estimate monthly breakdown.
                    </div>
                )}
            </div>
        </section>
    );
}
