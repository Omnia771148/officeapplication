'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './live.css';

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
        const intervalId = setInterval(fetchOrderStatuses, 1000); // Poll every 1 second

        return () => clearInterval(intervalId);
    }, []);

    if (loading) {
        return (
            <div className="liveContainer">
                <div className="loadingState">
                    <div className="spinner"></div>
                    <p>Loading live orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="liveContainer">
            {/* Top Navigation & Header Bar */}
            <header className="livePageHeader">
                <Link href="/dashboard" className="headerBackLink">
                    <button className="backBtn">
                        ← Dashboard
                    </button>
                </Link>

                <div className="titleWrapper">
                    <h1 className="pageTitle">
                        <span className="liveDot"></span> Live Orders
                    </h1>
                    <span className="liveCountBadge">{orderStatuses.length} Active</span>
                </div>

                <div className="headerActionsGroup">
                    <Link href="/total-income" className="headerIncomeLink">
                        <button className="totalIncomeBtn">
                            💰 Total Income
                        </button>
                    </Link>

                    <Link href="/live-delay-analysis" className="headerAnalysisLink">
                        <button className="analysisToggleBtn">
                            📊 Delay Analysis
                        </button>
                    </Link>
                </div>
            </header>

            {/* Orders Grid */}
            <main className="ordersGrid">
                {orderStatuses.length === 0 ? (
                    <div className="noDataContainer">
                        <div className="noDataIcon">📦</div>
                        <p className="noData">No active live orders right now.</p>
                        <span className="noDataSub">New orders will automatically appear here in real-time.</span>
                    </div>
                ) : (
                    orderStatuses.map((status) => (
                        <OrderCard key={status._id} status={status} />
                    ))
                )}
            </main>

            {/* Bottom Navigation */}
            <footer className="navigation">
                <Link href="/dashboard">
                    <button className="backButton">Back to Dashboard</button>
                </Link>
            </footer>
        </div>
    );
}

function getCoordinates(status) {
    if (!status) return null;

    const findLatLng = (obj) => {
        if (!obj) return null;
        if (typeof obj === 'object') {
            const lat = obj.lat ?? obj.latitude ?? obj.coords?.lat ?? obj.coords?.latitude;
            const lng = obj.lng ?? obj.longitude ?? obj.coords?.lng ?? obj.coords?.longitude;
            if (lat !== undefined && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
                return { lat: Number(lat), lng: Number(lng) };
            }
            if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
                const p0 = Number(obj.coordinates[0]);
                const p1 = Number(obj.coordinates[1]);
                if (!isNaN(p0) && !isNaN(p1)) {
                    return { lat: p1, lng: p0 };
                }
            }
        } else if (typeof obj === 'string') {
            const match = obj.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
            if (match) {
                return { lat: Number(match[1]), lng: Number(match[3]) };
            }
        }
        return null;
    };

    let coords = findLatLng(status.userCoordinates);
    if (coords) return coords;

    coords = findLatLng(status.userLocation);
    if (coords) return coords;

    coords = findLatLng(status.coordinates);
    if (coords) return coords;

    coords = findLatLng(status.location);
    if (coords) return coords;

    coords = findLatLng(status.customerLocation) || findLatLng(status.deliveryLocation) || findLatLng(status.dropLocation);
    if (coords) return coords;

    coords = findLatLng(status);
    if (coords) return coords;

    return null;
}

function getLocationDisplayText(status, coords) {
    if (status.deliveryAddress) {
        return status.deliveryAddress;
    }
    const loc = status.userCoordinates || status.userLocation || status.location || status.customerLocation || status.deliveryLocation;
    if (typeof loc === 'string' && loc.trim()) {
        return loc.trim();
    }
    if (loc && typeof loc === 'object') {
        if (loc.address) return String(loc.address);
        if (loc.fullAddress) return String(loc.fullAddress);
        if (loc.formattedAddress) return String(loc.formattedAddress);
    }
    if (coords) {
        return `${coords.lat}, ${coords.lng}`;
    }
    if (loc && typeof loc === 'object') {
        return JSON.stringify(loc);
    }
    return null;
}

