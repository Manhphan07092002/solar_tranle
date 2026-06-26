import mongoose, { Schema } from 'mongoose';

export interface IInverter {
    manufacturer: string;
    model: string;
    maxPowerAC: number;
    efficiency: number;
    minStringLength: number;
    maxStringLength: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const InverterSchema = new Schema({
    manufacturer: { type: String, required: true },
    model: { type: String, required: true },
    maxPowerAC: { type: Number, required: true },
    efficiency: { type: Number, required: true },
    minStringLength: { type: Number, required: true },
    maxStringLength: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IInverter>('Inverter', InverterSchema);
