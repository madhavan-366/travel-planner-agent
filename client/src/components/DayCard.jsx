import React from 'react';
import styles from './DayCard.module.css';

export default function DayCard({ dayData }) {
    const { day, activities, accommodation, transport } = dayData;

    return (
        <div className={styles.cardContainer}>
            <div className={styles.dayHeader}>Day {day}</div>
            
            <div className={styles.section}>
                <div className={styles.sectionTitle}>🏨 Accommodation</div>
                <div className={styles.itemDetail}>
                    <span>{accommodation?.name || 'Searching...'}</span>
                    <span className={styles.costBadge}>
                        ₹{accommodation?.price_per_night || 0}/night
                    </span>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionTitle}>📍 Activities</div>
                {activities && activities.map((act, i) => (
                    <div key={i} className={styles.activityItem}>
                        <div className={styles.timeLine}>
                            <span className={styles.time}>{act.time}</span>
                            <span className={styles.typeTag}>{act.type}</span>
                        </div>
                        <div className={styles.actName}>{act.name}</div>
                        <div className={styles.actCost}>
                            {act.cost === 0 ? 'Free' : `₹${act.cost}`}
                        </div>
                    </div>
                ))}
            </div>

            {transport && (
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>✈️ Logistics & Transport</div>
                    <div className={styles.itemDetail}>
                        <span>{transport.type}</span>
                        <span className={styles.costBadge}>₹{transport.cost}</span>
                    </div>
                </div>
            )}
        </div>
    );
}