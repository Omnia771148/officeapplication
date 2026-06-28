'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReplaceRestaurantIdPage() {
    const router = useRouter();
    const [existingId, setExistingId] = useState('');
    const [newId, setNewId] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        setError(null);

        if (!existingId.trim() || !newId.trim()) {
            setError('Please fill in both fields.');
            return;
        }

        const confirmChange = confirm(
            `Are you sure you want to change restaurantId "${existingId.trim()}" to "${newId.trim()}" for all items? This will update the database directly.`
        );
        if (!confirmChange) return;

        setLoading(true);
        try {
            const res = await fetch('/api/replace-restaurant-id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    existingId: existingId.trim(),
                    newId: newId.trim()
                })
            });

            const data = await res.json();
            if (data.success) {
                setMessage(`Successfully updated ${data.modifiedCount} items in database!`);
                setExistingId('');
                setNewId('');
            } else {
                setError(data.error || 'Failed to replace restaurant ID.');
            }
        } catch (err) {
            setError('Server communication error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="replacePageContainer">
            <style>{`
                .replacePageContainer {
                    padding: 40px 20px;
                    background-color: #f8f9fa;
                    min-height: 100vh;
                    font-family: 'Inter', -apple-system, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .backContainer {
                    width: 100%;
                    max-width: 500px;
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: flex-start;
                }
                .btnBack {
                    background: white;
                    border: 1px solid #dfe6e9;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    color: #333;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    transition: all 0.2s;
                }
                .btnBack:hover {
                    background: #f1f2f6;
                    transform: translateX(-2px);
                }
                .replaceCard {
                    background: white;
                    border-radius: 12px;
                    padding: 35px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                    width: 100%;
                    max-width: 500px;
                    border: 1px solid #eef2f3;
                }
                .replaceTitle {
                    font-size: 1.8rem;
                    color: #2d3748;
                    font-weight: 800;
                    margin-bottom: 10px;
                    text-align: center;
                }
                .replaceSubtitle {
                    font-size: 0.95rem;
                    color: #64748b;
                    margin-bottom: 30px;
                    text-align: center;
                    line-height: 1.5;
                }
                .formGroup {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 20px;
                }
                .formLabel {
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #475569;
                }
                .formInput {
                    padding: 12px 16px;
                    border-radius: 8px;
                    border: 1.5px solid #cbd5e1;
                    font-size: 1rem;
                    outline: none;
                    transition: all 0.2s;
                    color: #1e293b !important;
                    background-color: #f8fafc;
                }
                .formInput:focus {
                    border-color: #e67e22;
                    box-shadow: 0 0 0 3px rgba(230, 126, 34, 0.15);
                    background-color: #ffffff;
                }
                .btnSubmit {
                    width: 100%;
                    background: #e67e22;
                    color: white;
                    border: none;
                    padding: 14px;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-top: 10px;
                    box-shadow: 0 4px 6px rgba(230, 126, 34, 0.2);
                }
                .btnSubmit:hover:not(:disabled) {
                    background-color: #d35400;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 12px rgba(230, 126, 34, 0.3);
                }
                .btnSubmit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .alertSuccess {
                    margin-top: 20px;
                    padding: 14px;
                    background-color: #def7ec;
                    color: #03543f;
                    border-radius: 8px;
                    font-weight: 600;
                    text-align: center;
                    border: 1px solid #bcf0da;
                }
                .alertError {
                    margin-top: 20px;
                    padding: 14px;
                    background-color: #fde8e8;
                    color: #9b1c1c;
                    border-radius: 8px;
                    font-weight: 600;
                    text-align: center;
                    border: 1px solid #fbd5d5;
                }
            `}</style>

            <div className="backContainer">
                <button onClick={() => router.push('/restaurants')} className="btnBack">
                    ← Back to Restaurants
                </button>
            </div>

            <div className="replaceCard">
                <h2 className="replaceTitle">🔄 Replace Restaurant ID</h2>
                <p className="replaceSubtitle">
                    Bulk update the <code>restaurantId</code> value for all menu items inside the <code>itemstatus</code> collection.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="formGroup">
                        <label className="formLabel">Existing Restaurant ID</label>
                        <input
                            type="text"
                            className="formInput"
                            placeholder="e.g. 1"
                            value={existingId}
                            onChange={(e) => setExistingId(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="formGroup">
                        <label className="formLabel">Replacing Restaurant ID (New Value)</label>
                        <input
                            type="text"
                            className="formInput"
                            placeholder="e.g. 3"
                            value={newId}
                            onChange={(e) => setNewId(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>

                    <button type="submit" className="btnSubmit" disabled={loading}>
                        {loading ? 'Updating Database...' : 'Update Database'}
                    </button>
                </form>

                {message && <div className="alertSuccess">{message}</div>}
                {error && <div className="alertError">{error}</div>}
            </div>
        </div>
    );
}
