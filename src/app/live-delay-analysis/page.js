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

    const getMinutesElapsed = (createdAt) => {
        if (!createdAt) return 0;
        const diffMs = new Date() - new Date(createdAt);
        return Math.floor(diffMs / 60000);
    };

    const delayedByRestaurant = orderStatuses.filter(status => {
        const elapsed = getMinutesElapsed(status.createdAt);
        return elapsed > 5 && !status.restaurantAcceptedAt;
    });

    const delayedByDeliveryBoy = orderStatuses.filter(status => {
        if (!status.restaurantAcceptedAt) return false;
        const elapsed = getMinutesElapsed(status.restaurantAcceptedAt);
        return elapsed > 5 && !status.deliveryBoyAcceptedAt;
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
                                        const elapsed = getMinutesElapsed(order.createdAt);
                                        return (
                                            <div key={order._id} className="delayMiniCard restaurant">
                                                <div className="miniCardHeader">
                                                    <span className="miniCardId">Order ID: {order.orderId || 'N/A'}</span>
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
                                        const elapsed = getMinutesElapsed(order.restaurantAcceptedAt);
                                        return (
                                            <div key={order._id} className="delayMiniCard delivery">
                                                <div className="miniCardHeader">
                                                    <span className="miniCardId">Order ID: {order.orderId || 'N/A'}</span>
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
