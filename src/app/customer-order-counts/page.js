'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import './customer-order-counts.css';

export default function CustomerOrderCountsPage() {
    const router = useRouter();

    const [customers, setCustomers] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRestaurant, setSelectedRestaurant] = useState('ALL');
    const [countOperator, setCountOperator] = useState('gte'); // 'gte' | 'eq' | 'lte'
    const [countValue, setCountValue] = useState('');
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc' | 'name'
    const [expandedDates, setExpandedDates] = useState({});

    const fetchCustomerCounts = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/customer-order-counts');
            const data = await res.json();

            if (data.success) {
                setCustomers(data.customers || []);
                setRestaurants(data.restaurants || []);
            } else {
                setError(data.error || 'Failed to fetch customer order counts');
            }
        } catch (err) {
            console.error('Error loading customer order counts:', err);
            setError('Failed to connect to the server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomerCounts();
    }, []);

    // Derive displayed order count & spent for each customer based on selected restaurant
    const processedCustomers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const hasCountFilter = countValue !== '' && !isNaN(Number(countValue));
        const targetCount = hasCountFilter ? Number(countValue) : null;

        const list = customers
            .map((c) => {
                const displayCount =
                    selectedRestaurant === 'ALL'
                        ? c.totalOrders
                        : c.restaurantCounts?.[selectedRestaurant] || 0;

                const displaySpent =
                    selectedRestaurant === 'ALL'
                        ? c.totalSpent
                        : c.restaurantSpent?.[selectedRestaurant] || 0;

                const displayOrderDates =
                    selectedRestaurant === 'ALL'
                        ? c.orderDates || []
                        : c.restaurantOrderDates?.[selectedRestaurant] || [];

                return {
                    ...c,
                    displayCount,
                    displaySpent,
                    displayOrderDates
                };
            })
            .filter((c) => {
                // Search filter: Name, Phone Number, or Email
                if (q) {
                    const matchName = (c.name || '').toLowerCase().includes(q);
                    const matchPhone = (c.phone || '').toLowerCase().includes(q);
                    const matchEmail = (c.email || '').toLowerCase().includes(q);
                    if (!matchName && !matchPhone && !matchEmail) {
                        return false;
                    }
                }

                // When a specific restaurant is selected and no explicit 0 count filter is set,
                // show customers who have ordered from that restaurant (>= 1)
                if (selectedRestaurant !== 'ALL' && !hasCountFilter) {
                    if (c.displayCount === 0) return false;
                }

                // Count filter entered by number
                if (hasCountFilter) {
                    if (countOperator === 'gte' && c.displayCount < targetCount) return false;
                    if (countOperator === 'eq' && c.displayCount !== targetCount) return false;
                    if (countOperator === 'lte' && c.displayCount > targetCount) return false;
                }

                return true;
            });

        list.sort((a, b) => {
            if (sortOrder === 'name') {
                return a.name.localeCompare(b.name);
            }
            if (sortOrder === 'asc') {
                if (a.displayCount !== b.displayCount) return a.displayCount - b.displayCount;
                return a.name.localeCompare(b.name);
            }
            // default 'desc'
            if (b.displayCount !== a.displayCount) return b.displayCount - a.displayCount;
            return a.name.localeCompare(b.name);
        });

        return list;
    }, [customers, searchQuery, selectedRestaurant, countOperator, countValue, sortOrder]);

    const summaryStats = useMemo(() => {
        let totalOrders = 0;
        let customersWithOrders = 0;
        let maxOrders = 0;

        for (const c of processedCustomers) {
            totalOrders += c.displayCount;
            if (c.displayCount > 0) customersWithOrders += 1;
            if (c.displayCount > maxOrders) maxOrders = c.displayCount;
        }

        return {
            matchingCustomers: processedCustomers.length,
            totalOrders,
            customersWithOrders,
            maxOrders
        };
    }, [processedCustomers]);

    const hasActiveFilters = Boolean(
        searchQuery.trim() ||
        selectedRestaurant !== 'ALL' ||
        countValue !== ''
    );

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedRestaurant('ALL');
        setCountOperator('gte');
        setCountValue('');
        setSortOrder('desc');
    };

    const formatCurrency = (val) => {
        const num = Number(val) || 0;
        return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatOrderDate = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const toggleExpandDates = (id) => {
        setExpandedDates((prev) => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleDownloadCSV = () => {
        if (processedCustomers.length === 0) return;

        const rows = [];
        rows.push(['CUSTOMERS & ORDER COUNTS REPORT']);
        rows.push([
            'Restaurant Filter:',
            selectedRestaurant === 'ALL' ? 'All Restaurants' : selectedRestaurant
        ]);
        rows.push(['Generated On:', new Date().toLocaleString('en-IN')]);
        rows.push([]);
        rows.push([
            'S.No',
            'Customer Name',
            'Phone Number',
            'Email',
            'Order Count',
            'Total Spent (INR)',
            'Order Placed Dates'
        ]);

        processedCustomers.forEach((c, idx) => {
            const formattedDates = (c.displayOrderDates || [])
                .map((dt) => formatOrderDate(dt))
                .filter(Boolean)
                .join(' | ');

            rows.push([
                idx + 1,
                `"${(c.name || '').replace(/"/g, '""')}"`,
                `"${(c.phone || '').replace(/"/g, '""')}"`,
                `"${(c.email || '').replace(/"/g, '""')}"`,
                c.displayCount,
                c.displaySpent,
                `"${(formattedDates || 'No completed orders').replace(/"/g, '""')}"`
            ]);
        });

        const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Customer_Order_Counts_${selectedRestaurant === 'ALL' ? 'All' : selectedRestaurant.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getCountBadgeClass = (count) => {
        if (count >= 5) return 'cocCountBadge cocCountHigh';
        if (count >= 1) return 'cocCountBadge cocCountMid';
        return 'cocCountBadge cocCountZero';
    };

    return (
        <div className="cocPageContainer">
            {/* Header */}
            <header className="cocHeader">
                <div className="cocHeaderLeft">
                    <button className="cocBackBtn" onClick={() => router.push('/dashboard')}>
                        ← Back to Dashboard
                    </button>
                    <div className="cocTitleBlock">
                        <h1>👥 Customers &amp; Order Counts</h1>
                        <p>Customer details from users collection paired with completed order counts</p>
                    </div>
                </div>

                <div className="cocHeaderActions">
                    <button
                        className="cocCsvBtn"
                        onClick={handleDownloadCSV}
                        disabled={loading || processedCustomers.length === 0}
                    >
                        📊 Download CSV
                    </button>
                    <button className="cocRefreshBtn" onClick={fetchCustomerCounts} disabled={loading}>
                        🔄 Refresh
                    </button>
                </div>
            </header>

            {error && <div className="cocErrorBox">⚠️ {error}</div>}

            {/* KPI Summary Cards */}
            <div className="cocMetricsGrid">
                <div className="cocMetricCard">
                    <div className="cocMetricIcon iconUsers">👥</div>
                    <div>
                        <span className="cocMetricLabel">Customers Shown</span>
                        <span className="cocMetricValue">{summaryStats.matchingCustomers}</span>
                    </div>
                </div>

                <div className="cocMetricCard">
                    <div className="cocMetricIcon iconTotalOrders">📦</div>
                    <div>
                        <span className="cocMetricLabel">
                            {selectedRestaurant === 'ALL' ? 'Total Orders' : `Orders (${selectedRestaurant})`}
                        </span>
                        <span className="cocMetricValue">{summaryStats.totalOrders}</span>
                    </div>
                </div>

                <div className="cocMetricCard">
                    <div className="cocMetricIcon iconActiveBuyers">🛒</div>
                    <div>
                        <span className="cocMetricLabel">Customers With Orders</span>
                        <span className="cocMetricValue">{summaryStats.customersWithOrders}</span>
                    </div>
                </div>

                <div className="cocMetricCard">
                    <div className="cocMetricIcon iconTopCount">🏆</div>
                    <div>
                        <span className="cocMetricLabel">Highest Order Count</span>
                        <span className="cocMetricValue">{summaryStats.maxOrders}</span>
                    </div>
                </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="cocToolbarCard">
                <div className="cocSearchGroup">
                    <label className="cocFilterLabel">Search Customer (Name, Number, Email)</label>
                    <div className="cocSearchBox">
                        <span className="cocSearchIcon">🔍</span>
                        <input
                            type="text"
                            className="cocSearchInput"
                            placeholder="Search by name, phone number, or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="cocFilterControls">
                    {/* Restaurant Filter */}
                    <div className="cocFilterGroup">
                        <label className="cocFilterLabel">Restaurant</label>
                        <select
                            className="cocSelectDropdown"
                            value={selectedRestaurant}
                            onChange={(e) => setSelectedRestaurant(e.target.value)}
                        >
                            <option value="ALL">All Restaurants</option>
                            {restaurants.map((rest) => (
                                <option key={rest} value={rest}>
                                    {rest}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Order Count Filter */}
                    <div className="cocFilterGroup">
                        <label className="cocFilterLabel">Order Count Filter</label>
                        <div className="cocCountFilterWrap">
                            <select
                                className="cocOperatorSelect"
                                value={countOperator}
                                onChange={(e) => setCountOperator(e.target.value)}
                                title="Count comparison"
                            >
                                <option value="gte">&gt;= (Min)</option>
                                <option value="eq">= (Exact)</option>
                                <option value="lte">&lt;= (Max)</option>
                            </select>
                            <input
                                type="number"
                                min="0"
                                className="cocCountInput"
                                placeholder="Count..."
                                value={countValue}
                                onChange={(e) => setCountValue(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Sort Order */}
                    <div className="cocFilterGroup">
                        <label className="cocFilterLabel">Sort By</label>
                        <select
                            className="cocSelectDropdown"
                            style={{ minWidth: '150px' }}
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="desc">Highest Orders</option>
                            <option value="asc">Lowest Orders</option>
                            <option value="name">Name (A-Z)</option>
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button type="button" className="cocResetBtn" onClick={handleResetFilters}>
                            ✕ Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Table / Mobile Cards */}
            <div className="cocContentCard">
                {loading ? (
                    <div className="cocStateContainer">
                        <div className="cocSpinner"></div>
                        <p>Loading customers and counting completed orders...</p>
                    </div>
                ) : processedCustomers.length === 0 ? (
                    <div className="cocStateContainer">
                        <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#334155' }}>
                            No customers match your filters
                        </p>
                        <p style={{ fontSize: '0.9rem' }}>
                            Try adjusting the search text, restaurant selection, or order count filter.
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                className="cocResetBtn"
                                style={{ marginTop: '12px' }}
                                onClick={handleResetFilters}
                            >
                                ↺ Reset All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="cocTableWrapper">
                            <table className="cocTable">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Customer Name</th>
                                        <th>Phone Number</th>
                                        <th>Email</th>
                                        <th>
                                            {selectedRestaurant === 'ALL'
                                                ? 'Total Orders'
                                                : `Orders (${selectedRestaurant})`}
                                        </th>
                                        <th>Total Spent</th>
                                        <th>Order Placed Dates</th>
                                        {selectedRestaurant === 'ALL' && <th>Restaurant Breakdown</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedCustomers.map((c, index) => {
                                        const restEntries = Object.entries(c.restaurantCounts || {}).sort(
                                            (a, b) => b[1] - a[1]
                                        );
                                        const dates = c.displayOrderDates || [];
                                        const isExpanded = Boolean(expandedDates[c._id]);
                                        const visibleDates = isExpanded ? dates : dates.slice(0, 3);
                                        return (
                                            <tr key={c._id}>
                                                <td className="cocRankCell">{index + 1}</td>
                                                <td className="cocNameCell">{c.name}</td>
                                                <td>
                                                    {c.phone && c.phone !== 'N/A' ? (
                                                        <a href={`tel:${c.phone}`} className="cocPhoneLink">
                                                            📞 {c.phone}
                                                        </a>
                                                    ) : (
                                                        'N/A'
                                                    )}
                                                </td>
                                                <td className="cocEmailCell">{c.email}</td>
                                                <td>
                                                    <span className={getCountBadgeClass(c.displayCount)}>
                                                        {c.displayCount}
                                                    </span>
                                                </td>
                                                <td className="cocSpentCell">{formatCurrency(c.displaySpent)}</td>
                                                <td>
                                                    {dates.length > 0 ? (
                                                        <div className="cocDateTags">
                                                            {visibleDates.map((dt, i) => (
                                                                <span key={`${dt}-${i}`} className="cocDateTag">
                                                                    📅 {formatOrderDate(dt)}
                                                                </span>
                                                            ))}
                                                            {dates.length > 3 && (
                                                                <button
                                                                    type="button"
                                                                    className="cocMoreDatesBtn"
                                                                    onClick={() => toggleExpandDates(c._id)}
                                                                >
                                                                    {isExpanded ? 'Show less' : `+${dates.length - 3} more`}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontSize: '0.84rem' }}>
                                                            No dates
                                                        </span>
                                                    )}
                                                </td>
                                                {selectedRestaurant === 'ALL' && (
                                                    <td>
                                                        {restEntries.length > 0 ? (
                                                            <div className="cocRestTags">
                                                                {restEntries.map(([rName, rCount]) => (
                                                                    <span key={rName} className="cocRestTag">
                                                                        {rName}
                                                                        <strong>×{rCount}</strong>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8', fontSize: '0.84rem' }}>
                                                                No completed orders
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="cocMobileList">
                            {processedCustomers.map((c, index) => {
                                const restEntries = Object.entries(c.restaurantCounts || {}).sort(
                                    (a, b) => b[1] - a[1]
                                );
                                const dates = c.displayOrderDates || [];
                                const isExpanded = Boolean(expandedDates[c._id]);
                                const visibleDates = isExpanded ? dates : dates.slice(0, 3);
                                return (
                                    <div key={c._id} className="cocMobileCard">
                                        <div className="cocMobileCardTop">
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                                                    #{index + 1}
                                                </span>
                                                <div className="cocMobileCardName">{c.name}</div>
                                            </div>
                                            <span className={getCountBadgeClass(c.displayCount)}>
                                                {c.displayCount} {c.displayCount === 1 ? 'Order' : 'Orders'}
                                            </span>
                                        </div>

                                        <div className="cocMobileCardMeta">
                                            <div className="cocMobileRow">
                                                <span className="cocMobileLabel">Phone</span>
                                                {c.phone && c.phone !== 'N/A' ? (
                                                    <a href={`tel:${c.phone}`} className="cocPhoneLink">
                                                        📞 {c.phone}
                                                    </a>
                                                ) : (
                                                    <span>N/A</span>
                                                )}
                                            </div>
                                            <div className="cocMobileRow">
                                                <span className="cocMobileLabel">Email</span>
                                                <span className="cocEmailCell">{c.email}</span>
                                            </div>
                                            <div className="cocMobileRow">
                                                <span className="cocMobileLabel">Total Spent</span>
                                                <span className="cocSpentCell">{formatCurrency(c.displaySpent)}</span>
                                            </div>
                                        </div>

                                        {dates.length > 0 && (
                                            <div>
                                                <div className="cocMobileLabel" style={{ marginBottom: '6px' }}>
                                                    Order Placed Dates
                                                </div>
                                                <div className="cocDateTags">
                                                    {visibleDates.map((dt, i) => (
                                                        <span key={`${dt}-${i}`} className="cocDateTag">
                                                            📅 {formatOrderDate(dt)}
                                                        </span>
                                                    ))}
                                                    {dates.length > 3 && (
                                                        <button
                                                            type="button"
                                                            className="cocMoreDatesBtn"
                                                            onClick={() => toggleExpandDates(c._id)}
                                                        >
                                                            {isExpanded ? 'Show less' : `+${dates.length - 3} more`}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {selectedRestaurant === 'ALL' && restEntries.length > 0 && (
                                            <div className="cocRestTags">
                                                {restEntries.map(([rName, rCount]) => (
                                                    <span key={rName} className="cocRestTag">
                                                        {rName}
                                                        <strong>×{rCount}</strong>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
