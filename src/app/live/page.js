'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './live.css'; // Assuming I will create a CSS file for styling

export default function LivePage() {
    const [orderStatuses, setOrderStatuses] = useState([]);
    const [loading, setLoading] = useState(true);


    const fetchOrderStatuses = async () => {
        try {
            const res = await fetch('/api/orderstatuses');
            const data = await res.json();
            if (data.success) {
                setOrderStatuses(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch order statuses:', error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchOrderStatuses();
        const intervalId = setInterval(fetchOrderStatuses, 15000); // Poll every 15 seconds

        return () => clearInterval(intervalId);
    }, []);

    if (loading) {
        return <div className="loading">Loading Live Orders...</div>;
    }

    return (
        <div className="liveContainer">
            <h1 className="pageTitle">Live Order Statuses</h1>

            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <Link href="/live-delay-analysis">
                    <button className="analysisToggleBtn">
                        📊 Analyze Delayed Orders (5m+ Delay)
                    </button>
                </Link>
            </div>

            <div className="ordersGrid">
                {orderStatuses.length === 0 ? (
                    <p className="noData">No live orders found.</p>
                ) : (
                    orderStatuses.map((status) => (
                        <div key={status._id} className="orderCard">
                            <div className="cardHeader">
                                <h3>Order ID: {status.orderId || 'N/A'}</h3>
                                <span className={`statusBadge ${status.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                                    {status.status || 'Unknown'}
                                </span>
                            </div>
                            <div className="cardBody">
                                {status.restaurantName && (
                                    <div className="infoRow">
                                        <span className="label">Restaurant Name:</span>
                                        <span className="value">{status.restaurantName}</span>
                                    </div>
                                )}
                                {status.restaurantId && (
                                    <div className="infoRow">
                                        <span className="label">Restaurant ID:</span>
                                        <span className="value">{status.restaurantId}</span>
                                    </div>
                                )}
                                {Object.entries(status).map(([key, value]) => {
                                    if (['_id', '__v', 'updatedAt', 'createdAt', 'orderId', 'status', 'restaurantName', 'restaurantId', 'restaurantPhone', 'userPhone', 'deliveryBoyPhone', 'deliveryboyPhone', 'restaurantAcceptedAt', 'deliveryBoyAcceptedAt'].includes(key)) return null;

                                    if (key === 'items' && Array.isArray(value)) {
                                        return (
                                            <div key={key} className="itemsContainer">
                                                <span className="label">Items:</span>
                                                <ul className="itemsList">
                                                    {value.map((item, idx) => (
                                                        <li key={idx} className="itemRow">
                                                            {typeof item === 'object' ? (
                                                                <>
                                                                    <div className="itemDetails">
                                                                        <span className="itemName">{item.name || item.itemName || 'Item'}</span>
                                                                        {item.price && (
                                                                            <span className="itemPrice">₹{item.price}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="itemMeta">
                                                                        <span className="itemQty">x{item.quantity || 1}</span>
                                                                        {(item.price && item.quantity) && (
                                                                            <span className="itemTotal">₹{item.price * item.quantity}</span>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="itemName">{item}</span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={key} className="infoRow">
                                            <span className="label">{key}:</span>
                                            <span className="value">{String(value)}</span>
                                        </div>
                                    );
                                })}
                                <div className="infoRow">
                                    <span className="label">Order Placed:</span>
                                    <span className="value">{status.createdAt ? new Date(status.createdAt).toLocaleString() : 'N/A'}</span>
                                </div>
                                <div className="infoRow">
                                    <span className="label">Restaurant Accepted:</span>
                                    <span className="value">
                                        {status.restaurantAcceptedAt ? (
                                            new Date(status.restaurantAcceptedAt).toLocaleString()
                                        ) : (
                                            <span className="pendingBadgeRed">Pending</span>
                                        )}
                                    </span>
                                </div>
                                <div className="infoRow">
                                    <span className="label">Delivery Boy Accepted:</span>
                                    <span className="value">
                                        {status.deliveryBoyAcceptedAt ? (
                                            new Date(status.deliveryBoyAcceptedAt).toLocaleString()
                                        ) : (
                                            <span className="pendingBadgeRed">Pending</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div className="cardActions">
                                <a href={status.userPhone ? `tel:${status.userPhone}` : '#'} className="actionButton userButton">
                                    Call User
                                </a>
                                <a href={status.deliveryBoyPhone || status.deliveryboyPhone ? `tel:${status.deliveryBoyPhone || status.deliveryboyPhone}` : '#'} className="actionButton deliveryButton">
                                    Call Delivery Boy
                                </a>
                                <a href={status.restaurantPhone ? `tel:${status.restaurantPhone}` : '#'} className="actionButton restaurantButton">
                                    Call Restaurant
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="navigation">
                <Link href="/dashboard">
                    <button className="backButton">Back to Dashboard</button>
                </Link>
            </div>
        </div>
    );
}