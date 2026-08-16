'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BranchStats from '@/components/BranchStats';
import '@/components/BranchPage.css';

export default function RestaurantDashboardPage({ params }) {
    const router = useRouter();
    // Resolve params using React.use()
    const resolvedParams = use(params);
    const id = resolvedParams.id;
    const [details, setDetails] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    // Restaurant name edit states
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState('');
    const [updatingName, setUpdatingName] = useState(false);

    // Active status toggle state
    const [togglingActive, setTogglingActive] = useState(false);

    // Timings edit state
    const [isEditingTimings, setIsEditingTimings] = useState(false);
    const [editOpenTime, setEditOpenTime] = useState('');
    const [editCloseTime, setEditCloseTime] = useState('');
    const [updatingTimings, setUpdatingTimings] = useState(false);

    const handleSaveTimings = async () => {
        if (!editOpenTime || !editCloseTime) {
            alert('Please select both Open Time and Close Time');
            return;
        }
        setUpdatingTimings(true);
        try {
            const res = await fetch('/api/restaurant-timings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restId: id,
                    openTime: editOpenTime,
                    closeTime: editCloseTime
                })
            });
            const data = await res.json();
            if (data.success) {
                setDetails(prev => ({
                    ...prev,
                    openTime: editOpenTime,
                    closeTime: editCloseTime
                }));
                setIsEditingTimings(false);
                alert('Restaurant timings updated successfully!');
            } else {
                alert(data.error || 'Failed to update restaurant timings.');
            }
        } catch (err) {
            console.error("Error updating timings:", err);
            alert("Server communication error.");
        } finally {
            setUpdatingTimings(false);
        }
    };

    const handleToggleActive = async (nextStatus) => {
        setTogglingActive(true);
        try {
            const res = await fetch('/api/restaurant-timings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restId: id,
                    isActive: nextStatus
                })
            });
            const data = await res.json();
            if (data.success) {
                setDetails(prev => ({
                    ...prev,
                    isActive: nextStatus
                }));
            } else {
                alert(data.error || 'Failed to update active status.');
            }
        } catch (err) {
            console.error("Error toggling active status:", err);
            alert("Server communication error.");
        } finally {
            setTogglingActive(false);
        }
    };

    const handleSaveName = async () => {
        if (!editName.trim()) {
            alert('Restaurant name cannot be empty');
            return;
        }
        setUpdatingName(true);
        try {
            const res = await fetch('/api/restaurant-register', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restId: id,
                    newName: editName.trim()
                })
            });
            const data = await res.json();
            if (data.success) {
                setDetails(prev => ({
                    ...prev,
                    name: data.data.name,
                    phone: data.data.phone
                }));
                setIsEditingName(false);
                alert('Restaurant name and collection updated successfully!');
            } else {
                alert(data.error || 'Failed to update restaurant name.');
            }
        } catch (err) {
            alert('Error updating restaurant name.');
        } finally {
            setUpdatingName(false);
        }
    };

    return (
        <div className="branchPageContainer">
            <div className="branchHeader">
                <button className="branchBackButton" onClick={() => router.back()}>← Back</button>
            </div>

            <h1 className="branchTitle" style={{ color: '#009688' }}>
                {details ? (details.name || details.phone || `Restaurant ${id}`) : `Restaurant ${id}`} Branch
            </h1>
            <p className="branchSubtitle">
                Welcome to the {details ? (details.name || details.phone || `Restaurant ${id}`) : `Restaurant ${id}`} management page.
            </p>

            <div className="branchButtonContainer">
                <Link href="/yet-to-accept">
                    <button className="branchActionButton yetToAccept">
                        Yet To Accept
                    </button>
                </Link>

                <Link href="/accepted">
                    <button className="branchActionButton accepted">
                        Accepted
                    </button>
                </Link>

                <Link href="/rejected">
                    <button className="branchActionButton rejected">
                        Rejected
                    </button>
                </Link>

                <Link href="/payments">
                    <button className="branchActionButton payments">
                        Payments
                    </button>
                </Link>

                <Link href="/deliveryboy-details">
                    <button className="branchActionButton deliveryboy">
                        Delivery Boy Details
                    </button>
                </Link>

                <Link href="/items">
                    <button className="branchActionButton items">
                        Items
                    </button>
                </Link>

                <Link href="/offers">
                    <button className="branchActionButton offers" style={{ backgroundColor: '#f39c12', color: 'white' }}>
                        Offers
                    </button>
                </Link>

                <Link href={`/add-item-customer?restaurantId=${id}`}>
                    <button className="branchActionButton customerItem" style={{ backgroundColor: '#e67e22', color: 'white' }}>
                        Add Customer Item
                    </button>
                </Link>
            </div>

            {details && (
                <div className="branchDetailsCard">
                    <h3 className="detailsCardTitle">📋 Restaurant Profile</h3>
                    <div className="detailsGrid">
                        <div className="detailItem">
                            <span className="detailLabel">Restaurant ID</span>
                            <span className="detailValue">{details.restId}</span>
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Restaurant Name</span>
                            {isEditingName ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                    <input
                                        type="text"
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.95rem',
                                            color: '#1e293b',
                                            backgroundColor: '#ffffff',
                                            flex: 1,
                                            boxSizing: 'border-box'
                                        }}
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        disabled={updatingName}
                                    />
                                    <button 
                                        onClick={handleSaveName}
                                        disabled={updatingName}
                                        style={{
                                            backgroundColor: '#2ecc71',
                                            color: 'white',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {updatingName ? '...' : 'Save'}
                                    </button>
                                    <button 
                                        onClick={() => setIsEditingName(false)}
                                        disabled={updatingName}
                                        style={{
                                            backgroundColor: '#e74c3c',
                                            color: 'white',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                    <span className="detailValue">{details.name || 'N/A'}</span>
                                    <button 
                                        className="passwordToggleBtn" 
                                        onClick={() => {
                                            setEditName(details.name || '');
                                            setIsEditingName(true);
                                        }}
                                    >
                                        ✏️ Edit
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Offer Title</span>
                            <span className="detailValue">{details.offerTitle || 'N/A'}</span>
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Location Name</span>
                            <span className="detailValue">{details.restLocation}</span>
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Email Address</span>
                            <span className="detailValue">{details.email}</span>
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Phone Number</span>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <span className="detailValue">{details.phone}</span>
                                <a href={`tel:${details.phone}`} className="callActionButtonInline">📞 Call</a>
                            </div>
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Password</span>
                            <div className="passwordContainer">
                                <span className="detailValue">
                                    {showPassword ? details.password : '••••••••'}
                                </span>
                                <button 
                                    className="passwordToggleBtn" 
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">FSSAI License No</span>
                            <span className="detailValue">{details.fssai || 'N/A'}</span>
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Address</span>
                            <span className="detailValue">{details.address || 'N/A'}</span>
                            {details.address && details.address !== 'N/A' && (
                                <a 
                                    href={
                                        details.restaurantLocation && details.restaurantLocation.lat && details.restaurantLocation.lng
                                        ? `https://www.google.com/maps/search/?api=1&query=${details.restaurantLocation.lat},${details.restaurantLocation.lng}`
                                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.address)}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mapsActionButton"
                                >
                                    📍 Open in Maps
                                </a>
                            )}
                        </div>
                        <div className="detailItem">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="detailLabel">Open Time</span>
                                {!isEditingTimings && (
                                    <button 
                                        className="passwordToggleBtn"
                                        onClick={() => {
                                            setEditOpenTime(details.openTime || '09:00');
                                            setEditCloseTime(details.closeTime || '22:00');
                                            setIsEditingTimings(true);
                                        }}
                                    >
                                        ✏️ Edit
                                    </button>
                                )}
                            </div>
                            {isEditingTimings ? (
                                <input
                                    type="time"
                                    value={editOpenTime}
                                    onChange={(e) => setEditOpenTime(e.target.value)}
                                    disabled={updatingTimings}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.95rem',
                                        color: '#1e293b',
                                        backgroundColor: '#ffffff',
                                        width: '100%',
                                        marginTop: '4px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            ) : (
                                <span className="detailValue">{details.openTime || 'N/A'}</span>
                            )}
                        </div>
                        <div className="detailItem">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="detailLabel">Close Time</span>
                                {!isEditingTimings && (
                                    <button 
                                        className="passwordToggleBtn"
                                        onClick={() => {
                                            setEditOpenTime(details.openTime || '09:00');
                                            setEditCloseTime(details.closeTime || '22:00');
                                            setIsEditingTimings(true);
                                        }}
                                    >
                                        ✏️ Edit
                                    </button>
                                )}
                            </div>
                            {isEditingTimings ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                    <input
                                        type="time"
                                        value={editCloseTime}
                                        onChange={(e) => setEditCloseTime(e.target.value)}
                                        disabled={updatingTimings}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.95rem',
                                            color: '#1e293b',
                                            backgroundColor: '#ffffff',
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                        <button
                                            onClick={handleSaveTimings}
                                            disabled={updatingTimings}
                                            style={{
                                                backgroundColor: '#2ecc71',
                                                color: 'white',
                                                border: 'none',
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '0.8rem',
                                                flex: 1
                                            }}
                                        >
                                            {updatingTimings ? '...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={() => setIsEditingTimings(false)}
                                            disabled={updatingTimings}
                                            style={{
                                                backgroundColor: '#e74c3c',
                                                color: 'white',
                                                border: 'none',
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '0.8rem',
                                                flex: 1
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <span className="detailValue">{details.closeTime || 'N/A'}</span>
                            )}
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Active Status</span>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: '700',
                                    color: (details.isActive !== false) ? '#2ecc71' : '#e74c3c'
                                }}>
                                    {(details.isActive !== false) ? '● Active' : '○ Inactive'}
                                </span>
                                <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', flexShrink: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={details.isActive !== false}
                                        disabled={togglingActive}
                                        onChange={(e) => handleToggleActive(e.target.checked)}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        cursor: togglingActive ? 'not-allowed' : 'pointer',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundColor: (details.isActive !== false) ? '#2ecc71' : '#cbd5e1',
                                        transition: '.3s',
                                        borderRadius: '24px',
                                        opacity: togglingActive ? 0.6 : 1
                                    }}>
                                        <span style={{
                                            position: 'absolute',
                                            content: '""',
                                            height: '18px',
                                            width: '18px',
                                            left: (details.isActive !== false) ? '24px' : '4px',
                                            bottom: '3px',
                                            backgroundColor: 'white',
                                            transition: '.3s',
                                            borderRadius: '50%',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                        }} />
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <BranchStats restaurantId={id} onDetailsLoaded={setDetails} />
        </div>
    );
}
