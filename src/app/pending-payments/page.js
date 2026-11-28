'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PendingPaymentsPage() {
    const router = useRouter();
    const [payments, setPayments] = useState([]);
    const [totalGrandTotal, setTotalGrandTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPendingPayments = async () => {
            try {
                const res = await fetch('/api/all-pending-payments');
                const result = await res.json();
                if (result.success) {
                    setPayments(result.data || []);
                    setTotalGrandTotal(result.totalGrandTotal || 0);
                } else {
                    setError(result.error || 'Failed to fetch pending payments');
                }
            } catch (err) {
                console.error('Error fetching pending payments:', err);
                setError('Failed to fetch pending payments');
            } finally {
                setLoading(false);
            }
        };

        fetchPendingPayments();
    }, []);

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                Loading pending payments...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#b91c1c', fontFamily: 'sans-serif' }}>
                {error}
            </div>
        );
    }

    return (
        <div style={{ padding: '40px 20px', backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: 'sans-serif', color: '#1e293b' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            color: '#1e293b'
                        }}
                    >
                        ← Back
                    </button>
                    <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Pending Payments</h1>
                    <div style={{ width: '80px' }} />
                </div>

                {/* Total Grand Total Summary */}
                <div style={{
                    background: '#ffffff',
                    border: '2px solid #e11d48',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '30px',
                    textAlign: 'center',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        All Total of Grand Total ({payments.length} {payments.length === 1 ? 'Restaurant' : 'Restaurants'})
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: '700', color: '#be123c', marginTop: '8px' }}>
                        ₹{totalGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                {/* Restaurant List */}
                {payments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                        No restaurants with grandTotal greater than 0.
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '20px'
                    }}>
                        {payments.map((item) => (
                            <div
                                key={item._id}
                                style={{
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}
                            >
                                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                                    {item.restaurantName || 'Unnamed Restaurant'}
                                </h2>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: '#64748b' }}>Restaurant ID</span>
                                    <span style={{ fontWeight: '600' }}>{item.restaurantId || 'N/A'}</span>
                                </div>
                                {item.grossTotal !== undefined && item.grossTotal !== null && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#64748b' }}>Gross Total</span>
                                        <span style={{ fontWeight: '600' }}>
                                            ₹{Number(item.grossTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff1f2', padding: '10px 12px', borderRadius: '8px', marginTop: '4px' }}>
                                    <span style={{ color: '#9f1239', fontWeight: '600', fontSize: '0.9rem' }}>Grand Total</span>
                                    <span style={{ color: '#be123c', fontWeight: '700', fontSize: '1.15rem' }}>
                                        ₹{Number(item.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
