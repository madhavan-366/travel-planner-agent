import { useState } from 'react';

export const useTripPlan = () => {
    const [status, setStatus] = useState('idle'); // idle, planning, revising, complete, error
    const [itinerary, setItinerary] = useState([]);
    const [agentEvents, setAgentEvents] = useState([]);
    const [revisionCount, setRevisionCount] = useState(0);
    const [error, setError] = useState(null);

    const startPlanning = async (formData) => {
        setStatus('planning');
        setError(null);
        setItinerary([]);
        setAgentEvents([]);
        setRevisionCount(0);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`Server returned HTTP status ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop(); // Keep partial frame in buffer

                for (const line of lines) {
                    if (!line.trim() || !line.startsWith('data: ')) continue;
                    const cleanData = line.replace('data: ', '').trim();

                    if (cleanData === '[DONE]') {
                        setStatus('complete');
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(cleanData);
                        
                        if (parsed.error) {
                            setStatus('error');
                            setError(parsed.error);
                            continue;
                        }

                        const { node, output } = parsed;
                        
                        setAgentEvents(prev => [...prev, `Completed ${node} node state process.`]);

                        if (node === 'planner') {
                            if (output.itinerary) {
                                setItinerary(output.itinerary);
                            }
                        } else if (node === 'tool_executor') {
                            if (output.itinerary) {
                                setItinerary(output.itinerary);
                            }
                        } else if (node === 'budget_validator') {
                            if (output.revision_reason) {
                                setStatus('revising');
                                setRevisionCount(output.revision_count || 1);
                            }
                        }
                    } catch (e) {
                        // Safe failure check if parse fails on heartbeat telemetry frames
                    }
                }
            }
        } catch (err) {
            setStatus('error');
            setError(err.message);
        }
    };

    return { status, itinerary, agentEvents, revisionCount, error, startPlanning };
};