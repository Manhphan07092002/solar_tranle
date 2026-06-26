import mongoose, { Schema } from 'mongoose';

export interface IPanel {
    manufacturer: string;
    model: string;
    power: number;
    width: number;
    height: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const PanelSchema = new Schema({
    manufacturer: { type: String, required: true },
    model: { type: String, required: true },
    power: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IPanel>('Panel', PanelSchema);
