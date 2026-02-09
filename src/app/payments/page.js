'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentsPage() {
    const router = useRouter();
    const [restaurantId, setRestaurantId] = useState(null);
    const [payments, setPayments] = useState({ grandTotal: 0, pendingAmount: 0 });
    const [loading, setLoading] = useState(true);

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
                const pending = total * 0.12;
                setPayments({
                    grandTotal: total,
                    pendingAmount: pending
                });
            } else {
                console.error('Failed to fetch payments:', data.error);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div style={{ padding: '40px', fontFamily: 'var(--font-outfit), sans-serif', textAlign: 'center', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
            <h1 style={{ fontSize: '2.5rem', color: '#333', marginBottom: '30px' }}>Payments Dashboard</h1>
            <p style={{ fontSize: '1.2rem', color: '#555', marginBottom: '40px' }}>
                Restaurant ID: {restaurantId}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
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
                        (12% of Total)
                    </p>
                </div>
            </div>
        </div>
    );
}
