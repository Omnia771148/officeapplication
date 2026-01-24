'use client';

import { useState, useEffect } from 'react';

export default function AcceptedPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restaurantId, setRestaurantId] = useState(null);

    useEffect(() => {
        const storedRestaurantId = localStorage.getItem('restaurantId');
        setRestaurantId(storedRestaurantId);

        if (!storedRestaurantId) {
            setLoading(false);
            return;
        }

        const fetchOrders = async () => {
            try {
                const res = await fetch(`/api/accepted?restaurantId=${storedRestaurantId}`);
                const data = await res.json();
                if (data.success) {
                    setOrders(data.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (!restaurantId) return <div>No Branch Selected</div>;

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1 style={{ textAlign: 'center' }}>Accepted Orders</h1>
            {orders.length === 0 ? <p style={{ textAlign: 'center' }}>No accepted orders found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                    {orders.map((order) => (
                        <div key={order._id} style={{
                            border: '1px solid #ccc',
                            padding: '20px',
                            borderRadius: '8px',
                            backgroundColor: '#fff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                                Order Details
                            </h3>

                            {/* Loop through ALL fields and display them */}
                            {Object.entries(order).map(([key, value]) => (
                                <p key={key} style={{ margin: '8px 0', wordBreak: 'break-word' }}>
                                    <strong style={{ textTransform: 'capitalize' }}>{key}: </strong>
                                    {typeof value === 'object' && value !== null
                                        ? JSON.stringify(value)
                                        : String(value)
                                    }
                                </p>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
