import React, { useState } from 'react';
import styles from './TripForm.module.css';

export default function TripForm({ onSubmit, isLoading }) {
    const [destination, setDestination] = useState('Tokyo');
    const [budgetUsd, setBudgetUsd] = useState(2000);
    const [durationDays, setDurationDays] = useState(4);
    const [departureDate, setDepartureDate] = useState('2026-07-10');
    const [returnDate, setReturnDate] = useState('2026-07-14');

    const handleFormSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            destination,
            budget_usd: parseFloat(budgetUsd),
            duration_days: parseInt(durationDays, 10),
            travel_dates: {
                departure: departureDate,
                return: returnDate
            }
        });
    };

    return (
        <form className={styles.formContainer} onSubmit={handleFormSubmit}>
            <h2 className={styles.title}>Build Your Agentic Itinerary</h2>
            <div className={styles.fieldGroup}>
                <label>Where to?</label>
                <input type="text" value={destination} onChange={e => setDestination(e.target.value)} required />
            </div>
            <div className={styles.row}>
                <div className={styles.fieldGroup}>
                    <label>Budget (USD)</label>
                    <input type="number" value={budgetUsd} onChange={e => setBudgetUsd(e.target.value)} required />
                </div>
                <div className={styles.fieldGroup}>
                    <label>Duration (Days)</label>
                    <input type="number" value={durationDays} onChange={e => setDurationDays(e.target.value)} required />
                </div>
            </div>
            <div className={styles.row}>
                <div className={styles.fieldGroup}>
                    <label>Departure Date</label>
                    <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} required />
                </div>
                <div className={styles.fieldGroup}>
                    <label>Return Date</label>
                    <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} required />
                </div>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                {isLoading ? 'Agent Engine Active...' : 'Generate Optimized Plan'}
            </button>
        </form>
    );
}