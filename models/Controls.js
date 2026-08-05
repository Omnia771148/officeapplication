import mongoose from 'mongoose';

// Delete cached model in Next.js hot reload to force schema re-compilation
if (mongoose.models && mongoose.models.Controls) {
    delete mongoose.models.Controls;
}

const HistoryItemSchema = new mongoose.Schema({
    status: { type: Boolean, required: true },
    name: { type: String, required: true },
    date: { type: mongoose.Schema.Types.Mixed, required: true },
    istTime: { type: String },
    timestamp: { type: Number, default: Date.now }
}, { _id: true });

const ControlsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    status: { type: Boolean, required: true, default: true },
    history: [HistoryItemSchema]
}, { timestamps: true, collection: 'controls' });

export default mongoose.models.Controls || mongoose.model('Controls', ControlsSchema);
