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

    const branches = [
        { name: 'Viva Findine', path: '/viva-findine', color: '#4ECDC4', id: '1' },
        { name: 'Amigos', path: '/amigos', color: '#45B7D1', id: '2' },
        { name: 'Mister Hangouts', path: '/mister-hangouts', color: '#FF6B6B', id: '3' },
        { name: 'Reddy Famliy Restaurent', path: '/reddy-famliy-restaurent', color: '#FFA07A', id: '4' },
        { name: 'Aha Kitchens', path: '/aha-kitchens', color: '#98D8C8', id: '5' },
        { name: 'Bro Story', path: '/bro-story', color: '#FF9F43', id: '6' },
        { name: 'Fun & Food', path: '/fun-and-food', color: '#A29BFE', id: '7' },
        { name: 'PR Grand', path: '/pr-grand', color: '#FD79A8', id: '8' },
        { name: 'Food Land', path: '/food-land', color: '#FDCB6E', id: '9' },
        { name: 'Talimpu', path: '/talimpu', color: '#1dd1a1', id: '10' },
        { name: 'Taj Darbar', path: '/taj-darbar', color: '#ff6b6b', id: '11' },
        { name: 'Ruchi Vedhika', path: '/ruchivedhika', color: '#feca57', id: '12' },
        { name: 'Hindustan', path: '/hindustan', color: '#5f27cd', id: '13' },
        { name: 'Lassi', path: '/lassi', color: '#ff9ff3', id: '14' },
        { name: 'Mandi 9R', path: '/mandi9r', color: '#48dbfb', id: '15' },
    ];

    // Load active restaurant from localStorage on page load if one was selected
    useEffect(() => {
        const storedId = localStorage.getItem('restaurantId');
        if (storedId) {
            const foundBranch = branches.find(b => b.id === storedId);
            if (foundBranch) {
                setSelectedBranch(foundBranch);
            }
        }
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

            <div className="searchContainer">
                <input
                    type="text"
                    placeholder="Search restaurant by name..."
                    className="searchInput"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="buttonGrid">
                {filteredBranches.length > 0 ? (
                    filteredBranches.map((branch) => {
                        const isSelected = selectedBranch?.id === branch.id;
                        return (
                            <button
                                key={branch.name}
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

                        <Link href={selectedBranch.path}>
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
