'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import './completed-order-coupons.css';

export default function CompletedOrderCouponsPage() {
    const router = useRouter();

    const [orders, setOrders] = useState([]);
    const [couponsSummary, setCouponsSummary] = useState([]);
    const [summaryMetrics, setSummaryMetrics] = useState({
        totalCompletedOrdersWithCoupon: 0,
        uniqueCouponsCount: 0,
        totalDiscountGiven: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters & UI states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCouponCode, setSelectedCouponCode] = useState('ALL');
    const [viewMode, setViewMode] = useState('orders'); // 'orders' | 'summary'

    const fetchCouponsData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/completed-order-coupons');
            const data = await res.json();

            if (data.success) {
                setOrders(data.orders || []);
                setCouponsSummary(data.couponsSummary || []);
                setSummaryMetrics({
                    totalCompletedOrdersWithCoupon: data.totalCompletedOrdersWithCoupon || 0,
                    uniqueCouponsCount: data.uniqueCouponsCount || 0,
                    totalDiscountGiven: data.totalDiscountGiven || 0
                });
            } else {
                setError(data.error || 'Failed to retrieve coupon codes from completed orders');
            }
        } catch (err) {
            console.error('Error fetching completed order coupons:', err);
            setError('Unable to load coupons data. Please check connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCouponsData();
    }, []);

    // Filtered orders based on search & coupon pill
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            // Filter by selected coupon code
            if (selectedCouponCode !== 'ALL' && order.couponCode !== selectedCouponCode) {
                return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchCode = order.couponCode?.toLowerCase().includes(q);
                const matchOrder = order.orderId?.toLowerCase().includes(q);
                const matchUser = order.userName?.toLowerCase().includes(q);
                const matchPhone = String(order.userPhone || '').toLowerCase().includes(q);
                const matchRest = order.restaurantName?.toLowerCase().includes(q);
                const matchInfluencer = order.influencerName?.toLowerCase().includes(q);

                return matchCode || matchOrder || matchUser || matchPhone || matchRest || matchInfluencer;
            }

            return true;
        });
    }, [orders, selectedCouponCode, searchQuery]);

    // Filtered summary cards
    const filteredSummary = useMemo(() => {
        return couponsSummary.filter(item => {
            if (selectedCouponCode !== 'ALL' && item.couponCode !== selectedCouponCode) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return item.couponCode.toLowerCase().includes(q) ||
                    (item.influencerName && item.influencerName.toLowerCase().includes(q));
            }
            return true;
        });
    }, [couponsSummary, selectedCouponCode, searchQuery]);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'N/A';
            return d.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return 'N/A';
        }
    };

    return (
        <div className="couponsPageContainer">
            {/* Header */}
            <div className="couponsHeader">
                <button className="backBtn" onClick={() => router.back()}>
                    ← Back
                </button>
                <div className="headerTitleBlock">
                    <h1>🎟️ Coupons Used in Final Completed Orders</h1>
                    <p>Live coupon codes retrieved directly from final completed orders placed by users</p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="metricsGrid">
                <div className="metricCard">
                    <div className="metricIcon iconOrders">📦</div>
                    <div>
                        <span className="metricLabel">Completed Orders with Coupon</span>
                        <span className="metricValue">{summaryMetrics.totalCompletedOrdersWithCoupon}</span>
                    </div>
                </div>

                <div className="metricCard">
                    <div className="metricIcon iconDiscount">💸</div>
                    <div>
                        <span className="metricLabel">Total Discount Given</span>
                        <span className="metricValue">₹{summaryMetrics.totalDiscountGiven.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div className="metricCard">
                    <div className="metricIcon iconCoupons">🏷️</div>
                    <div>
                        <span className="metricLabel">Unique Coupons Redeemed</span>
                        <span className="metricValue">{summaryMetrics.uniqueCouponsCount}</span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="toolbarCard">
                <div className="searchRow">
                    <div className="searchBox">
                        <span className="searchIcon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search by Coupon Code, Order ID, Customer Name, Phone, Restaurant..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="viewModeToggle">
                        <button
                            className={`viewModeBtn ${viewMode === 'orders' ? 'active' : ''}`}
                            onClick={() => setViewMode('orders')}
                        >
                            Orders View ({filteredOrders.length})
                        </button>
                        <button
                            className={`viewModeBtn ${viewMode === 'summary' ? 'active' : ''}`}
                            onClick={() => setViewMode('summary')}
                        >
                            Coupons Summary ({filteredSummary.length})
                        </button>
                    </div>
                </div>

                {/* Filter Pills */}
                {couponsSummary.length > 0 && (
                    <div className="filterPills">
                        <span className="filterPillLabel">Filter Coupon:</span>
                        <button
                            className={`filterPill ${selectedCouponCode === 'ALL' ? 'active' : ''}`}
                            onClick={() => setSelectedCouponCode('ALL')}
                        >
                            All ({couponsSummary.length})
                        </button>
                        {couponsSummary.map(c => (
                            <button
                                key={c.couponCode}
                                className={`filterPill ${selectedCouponCode === c.couponCode ? 'active' : ''}`}
                                onClick={() => setSelectedCouponCode(c.couponCode)}
                            >
                                {c.couponCode} ({c.timesUsed})
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content Table */}
            <div className="contentCard">
                {loading ? (
                    <div className="loadingSpinner">Loading coupon data from final completed orders...</div>
                ) : error ? (
                    <div className="emptyBox" style={{ color: '#dc2626' }}>
                        <div className="emptyIcon">⚠️</div>
                        <p>{error}</p>
                        <button className="backBtn" onClick={fetchCouponsData} style={{ marginTop: '12px' }}>
                            Retry
                        </button>
                    </div>
                ) : viewMode === 'orders' ? (
                    filteredOrders.length === 0 ? (
                        <div className="emptyBox">
                            <div className="emptyIcon">📭</div>
                            <h3>No orders match your filter</h3>
                            <p>No final completed orders found for the selected criteria.</p>
                        </div>
                    ) : (
                        <div className="tableWrapper">
                            <table className="customTable">
                                <thead>
                                    <tr>
                                        <th>Coupon Code</th>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th>Restaurant</th>
                                        <th>Discount</th>
                                        <th>Order Total</th>
                                        <th>Completed At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order, idx) => (
                                        <tr key={order.orderId || idx}>
                                            <td>
                                                <span className="couponBadge">🎟️ {order.couponCode}</span>
                                                {order.influencerName && (
                                                    <span className="secondaryInfo">Influencer: {order.influencerName}</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="orderIdText">{order.orderId}</span>
                                            </td>
                                            <td>
                                                <span className="primaryInfo">{order.userName}</span>
                                                <span className="secondaryInfo">📞 {order.userPhone}</span>
                                            </td>
                                            <td>
                                                <span className="primaryInfo">{order.restaurantName}</span>
                                            </td>
                                            <td>
                                                <span className="discountBadge">-₹{order.discountAmount}</span>
                                            </td>
                                            <td>
                                                <span className="primaryInfo">₹{order.grandTotal}</span>
                                                <span className="secondaryInfo">{order.paymentMethod}</span>
                                            </td>
                                            <td>
                                                <span className="secondaryInfo">{formatDate(order.completedAt)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    filteredSummary.length === 0 ? (
                        <div className="emptyBox">
                            <div className="emptyIcon">📭</div>
                            <h3>No coupon summary found</h3>
                        </div>
                    ) : (
                        <div className="tableWrapper">
                            <table className="customTable">
                                <thead>
                                    <tr>
                                        <th>Coupon Code</th>
                                        <th>Influencer</th>
                                        <th>Times Used</th>
                                        <th>Unique Customers</th>
                                        <th>Total Discount Given</th>
                                        <th>Total Order Volume</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSummary.map((item) => (
                                        <tr key={item.couponCode}>
                                            <td>
                                                <span className="couponBadge">🎟️ {item.couponCode}</span>
                                            </td>
                                            <td>
                                                <span className="primaryInfo">{item.influencerName || 'N/A'}</span>
                                            </td>
                                            <td>
                                                <span className="primaryInfo" style={{ fontWeight: 800 }}>{item.timesUsed}</span>
                                            </td>
                                            <td>
                                                <span className="primaryInfo">{item.uniqueUsersCount}</span>
                                            </td>
                                            <td>
                                                <span className="discountBadge">-₹{item.totalDiscount}</span>
                                            </td>
                                            <td>
                                                <span className="primaryInfo">₹{item.totalOrderValue}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
