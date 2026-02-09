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
                                {Object.entries(status).map(([key, value]) => {
                                    if (['_id', '__v', 'updatedAt', 'createdAt', 'orderId', 'status'].includes(key)) return null;

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
                                    <span className="label">Time:</span>
                                    <span className="value">{new Date(status.createdAt).toLocaleString()}</span>
                                </div>
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