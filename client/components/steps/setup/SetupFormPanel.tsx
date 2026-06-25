import React from 'react';
import { ChevronDown, ChevronUp, Check, AlertTriangle, Search, Locate, Loader2, X, CloudSun, Home, Lock, MapPin, Download } from 'lucide-react';
import { DesignState } from '../../../types';
import { WEATHER_STATIONS } from '../../../constants';
import { getDistanceKm } from '../../../utils/helpers';

interface SetupFormPanelProps {
    designData: DesignState;
    searchAddr: string;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    searchStatus: 'idle' | 'searching' | 'success' | 'error';
    searchFeedback: string;
    suggestions: any[];
    showSuggestions: boolean;
    isLoadingSuggestions: boolean;
    handleSearchInputChange: (value: string) => void;
    handleSuggestionClick: (suggestion: any) => void;
    handleManualSearch: () => void;
    handleCurrentLocation: () => void;
    clearSearch: () => void;
    targetLocation: { lat: number, lng: number } | null;
    projectName: string;
    setProjectName: (v: string) => void;
    city: string;
    setCity: (v: string) => void;
    zipCode: string;
    setZipCode: (v: string) => void;
    selectedStationId: string;
    setSelectedStationId: (v: string) => void;
    openSections: Record<string, boolean>;
    toggleSection: (section: string) => void;
    customerData: any;
    setCustomerData: (v: any) => void;
    gridData: any;
    setGridData: (v: any) => void;
    notes: string;
    setNotes: (v: string) => void;
}

