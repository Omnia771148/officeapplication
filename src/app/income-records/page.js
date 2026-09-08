'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './income-records.css';

export default function IncomeRecordsPage() {
    const router = useRouter();
    const [records, setRecords] = useState([]);
    const [summary, setSummary] = useState({
        totalEarningsBeforeCommission: 0,
        totalEarningsAfterCommission: 0,
        totalDeliveryCharges: 0,
        totalRecordsCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchIncomeData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/income-records');
            const data = await response.json();

            if (data.success) {
                setRecords(data.records || []);
                setSummary(data.summary || {
                    totalEarningsBeforeCommission: 0,
                    totalEarningsAfterCommission: 0,
                    totalDeliveryCharges: 0,
                    totalRecordsCount: 0
                });
            } else {
                setError(data.error || 'Failed to fetch income records');
            }
        } catch (err) {
            console.error('Error fetching income records:', err);
            setError('Server communication error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncomeData();
    }, []);

    const filteredRecords = records.filter(record => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (record.orderId && record.orderId.toLowerCase().includes(q)) ||
            (record.restaurantName && record.restaurantName.toLowerCase().includes(q)) ||
            (record.restaurantId && String(record.restaurantId).toLowerCase().includes(q)) ||
            (record.deliveryBoyName && record.deliveryBoyName.toLowerCase().includes(q)) ||
            (record.paymentMethod && record.paymentMethod.toLowerCase().includes(q))
        );
    });

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
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
        <div className="incomeRecordsContainer">
            {/* Top Navigation & Header */}
            <div className="incomeHeader">
                <div className="incomeHeaderLeft">
                    <button
                        className="incomeBackBtn"
                        onClick={() => router.push('/dashboard')}
                    >
                        ← Back to Dashboard
                    </button>
                    <h1 className="incomeTitle">💰 Total Records of Income</h1>
                </div>

                <button
                    className="incomeRefreshBtn"
                    onClick={fetchIncomeData}
                    disabled={loading}
                >
                    🔄 Refresh
                </button>
            </div>

            {/* 3 Main Summary Heading Cards */}
            <div className="metricsGrid">
                {/* Total Earnings Before Commission */}
                <div className="metricCard beforeComm">
                    <div className="metricIconWrapper">
                        📈
                    </div>
                    <div className="metricContent">
                        <span className="metricHeading">Total Earnings Before Commission</span>
                        <span className="metricValue">
                            ₹{summary.totalEarningsBeforeCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="metricSubtext">Variable: grandTotal</span>
                    </div>
                </div>

                {/* Total Earnings After Commission */}
                <div className="metricCard afterComm">
                    <div className="metricIconWrapper">
                        💼
                    </div>
                    <div className="metricContent">
                        <span className="metricHeading">Total Earnings After Commission</span>
                        <span className="metricValue">
                            ₹{summary.totalEarningsAfterCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="metricSubtext">Variable: commissionAmount</span>
                    </div>
                </div>

                {/* Delivery Boy Charges */}
                <div className="metricCard deliveryCharges">
                    <div className="metricIconWrapper">
                        🛵
                    </div>
                    <div className="metricContent">
                        <span className="metricHeading">Delivery Boy Charges</span>
                        <span className="metricValue">
                            ₹{summary.totalDeliveryCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="metricSubtext">Variable: deliveryCharge</span>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="controlsBar">
                <div className="searchBox">
                    <span className="searchIcon">🔍</span>
                    <input
                        type="text"
                        className="searchInputField"
                        placeholder="Search by Order ID, Restaurant, Delivery Boy..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <span className="recordsCountBadge">
                    Showing {filteredRecords.length} of {records.length} Completed Records
                </span>
            </div>

            {/* Content Body: Loading, Error, or Table */}
            {loading ? (
                <div className="stateContainer">
                    <div className="spinner"></div>
                    <p>Loading income records from database...</p>
                </div>
            ) : error ? (
                <div className="stateContainer">
                    <p style={{ color: '#ef4444', fontWeight: 'bold' }}>⚠️ {error}</p>
                    <button className="incomeRefreshBtn" onClick={fetchIncomeData} style={{ marginTop: '12px' }}>
                        Retry
                    </button>
                </div>
            ) : filteredRecords.length === 0 ? (
                <div className="stateContainer">
                    <div className="emptyStateTitle">No Records Found</div>
                    <p>No completed orders matched your query.</p>
                </div>
            ) : (
                <div className="tableCard">
                    <div className="tableResponsive">
                        <table className="recordsTable">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Date & Time</th>
                                    <th>Restaurant</th>
                                    <th>Total Earnings Before Commission (grandTotal)</th>
                                    <th>Total Earnings After Commission (commissionAmount)</th>
                                    <th>Delivery Boy Charges (deliveryCharge)</th>
                                    <th>Delivery Boy</th>
                                    <th>Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((record) => (
                                    <tr key={record._id}>
                                        <td>
                                            <span className="orderIdBadge">{record.orderId}</span>
                                        </td>
                                        <td className="dateCell">
                                            {formatDate(record.date)}
                                        </td>
                                        <td>
                                            <span className="restaurantNameCell">{record.restaurantName}</span>
                                            {record.restaurantId !== 'N/A' && (
                                                <span className="restaurantIdSub">ID: {record.restaurantId}</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="valBeforeComm">
                                                ₹{Number(record.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="valAfterComm">
                                                ₹{Number(record.commissionAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="valDeliveryCharge">
                                                ₹{Number(record.deliveryCharge).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="deliveryBoyCell">
                                                <strong>{record.deliveryBoyName}</strong>
                                                {record.deliveryBoyPhone !== 'N/A' && (
                                                    <span className="deliveryBoyPhone">{record.deliveryBoyPhone}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badgePayment">
                                                {record.paymentMethod} • {record.paymentStatus}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
