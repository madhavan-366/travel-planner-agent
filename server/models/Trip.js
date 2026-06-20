import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromLocation: { type: String, required: true },
    destination: { type: String, required: true },
    budgetUsd: { type: Number, required: true },
    durationDays: { type: Number, required: true },
    travelDates: { type: String, default: 'Flexible' },
    itinerary: { type: String, default: '' },
    status: { 
        type: String, 
        enum: ['planning', 'complete', 'failed'], 
        default: 'planning' 
    },
    totalCost: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Trip', tripSchema);