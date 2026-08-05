'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../live/live.css';

export default function LiveDelayAnalysisPage() {
    const router = useRouter();
    const [orderStatuses, setOrderStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOrderStatuses = async () => {
        try {
            const res = await fetch('/api/orderstatuses');
            if (!res.ok) {
                throw new Error('Failed to fetch live orders');
            }
            const data = await res.json();
            if (data.success) {
                setOrderStatuses(data.data);
            } else {
                throw new Error(data.error || 'Failed to retrieve order statuses');
            }
        } catch (err) {
            console.error('Failed to fetch order statuses:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderStatuses();
        const intervalId = setInterval(fetchOrderStatuses, 15000); // Poll every 15 seconds

        return () => clearInterval(intervalId);
    }, []);

    const getMinutesElapsed = (dateVal) => {
        if (!dateVal) return 0;
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return 0;
        const diffMs = new Date() - d;
        return Math.floor(diffMs / 60000);
    };

    const delayedByRestaurant = orderStatuses.filter(status => {
        const orderTime = status.createdAt || status.created_at || status.date || status.orderDate;
        const elapsed = getMinutesElapsed(orderTime);
        
        const hasAcceptedTime = Boolean(status.restaurantAcceptedAt);
        const statusStr = String(status.status || '').toLowerCase();
        const isAcceptedByStatus = statusStr.includes('accept') || statusStr.includes('prepar') || statusStr.includes('dispatch') || statusStr.includes('complete') || statusStr.includes('deliver');
        const isRejected = statusStr.includes('reject') || statusStr.includes('cancel');

        return elapsed > 5 && !hasAcceptedTime && !isAcceptedByStatus && !isRejected;
    });

    const delayedByDeliveryBoy = orderStatuses.filter(status => {
        const hasRestaurantAccepted = Boolean(status.restaurantAcceptedAt) || String(status.status || '').toLowerCase().includes('accept');
        if (!hasRestaurantAccepted) return false;
        
        const acceptTime = status.restaurantAcceptedAt || status.createdAt;
        const elapsed = getMinutesElapsed(acceptTime);

        const hasDeliveryAccepted = Boolean(status.deliveryBoyAcceptedAt);
        const statusStr = String(status.status || '').toLowerCase();
        const isDeliveredOrComplete = statusStr.includes('complete') || statusStr.includes('deliver') || statusStr.includes('pickup') || statusStr.includes('dispatched');
        const isRejected = statusStr.includes('reject') || statusStr.includes('cancel');

        return elapsed > 5 && !hasDeliveryAccepted && !isDeliveredOrComplete && !isRejected;
    });

    return (
        <div className="liveContainer">
            <div className="deliveryBoyHeader" style={{ justifyContent: 'space-between', marginBottom: '30px' }}>
                <button className="backBtn" onClick={() => router.back()}>
                    ← Back
                </button>
                <h1 className="paymentsTitle" style={{ margin: 0 }}>Live Order Delay Analysis</h1>
            </div>

            {loading && (
                <div className="loading">⌛ Loading live delay statistics...</div>
            )}

            {error && (
                <div className="noData" style={{ color: '#dc3545', fontWeight: 'bold' }}>⚠️ Error: {error}</div>
            )}

            {!loading && !error && (
                <div className="delayAnalysisPanel" style={{ border: 'none', boxShadow: 'none', background: 'transparent', padding: 0 }}>
                    <div className="delayColumns">
                        <div className="delayColumn">
                            <h3 className="columnHeader restaurant">⏳ Delayed by Restaurant ({delayedByRestaurant.length})</h3>
                            <div className="miniCardsContainer" style={{ maxHeight: 'none' }}>
                                {delayedByRestaurant.length === 0 ? (
                                    <p className="noDelayText">No restaurant delays detected (all accepted within 5 minutes).</p>
                                ) : (
                                    delayedByRestaurant.map(order => {
                                        const elapsed = getMinutesElapsed(order.createdAt || order.date || order.orderDate);
                                        return (
                                            <div key={order._id} className="delayMiniCard restaurant">
                                                <div className="miniCardHeader">
                                                    <span className="miniCardId">Order ID: {order.orderId || order._id || 'N/A'}</span>
                                                    <span className="miniCardTimer">{elapsed} mins ago</span>
                                                </div>
                                                <div className="miniCardBody">
                                                    <p className="miniCardRestName"><strong>Restaurant:</strong> {order.restaurantName || 'N/A'}</p>
                                                    <div className="miniCardActions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                        <a href={order.restaurantPhone ? `tel:${order.restaurantPhone}` : '#'} className="miniActionBtn rest" style={{ flex: '1 1 45%' }}>
                                                            📞 Restaurant
                                                        </a>
                                                        <a href={order.userPhone ? `tel:${order.userPhone}` : '#'} className="miniActionBtn user" style={{ flex: '1 1 45%' }}>
                                                            📞 Customer
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="delayColumn">
                            <h3 className="columnHeader delivery">⏳ Delayed by Delivery Boy ({delayedByDeliveryBoy.length})</h3>
                            <div className="miniCardsContainer" style={{ maxHeight: 'none' }}>
                                {delayedByDeliveryBoy.length === 0 ? (
                                    <p className="noDelayText">No delivery boy delays detected (all accepted within 5 minutes).</p>
                                ) : (
                                    delayedByDeliveryBoy.map(order => {
                                        const elapsed = getMinutesElapsed(order.restaurantAcceptedAt || order.createdAt);
                                        return (
                                            <div key={order._id} className="delayMiniCard delivery">
                                                <div className="miniCardHeader">
                                                    <span className="miniCardId">Order ID: {order.orderId || order._id || 'N/A'}</span>
                                                    <span className="miniCardTimer">{elapsed} mins ago</span>
                                                </div>
                                                <div className="miniCardBody">
                                                    <p className="miniCardRestName"><strong>Restaurant:</strong> {order.restaurantName || 'N/A'}</p>
                                                    <div className="miniCardActions" style={{ display: 'flex', gap: '8px' }}>
                                                        {order.deliveryBoyPhone || order.deliveryboyPhone ? (
                                                            <a href={`tel:${order.deliveryBoyPhone || order.deliveryboyPhone}`} className="miniActionBtn boy" style={{ flex: 1 }}>
                                                                📞 Delivery Boy
                                                            </a>
                                                        ) : (
                                                            <span className="noBoyText" style={{ flex: 1, alignSelf: 'center' }}>No Boy Assigned</span>
                                                        )}
                                                        <a href={order.userPhone ? `tel:${order.userPhone}` : '#'} className="miniActionBtn user" style={{ flex: 1 }}>
                                                            📞 Customer
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
