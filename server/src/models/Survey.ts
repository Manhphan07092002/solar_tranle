import mongoose, { Schema } from 'mongoose';

export interface ISurvey {
    title: string;
    content: string;
    imageUrl?: string;
    category: 'survey' | 'article' | 'guide';
    status: 'draft' | 'published';
    author: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SurveySchema = new Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    imageUrl: { type: String },
    category: { type: String, enum: ['survey', 'article', 'guide'], default: 'article' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model<ISurvey>('Survey', SurveySchema);
