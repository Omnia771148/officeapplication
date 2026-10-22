'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import './invoice.css';

const MONTHS = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
];

export default function InvoicePage() {
    const router = useRouter();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('ALL');
    const [selectedYear, setSelectedYear] = useState('ALL');
    const [selectedRestaurant, setSelectedRestaurant] = useState('ALL');
    const [selectedCommission, setSelectedCommission] = useState('ALL');

    const fetchInvoiceData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/invoice-orders');
            const data = await res.json();

            if (data.success) {
                setOrders(data.orders || []);
            } else {
                setError(data.error || 'Failed to fetch completed order data for invoices');
            }
        } catch (err) {
            console.error('Error loading invoice data:', err);
            setError('Failed to connect to the server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoiceData();
    }, []);

    // Extract unique restaurants
    const uniqueRestaurants = useMemo(() => {
        const names = new Set();
        orders.forEach(o => {
            if (o.restaurantName && o.restaurantName !== 'N/A') {
                names.add(o.restaurantName);
            }
        });
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [orders]);

    // Extract unique years from order dates
    const uniqueYears = useMemo(() => {
        const years = new Set();
        orders.forEach(o => {
            if (o.orderDate) {
                const d = new Date(o.orderDate);
                if (!isNaN(d.getTime())) {
                    years.add(d.getFullYear());
                }
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [orders]);

    // Extract unique commission rates
    const uniqueCommissions = useMemo(() => {
        const rates = new Set();
        orders.forEach(o => {
            if (o.commissionRate !== undefined && o.commissionRate !== null) {
                rates.add(Number(o.commissionRate));
            }
        });
        return Array.from(rates).sort((a, b) => a - b);
    }, [orders]);

    // Combined filter logic
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            let orderYear = null;
            let orderMonth = null;
            let orderDateKey = '';

            if (order.orderDate) {
                const d = new Date(order.orderDate);
                if (!isNaN(d.getTime())) {
                    orderYear = d.getFullYear();
                    orderMonth = d.getMonth() + 1;
                    const yStr = d.getFullYear();
                    const mStr = String(d.getMonth() + 1).padStart(2, '0');
                    const dStr = String(d.getDate()).padStart(2, '0');
                    orderDateKey = `${yStr}-${mStr}-${dStr}`;
                }
            }

            // 1. Exact Date filter
            if (selectedDate && orderDateKey !== selectedDate) {
                return false;
            }

            // 2. Month filter
            if (selectedMonth !== 'ALL') {
                if (!orderMonth || String(orderMonth) !== String(selectedMonth)) {
                    return false;
                }
            }

            // 3. Year filter
            if (selectedYear !== 'ALL') {
                if (!orderYear || String(orderYear) !== String(selectedYear)) {
                    return false;
                }
            }

            // 4. Restaurant filter
            if (selectedRestaurant !== 'ALL' && order.restaurantName !== selectedRestaurant) {
                return false;
            }

            // 5. Commission Rate filter
            if (selectedCommission !== 'ALL') {
                if (String(order.commissionRate) !== String(selectedCommission)) {
                    return false;
                }
            }

            // 6. Text search (Restaurant name or Order ID)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchRest = (order.restaurantName || '').toLowerCase().includes(q);
                const matchOrderId = (order.orderId || '').toLowerCase().includes(q);
                return matchRest || matchOrderId;
            }

            return true;
        });
    }, [orders, selectedDate, selectedMonth, selectedYear, selectedRestaurant, selectedCommission, searchQuery]);

    // Summary metrics dynamically recalculated based on filtered orders
    const filteredSummary = useMemo(() => {
        let grandTotal = 0;
        let totalPrice = 0;
        let sentToRest = 0;
        let whatWeGet = 0;

        filteredOrders.forEach(o => {
            grandTotal += o.grandTotal || 0;
            totalPrice += o.totalPrice || 0;
            sentToRest += o.amountSentToRestaurants || 0;
            whatWeGet += o.whatWeGet || 0;
        });

        return {
            count: filteredOrders.length,
            grandTotal,
            totalPrice,
            sentToRest,
            whatWeGet
        };
    }, [filteredOrders]);

    const handleResetFilters = () => {
        setSelectedDate('');
        setSelectedMonth('ALL');
        setSelectedYear('ALL');
        setSelectedRestaurant('ALL');
        setSelectedCommission('ALL');
        setSearchQuery('');
    };

    const hasActiveFilters = Boolean(
        selectedDate ||
        selectedMonth !== 'ALL' ||
        selectedYear !== 'ALL' ||
        selectedRestaurant !== 'ALL' ||
        selectedCommission !== 'ALL' ||
        searchQuery.trim()
    );

    const formatCurrency = (val) => {
        const num = Number(val) || 0;
        return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return '';
        }
    };

    // Label describing active filter period
    const getFilterPeriodLabel = () => {
        const parts = [];
        if (selectedRestaurant !== 'ALL') parts.push(`Restaurant: ${selectedRestaurant}`);
        if (selectedDate) {
            parts.push(`Date: ${selectedDate}`);
        } else {
            if (selectedMonth !== 'ALL') {
                const mName = MONTHS.find(m => m.value === selectedMonth)?.label;
                parts.push(`Month: ${mName}`);
            }
            if (selectedYear !== 'ALL') parts.push(`Year: ${selectedYear}`);
        }
        if (selectedCommission !== 'ALL') parts.push(`Commission: ${selectedCommission}%`);
        return parts.length > 0 ? parts.join(' | ') : 'All Completed Orders';
    };

    // Trigger Browser Print to PDF
    const handlePrintInvoice = () => {
        window.print();
    };

    // Download CSV File
    const handleDownloadCSV = () => {
        if (filteredOrders.length === 0) return;

        let filename = 'Settlement_Invoice';
        if (selectedRestaurant !== 'ALL') {
            filename += `_${selectedRestaurant.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }
        if (selectedDate) {
            filename += `_${selectedDate}`;
        } else {
            if (selectedMonth !== 'ALL') {
                const mName = MONTHS.find(m => m.value === selectedMonth)?.label;
                filename += `_${mName}`;
            }
            if (selectedYear !== 'ALL') {
                filename += `_${selectedYear}`;
            }
        }
        filename += '.csv';

        const rows = [];
        rows.push(['RESTAURANT SETTLEMENT INVOICE']);
        rows.push([`Filter / Period:`, `"${getFilterPeriodLabel().replace(/"/g, '""')}"`]);
        rows.push([`Generated On:`, `"${new Date().toLocaleString('en-IN')}"`]);
        rows.push([`Total Orders:`, filteredOrders.length]);
        rows.push([]);

        // Header Row
        rows.push([
            'Order ID',
            'Date',
            'Restaurant Name',
            'Grand Total (INR)',
            'Total Food Price (INR)',
            'Delivery Fee (INR)',
            'Payment Type',
            'Commission Rate (%)',
            'Commission Amount (INR)',
            'Amount Sent to Restaurants (INR)',
            'What We Get (INR)'
        ]);

        // Data Rows
        filteredOrders.forEach(o => {
            rows.push([
                o.orderId || 'N/A',
                formatDate(o.orderDate) || 'N/A',
                `"${(o.restaurantName || '').replace(/"/g, '""')}"`,
                o.grandTotal || 0,
                o.totalPrice || 0,
                o.deliveryFee || 0,
                'UPI',
                `${o.commissionRate || 0}%`,
                o.commissionAmount || 0,
                o.amountSentToRestaurants || 0,
                o.whatWeGet || 0
            ]);
        });

        // Blank & Total Row
        rows.push([]);
        rows.push([
            'TOTAL',
            '',
            '',
            filteredSummary.grandTotal,
            filteredSummary.totalPrice,
            '',
            'UPI',
            '',
            '',
            filteredSummary.sentToRest,
            filteredSummary.whatWeGet
        ]);

        const csvContent = '\uFEFF' + rows.map(e => e.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="invoicePageContainer">
            {/* Header */}
            <div className="invoiceHeader">
                <div className="headerLeft">
                    <button className="backBtn" onClick={() => router.push('/dashboard')}>
                        ← Back to Dashboard
                    </button>
                    <div className="headerTitleBlock">
                        <h1>🧾 Invoices & Settlement Records</h1>
                        <p>Track restaurant settlements, commissions, and platform earnings</p>
                    </div>
                </div>

                <div className="headerActions">
                    <button
                        className="downloadPdfBtn"
                        onClick={handlePrintInvoice}
                        disabled={loading || filteredOrders.length === 0}
                        title="Download / Print PDF Invoice for the filtered period"
                    >
                        📄 Download PDF Invoice
                    </button>

                    <button
                        className="downloadCsvBtn"
                        onClick={handleDownloadCSV}
                        disabled={loading || filteredOrders.length === 0}
                        title="Export filtered orders to Excel / CSV"
                    >
                        📊 Download CSV
                    </button>

                    <button className="refreshBtn" onClick={fetchInvoiceData} disabled={loading}>
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="errorBox">
                    ⚠️ {error}
                </div>
            )}

            {/* Dynamic KPI Summary Cards */}
            <div className="metricsGrid">
                <div className="metricCard">
                    <div className="metricIcon iconOrders">📦</div>
                    <div>
                        <span className="metricLabel">Filtered Orders</span>
                        <span className="metricValue">{filteredSummary.count}</span>
                    </div>
                </div>

                <div className="metricCard">
                    <div className="metricIcon iconGrandTotal">💳</div>
                    <div>
                        <span className="metricLabel">Total Grand Total</span>
                        <span className="metricValue">{formatCurrency(filteredSummary.grandTotal)}</span>
                    </div>
                </div>

                <div className="metricCard">
                    <div className="metricIcon iconTotalPrice">🍲</div>
                    <div>
                        <span className="metricLabel">Total Food Price</span>
                        <span className="metricValue">{formatCurrency(filteredSummary.totalPrice)}</span>
                    </div>
                </div>

                <div className="metricCard">
                    <div className="metricIcon iconSent">🏪</div>
                    <div>
                        <span className="metricLabel">Amount Sent to Restaurants</span>
                        <span className="metricValue">{formatCurrency(filteredSummary.sentToRest)}</span>
                    </div>
                </div>

                <div className="metricCard">
                    <div className="metricIcon iconRevenue">💼</div>
                    <div>
                        <span className="metricLabel">What We Get</span>
                        <span className="metricValue">{formatCurrency(filteredSummary.whatWeGet)}</span>
                    </div>
                </div>
            </div>

            {/* Advanced Filters Toolbar */}
            <div className="toolbarCard">
                <div className="searchBox">
                    <span className="searchIcon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search restaurant or order ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="searchInput"
                    />
                </div>

                <div className="filterControls">
                    {/* Exact Date Filter */}
                    <div className="filterGroup">
                        <span className="filterLabel">Date</span>
                        <input
                            type="date"
                            className="dateInput"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            title="Filter by exact date"
                        />
                    </div>

                    {/* Month Filter */}
                    <div className="filterGroup">
                        <span className="filterLabel">Month</span>
                        <select
                            className="selectDropdown"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            <option value="ALL">All Months</option>
                            {MONTHS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Year Filter */}
                    <div className="filterGroup">
                        <span className="filterLabel">Year</span>
                        <select
                            className="selectDropdown"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            <option value="ALL">All Years</option>
                            {uniqueYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Restaurant Filter */}
                    <div className="filterGroup">
                        <span className="filterLabel">Restaurant</span>
                        <select
                            className="selectDropdown"
                            value={selectedRestaurant}
                            onChange={(e) => setSelectedRestaurant(e.target.value)}
                            style={{ maxWidth: '200px' }}
                        >
                            <option value="ALL">All Restaurants ({uniqueRestaurants.length})</option>
                            {uniqueRestaurants.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Commission Rate Filter */}
                    <div className="filterGroup">
                        <span className="filterLabel">Commission</span>
                        <select
                            className="selectDropdown"
                            value={selectedCommission}
                            onChange={(e) => setSelectedCommission(e.target.value)}
                        >
                            <option value="ALL">All Rates</option>
                            {uniqueCommissions.map(c => (
                                <option key={c} value={c}>{c}% Commission</option>
                            ))}
                        </select>
                    </div>

                    {/* Reset Button */}
                    {hasActiveFilters && (
                        <button className="resetFilterBtn" onClick={handleResetFilters} title="Reset all filters">
                            ↺ Reset Filters
                        </button>
                    )}

                    <span className="countBadge">
                        {filteredOrders.length} of {orders.length} orders
                    </span>
                </div>

                {/* Active Filter Tags */}
                {hasActiveFilters && (
                    <div className="activeFiltersBar">
                        <span className="activeFiltersTitle">Active Filters:</span>
                        {selectedDate && (
                            <span className="activeTag">
                                📅 Date: {selectedDate}
                                <span className="activeTagRemove" onClick={() => setSelectedDate('')}>✕</span>
                            </span>
                        )}
                        {selectedMonth !== 'ALL' && (
                            <span className="activeTag">
                                🗓️ Month: {MONTHS.find(m => m.value === selectedMonth)?.label}
                                <span className="activeTagRemove" onClick={() => setSelectedMonth('ALL')}>✕</span>
                            </span>
                        )}
                        {selectedYear !== 'ALL' && (
                            <span className="activeTag">
                                📆 Year: {selectedYear}
                                <span className="activeTagRemove" onClick={() => setSelectedYear('ALL')}>✕</span>
                            </span>
                        )}
                        {selectedRestaurant !== 'ALL' && (
                            <span className="activeTag">
                                🏪 {selectedRestaurant}
                                <span className="activeTagRemove" onClick={() => setSelectedRestaurant('ALL')}>✕</span>
                            </span>
                        )}
                        {selectedCommission !== 'ALL' && (
                            <span className="activeTag">
                                🏷️ {selectedCommission}% Commission
                                <span className="activeTagRemove" onClick={() => setSelectedCommission('ALL')}>✕</span>
                            </span>
                        )}
                        {searchQuery.trim() && (
                            <span className="activeTag">
                                🔍 "{searchQuery}"
                                <span className="activeTagRemove" onClick={() => setSearchQuery('')}>✕</span>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Table Card */}
            <div className="tableCard">
                {/* Print Header (Visible strictly when printing / saving as PDF) */}
                <div className="printOnlySection">
                    <div className="printHeaderTop">
                        <div>
                            <h1 className="printCompanyTitle">OFFICE SETTLEMENT INVOICE</h1>
                            <p className="printSubtitle">Restaurant Payout & Commission Statement</p>
                        </div>
                        <div className="printMetaBlock">
                            <div><strong>Statement Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            <div><strong>Filter / Period:</strong> {getFilterPeriodLabel()}</div>
                            <div><strong>Payment Method:</strong> UPI</div>
                        </div>
                    </div>

                    <div className="printSummaryBox">
                        <div className="printSummaryItem">
                            <span className="printSummaryLabel">Total Orders</span>
                            <span className="printSummaryVal">{filteredSummary.count}</span>
                        </div>
                        <div className="printSummaryItem">
                            <span className="printSummaryLabel">Total Food Price</span>
                            <span className="printSummaryVal">{formatCurrency(filteredSummary.totalPrice)}</span>
                        </div>
                        <div className="printSummaryItem">
                            <span className="printSummaryLabel">What We Get (Platform Cut)</span>
                            <span className="printSummaryVal">{formatCurrency(filteredSummary.whatWeGet)}</span>
                        </div>
                        <div className="printSummaryItem">
                            <span className="printSummaryLabel">Amount Sent to Restaurants</span>
                            <span className="printSummaryVal" style={{ color: '#059669' }}>{formatCurrency(filteredSummary.sentToRest)}</span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="stateContainer">
                        <div className="spinner"></div>
                        <p>Loading completed orders from <code>finalcompletedorders</code>...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="stateContainer">
                        <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>No orders match your filter criteria</p>
                        <p style={{ fontSize: '0.9rem' }}>Try clearing or adjusting the date, month, year, restaurant, or commission filters.</p>
                        <button className="resetFilterBtn" style={{ marginTop: '14px' }} onClick={handleResetFilters}>
                            ↺ Clear All Filters
                        </button>
                    </div>
                ) : (
                    <div className="tableContainer">
                        <table className="invoiceTable">
                            <thead>
                                <tr>
                                    <th>Order Info</th>
                                    <th>Restaurant Name</th>
                                    <th>Grand Total</th>
                                    <th>Total Price</th>
                                    <th>Delivery Fee</th>
                                    <th>Payment Type</th>
                                    <th>Commission Rate</th>
                                    <th>Amount Sent to Restaurants</th>
                                    <th>What We Get</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => {
                                    return (
                                        <tr key={order._id}>
                                            <td>
                                                <div className="orderIdCell">{order.orderId}</div>
                                                {order.orderDate && (
                                                    <div className="orderDateText">{formatDate(order.orderDate)}</div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="restaurantNameCell">{order.restaurantName}</div>
                                            </td>
                                            <td>
                                                <span className="currencyText">{formatCurrency(order.grandTotal)}</span>
                                            </td>
                                            <td>
                                                <span className="currencyText">{formatCurrency(order.totalPrice)}</span>
                                            </td>
                                            <td>
                                                <span className="currencyText">{formatCurrency(order.deliveryFee)}</span>
                                            </td>
                                            <td>
                                                <span className="paymentBadge paymentUpi">
                                                    UPI
                                                </span>
                                            </td>
                                            <td>
                                                <div className="commissionBadge">
                                                    <span>{order.commissionRate > 0 ? `${order.commissionRate}%` : '0%'}</span>
                                                    {order.commissionAmount > 0 && (
                                                        <span className="commissionAmountSub">
                                                            ({formatCurrency(order.commissionAmount)})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="sentToRestCell">
                                                    {formatCurrency(order.amountSentToRestaurants)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="whatWeGetCell">
                                                    {formatCurrency(order.whatWeGet)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td>Total ({filteredOrders.length})</td>
                                    <td>-</td>
                                    <td>{formatCurrency(filteredSummary.grandTotal)}</td>
                                    <td>{formatCurrency(filteredSummary.totalPrice)}</td>
                                    <td>-</td>
                                    <td>UPI</td>
                                    <td>-</td>
                                    <td style={{ color: '#059669', fontWeight: 800 }}>
                                        {formatCurrency(filteredSummary.sentToRest)}
                                    </td>
                                    <td style={{ color: '#4338ca', fontWeight: 800 }}>
                                        {formatCurrency(filteredSummary.whatWeGet)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* Print Footer (Visible strictly when printing / saving as PDF) */}
                <div className="printOnlySection">
                    <div className="printFooter">
                        <div>
                            <div>• This is a system-generated settlement statement based on completed orders.</div>
                            <div>• All payments are disbursed via UPI.</div>
                        </div>
                        <div className="printSignatory">
                            <div className="signatoryLine"></div>
                            <div>Authorized Signature</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
