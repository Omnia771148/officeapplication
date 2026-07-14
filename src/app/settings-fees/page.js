'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './settings-fees.css';

export default function SettingsFeesPage() {
    const router = useRouter();
    const [deliveryFeeBase, setDeliveryFeeBase] = useState(20);
    const [deliveryFeePerKm, setDeliveryFeePerKm] = useState(10);
    const [surgeFee, setSurgeFee] = useState(0);
    const [isSurgeActive, setIsSurgeActive] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/fees-config');
                if (!res.ok) {
                    throw new Error('Failed to load fee configurations');
                }
                const result = await res.json();
                if (result.success && result.data) {
                    setDeliveryFeeBase(result.data.deliveryFeeBase ?? 20);
                    setDeliveryFeePerKm(result.data.deliveryFeePerKm ?? 10);
                    setSurgeFee(result.data.surgeFee ?? 0);
                    setIsSurgeActive(result.data.isSurgeActive ?? false);
                }
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccessMsg(null);

        // Simple validation
        if (Number(deliveryFeeBase) < 0 || Number(deliveryFeePerKm) < 0 || Number(surgeFee) < 0) {
            setError('Fees and rates cannot be negative values.');
            setSaving(false);
            return;
        }

        try {
            const res = await fetch('/api/fees-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    deliveryFeeBase: Number(deliveryFeeBase),
                    deliveryFeePerKm: Number(deliveryFeePerKm),
                    surgeFee: Number(surgeFee),
                    isSurgeActive: Boolean(isSurgeActive)
                })
            });

            if (!res.ok) {
                throw new Error('Failed to update configurations');
            }

            const result = await res.json();
            if (result.success) {
                setSuccessMsg('Fee configurations updated successfully!');
                setTimeout(() => setSuccessMsg(null), 4000);
            } else {
                throw new Error(result.error || 'Server returned an error');
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="settingsContainer">
                <div className="loadingSpinner">⌛ Loading fee settings...</div>
            </div>
        );
    }

    return (
        <div className="settingsContainer">
            <div className="settingsHeader">
                <button className="backBtn" onClick={() => router.back()}>
                    ← Back
                </button>
            </div>

            <div className="settingsCard">
                <h1 className="settingsTitle">Delivery & Surge Fees</h1>
                <p className="settingsSubtitle">
                    Configure the global starting fee, distance-based rate, and toggle surge pricing for customer orders.
                </p>

                {error && <div className="errorBanner">⚠️ {error}</div>}
                {successMsg && <div className="successBanner">✅ {successMsg}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="inputGroup">
                        <label htmlFor="baseFee">Delivery Base Fee</label>
                        <div className="inputFieldWrapper">
                            <span className="currencySymbol">₹</span>
                            <input
                                type="number"
                                id="baseFee"
                                className="inputField"
                                value={deliveryFeeBase}
                                onChange={(e) => setDeliveryFeeBase(e.target.value)}
                                placeholder="e.g. 20"
                                required
                                min="0"
                                step="any"
                            />
                        </div>
                    </div>

                    <div className="inputGroup">
                        <label htmlFor="perKmFee">Per Kilometer Charge</label>
                        <div className="inputFieldWrapper">
                            <span className="currencySymbol">₹</span>
                            <input
                                type="number"
                                id="perKmFee"
                                className="inputField"
                                value={deliveryFeePerKm}
                                onChange={(e) => setDeliveryFeePerKm(e.target.value)}
                                placeholder="e.g. 10"
                                required
                                min="0"
                                step="any"
                            />
                        </div>
                    </div>

                    <div className="inputGroup">
                        <label htmlFor="surgeFee">Surge Fee</label>
                        <div className="inputFieldWrapper">
                            <span className="currencySymbol">₹</span>
                            <input
                                type="number"
                                id="surgeFee"
                                className="inputField"
                                value={surgeFee}
                                onChange={(e) => setSurgeFee(e.target.value)}
                                placeholder="e.g. 15"
                                required
                                min="0"
                                step="any"
                            />
                        </div>
                    </div>

                    <div className="toggleContainer">
                        <div className="toggleTextWrapper">
                            <span className="toggleLabel">Enable Surge Pricing</span>
                            <span className="toggleSubLabel">Apply configured surge fee to all active orders</span>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={isSurgeActive}
                                onChange={(e) => setIsSurgeActive(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <button type="submit" className="submitBtn" disabled={saving}>
                        {saving ? 'Saving changes...' : 'Save Settings'}
                    </button>
                </form>
            </div>
        </div>
    );
}
