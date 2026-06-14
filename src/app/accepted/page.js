'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import '@/components/OrdersDisplay.css';

const renderValue = (key, value) => {
    if (value === null || value === undefined) return 'N/A';

    // Handle array (like items)
    if (Array.isArray(value)) {
        if (value.length === 0) return 'No items';
        return (
            <ul className="itemsListInternal">
                {value.map((item, idx) => {
                    if (typeof item === 'object' && item !== null) {
                        const name = item.name || item.itemName || item.title || 'Item';
                        const qty = item.quantity || item.qty || 1;
                        const price = item.price || item.itemPrice || 0;
                        const total = price * qty;
                        return (
                            <li key={idx} className="listItemInternal">
                                <strong>{name}</strong> {price ? `(₹${price})` : ''} x {qty} {total ? ` = ₹${total}` : ''}
                            </li>
                        );
                    }
                    return <li key={idx} className="listItemInternal">{String(item)}</li>;
                })}
            </ul>
        );
    }

    // Handle object (like address, coordinates, nested details)
    if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0) return '{}';
        return (
            <div className="nestedObjectContainer">
                {entries.map(([subKey, subVal]) => {
                    if (['_id', 'id', '__v'].includes(subKey)) return null;
                    return (
                        <div key={subKey} className="nestedObjectRow">
                            <span className="nestedLabel">{subKey.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="nestedValue">
                                {typeof subVal === 'object' ? JSON.stringify(subVal) : String(subVal)}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Default string or primitive value
    return String(value);
};

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

    if (loading) return (
        <div className="ordersContainer">
            <div className="loadingText">Loading accepted orders...</div>
        </div>
    );

    if (!restaurantId) return (
        <div className="ordersContainer">
            <div className="errorText">No Branch Selected</div>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <button className="backBtn">← Back to Dashboard</button>
            </Link>
        </div>
    );

    return (
        <div className="ordersContainer">
            <div className="ordersHeader">
                <button onClick={() => window.history.back()} className="backBtn">← Back</button>
                <h1 className="ordersTitle accepted">👍 Accepted Orders</h1>
            </div>

            {orders.length === 0 ? (
                <div className="noOrdersText">No accepted orders found for this branch.</div>
            ) : (
                <div className="ordersList">
                    {orders.map((order) => (
                        <div key={order._id} className="orderCard">
                            <h3 className="orderCardTitle">Order ID: {order.orderId || order._id}</h3>
                            <div className="orderGrid">
                                {Object.entries(order).map(([key, value]) => {
                                    if (key === '_id' || key === 'restaurantId' || key === '__v' || key === 'orderId') return null;
                                    return (
                                        <div key={key} className="orderItem">
                                            <span className="orderItemLabel">{key.replace(/([A-Z])/g, ' $1')}</span>
                                            <div className="orderItemValue">
                                                {renderValue(key, value)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
