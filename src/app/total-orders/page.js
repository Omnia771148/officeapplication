'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import './total-orders.css';

export default function TotalOrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [restaurantList, setRestaurantList] = useState([]);
    const [summary, setSummary] = useState({
        totalOrders: 0,
        totalNetEarnings: 0,
        totalCoinsEarned: 0,
        totalGrandTotal: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRestaurant, setSelectedRestaurant] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/total-orders');
            const data = await res.json();

            if (data.success) {
                setOrders(data.orders || []);
                setRestaurantList(data.restaurants || []);
                setSummary(data.summary || {
                    totalOrders: 0,
                    totalNetEarnings: 0,
                    totalCoinsEarned: 0,
                    totalGrandTotal: 0
                });
            } else {
                setError(data.error || 'Failed to fetch completed orders');
            }
        } catch (err) {
            console.error('Error fetching total orders:', err);
            setError('Unable to load orders. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Helper to get local YYYY-MM-DD from order date
    const getOrderDateKey = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Format local date label
    const formatDateLabel = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Format local time label for clock selection
    const formatTimeLabel = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        const displayM = String(m).padStart(2, '0');
        return `${displayH}:${displayM} ${period}${m === 0 ? ' (Hour)' : ' (±30m)'}`;
    };

    // Apply combined filters: Search, Restaurant, Date (Calendar), Time (Clock)
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            // 1. Text Search Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const match =
                    (order.orderId && order.orderId.toLowerCase().includes(q)) ||
                    (order.userName && order.userName.toLowerCase().includes(q)) ||
                    (order.userPhone && String(order.userPhone).toLowerCase().includes(q)) ||
                    (order.restaurantName && order.restaurantName.toLowerCase().includes(q)) ||
                    (order.deliveryBoyName && order.deliveryBoyName.toLowerCase().includes(q)) ||
                    (order.deliveryBoyPhone && String(order.deliveryBoyPhone).toLowerCase().includes(q)) ||
                    (order.deliveryBoyId && String(order.deliveryBoyId).toLowerCase().includes(q));
                if (!match) return false;
            }

            // 2. Separate Restaurant Dropdown Filter
            if (selectedRestaurant) {
                const orderRest = (order.restaurantName || '').toLowerCase().trim();
                const targetRest = selectedRestaurant.toLowerCase().trim();
                if (orderRest !== targetRest) return false;
            }

            // 3. Calendar Date Filter
            if (selectedDate) {
                const orderDateKey = getOrderDateKey(order.orderDate);
                if (orderDateKey !== selectedDate) return false;
            }

            // 4. Clock Time Filter
            if (selectedTime) {
                if (!order.orderDate) return false;
                const d = new Date(order.orderDate);
                if (isNaN(d.getTime())) return false;

                const [selHour, selMin] = selectedTime.split(':').map(Number);
                const orderHour = d.getHours();
                const orderMin = d.getMinutes();

                if (selMin === 0) {
                    // Match the hour (e.g. 13:00 matches orders between 13:00 and 13:59)
                    if (orderHour !== selHour) return false;
                } else {
                    // Match within +/- 30 minutes window around chosen clock time
                    const selTotalMin = selHour * 60 + selMin;
                    const orderTotalMin = orderHour * 60 + orderMin;
                    if (Math.abs(orderTotalMin - selTotalMin) > 30) return false;
                }
            }

            return true;
        });
    }, [orders, searchQuery, selectedRestaurant, selectedDate, selectedTime]);

    // Sort orders by newest date/time first
    const sortedOrders = useMemo(() => {
        return [...filteredOrders].sort((a, b) => {
            const timeA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
            const timeB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
            return timeB - timeA;
        });
    }, [filteredOrders]);

    const resetFilters = () => {
        setSearchQuery('');
        setSelectedRestaurant('');
        setSelectedDate('');
        setSelectedTime('');
    };

    const isAnyFilterActive = Boolean(searchQuery || selectedRestaurant || selectedDate || selectedTime);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="totalOrdersContainer">
            {/* Top Navigation */}
            <header className="ordersHeader">
                <div className="ordersHeaderLeft">
                    <button
                        className="backBtn"
                        onClick={() => router.push('/dashboard')}
                    >
                        ← Back to Dashboard
                    </button>
                    <h1 className="pageTitle">📦 Total Orders (Completed)</h1>
                </div>

                <button
                    className="ordersRefreshBtn"
                    onClick={fetchOrders}
                    disabled={loading}
                >
                    🔄 Refresh
                </button>
            </header>

            {/* Metric Summary Cards */}
            <div className="metricsGrid">
                <div className="metricCard">
                    <div className="metricIcon iconOrders">📦</div>
                    <div className="metricContent">
                        <span className="metricLabel">Total Orders</span>
                        <span className="metricValue">
                            {isAnyFilterActive ? `${sortedOrders.length} / ${summary.totalOrders}` : summary.totalOrders}
                        </span>
                    </div>
                </div>

                <div className="metricCard">
                    <div className="metricIcon iconNetEarnings">💰</div>
                    <div className="metricContent">
                        <span className="metricLabel">Total Net Earnings</span>
                        <span className="metricValue">₹{summary.totalNetEarnings.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div className="metricCard">
                    <div className="metricIcon iconCoins">🪙</div>
                    <div className="metricContent">
                        <span className="metricLabel">Coins Earned</span>
                        <span className="metricValue">{summary.totalCoinsEarned.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div className="metricCard">
                    <div className="metricIcon iconGross">🧾</div>
                    <div className="metricContent">
                        <span className="metricLabel">Total Order Value</span>
                        <span className="metricValue">₹{summary.totalGrandTotal.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            {/* Search & Separate Dropdowns Controls Toolbar */}
            <div className="controlsSection">
                {/* Search Bar & Reset button */}
                <div className="searchAndActionRow">
                    <div className="searchSection">
                        <span className="searchIcon">🔍</span>
                        <input
                            type="text"
                            className="searchInput"
                            placeholder="Search by Order ID, Customer Name, Phone, Restaurant, Delivery Boy..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="clearSearchBtn" onClick={() => setSearchQuery('')}>✕</button>
                        )}
                    </div>

                    {isAnyFilterActive && (
                        <button className="resetFiltersBtn" onClick={resetFilters} title="Clear all active filters">
                            ✕ Reset Filters
                        </button>
                    )}
                </div>

                {/* 3 Separate Dropdowns: Restaurant, Date, Time */}
                <div className="dropdownsRow">
                    {/* 1. Restaurant Name Dropdown (from restuarentusers collection) */}
                    <div className="dropdownGroup">
                        <label className="dropdownLabel" htmlFor="restaurantSelect">
                            🏪 Restaurant:
                        </label>
                        <select
                            id="restaurantSelect"
                            className="filterSelect"
                            value={selectedRestaurant}
                            onChange={(e) => setSelectedRestaurant(e.target.value)}
                        >
                            <option value="">All Restaurants ({restaurantList.length})</option>
                            {restaurantList.map((restName) => (
                                <option key={restName} value={restName}>
                                    {restName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Calendar Date Picker */}
                    <div
                        className="dropdownGroup"
                        onClick={(e) => {
                            const input = e.currentTarget.querySelector('input[type="date"]');
                            if (e.target !== input && input?.showPicker) input.showPicker();
                        }}
                    >
                        <label className="dropdownLabel" htmlFor="datePicker">
                            📅 Date:
                        </label>
                        <input
                            id="datePicker"
                            type="date"
                            className="dateInput"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            title="Click to open calendar"
                        />
                        {selectedDate && (
                            <button
                                type="button"
                                className="pickerClearBtn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate('');
                                }}
                                title="Clear date filter"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* 3. Clock Time Picker */}
                    <div
                        className="dropdownGroup"
                        onClick={(e) => {
                            const input = e.currentTarget.querySelector('input[type="time"]');
                            if (e.target !== input && input?.showPicker) input.showPicker();
                        }}
                    >
                        <label className="dropdownLabel" htmlFor="timePicker">
                            ⏰ Time:
                        </label>
                        <input
                            id="timePicker"
                            type="time"
                            className="timeInput"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            title="Click to open clock picker"
                        />
                        {selectedTime && (
                            <button
                                type="button"
                                className="pickerClearBtn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTime('');
                                }}
                                title="Clear time filter"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Active Filter Tags */}
                {isAnyFilterActive && (
                    <div className="activeFilterTags">
                        {selectedRestaurant && (
                            <span className="filterTag">
                                🏪 {selectedRestaurant}
                                <button type="button" onClick={() => setSelectedRestaurant('')}>✕</button>
                            </span>
                        )}
                        {selectedDate && (
                            <span className="filterTag">
                                📅 {formatDateLabel(selectedDate)}
                                <button type="button" onClick={() => setSelectedDate('')}>✕</button>
                            </span>
                        )}
                        {selectedTime && (
                            <span className="filterTag">
                                ⏰ {formatTimeLabel(selectedTime)}
                                <button type="button" onClick={() => setSelectedTime('')}>✕</button>
                            </span>
                        )}
                        {searchQuery && (
                            <span className="filterTag">
                                🔍 "{searchQuery}"
                                <button type="button" onClick={() => setSearchQuery('')}>✕</button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Orders Table Section */}
            <div className="tableCard">
                {loading ? (
                    <div className="loadingState">
                        <div className="loadingSpinner"></div>
                        <p>Loading completed orders from database...</p>
                    </div>
                ) : error ? (
                    <div className="errorState">
                        <p>⚠️ {error}</p>
                        <button onClick={fetchOrders}>Retry</button>
                    </div>
                ) : sortedOrders.length === 0 ? (
                    <div className="emptyState">
                        <div className="emptyStateIcon">📭</div>
                        <h3>No orders found</h3>
                        <p>
                            {isAnyFilterActive
                                ? 'No orders match your selected filters.'
                                : 'No completed orders in database.'}
                        </p>
                        {isAnyFilterActive && (
                            <button
                                className="resetFiltersBtn"
                                style={{ margin: '14px auto 0 auto' }}
                                onClick={resetFilters}
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="tableContainer">
                        <table className="ordersTable">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Restaurant</th>
                                    <th>Delivery Boy</th>
                                    <th>Coins Earned</th>
                                    <th>Net Earnings</th>
                                    <th>Grand Total</th>
                                    <th>Date & Time</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedOrders.map((order) => (
                                    <tr key={order._id}>
                                        {/* Order ID */}
                                        <td>
                                            <span className="orderIdBadge">{order.orderId}</span>
                                        </td>

                                        {/* Customer: userName & userPhone */}
                                        <td>
                                            <div className="customerBlock">
                                                <span className="primaryText">{order.userName}</span>
                                                <span className="secondaryText">📞 {order.userPhone}</span>
                                            </div>
                                        </td>

                                        {/* Restaurant Name */}
                                        <td>
                                            <div className="restaurantBlock">
                                                <span className="primaryText">{order.restaurantName}</span>
                                                {order.restaurantId && order.restaurantId !== 'N/A' && (
                                                    <span className="secondaryText">ID: {order.restaurantId}</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Delivery Boy: Name, Phone & ID */}
                                        <td>
                                            <div className="deliveryBlock">
                                                <span className="primaryText">🚴 {order.deliveryBoyName}</span>
                                                <span className="secondaryText">📞 {order.deliveryBoyPhone}</span>
                                                <span className="idChip" title={order.deliveryBoyId}>ID: {order.deliveryBoyId}</span>
                                            </div>
                                        </td>

                                        {/* Coins Earned */}
                                        <td>
                                            <span className="coinsPill">
                                                🪙 {order.coinsEarned}
                                            </span>
                                        </td>

                                        {/* Net Earnings */}
                                        <td>
                                            <span className="earningsPill">
                                                ₹{order.netEarnings}
                                            </span>
                                        </td>

                                        {/* Grand Total */}
                                        <td>
                                            <span className="primaryText">₹{order.grandTotal}</span>
                                            <div className="secondaryText">{order.paymentMethod}</div>
                                        </td>

                                        {/* Date */}
                                        <td>
                                            <span className="secondaryText">{formatDate(order.orderDate)}</span>
                                        </td>

                                        {/* Action */}
                                        <td>
                                            <button
                                                className="viewBtn"
                                                onClick={() => setSelectedOrder(order)}
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="modalOverlay" onClick={() => setSelectedOrder(null)}>
                    <div className="modalBox" onClick={(e) => e.stopPropagation()}>
                        <div className="modalHeader">
                            <div>
                                <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem' }}>
                                    Order Details: <span style={{ color: '#4338ca' }}>{selectedOrder.orderId}</span>
                                </h2>
                                <span className="secondaryText">Completed: {formatDate(selectedOrder.orderDate)}</span>
                            </div>
                            <button className="modalCloseBtn" onClick={() => setSelectedOrder(null)}>✕</button>
                        </div>

                        {/* Customer & Restaurant Details */}
                        <div className="modalSection">
                            <div className="modalSectionTitle">Customer & Restaurant</div>
                            <div className="modalInfoGrid">
                                <div>
                                    <div className="infoItemLabel">Customer Name</div>
                                    <div className="infoItemValue">{selectedOrder.userName}</div>
                                </div>
                                <div>
                                    <div className="infoItemLabel">Customer Phone</div>
                                    <div className="infoItemValue">{selectedOrder.userPhone}</div>
                                </div>
                                <div>
                                    <div className="infoItemLabel">Restaurant Name</div>
                                    <div className="infoItemValue">{selectedOrder.restaurantName}</div>
                                </div>
                                <div>
                                    <div className="infoItemLabel">Restaurant ID</div>
                                    <div className="infoItemValue">{selectedOrder.restaurantId}</div>
                                </div>
                            </div>
                        </div>

                        {/* Delivery Partner Details */}
                        <div className="modalSection">
                            <div className="modalSectionTitle">Delivery Partner Details</div>
                            <div className="modalInfoGrid">
                                <div>
                                    <div className="infoItemLabel">Delivery Boy Name</div>
                                    <div className="infoItemValue">{selectedOrder.deliveryBoyName}</div>
                                </div>
                                <div>
                                    <div className="infoItemLabel">Delivery Boy Phone</div>
                                    <div className="infoItemValue">{selectedOrder.deliveryBoyPhone}</div>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div className="infoItemLabel">Delivery Boy ID</div>
                                    <div className="infoItemValue" style={{ fontFamily: 'monospace' }}>
                                        {selectedOrder.deliveryBoyId}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financials & Coins */}
                        <div className="modalSection">
                            <div className="modalSectionTitle">Financials & Rewards</div>
                            <div className="modalInfoGrid">
                                <div>
                                    <div className="infoItemLabel">Net Earnings</div>
                                    <div className="infoItemValue" style={{ color: '#047857', fontSize: '1.1rem' }}>
                                        ₹{selectedOrder.netEarnings}
                                    </div>
                                </div>
                                <div>
                                    <div className="infoItemLabel">Coins Earned</div>
                                    <div className="infoItemValue" style={{ color: '#b45309', fontSize: '1.1rem' }}>
                                        🪙 {selectedOrder.coinsEarned}
                                    </div>
                                </div>
                                <div>
                                    <div className="infoItemLabel">Grand Total</div>
                                    <div className="infoItemValue">₹{selectedOrder.grandTotal}</div>
                                </div>
                                <div>
                                    <div className="infoItemLabel">Commission</div>
                                    <div className="infoItemValue">₹{selectedOrder.commissionAmount}</div>
                                </div>
                                <div>
                                    <div className="infoItemLabel">Payment Method</div>
                                    <div className="infoItemValue">{selectedOrder.paymentMethod}</div>
                                </div>
                                <div>
                                    <div className="infoItemLabel">Payment Status</div>
                                    <div className="infoItemValue">{selectedOrder.paymentStatus}</div>
                                </div>
                            </div>
                        </div>

                        {/* Delivery Address */}
                        <div className="modalSection">
                            <div className="modalSectionTitle">Delivery Address</div>
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', fontSize: '0.9rem', border: '1px solid #e2e8f0' }}>
                                📍 {selectedOrder.deliveryAddress}
                            </div>
                        </div>

                        {/* Items Breakdown */}
                        {selectedOrder.items && selectedOrder.items.length > 0 && (
                            <div className="modalSection">
                                <div className="modalSectionTitle">Ordered Items ({selectedOrder.items.length})</div>
                                <ul className="itemsList">
                                    {selectedOrder.items.map((item, idx) => (
                                        <li key={idx} className="itemRow">
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{item.name || item.itemName || 'Item'}</div>
                                                <div className="secondaryText">Qty: {item.quantity || 1}</div>
                                            </div>
                                            <div style={{ fontWeight: 700 }}>
                                                ₹{(Number(item.price) || 0) * (Number(item.quantity) || 1)}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
