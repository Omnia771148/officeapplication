'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BranchStats from '@/components/BranchStats';
import '@/components/BranchPage.css';
import '../dashboard/dashboard.css';

export default function RestaurantsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [details, setDetails] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(true);

    const colors = ['#4ECDC4', '#45B7D1', '#FF6B6B', '#FFA07A', '#98D8C8', '#FF9F43', '#A29BFE', '#FD79A8', '#FDCB6E', '#1dd1a1', '#ff6b6b', '#feca57', '#5f27cd', '#ff9ff3', '#48dbfb'];

    const fetchFromDb = async () => {
        setLoadingBranches(true);
        try {
            const res = await fetch('/api/restaurant-timings');
            const data = await res.json();
            if (data.success && data.restaurants) {
                const mappedBranches = data.restaurants.map((r, index) => {
                    const hardcodedPaths = {
                        '1': '/viva-findine',
                        '2': '/amigos',
                        '3': '/mister-hangouts',
                        '4': '/reddy-famliy-restaurent',
                        '5': '/aha-kitchens',
                        '6': '/bro-story',
                        '7': '/fun-and-food',
                        '8': '/pr-grand',
                        '9': '/food-land',
                        '10': '/talimpu',
                        '11': '/taj-darbar',
                        '12': '/ruchivedhika',
                        '13': '/hindustan',
                        '14': '/lassi',
                        '15': '/mandi9r'
                    };
                    const phoneName = r.name || r.phone;
                    const sanitizedName = phoneName ? phoneName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') : r.restId;
                    
                    return {
                        name: phoneName || `Restaurant ${r.restId}`,
                        collectionName: sanitizedName,
                        id: r.restId,
                        color: colors[index % colors.length],
                        path: hardcodedPaths[r.restId] || null
                    };
                });
                setBranches(mappedBranches);
                localStorage.setItem('registeredRestaurantsCache', JSON.stringify(mappedBranches));

                const storedId = localStorage.getItem('restaurantId');
                if (storedId) {
                    const found = mappedBranches.find(b => b.id === storedId);
                    if (found) {
                        setSelectedBranch(found);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load dynamic branches:", err);
        } finally {
            setLoadingBranches(false);
        }
    };

    useEffect(() => {
        const cachedData = localStorage.getItem('registeredRestaurantsCache');
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                setBranches(parsed);
                setLoadingBranches(false);
                
                const storedId = localStorage.getItem('restaurantId');
                if (storedId) {
                    const found = parsed.find(b => b.id === storedId);
                    if (found) {
                        setSelectedBranch(found);
                    }
                }
                return;
            } catch (cacheErr) {
                console.error("Error reading cache, reloading from DB:", cacheErr);
            }
        }
        fetchFromDb();
    }, []);

    const handleBranchClick = (branch) => {
        localStorage.setItem('restaurantId', branch.id);
        setSelectedBranch(branch);
        setDetails(null); // Reset details to trigger reload spinner
    };

    const filteredBranches = branches.filter((branch) =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="dashboardContainer" style={{ position: 'relative', paddingTop: '80px', paddingBottom: '80px', height: 'auto', minHeight: '100vh' }}>
            <div style={{ position: 'absolute', top: '25px', left: '25px' }}>
                <button 
                    onClick={() => router.push('/dashboard')} 
                    style={{
                        background: 'white',
                        border: '1px solid #dfe6e9',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        color: '#333',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        transition: 'transform 0.2s'
                    }}
                >
                    ← Back to Dashboard
                </button>
            </div>
            
            <div style={{ position: 'absolute', top: '25px', right: '25px' }}>
                <button 
                    onClick={() => router.push('/replace-restaurant-id')} 
                    style={{
                        background: '#e67e22',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        color: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s, background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#d35400'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#e67e22'}
                >
                    🔄 Replace Restaurant ID
                </button>
            </div>
            
            <h1 className="dashboardTitle">Select a Restaurant Branch</h1>

            <div className="searchContainer" style={{ display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'center' }}>
                <input
                    type="text"
                    placeholder="Search restaurant by name..."
                    className="searchInput"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ margin: 0 }}
                />
                <button
                    onClick={fetchFromDb}
                    style={{
                        background: '#3498db',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s, background-color 0.2s',
                        height: '46px',
                        whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
                >
                    🔄 Sync List
                </button>
            </div>
            
            <div className="buttonGrid">
                {loadingBranches ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666', padding: '20px', fontSize: '1.1rem' }}>
                        Loading branches...
                    </div>
                ) : filteredBranches.length > 0 ? (
                    filteredBranches.map((branch) => {
                        const isSelected = selectedBranch?.id === branch.id;
                        return (
                            <button
                                key={branch.id}
                                className="branchButton"
                                style={{ 
                                    '--btn-color': branch.color,
                                    border: isSelected ? '4px solid #2d3436' : 'none',
                                    transform: isSelected ? 'scale(1.05)' : 'none',
                                    boxShadow: isSelected ? '0 8px 16px rgba(0,0,0,0.25)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
                                    transition: 'all 0.2s ease-in-out'
                                }}
                                onClick={() => handleBranchClick(branch)}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span>{branch.name}</span>
                                    <span style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '5px', fontWeight: 'normal' }}>
                                        ID: {branch.id} {isSelected && '✓'}
                                    </span>
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666', padding: '20px', fontSize: '1.1rem' }}>
                        No branches found matching "{searchTerm}"
                    </div>
                )}
            </div>

            {/* Selected Branch Actions and Profile Section */}
            {selectedBranch && (
                <div 
                    className="selectedBranchContainer" 
                    style={{
                        marginTop: '50px',
                        padding: '30px',
                        backgroundColor: 'white',
                        borderRadius: '15px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                        width: '90%',
                        maxWidth: '850px',
                        border: '1px solid #eef2f3',
                        boxSizing: 'border-box'
                    }}
                >
                    <h2 className="branchTitle" style={{ color: selectedBranch.color, textAlign: 'center', marginBottom: '5px', fontSize: '2.2rem' }}>
                        {selectedBranch.name} Branch Operations
                    </h2>
                    <p className="branchSubtitle" style={{ textAlign: 'center', marginBottom: '30px' }}>
                        Manage orders, settings, and view profile for {selectedBranch.name}.
                    </p>

                    <div className="branchButtonContainer" style={{ marginBottom: '40px' }}>
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
                            <button className="branchActionButton deliveryboy" style={{ backgroundColor: '#9b59b6' }}>
                                Delivery Boy Details
                            </button>
                        </Link>

                        <Link href="/items">
                            <button className="branchActionButton items" style={{ backgroundColor: '#3498db' }}>
                                Items
                            </button>
                        </Link>

                        <Link href="/offers">
                            <button className="branchActionButton offers" style={{ backgroundColor: '#f39c12' }}>
                                Offers
                            </button>
                        </Link>

                        <Link href={`/restaurant-dashboard/${selectedBranch.id}`}>
                            <button className="branchActionButton dashboardRedirect" style={{ backgroundColor: '#34495e', minWidth: '220px' }}>
                                View Full Dashboard Page →
                            </button>
                        </Link>
                    </div>

                    {details && (
                        <div className="branchDetailsCard" style={{ marginTop: '20px', textBehavior: 'left' }}>
                            <h3 className="detailsCardTitle">📋 Restaurant Profile</h3>
                            {details.logoUrl && (
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                    <img 
                                        src={details.logoUrl} 
                                        alt={`${details.restLocation} Logo`} 
                                        style={{ 
                                            width: '120px', 
                                            height: '120px', 
                                            borderRadius: '50%', 
                                            objectFit: 'cover',
                                            border: '3px solid #f0f0f0',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.08)'
                                        }} 
                                    />
                                </div>
                            )}
                            <div className="detailsGrid">
                                <div className="detailItem">
                                    <span className="detailLabel">Restaurant ID</span>
                                    <span className="detailValue">{details.restId}</span>
                                </div>
                                <div className="detailItem">
                                    <span className="detailLabel">Restaurant Name</span>
                                    <span className="detailValue">{details.name || 'N/A'}</span>
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

                    <BranchStats restaurantId={selectedBranch.id} onDetailsLoaded={setDetails} />
                </div>
            )}
        </div>
    );
}
