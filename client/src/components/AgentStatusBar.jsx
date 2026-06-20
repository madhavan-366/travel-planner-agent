import React from 'react';
import styles from './AgentStatusBar.module.css';

export default function AgentStatusBar({ status, agentEvents, revisionCount }) {
    if (status === 'idle') return null;

    let statusText = '';
    let statusClass = styles.planning;

    if (status === 'planning') {
        statusText = 'Drafting your itinerary with AI...';
        statusClass = styles.planning;
    } else if (status === 'revising') {
        statusText = `Over budget — finding cheaper options... (attempt ${revisionCount}/3)`;
        statusClass = styles.revising;
    } else if (status === 'complete') {
        statusText = 'Your itinerary is ready!';
        statusClass = styles.complete;
    } else if (status === 'error') {
        statusText = 'Something went wrong. Please try again.';
        statusClass = styles.error;
    }

    return (
        <div className={styles.container}>
            <div className={`${styles.statusPill} ${statusClass}`}>
                {statusText}
            </div>
            <div className={styles.logConsole}>
                {agentEvents.map((ev, index) => (
                    <div key={index} className={styles.logLine}>› {ev}</div>
                ))}
            </div>
        </div>
    );
}