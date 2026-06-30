'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import BranchStats from '@/components/BranchStats';
import '@/components/BranchPage.css';

export default function FunAndFoodPage() {
    const router = useRouter();
    const [details, setDetails] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="branchPageContainer">
            <div className="branchHeader">
                <button className="branchBackButton" onClick={() => router.back()}>← Back</button>
            </div>

            <h1 className="branchTitle" style={{ color: '#A29BFE' }}>
                {details ? (details.phone || details.name || 'Fun & Food') : 'Fun & Food'} Branch
            </h1>
            <p className="branchSubtitle">
                Welcome to the {details ? (details.phone || details.name || 'Fun & Food') : 'Fun & Food'} management page.
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

                <Link href={`/add-item-customer?restaurantId=${details ? details.restId : '7'}`}>
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

            <BranchStats restaurantId="7" onDetailsLoaded={setDetails} />
        </div>
    );
}
