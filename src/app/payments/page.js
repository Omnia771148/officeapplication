'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentsPage() {
    const router = useRouter();
    const [restaurantId, setRestaurantId] = useState(null);
    const [payments, setPayments] = useState({ grandTotal: 0, pendingAmount: 0 });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [transactionId, setTransactionId] = useState('');
    const [amount, setAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const id = localStorage.getItem('restaurantId');
        if (!id) {
            router.push('/dashboard');
        } else {
            setRestaurantId(id);
            fetchPayments(id);
        }
    }, [router]);

    const fetchPayments = async (id) => {
        try {
            const response = await fetch(`/api/pendingpayments?restaurantId=${id}`);
            const data = await response.json();

            if (data.success) {
                const total = data.data.grandTotal || 0;
                const pending = total * 0.88;
                setPayments({
                    grandTotal: total,
                    pendingAmount: pending
                });
                setTransactions(data.data.transactions || []);
            } else {
                console.error('Failed to fetch payments:', data.error);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await fetch('/api/pendingpayments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    restaurantId,
                    transactionId,
                    amount,
                }),
            });

            const data = await response.json();
            if (data.success) {
                await fetchPayments(restaurantId);
                setShowModal(false);
                setTransactionId('');
                setAmount('');
                alert('Payment recorded successfully!');
            } else {
                alert('Error recording payment: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error submitting payment:', error);
            alert('Failed to submit payment.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div style={{ padding: '40px', fontFamily: 'var(--font-outfit), sans-serif', textAlign: 'center', backgroundColor: '#f4f7f6', minHeight: '100vh', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2px solid #edf2f7', paddingBottom: '15px', maxWidth: '800px', margin: '0 auto' }}>
                <button 
                    onClick={() => window.history.back()} 
                    style={{
                        background: '#fff',
                        border: '1px solid #dfe6e9',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        color: '#2d3436',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                    }}
                >
                    ← Back
                </button>
                <h1 style={{ fontSize: '2rem', color: '#333', margin: 0 }}>Payments Dashboard</h1>
            </div>

            <p style={{ fontSize: '1.2rem', color: '#555', marginBottom: '40px' }}>
                Restaurant ID: {restaurantId}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap', marginBottom: '40px' }}>
                {/* Total Payments Card */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '30px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    width: '300px',
                    textAlign: 'center'
                }}>
                    <h2 style={{ fontSize: '1.5rem', color: '#4CAF50', marginBottom: '15px' }}>Total Payments</h2>
                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#333' }}>
                        ₹{payments.grandTotal.toLocaleString()}
                    </p>
                </div>

                {/* Pending Payments Card */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '30px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    width: '300px',
                    textAlign: 'center'
                }}>
                    <h2 style={{ fontSize: '1.5rem', color: '#FF6F61', marginBottom: '15px' }}>Pending Payments</h2>
                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#333' }}>
                        ₹{payments.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '10px' }}>
                        (Total - 12%)
                    </p>
                </div>
            </div>

            <button
                onClick={() => setShowModal(true)}
                style={{
                    padding: '15px 30px',
                    fontSize: '1.2rem',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                    transition: 'transform 0.2s',
                    fontWeight: 'bold',
                    marginBottom: '45px'
                }}
            >
                Done Payment
            </button>

            {/* Transaction History Section */}
            <div style={{
                maxWidth: '800px',
                margin: '0 auto 40px auto',
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                textAlign: 'left'
            }}>
                <h2 style={{ fontSize: '1.5rem', color: '#333', marginBottom: '20px', borderBottom: '2px solid #edf2f7', paddingBottom: '10px' }}>
                    📜 Transaction History
                </h2>
                {transactions.length === 0 ? (
                    <p style={{ color: '#888', textAlign: 'center', margin: '20px 0' }}>No transactions recorded yet.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #edf2f7', color: '#64748b' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date & Time</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transaction ID</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx, idx) => (
                                    <tr key={tx._id || idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                                        <td style={{ padding: '12px 16px', color: '#334155' }}>
                                            {tx.date ? new Date(tx.date).toLocaleString() : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '600', color: '#009688' }}>
                                            {tx.transactionId}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#2e7d32' }}>
                                            ₹{(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '40px',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        width: '400px',
                        textAlign: 'center'
                    }}>
                        <h2 style={{ marginBottom: '20px', color: '#333' }}>Enter Transaction Details</h2>
                        <form onSubmit={handlePaymentSubmit}>
                            <input
                                type="text"
                                placeholder="Transaction ID"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '1rem',
                                    marginBottom: '20px',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px',
                                    boxSizing: 'border-box'
                                }}
                                required
                            />
                            <input
                                type="number"
                                step="any"
                                placeholder="Amount (₹)"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '1rem',
                                    marginBottom: '20px',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px',
                                    boxSizing: 'border-box'
                                }}
                                required
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        backgroundColor: '#ccc',
                                        color: '#333',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        backgroundColor: '#4CAF50',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        opacity: submitting ? 0.7 : 1
                                    }}
                                >
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
