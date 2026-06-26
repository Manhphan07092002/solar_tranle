import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Save, Loader2, Paintbrush } from 'lucide-react';

export default function AdminSettings() {
    const [settings, setSettings] = useState({ appName: 'PV Designer', primaryColor: '#2563eb', logoUrl: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await adminService.getSettings();
            setSettings(data);
        } catch (error) {
            console.error('Failed to load settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await adminService.updateSettings(settings);
            setMessage('Settings saved successfully! Refresh page to see full effect.');
            
            // Immediately apply primary color
            document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
        } catch (error) {
            setMessage('Error saving settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setMessage('Error: Logo image must be less than 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings({...settings, logoUrl: reader.result as string});
                setMessage('Logo uploaded successfully! Don\\'t forget to save changes.');
            };
            reader.readAsDataURL(file);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                <Paintbrush className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold text-slate-800">White-labeling Settings</h2>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Application Name</label>
                    <input 
                        type="text" 
                        value={settings.appName} 
                        onChange={(e) => setSettings({...settings, appName: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-colors"
                        required
                    />
                    <p className="text-xs text-slate-500 mt-1">This name will appear in headers and reports.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Primary Color (Hex)</label>
                    <div className="flex gap-4 items-center">
                        <input 
                            type="color" 
                            value={settings.primaryColor} 
                            onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                            className="w-12 h-12 p-1 rounded cursor-pointer border border-slate-200 bg-slate-50"
                        />
                        <input 
                            type="text" 
                            value={settings.primaryColor} 
                            onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-colors uppercase font-mono"
                            pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL (Optional)</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={settings.logoUrl || ''} 
                            onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-colors"
                            placeholder="https://example.com/logo.png"
                        />
                        <label className="cursor-pointer px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center font-medium text-slate-700 text-sm whitespace-nowrap">
                            <span>Tải ảnh lên</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </label>
                    </div>
                    {settings.logoUrl && settings.logoUrl.startsWith('data:image') && (
                        <p className="text-xs text-blue-600 mt-1">Image loaded from device.</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Paste a URL or upload from your device. Leave blank to use the default logo.</p>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg text-sm font-medium ${message.includes('success') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {message}
                    </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        style={{ backgroundColor: settings.primaryColor }}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
