'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './controls.css';

const AUTHORIZED_NAMES = ['sai', 'vineeth', 'parthu'];
const LOGIN_PASSWORD = '123';

const CONTROL_DESCRIPTIONS = {
    confirmPayButton: 'Turn off and on the confirm pay button in the payment checkout flow.',
    maintenanceMode: 'Turn off and on application maintenance mode.'
};

export default function ControlsPage() {
    const router = useRouter();
    const [controlsList, setControlsList] = useState([]);
    const [isMounted, setIsMounted] = useState(false);
    const [loading, setLoading] = useState(true);

    // Auth modal state
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingControlKey, setPendingControlKey] = useState('');
    const [pendingControlName, setPendingControlName] = useState('');
    const [pendingToggleState, setPendingToggleState] = useState(null);
    const [authName, setAuthName] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [lastUpdatedBy, setLastUpdatedBy] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        fetchControlStatus();
    }, []);

    const fetchControlStatus = async () => {
        try {
            const res = await fetch('/api/controls');
            const data = await res.json();
            if (data.success && data.controls) {
                setControlsList(data.controls);
            }
        } catch (err) {
            console.error('Failed to fetch controls from database:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleClick = (controlItem, e) => {
        e.preventDefault();
        const targetState = !controlItem.status;
        setPendingControlKey(controlItem.key);
        setPendingControlName(controlItem.name);
        setPendingToggleState(targetState);
        setAuthName('');
        setAuthPassword('');
        setAuthError('');
        setShowAuthModal(true);
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        const trimmedName = authName.trim().toLowerCase();

        if (!AUTHORIZED_NAMES.includes(trimmedName)) {
            setAuthError('Invalid Name. Authorized names are: Sai, Vineeth, or Parthu.');
            return;
        }

        if (authPassword !== LOGIN_PASSWORD) {
            setAuthError('Incorrect Password. Please use your login password.');
            return;
        }

        setSubmitting(true);
        setAuthError('');

        try {
            const capitalizedName = authName.trim().charAt(0).toUpperCase() + authName.trim().slice(1);

            const res = await fetch('/api/controls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: pendingControlKey,
                    status: pendingToggleState,
                    name: capitalizedName
                })
            });

            const data = await res.json();

            if (data.success && data.controls) {
                setControlsList(data.controls);
                setLastUpdatedBy(`${pendingControlName} was turned ${pendingToggleState ? 'ON' : 'OFF'} by ${capitalizedName}`);
                setShowAuthModal(false);
                setPendingToggleState(null);
                setAuthName('');
                setAuthPassword('');
            } else {
                setAuthError(data.error || 'Failed to update database.');
            }
        } catch (err) {
            console.error('Failed to update control record:', err);
            setAuthError('Server error while saving to database.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelAuth = () => {
        setShowAuthModal(false);
        setPendingToggleState(null);
        setAuthName('');
        setAuthPassword('');
        setAuthError('');
    };

    // Robust parser to convert any history date/timestamp into milliseconds for sorting
    const parseHistoryTime = (item) => {
        if (item.timestamp && !isNaN(Number(item.timestamp))) {
            return Number(item.timestamp);
        }
        if (item.createdAt) {
            const t = new Date(item.createdAt).getTime();
            if (!isNaN(t)) return t;
        }
        if (item.date) {
            if (typeof item.date === 'number') return item.date;
            const d = new Date(item.date);
            if (!isNaN(d.getTime())) return d.getTime();
            // Remove "IST" for Date parsing if needed
            const cleanStr = String(item.date).replace(/IST/gi, '').trim();
            const parsed = new Date(cleanStr).getTime();
            if (!isNaN(parsed)) return parsed;
        }
        return 0;
    };

    // Combine and sort all history records across control documents (latest first)
    const allHistoryLogs = controlsList.flatMap(control =>
        (control.history || []).map(h => ({
            ...h,
            featureName: control.name
        }))
    ).sort((a, b) => parseHistoryTime(b) - parseHistoryTime(a));

    if (!isMounted) {
        return null;
    }

    return (
        <div className="controlsContainer">
            <div className="controlsHeader">
                <button className="backBtn" onClick={() => router.push('/dashboard')}>
                    ← Back to Dashboard
                </button>
            </div>

            <div className="controlsCard">
                <h1 className="controlsTitle">
                    <span>🎛️</span> App Controls
                </h1>
                <p className="controlsSubtitle">
                    Manage feature toggles and operational settings for your application.
                </p>

                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#000' }}>
                        Loading controls from database...
                    </div>
                ) : (
                    <>
                        {controlsList.map((item) => (
                            <div key={item.key || item._id} className="controlItem">
                                <div className="controlInfo">
                                    <div className="controlLabel">
                                        <span>{item.name}</span>
                                        <span className={`statusBadge ${item.status ? 'active' : 'inactive'}`}>
                                            {item.status ? 'ON' : 'OFF'}
                                        </span>
                                    </div>
                                    <div className="controlDescription">
                                        {CONTROL_DESCRIPTIONS[item.key] || `Turn off and on ${item.name.toLowerCase()}.`}
                                    </div>
                                </div>

                                <label className="switch" aria-label={`Toggle ${item.name}`}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(item.status)}
                                        onClick={(e) => handleToggleClick(item, e)}
                                        onChange={() => {}}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        ))}

                        {lastUpdatedBy && (
                            <div className="successBanner">
                                ✅ {lastUpdatedBy}
                            </div>
                        )}

                        {/* Change History Log Section */}
                        {allHistoryLogs && allHistoryLogs.length > 0 && (
                            <div className="historySection">
                                <h3 className="historyTitle">
                                    📋 Change History Log
                                </h3>
                                <div className="historyList">
                                    {allHistoryLogs.map((item, idx) => (
                                        <div key={item._id || idx} className="historyItem">
                                            <div className="historyInfo">
                                                <span className={`statusBadge ${item.status ? 'active' : 'inactive'}`}>
                                                    {item.status ? 'ON' : 'OFF'}
                                                </span>
                                                <span className="historyName">
                                                    <strong>{item.featureName}</strong> by {item.name}
                                                </span>
                                            </div>
                                            <span className="historyDate">
                                                {(() => {
                                                    if (item.istTime) return item.istTime;
                                                    if (!item.date) return '';
                                                    if (typeof item.date === 'string' && (item.date.includes('IST') || item.date.includes('am') || item.date.includes('pm') || item.date.includes('AM') || item.date.includes('PM'))) {
                                                        return item.date;
                                                    }
                                                    try {
                                                        const d = new Date(item.date);
                                                        if (isNaN(d.getTime())) return String(item.date);
                                                        return d.toLocaleString('en-IN', {
                                                            timeZone: 'Asia/Kolkata',
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit',
                                                            hour12: true
                                                        }) + ' IST';
                                                    } catch {
                                                        return String(item.date);
                                                    }
                                                })()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="infoBanner">
                    ℹ️ <strong>Database Connected:</strong> Separate records created in <code>controls</code> collection. Authorized names: Sai, Vineeth, or Parthu.
                </div>
            </div>

            {/* Authorization Modal */}
            {showAuthModal && (
                <div className="modalOverlay" onClick={handleCancelAuth}>
                    <div className="modalCard" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modalTitle">
                            🔒 Authorization Required
                        </h2>
                        <p className="modalSubtitle">
                            Please enter your authorized Name and Password to turn <strong>{pendingToggleState ? 'ON' : 'OFF'}</strong> <strong>{pendingControlName}</strong>.
                        </p>

                        <form onSubmit={handleAuthSubmit}>
                            {authError && (
                                <div className="errorMessage">
                                    ⚠️ {authError}
                                </div>
                            )}

                            <div className="authFormGroup">
                                <div>
                                    <label className="authInputLabel">Authorized Name</label>
                                    <input
                                        type="text"
                                        className="authInput"
                                        placeholder="Enter Name"
                                        value={authName}
                                        onChange={(e) => setAuthName(e.target.value)}
                                        autoFocus
                                        required
                                        disabled={submitting}
                                    />
                                </div>

                                <div>
                                    <label className="authInputLabel">Login Password</label>
                                    <input
                                        type="password"
                                        className="authInput"
                                        placeholder="Enter password"
                                        value={authPassword}
                                        onChange={(e) => setAuthPassword(e.target.value)}
                                        required
                                        disabled={submitting}
                                    />
                                </div>
                            </div>

                            <div className="modalActions">
                                <button type="button" className="cancelBtn" onClick={handleCancelAuth} disabled={submitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="confirmBtn" disabled={submitting}>
                                    {submitting ? 'Saving...' : `Verify & Turn ${pendingToggleState ? 'ON' : 'OFF'}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
