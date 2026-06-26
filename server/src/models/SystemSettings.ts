import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
    appName: string;
    primaryColor: string;
    logoUrl: string;
}

const SystemSettingsSchema: Schema = new Schema({
    appName: { type: String, default: 'PV Designer' },
    primaryColor: { type: String, default: '#2563eb' }, // blue-600
    logoUrl: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
