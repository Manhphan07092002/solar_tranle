import mongoose, { Schema, Document } from 'mongoose';
import { DesignStateSchema } from './DesignState';

export interface IProject extends Document {
    id: string; // Maintain compatibility with frontend string IDs
    name: string;
    address: string;
    owner: string;
    capacityKWp: number;
    lastModified: Date;
    status: 'Draft' | 'Designed' | 'Installed';
    type: 'Residential' | 'Commercial';
    thumbnailUrl: string;
    designState: any; // Using the embedded schema structure
}

const ProjectSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    address: { type: String, default: '' },
    owner: { type: String, default: 'Unknown' },
    capacityKWp: { type: Number, default: 0 },
    lastModified: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['Draft', 'Designed', 'Installed'],
        default: 'Draft'
    },
    type: {
        type: String,
        enum: ['Residential', 'Commercial'],
        default: 'Residential'
    },
    thumbnailUrl: { type: String, default: '' },
    designState: { type: DesignStateSchema, default: null }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export default mongoose.model<IProject>('Project', ProjectSchema);
