import React, { useMemo } from 'react';
import { DesignState } from '../../../types';
import { Info, Calculator, Zap, CalendarDays, Leaf, Cpu, Server, Table } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MapPreview from './MapPreview';

interface Props {
    designData: DesignState;
}

export default function ProjectSummaryTab({ designData }: Props) {
    const numModules = designData.modules.length;
    const modulePower = designData.selectedModule?.power || 550;
    const capacityKWp = (numModules * modulePower) / 1000;
    const installedDC = capacityKWp;
    
    const specificYield = designData.weather?.specificYield > 0 ? designData.weather?.specificYield : 1400;
    const annualConsumption = designData.consumption?.annualConsumption > 0 ? designData.consumption.annualConsumption : 0;
    
    const maxAC = capacityKWp * 0.9;
    const annualProd = capacityKWp * specificYield; // kWh
    const co2Saved = (annualProd * 0.4) / 1000; // tonnes
    
    const numInverters = designData.inverterCount || 1;
    const numOptimizers = numModules;

    const monthlyData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        // Generic bell curve profile for solar production
        const prodProfile = [0.06, 0.07, 0.09, 0.11, 0.12, 0.13, 0.13, 0.11, 0.08, 0.05, 0.03, 0.02];
        // Flat profile for consumption (can be improved if a real profile is selected)
        const consProfile = [0.08, 0.08, 0.08, 0.08, 0.09, 0.1, 0.1, 0.09, 0.08, 0.08, 0.07, 0.07];
        
        return months.map((m, i) => {
            const production = annualProd * prodProfile[i];
            const consumption = annualConsumption * consProfile[i];
            const selfConsumption = Math.min(production, consumption);
            
            return {
                name: m,
                'To Home': selfConsumption,
                'To Grid': production - selfConsumption,
                'From Solar': selfConsumption,
                'From Grid': consumption - selfConsumption
            };
        });
    }, [annualProd, annualConsumption]);

    return (
        <div className="space-y-6 pb-20">
            {/* Map Preview */}
            <MapPreview designData={designData} />

            {/* SYSTEM OVERVIEW */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">System Overview</h3>
                </div>
                <div className="p-6 grid grid-cols-3 divide-x divide-slate-100">
                    <div className="flex items-center justify-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Table size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-800">{numModules}</div>
                            <div className="text-sm text-slate-500 font-medium">PV modules</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Server size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-800">{numInverters}</div>
                            <div className="text-sm text-slate-500 font-medium">Inverters</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Cpu size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-800">{numOptimizers}</div>
                            <div className="text-sm text-slate-500 font-medium">Optimizers</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FINANCIAL OVERVIEW */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Financial Overview</h3>
                </div>
                <div className="p-6">
                    <div className="flex gap-3 text-sm text-slate-600">
                        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="mb-2">To see full financial overview data, estimated bill savings and detailed financial analysis the following parameters need to be filled:</p>
                            <ul className="list-disc pl-5 text-blue-600 space-y-1">
                                <li>Annual Consumption</li>
                                <li>Utility Provider and Utility Rate (Import/Export)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* SIMULATION RESULTS */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Simulation Results</h3>
                </div>
                <div className="p-8 grid grid-cols-4 divide-x divide-slate-100">
                    <div className="flex flex-col items-center justify-center text-center px-4">
                        <Calculator size={28} className="text-blue-900 mb-3" strokeWidth={1.5} />
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Installed DC Power</p>
                        <div className="text-3xl font-light text-slate-800">{installedDC.toFixed(2)} <span className="text-base font-normal text-slate-500">kWp</span></div>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center px-4">
                        <Zap size={28} className="text-blue-900 mb-3" strokeWidth={1.5} />
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Max Achieved AC Power</p>
                        <div className="text-3xl font-light text-slate-800">{maxAC.toFixed(1)} <span className="text-base font-normal text-slate-500">kW</span></div>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center px-4">
                        <CalendarDays size={28} className="text-blue-900 mb-3" strokeWidth={1.5} />
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Annual Usable Production</p>
                        <div className="text-3xl font-light text-slate-800">{annualProd.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-base font-normal text-slate-500">kWh</span></div>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center px-4">
                        <Leaf size={28} className="text-blue-900 mb-3" strokeWidth={1.5} />
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Annual CO2 Saved</p>
                        <div className="text-3xl font-light text-slate-800">{co2Saved.toFixed(2)} <span className="text-base font-normal text-slate-500">t</span></div>
                    </div>
                </div>
            </div>

            {/* MONTHLY ENERGY CHART */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Estimated Monthly Energy</h3>
                </div>
                <div className="p-6 h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `${val.toLocaleString()} kWh`} />
                            <Tooltip 
                                cursor={{fill: '#f1f5f9'}}
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                formatter={(value: number, name: string) => [`${value.toLocaleString(undefined, {maximumFractionDigits: 0})} kWh`, name]}
                            />
                            <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                            
                            {/* Production Stack */}
                            <Bar dataKey="To Home" stackId="production" fill="#0f766e" maxBarSize={30} />
                            <Bar dataKey="To Grid" stackId="production" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={30} />
                            
                            {/* Consumption Stack */}
                            {annualConsumption > 0 && (
                                <>
                                    <Bar dataKey="From Solar" stackId="consumption" fill="#64748b" maxBarSize={30} />
                                    <Bar dataKey="From Grid" stackId="consumption" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={30} />
                                </>
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* BILL OF MATERIALS */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Bill Of Materials (BOM)</h3>
                </div>
                <div className="p-0">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Items</th>
                                <th className="px-6 py-3 font-semibold">Quantity</th>
                                <th className="px-6 py-3 font-semibold">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="px-6 py-4 font-medium text-slate-800">
                                    {designData.selectedInverter?.manufacturer || 'SolarEdge'} {designData.selectedInverter?.model || 'SE10000H Home Wave'}
                                </td>
                                <td className="px-6 py-4">{numInverters}</td>
                                <td className="px-6 py-4 text-xs text-slate-400">Main Inverter Unit</td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 font-medium text-slate-800">
                                    S440 Power Optimizer
                                </td>
                                <td className="px-6 py-4">{numOptimizers}</td>
                                <td className="px-6 py-4 text-xs text-slate-400">1 per module</td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 font-medium text-slate-800">
                                    {designData.selectedModule?.manufacturer} {designData.selectedModule?.model} ({modulePower}W)
                                </td>
                                <td className="px-6 py-4">{numModules}</td>
                                <td className="px-6 py-4 text-xs text-slate-400">Monocrystalline N-type</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