export default function SetupFormPanel({
    designData,
    searchAddr, searchInputRef,
    searchStatus, searchFeedback,
    suggestions, showSuggestions, isLoadingSuggestions,
    handleSearchInputChange, handleSuggestionClick,
    handleManualSearch, handleCurrentLocation, clearSearch,
    targetLocation,
    projectName, setProjectName,
    city, setCity, zipCode, setZipCode,
    selectedStationId, setSelectedStationId,
    openSections, toggleSection,
    customerData, setCustomerData,
    gridData, setGridData,
    notes, setNotes,
}: SetupFormPanelProps) {
    return (
        <div className="w-1/3 bg-white border-r border-slate-200 overflow-y-auto p-6">
            <div className="space-y-6">
                {/* Project Segment */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Project Segment *</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button className="px-4 py-2 border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
                            <Home size={16} />
                            Residential
                        </button>
                        <button className="px-4 py-2 border border-slate-300 bg-white text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-50">
                            Commercial
                        </button>
                    </div>
                </div>

                {/* Project Name */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Project Name *</label>
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                {/* Street Address with Autocomplete */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Street</label>
                    <div className="relative">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchAddr}
                            onChange={(e) => handleSearchInputChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                            onFocus={() => searchAddr.length >= 3 && showSuggestions}
                            placeholder="Search address..."
                            className={`w-full border rounded-lg pl-10 pr-10 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none
                                ${searchStatus === 'error' ? 'border-red-300 bg-red-50' :
                                    searchStatus === 'success' ? 'border-green-300 bg-green-50' : 'border-slate-300'}
                            `}
                        />
                        <div className="absolute left-3 top-2.5 text-slate-400">
                            {isLoadingSuggestions || searchStatus === 'searching' ?
                                <Loader2 size={18} className="animate-spin text-blue-500" /> :
                                <Search size={18} />
                            }
                        </div>
                        {searchAddr && (
                            <button onClick={clearSearch} className="absolute right-10 top-2.5 text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        )}
                        <button
                            onClick={handleCurrentLocation}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-blue-600"
                            title="Use Current Location"
                        >
                            <Locate size={16} />
                        </button>

                        {/* Autocomplete Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                {suggestions.map((suggestion, idx) => (
                                    <button
                                        key={suggestion.place_id || idx}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors flex items-start gap-3"
                                    >
                                        <MapPin size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">{suggestion.display_name}</p>
                                            {suggestion.type && <p className="text-xs text-slate-500 mt-0.5">{suggestion.type}</p>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {searchFeedback && (
                        <div className={`text-xs flex items-center gap-1.5 ${searchStatus === 'error' ? 'text-red-600' : 'text-green-700'}`}>
                            {searchStatus === 'error' ? <AlertTriangle size={12} /> : <Check size={12} />}
                            {searchFeedback}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">City</label>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Da Nang"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Zip code</label>
                        <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="550000"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>

                {/* Country */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Country *</label>
                    <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option>Vietnam</option>
                        <option>Thailand</option>
                        <option>Singapore</option>
                    </select>
                </div>

                {/* Weather Station */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Weather station *</label>
                    <div className="flex gap-2">
                        <select
                            value={selectedStationId}
                            onChange={(e) => setSelectedStationId(e.target.value)}
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {WEATHER_STATIONS.map(station => {
                                const loc = targetLocation || designData.mapConfig;
                                const dist = loc ? getDistanceKm(loc.lat, loc.lng, station.lat, station.lng) : 0;
                                const distLabel = loc ? (dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`) : '';
                                return (
                                    <option key={station.id} value={station.id}>
                                        {station.name} {distLabel ? `(${distLabel})` : ''}
                                    </option>
                                );
                            })}
                        </select>
                        <button className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50">
                            <Download size={16} className="text-slate-600" />
                        </button>
                    </div>
                </div>

                {/* Climate Data */}
                {designData.weather && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            <CloudSun size={16} className="text-orange-500" />
                            Climate Data
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <p className="text-slate-500 uppercase font-semibold">GHI</p>
                                <p className="font-bold text-slate-800">{designData.weather.ghi} kWh/m²</p>
                            </div>
                            <div>
                                <p className="text-slate-500 uppercase font-semibold">Yield</p>
                                <p className="font-bold text-slate-800">{designData.weather.specificYield} kWh/kWp</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grid Parameters */}
                <div className="border-t pt-4">
                    <button onClick={() => toggleSection('grid')} className="w-full flex items-center justify-between py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">
                        <span>GRID PARAMETERS</span>
                        {openSections.grid ? <ChevronUp size={16} /> : <div className="flex items-center gap-2 text-slate-500"><span className="text-xs font-normal">400V L-L, 230V L-N</span><ChevronDown size={16} /></div>}
                    </button>
                    {openSections.grid && (
                        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500">Electricity Grid *</label>
                                <select value={gridData.gridType} onChange={(e) => setGridData({ ...gridData, gridType: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option>400V L-L, 230V L-N</option>
                                    <option>230V L-N</option>
                                    <option>380V L-L, 220V L-N</option>
                                    <option>220V L-N</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500">Power Factor (cos φ)</label>
                                <input type="text" value={gridData.powerFactor} onChange={(e) => setGridData({ ...gridData, powerFactor: e.target.value })} className="w-full border-b border-slate-300 px-0 py-1 text-sm focus:border-blue-500 focus:ring-0 outline-none" />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <button onClick={() => setGridData({ ...gridData, exportLimit: !gridData.exportLimit })} className={`w-10 h-5 rounded-full relative transition-colors ${gridData.exportLimit ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${gridData.exportLimit ? 'left-6' : 'left-1'}`} />
                                </button>
                                <span className="text-sm text-slate-600">Export Limit</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Customer */}
                <div className="border-t pt-4">
                    <button onClick={() => toggleSection('customer')} className="w-full flex items-center justify-between py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">
                        <span>CUSTOMER</span>
                        {openSections.customer ? <ChevronUp size={16} /> : <ChevronDown size={16} className="text-slate-400" />}
                    </button>
                    {openSections.customer && (
                        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-500">First Name</label>
                                    <input type="text" value={customerData.firstName} onChange={(e) => setCustomerData({ ...customerData, firstName: e.target.value })} className="w-full border-b border-slate-300 px-0 py-1 text-sm focus:border-blue-500 focus:ring-0 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-500">Last Name</label>
                                    <input type="text" value={customerData.lastName} onChange={(e) => setCustomerData({ ...customerData, lastName: e.target.value })} className="w-full border-b border-slate-300 px-0 py-1 text-sm focus:border-blue-500 focus:ring-0 outline-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500">Email</label>
                                <div className="relative">
                                    <input type="email" value={customerData.email} onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })} className="w-full border-b border-slate-300 px-0 py-1 text-sm focus:border-blue-500 focus:ring-0 outline-none pr-8 text-slate-700" />
                                    <Lock size={14} className="absolute right-0 top-1.5 text-blue-500 bg-blue-100 rounded-full p-0.5" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500">Company</label>
                                <input type="text" value={customerData.company} onChange={(e) => setCustomerData({ ...customerData, company: e.target.value })} className="w-full border-b border-slate-300 px-0 py-1 text-sm focus:border-blue-500 focus:ring-0 outline-none" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Notes */}
                <div className="border-t pt-4">
                    <button onClick={() => toggleSection('notes')} className="w-full flex items-center justify-between py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">
                        <span>NOTES</span>
                        {openSections.notes ? <ChevronUp size={16} /> : <ChevronDown size={16} className="text-slate-400" />}
                    </button>
                    {openSections.notes && (
                        <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-500">Notes</label>
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border-b border-slate-300 px-0 py-1 text-sm focus:border-blue-500 focus:ring-0 outline-none resize-none" placeholder="Add notes..." />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
