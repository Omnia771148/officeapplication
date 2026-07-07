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
                            <span className="detailLabel">Open Time</span>
                            <span className="detailValue">{details.openTime || 'N/A'}</span>
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Close Time</span>
                            <span className="detailValue">{details.closeTime || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            )}

            <BranchStats restaurantId={id} onDetailsLoaded={setDetails} />
        </div>
    );
}