function formatDateTime(val) {
    if (!val) return null;
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    } catch {
        return String(val);
    }
}

function OrderCard({ status }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showMoreDetails, setShowMoreDetails] = useState(false);
    const coords = getCoordinates(status);
    const locationDisplay = getLocationDisplayText(status, coords);
    const mapUrl = coords
        ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
        : (status.deliveryAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(status.deliveryAddress)}` : null);

    // List of keys already handled in primary layout
    const knownKeys = new Set([
        '_id', '__v', 'updatedAt', 'createdAt', 'orderId', 'status',
        'restaurantName', 'restaurantId', 'restaurantPhone', 'userPhone',
        'deliveryBoyName', 'deliveryboyName', 'driverName', 'deliveryBoy',
        'deliveryBoyPhone', 'deliveryboyPhone',
        'restaurantAcceptedAt', 'deliveryBoyAcceptedAt',
        'userLocation', 'userCoordinates', 'location', 'latitude', 'longitude', 'lat', 'lng',
        'customerLocation', 'deliveryLocation', 'dropLocation', 'coords', 'deliveryAddress',
        'items',
        'userId', 'user_id', 'customerId',
        'totalPrice', 'total', 'price',
        'gst', 'foodGst', 'platformFee', 'deliveryFee', 'deliveryCharge', 'grandTotal', 'finalAmount',
        'userName', 'name', 'customerName',
        'userEmail', 'email', 'customerEmail',
        'isPhoneVerified',
        'flatNo', 'flat', 'street', 'landmark',
        'deliveryDistance', 'distance'
    ]);

    const extraFields = Object.entries(status).filter(([k]) => !knownKeys.has(k));

    return (
        <div className={`orderCard ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {/* Clickable Card Header to Extend/Collapse Orderwise */}
            <div
                className="cardHeader"
                onClick={() => setIsExpanded(!isExpanded)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsExpanded(!isExpanded);
                    }
                }}
            >
                <div className="headerLeft">
                    <span className="orderNumber">Order #{status.orderId || 'N/A'}</span>
                    <span className={`statusBadge ${status.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {status.status || 'Pending'}
                    </span>
                </div>
                <div className="headerRight">
                    <span className="expandToggleText">{isExpanded ? 'Hide' : 'Details'}</span>
                    <span className={`chevronIcon ${isExpanded ? 'open' : ''}`}>▼</span>
                </div>
            </div>

            {isExpanded && (
                <>
                    <div className="cardBody">
                        {/* 1. Restaurant, Delivery Boy & Timing Information */}
                        <div className="cardSection">
                            <div className="dataGrid">
                                {status.restaurantName && (
                                    <div className="dataField">
                                        <span className="dataHeading">Restaurant</span>
                                        <span className="dataValue highlightText">{status.restaurantName}</span>
                                    </div>
                                )}
                                {status.restaurantId && (
                                    <div className="dataField">
                                        <span className="dataHeading">Restaurant ID</span>
                                        <span className="dataValue">{status.restaurantId}</span>
                                    </div>
                                )}
                                <div className="dataField">
                                    <span className="dataHeading">Delivery Boy</span>
                                    <span className="dataValue highlightText">
                                        {status.deliveryBoyName || status.deliveryboyName || status.driverName || 'Not Assigned'}
                                    </span>
                                </div>
                                <div className="dataField">
                                    <span className="dataHeading">Order Placed</span>
                                    <span className="dataValue">{formatDateTime(status.createdAt) || 'N/A'}</span>
                                </div>
                                <div className="dataField">
                                    <span className="dataHeading">Rest. Accepted</span>
                                    <span className="dataValue">
                                        {status.restaurantAcceptedAt ? (
                                            <span className="acceptedTime">{formatDateTime(status.restaurantAcceptedAt)}</span>
                                        ) : (
                                            <span className="pendingBadgeRed">Pending</span>
                                        )}
                                    </span>
                                </div>
                                <div className="dataField">
                                    <span className="dataHeading">Boy Accepted</span>
                                    <span className="dataValue">
                                        {status.deliveryBoyAcceptedAt ? (
                                            <span className="acceptedTime">{formatDateTime(status.deliveryBoyAcceptedAt)}</span>
                                        ) : (
                                            <span className="pendingBadgeRed">Pending</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 2. User Location & Coordinates */}
                        <div className="cardSection">
                            <div className="dataGrid">
                                <div className="dataField fullWidth">
                                    <span className="dataHeading">📍 User Location</span>
                                    <span className="dataValue">
                                        {locationDisplay || (coords ? `${coords.lat}, ${coords.lng}` : (status.deliveryAddress || 'V, V ,'))}
                                    </span>
                                </div>

                                {coords && (
                                    <div className="dataField coordinatesField fullWidth">
                                        <div className="coordinatesLeft">
                                            <span className="dataHeading">Coordinates</span>
                                            <span className="coordinatesValue">
                                                {coords.lat}, {coords.lng}
                                            </span>
                                        </div>
                                        <a
                                            href={mapUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="viewInMapsBtn"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            📍 View in Maps
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Ordered Items Section */}
                        {Array.isArray(status.items) && status.items.length > 0 && (
                            <div className="cardSection itemsSection">
                                <span className="sectionHeading">
                                    Ordered Items ({status.items.length})
                                </span>
                                <div className="itemsList">
                                    {status.items.map((item, idx) => {
                                        const name = typeof item === 'object' ? (item.name || item.itemName || 'Item') : String(item);
                                        const price = typeof item === 'object' ? (item.price || item.itemPrice) : null;
                                        const qty = typeof item === 'object' ? (item.quantity || item.qty || 1) : 1;
                                        const total = price ? price * qty : null;

                                        return (
                                            <div key={idx} className="itemCard">
                                                <div className="itemRowMain">
                                                    <span className="itemName">{name}</span>
                                                    {price !== null && <span className="itemPrice">₹{price}</span>}
                                                </div>
                                                <div className="itemRowSub">
                                                    <span className="itemQtyBadge">x{qty}</span>
                                                    {total !== null && <span className="itemTotal">₹{total}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 4. Customer Information & Delivery Address */}
                        <div className="cardSection">
                            <span className="sectionHeading">Customer & Address Details</span>
                            <div className="dataGrid">
                                <div className="dataField fullWidth">
                                    <span className="dataHeading">User ID</span>
                                    <span className="dataValue monoText">{status.userId || status.user_id || 'N/A'}</span>
                                </div>
                                {(status.userName || status.name) && (
                                    <div className="dataField fullWidth">
                                        <span className="dataHeading">User Name</span>
                                        <span className="dataValue">{status.userName || status.name}</span>
                                    </div>
                                )}
                                {(status.userEmail || status.email) && (
                                    <div className="dataField fullWidth">
                                        <span className="dataHeading">User Email</span>
                                        <span className="dataValue">{status.userEmail || status.email}</span>
                                    </div>
                                )}
                                {status.isPhoneVerified !== undefined && (
                                    <div className="dataField">
                                        <span className="dataHeading">Is Phone Verified</span>
                                        <span className="dataValue">
                                            <span className={status.isPhoneVerified ? 'statusTagVerified' : 'statusTagUnverified'}>
                                                {status.isPhoneVerified ? 'true' : 'false'}
                                            </span>
                                        </span>
                                    </div>
                                )}
                                {(status.deliveryDistance || status.distance) && (
                                    <div className="dataField">
                                        <span className="dataHeading">Delivery Distance</span>
                                        <span className="dataValue">
                                            {String(status.deliveryDistance || status.distance).includes('km')
                                                ? (status.deliveryDistance || status.distance)
                                                : `${status.deliveryDistance || status.distance} km`}
                                        </span>
                                    </div>
                                )}
                                {(status.flatNo || status.flat) && (
                                    <div className="dataField">
                                        <span className="dataHeading">Flat No</span>
                                        <span className="dataValue">{status.flatNo || status.flat}</span>
                                    </div>
                                )}
                                {status.street && (
                                    <div className="dataField">
                                        <span className="dataHeading">Street</span>
                                        <span className="dataValue">{status.street}</span>
                                    </div>
                                )}
                                {status.landmark !== undefined && (
                                    <div className="dataField">
                                        <span className="dataHeading">Landmark</span>
                                        <span className="dataValue">{status.landmark || '—'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 5. Billing & Financials */}
                        <div className="cardSection">
                            <span className="sectionHeading">Billing & Fees</span>
                            <div className="dataGrid">
                                <div className="dataField">
                                    <span className="dataHeading">Total Price</span>
                                    <span className="dataValue">₹{status.totalPrice ?? status.total ?? '0'}</span>
                                </div>
                                <div className="dataField">
                                    <span className="dataHeading">GST</span>
                                    <span className="dataValue">₹{status.gst ?? '0'}</span>
                                </div>
                                <div className="dataField">
                                    <span className="dataHeading">Food GST</span>
                                    <span className="dataValue">₹{status.foodGst ?? '0'}</span>
                                </div>
                                <div className="dataField">
                                    <span className="dataHeading">Platform Fee</span>
                                    <span className="dataValue">₹{status.platformFee ?? '0'}</span>
                                </div>
                                <div className="dataField">
                                    <span className="dataHeading">Delivery Fee</span>
                                    <span className="dataValue">₹{status.deliveryFee ?? status.deliveryCharge ?? '0'}</span>
                                </div>
                                <div className="dataField highlightGrandTotal">
                                    <span className="dataHeading">Grand Total</span>
                                    <span className="dataValue grandTotalVal">
                                        ₹{status.grandTotal ?? status.finalAmount ?? status.totalPrice ?? '0'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 6. Action Call Buttons */}
                    <div className="cardActions">
                        <a
                            href={status.userPhone ? `tel:${status.userPhone}` : '#'}
                            className={`actionButton userButton ${!status.userPhone ? 'disabled' : ''}`}
                            onClick={(e) => {
                                if (!status.userPhone) e.preventDefault();
                            }}
                        >
                            📞 Call User
                        </a>
                        <a
                            href={status.deliveryBoyPhone || status.deliveryboyPhone ? `tel:${status.deliveryBoyPhone || status.deliveryboyPhone}` : '#'}
                            className={`actionButton deliveryButton ${!(status.deliveryBoyPhone || status.deliveryboyPhone) ? 'disabled' : ''}`}
                            onClick={(e) => {
                                if (!(status.deliveryBoyPhone || status.deliveryboyPhone)) e.preventDefault();
                            }}
                        >
                            🛵 Call Delivery Boy
                        </a>
                        <a
                            href={status.restaurantPhone ? `tel:${status.restaurantPhone}` : '#'}
                            className={`actionButton restaurantButton ${!status.restaurantPhone ? 'disabled' : ''}`}
                            onClick={(e) => {
                                if (!status.restaurantPhone) e.preventDefault();
                            }}
                        >
                            🏪 Call Restaurant
                        </a>
                    </div>

                    {/* 7. More Details Toggle Button */}
                    <div className="moreDetailsWrapper">
                        <button
                            type="button"
                            className="moreDetailsBtn"
                            onClick={() => setShowMoreDetails(!showMoreDetails)}
                        >
                            {showMoreDetails ? '▲ Hide Extra Details' : '▼ More Details'}
                        </button>
                    </div>

                    {showMoreDetails && (
                        <div className="moreDetailsContent">
                            <span className="sectionHeading">Additional Order Properties</span>
                            <div className="dataGrid">
                                {extraFields.length > 0 ? (
                                    extraFields.map(([key, value]) => (
                                        <div key={key} className="dataField fullWidth">
                                            <span className="dataHeading">{key.replace(/([A-Z])/g, ' $1')}</span>
                                            <span className="dataValue">
                                                {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        <div className="dataField fullWidth">
                                            <span className="dataHeading">System ID (_id)</span>
                                            <span className="dataValue monoText">{String(status._id)}</span>
                                        </div>
                                        {status.updatedAt && (
                                            <div className="dataField fullWidth">
                                                <span className="dataHeading">Last Updated</span>
                                                <span className="dataValue">{new Date(status.updatedAt).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
