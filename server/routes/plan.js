import express from 'express';
import fetch from 'node-fetch';
import { authenticateToken } from '../middleware/auth.js';
import Trip from '../models/Trip.js';

const router = express.Router();

// NEW FEATURE: Fetch historical plans for the profile dashboard vault
router.get('/my-plans', authenticateToken, async (req, res) => {
    try {
        const pastTrips = await Trip.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(pastTrips);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a saved plan
router.delete('/my-plans/:id', authenticateToken, async (req, res) => {
    try {
        await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Explicit save endpoint — called when user clicks "Save Plan" after viewing/swapping
router.post('/save-plan', authenticateToken, async (req, res) => {
    try {
        const { fromLocation, destination, budgetUsd, durationDays, travelDates, itinerary } = req.body;
        const trip = await Trip.create({
            userId: req.user.id,
            fromLocation,
            destination,
            budgetUsd,
            durationDays,
            travelDates,
            itinerary,
            status: 'complete'
        });
        res.json({ success: true, id: trip._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Swap a single activity via AI
router.post('/swap', authenticateToken, async (req, res) => {
    try {
        const response = await fetch(`${process.env.AGENT_SERVICE_URL}/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Core Planning Router Engine
router.post('/plan', authenticateToken, async (req, res) => {
    // Destructure from_location out of incoming client body
    const { from_location, destination, budget_usd, duration_days, travel_dates, travel_mode } = req.body;

    try {
        // Log trip data into MongoDB database
        const trip = await Trip.create({
            userId: req.user.id,
            fromLocation: from_location,
            destination,
            budgetUsd: budget_usd,
            durationDays: duration_days,
            travelDates: travel_dates,
            status: 'planning'
        });

        // Geocode origin and destination via OpenStreetMap Nominatim
        let originLatLon = null;
        let destLatLon = null;
        try {
            const geoPromises = [
                fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(from_location)}&format=json&limit=1`, {
                    headers: { 'User-Agent': 'AgenticTravelPlanner/1.0 (contact@example.com)' }
                }).then(r => r.json()),
                fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`, {
                    headers: { 'User-Agent': 'AgenticTravelPlanner/1.0 (contact@example.com)' }
                }).then(r => r.json())
            ];
            const [geoFrom, geoTo] = await Promise.all(geoPromises);
            if (geoFrom && geoFrom.length > 0) {
                originLatLon = { lat: parseFloat(geoFrom[0].lat), lon: parseFloat(geoFrom[0].lon), display_name: geoFrom[0].display_name };
            }
            if (geoTo && geoTo.length > 0) {
                destLatLon = { lat: parseFloat(geoTo[0].lat), lon: parseFloat(geoTo[0].lon), display_name: geoTo[0].display_name };
            }
        } catch (geoErr) {
            console.error("Geocoding skipped due to error:", geoErr.message);
        }

        // Setup Server-Sent Events headers for live stream visualization
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Forward request parameters directly to FastAPI Agent
        const response = await fetch(`${process.env.AGENT_SERVICE_URL}/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_location,
                destination,
                origin_latlon: originLatLon,
                destination_latlon: destLatLon,
                budget_usd: Number(budget_usd),
                duration_days: Number(duration_days),
                travel_dates: travel_dates || "Flexible",
                travel_mode: travel_mode || "Flight"
            })
        });

        const reader = response.body;
        let finalItinerary = "";
        
        for await (const chunk of reader) {
            const textChunk = chunk.toString();
            res.write(textChunk); // Pipe raw data stream up to React frontend view

            // Accumulate data chunks to save the complete summary upon close
            const lines = textChunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const cleanJSON = line.replace('data: ', '').trim();
                    if (cleanJSON === '[DONE]') {
                        trip.itinerary = finalItinerary;
                        trip.status = 'complete';
                        await trip.save();
                    } else {
                        try {
                            const parsed = JSON.parse(cleanJSON);
                            // Capture the finalized text output from the graph loop
                            if (parsed.output && parsed.output.itinerary) {
                                finalItinerary = parsed.output.itinerary;
                            }
                        } catch (e) {
                            // Suppress syntax noise from incomplete frame buffers
                        }
                    }
                }
            }
        }
    } catch (err) {
        res.write(`data: {"error": "${err.message}"}\n\n`);
    } finally {
        res.end();
    }
});

export default router;