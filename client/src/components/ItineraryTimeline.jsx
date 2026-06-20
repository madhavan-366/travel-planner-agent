import React, { useEffect } from 'react';
import { useTripPlan } from '../hooks/useTripPlan';
import AgentStatusBar from './AgentStatusBar';
import DayCard from './DayCard';
import styles from './ItineraryTimeline.module.css';

export default function ItineraryTimeline({ formData }) {
    const { status, itinerary, agentEvents, revisionCount, error, startPlanning } = useTripPlan();

    useEffect(() => {
        if (formData) {
            startPlanning(formData);
        }
    }, [formData]);

    return (
        <div className={styles.wrapper}>
            <AgentStatusBar 
                status={status} 
                agentEvents={agentEvents} 
                revisionCount={revisionCount} 
            />

            {error && <div className={styles.errorBanner}>Error: {error}</div>}

            <div className={styles.timelineContainer}>
                {itinerary.map((dayData, idx) => (
                    <div key={idx} className={styles.timelineNode}>
                        <DayCard dayData={dayData} />
                    </div>
                ))}

                {status === 'planning' && itinerary.length === 0 && (
                    <div className={styles.skeletonCard}>
                        <div className={styles.skeletonLine}></div>
                        <div className={styles.skeletonLineShort}></div>
                    </div>
                )}
            </div>
        </div>
    );
}