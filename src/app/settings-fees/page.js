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

    // Coins settings states
    const [isCoinsActive, setIsCoinsActive] = useState(true);
    const [coinMinOrderAmount, setCoinMinOrderAmount] = useState(200);
    const [coinBaseAmount, setCoinBaseAmount] = useState(10);
    const [coinStepAmount, setCoinStepAmount] = useState(100);
    const [coinStepValue, setCoinStepValue] = useState(5);
    const [coinMaxLimit, setCoinMaxLimit] = useState(100);
    const [coinMaxThreshold, setCoinMaxThreshold] = useState(1000);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/fees-config');
                if (!res.ok) {
                    throw new Error('Failed to load configurations');
                }
                const result = await res.json();
                if (result.success && result.data) {
                    setDeliveryFeeBase(result.data.deliveryFeeBase ?? 20);
                    setDeliveryFeePerKm(result.data.deliveryFeePerKm ?? 10);
                    setSurgeFee(result.data.surgeFee ?? 0);
                    setIsSurgeActive(result.data.isSurgeActive ?? false);
                    setIsCoinsActive(result.data.isCoinsActive ?? true);
                    setCoinMinOrderAmount(result.data.coinMinOrderAmount ?? 200);
                    setCoinBaseAmount(result.data.coinBaseAmount ?? 10);
                    setCoinStepAmount(result.data.coinStepAmount ?? 100);
                    setCoinStepValue(result.data.coinStepValue ?? 5);
                    setCoinMaxLimit(result.data.coinMaxLimit ?? 100);
                    setCoinMaxThreshold(result.data.coinMaxThreshold ?? 1000);
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
        if (
            Number(deliveryFeeBase) < 0 || 
            Number(deliveryFeePerKm) < 0 || 
            Number(surgeFee) < 0 ||
            Number(coinMinOrderAmount) < 0 ||
            Number(coinBaseAmount) < 0 ||
            Number(coinStepAmount) <= 0 ||
            Number(coinStepValue) < 0 ||
            Number(coinMaxLimit) < 0 ||
            Number(coinMaxThreshold) < 0
        ) {
            setError('Values cannot be negative, and increment step must be greater than zero.');
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
                    isSurgeActive: Boolean(isSurgeActive),
                    isCoinsActive: Boolean(isCoinsActive),
                    coinMinOrderAmount: Number(coinMinOrderAmount),
                    coinBaseAmount: Number(coinBaseAmount),
                    coinStepAmount: Number(coinStepAmount),
                    coinStepValue: Number(coinStepValue),
                    coinMaxLimit: Number(coinMaxLimit),
                    coinMaxThreshold: Number(coinMaxThreshold)
                })
            });

            if (!res.ok) {
                throw new Error('Failed to update configurations');
            }

            const result = await res.json();
            if (result.success) {
                setSuccessMsg('Configurations updated successfully!');
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
                <div className="loadingSpinner">⌛ Loading configurations...</div>
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
                <h1 className="settingsTitle">Fees & Coins Configurations</h1>
                <p className="settingsSubtitle">
                    Configure the delivery base fee, distance rates, surge pricing, and manage user coin calculations.
                </p>

                {error && <div className="errorBanner">⚠️ {error}</div>}
                {successMsg && <div className="successBanner">✅ {successMsg}</div>}

                <form onSubmit={handleSubmit}>
                    <h2 className="sectionTitle" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1E3545', marginBottom: '15px' }}>🚗 Delivery Rates & Surge</h2>

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

                    <hr className="sectionDivider" style={{ margin: '30px 0', border: '0', height: '1px', backgroundColor: '#e2d6bc' }} />

                    <h2 className="sectionTitle" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1E3545', marginBottom: '15px' }}>🪙 Customer Coins System</h2>

                    <div className="toggleContainer">
                        <div className="toggleTextWrapper">
                            <span className="toggleLabel">Enable Coins System</span>
                            <span className="toggleSubLabel">Reward users with coins for high value orders</span>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={isCoinsActive}
                                onChange={(e) => setIsCoinsActive(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    {isCoinsActive && (
                        <div className="coinsConfigSection" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="inputGroup">
                                <label htmlFor="coinMinOrderAmount">Minimum Order Total to Start Earning Coins</label>
                                <div className="inputFieldWrapper">
                                    <span className="currencySymbol">₹</span>
                                    <input
                                        type="number"
                                        id="coinMinOrderAmount"
                                        className="inputField"
                                        value={coinMinOrderAmount}
                                        onChange={(e) => setCoinMinOrderAmount(e.target.value)}
                                        placeholder="e.g. 200"
                                        required
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="inputGroup">
                                <label htmlFor="coinBaseAmount">Base Coins Awarded at Minimum Order Total</label>
                                <div className="inputFieldWrapper">
                                    <span className="currencySymbol">🪙</span>
                                    <input
                                        type="number"
                                        id="coinBaseAmount"
                                        className="inputField"
                                        value={coinBaseAmount}
                                        onChange={(e) => setCoinBaseAmount(e.target.value)}
                                        placeholder="e.g. 10"
                                        required
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="inputGroup">
                                <label htmlFor="coinStepAmount">Increment Step Value</label>
                                <div className="inputFieldWrapper">
                                    <span className="currencySymbol">₹</span>
                                    <input
                                        type="number"
                                        id="coinStepAmount"
                                        className="inputField"
                                        value={coinStepAmount}
                                        onChange={(e) => setCoinStepAmount(e.target.value)}
                                        placeholder="e.g. 100"
                                        required
                                        min="1"
                                    />
                                </div>
                            </div>

                            <div className="inputGroup">
                                <label htmlFor="coinStepValue">Coins Awarded per Step Increment</label>
                                <div className="inputFieldWrapper">
                                    <span className="currencySymbol">🪙</span>
                                    <input
                                        type="number"
                                        id="coinStepValue"
                                        className="inputField"
                                        value={coinStepValue}
                                        onChange={(e) => setCoinStepValue(e.target.value)}
                                        placeholder="e.g. 5"
                                        required
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="inputGroup">
                                <label htmlFor="coinMaxLimit">Maximum Coins Cap per Order (Awarded Above Threshold)</label>
                                <div className="inputFieldWrapper">
                                    <span className="currencySymbol">🪙</span>
                                    <input
                                        type="number"
                                        id="coinMaxLimit"
                                        className="inputField"
                                        value={coinMaxLimit}
                                        onChange={(e) => setCoinMaxLimit(e.target.value)}
                                        placeholder="e.g. 100"
                                        required
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="inputGroup">
                                <label htmlFor="coinMaxThreshold">Order Total Above Which Coins Become Fixed (Max Cap)</label>
                                <div className="inputFieldWrapper">
                                    <span className="currencySymbol">₹</span>
                                    <input
                                        type="number"
                                        id="coinMaxThreshold"
                                        className="inputField"
                                        value={coinMaxThreshold}
                                        onChange={(e) => setCoinMaxThreshold(e.target.value)}
                                        placeholder="e.g. 1000"
                                        required
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <button type="submit" className="submitBtn" style={{ marginTop: '20px' }} disabled={saving}>
                        {saving ? 'Saving changes...' : 'Save Settings'}
                    </button>
                </form>
            </div>
        </div>
    );
}
