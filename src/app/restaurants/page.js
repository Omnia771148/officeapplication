'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BranchStats from '@/components/BranchStats';
import '@/components/BranchPage.css';
import '../dashboard/dashboard.css';

// Utility to compress and resize image to target size in KB using HTML5 Canvas
const compressImage = (file, targetSizeKb = 65) => {
    if (!file || !file.type.startsWith("image/")) {
        return Promise.resolve(file);
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                const MAX_DIM = 800;
                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width > height) {
                        height = Math.round((height * MAX_DIM) / width);
                        width = MAX_DIM;
                    } else {
                        width = Math.round((width * MAX_DIM) / height);
                        height = MAX_DIM;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.8;
                const checkQualityAndResolve = () => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                resolve(file);
                            }
                            const blobSizeKb = blob.size / 1024;
                            if (blobSizeKb > targetSizeKb && quality > 0.15) {
                                quality -= 0.1;
                                checkQualityAndResolve();
                            } else {
                                const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                                const compressedFile = new File([blob], `${baseName}.jpg`, {
                                    type: "image/jpeg",
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            }
                        },
                        "image/jpeg",
                        quality
                    );
                };

                checkQualityAndResolve();
            };
        };
        reader.onerror = () => resolve(file);
    });
};

export default function RestaurantsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [details, setDetails] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    // Restaurant profile edit modal states (Name & Picture)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [modalEditName, setModalEditName] = useState('');
    const [selectedPictureFile, setSelectedPictureFile] = useState(null);
    const [picturePreviewUrl, setPicturePreviewUrl] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileStatusText, setProfileStatusText] = useState('');
    const [profileError, setProfileError] = useState('');

    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(true);

    const colors = ['#4ECDC4', '#45B7D1', '#FF6B6B', '#FFA07A', '#98D8C8', '#FF9F43', '#A29BFE', '#FD79A8', '#FDCB6E', '#1dd1a1', '#ff6b6b', '#feca57', '#5f27cd', '#ff9ff3', '#48dbfb'];

    const handleOpenEditModal = () => {
        setModalEditName(details?.name || selectedBranch?.name || '');
        setSelectedPictureFile(null);
        if (picturePreviewUrl) {
            URL.revokeObjectURL(picturePreviewUrl);
        }
        setPicturePreviewUrl(null);
        setProfileError('');
        setProfileStatusText('');
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        if (savingProfile) return;
        setIsEditModalOpen(false);
        if (picturePreviewUrl) {
            URL.revokeObjectURL(picturePreviewUrl);
        }
        setSelectedPictureFile(null);
        setPicturePreviewUrl(null);
        setProfileError('');
        setProfileStatusText('');
    };

    const handlePictureChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setProfileError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
                return;
            }
            setSelectedPictureFile(file);
            setProfileError('');
            if (picturePreviewUrl) {
                URL.revokeObjectURL(picturePreviewUrl);
            }
            const preview = URL.createObjectURL(file);
            setPicturePreviewUrl(preview);
        }
    };

    const handleClearSelectedPicture = () => {
        if (picturePreviewUrl) {
            URL.revokeObjectURL(picturePreviewUrl);
        }
        setSelectedPictureFile(null);
        setPicturePreviewUrl(null);
    };

    const handleSaveRestaurantProfile = async (e) => {
        if (e) e.preventDefault();
        const trimmedName = modalEditName.trim();
        if (!trimmedName) {
            setProfileError('Restaurant name cannot be empty.');
            return;
        }

        const restId = selectedBranch?.id || details?.restId;
        if (!restId) {
            setProfileError('Restaurant ID missing.');
            return;
        }

        setSavingProfile(true);
        setProfileError('');

        try {
            let uploadedLogoUrl = null;

            if (selectedPictureFile) {
                setProfileStatusText('Compressing photo to ~65KB...');
                const compressed = await compressImage(selectedPictureFile, 65);

                setProfileStatusText('Uploading picture to S3...');
                const formData = new FormData();
                formData.append('file', compressed);
                formData.append('id', restId);
                formData.append('folder', 'restaurants');

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok || !uploadData.url) {
                    throw new Error(uploadData.error || 'Failed to upload photo to S3.');
                }
                uploadedLogoUrl = uploadData.url;
            }

            setProfileStatusText('Saving restaurant details...');
            const payload = {
                restId: restId,
                newName: trimmedName
            };
            if (uploadedLogoUrl) {
                payload.logoUrl = uploadedLogoUrl;
            }

            const res = await fetch('/api/restaurant-register', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                setDetails(prev => ({
                    ...prev,
                    name: data.data.name,
                    phone: data.data.phone,
                    logoUrl: data.data.logoUrl || prev?.logoUrl
                }));

                setSelectedBranch(prev => prev ? ({
                    ...prev,
                    name: data.data.name
                }) : null);

                setBranches(prev => prev.map(b => b.id === restId ? { ...b, name: data.data.name } : b));

                const cached = localStorage.getItem('registeredRestaurantsCache');
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        const updated = parsed.map(b => b.id === restId ? { ...b, name: data.data.name } : b);
                        localStorage.setItem('registeredRestaurantsCache', JSON.stringify(updated));
                    } catch (err) {
                        console.error('Error updating cache:', err);
                    }
                }

                setIsEditModalOpen(false);
                handleClearSelectedPicture();
                alert('Restaurant name and picture updated successfully!');
            } else {
                setProfileError(data.error || 'Failed to update restaurant profile.');
            }
        } catch (err) {
            console.error('Error updating restaurant profile:', err);
            setProfileError(err.message || 'Server communication error.');
        } finally {
            setSavingProfile(false);
            setProfileStatusText('');
        }
    };

    const fetchFromDb = async () => {
        setLoadingBranches(true);
        try {
            const res = await fetch('/api/restaurant-timings');
            const data = await res.json();
            if (data.success && data.restaurants) {
                const mappedBranches = data.restaurants.map((r, index) => {
                    const phoneName = r.name || r.phone;
                    const sanitizedName = phoneName ? phoneName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') : r.restId;
                    
                    return {
                        name: phoneName || `Restaurant ${r.restId}`,
                        collectionName: sanitizedName,
                        id: r.restId,
                        color: colors[index % colors.length]
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

                        <button 
                            onClick={handleOpenEditModal}
                            className="branchActionButton"
                            style={{ 
                                backgroundColor: '#8e44ad', 
                                color: 'white',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(142, 68, 173, 0.35)',
                                transition: 'all 0.2s ease',
                                border: 'none',
                                minWidth: '200px'
                            }}
                            title="Click to edit restaurant name and replace picture"
                        >
                            <span style={{ fontSize: '1.15rem' }}>✏️</span>
                            <span>Edit Restaurant</span>
                        </button>
                    </div>

                    {details && (
                        <div className="branchDetailsCard" style={{ marginTop: '20px', textBehavior: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                                <h3 className="detailsCardTitle" style={{ margin: 0 }}>📋 Restaurant Profile</h3>
                                <button
                                    onClick={handleOpenEditModal}
                                    style={{
                                        backgroundColor: '#8e44ad',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 8px rgba(142, 68, 173, 0.25)',
                                        transition: 'all 0.2s'
                                    }}
                                    title="Edit restaurant name and replace picture"
                                >
                                    ✏️ Edit Restaurant
                                </button>
                            </div>

                            {/* Restaurant Picture / Logo with Replace trigger */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px', position: 'relative' }}>
                                <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                                    {details.logoUrl ? (
                                        <img 
                                            src={details.logoUrl} 
                                            alt={`${details.name || selectedBranch.name} Logo`} 
                                            style={{ 
                                                width: '130px', 
                                                height: '130px', 
                                                borderRadius: '50%', 
                                                objectFit: 'cover',
                                                border: '4px solid #8e44ad',
                                                boxShadow: '0 6px 16px rgba(0,0,0,0.12)'
                                            }} 
                                        />
                                    ) : (
                                        <div style={{
                                            width: '130px',
                                            height: '130px',
                                            borderRadius: '50%',
                                            backgroundColor: '#f1f5f9',
                                            border: '3px dashed #94a3b8',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#64748b'
                                        }}>
                                            <span style={{ fontSize: '40px' }}>🍽️</span>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>No Picture</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleOpenEditModal}
                                        title="Click to replace or upload restaurant picture"
                                        style={{
                                            position: 'absolute',
                                            bottom: '2px',
                                            right: '2px',
                                            backgroundColor: '#8e44ad',
                                            color: 'white',
                                            border: '3px solid white',
                                            borderRadius: '50%',
                                            width: '38px',
                                            height: '38px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.25)',
                                            fontSize: '15px',
                                            transition: 'transform 0.2s'
                                        }}
                                    >
                                        📷
                                    </button>
                                </div>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px', fontWeight: '500' }}>
                                    {details.logoUrl ? 'Click 📷 or "Edit Restaurant" to replace picture' : 'Click 📷 or "Edit Restaurant" to upload picture'}
                                </span>
                            </div>

                            <div className="detailsGrid">
                                <div className="detailItem">
                                    <span className="detailLabel">Restaurant ID</span>
                                    <span className="detailValue">{details.restId}</span>
                                </div>
                                <div className="detailItem">
                                    <span className="detailLabel">Restaurant Name</span>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                        <span className="detailValue" style={{ fontWeight: '700' }}>{details.name || 'N/A'}</span>
                                        <button 
                                            className="passwordToggleBtn" 
                                            onClick={handleOpenEditModal}
                                            title="Edit name and picture"
                                        >
                                            ✏️ Edit
                                        </button>
                                    </div>
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
                                <div className="detailItem">
                                    <span className="detailLabel">Commission (%)</span>
                                    <span className="detailValue">{details.commission !== undefined && details.commission !== null ? `${details.commission}%` : '0%'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <BranchStats restaurantId={selectedBranch.id} onDetailsLoaded={setDetails} />
                </div>
            )}

            {/* Edit Restaurant Name & Picture Modal */}
            {isEditModalOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                        padding: '16px',
                        boxSizing: 'border-box'
                    }}
                    onClick={handleCloseEditModal}
                >
                    <div 
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            maxWidth: '540px',
                            width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                            maxHeight: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxSizing: 'border-box',
                            textAlign: 'left'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '18px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>✏️</span> Edit Restaurant Details
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                                    Update restaurant name and replace profile picture
                                </p>
                            </div>
                            <button
                                onClick={handleCloseEditModal}
                                disabled={savingProfile}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.4rem',
                                    color: '#64748b',
                                    cursor: savingProfile ? 'not-allowed' : 'pointer',
                                    padding: '4px 8px',
                                    lineHeight: 1
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveRestaurantProfile} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {profileError && (
                                <div style={{
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #f87171',
                                    color: '#b91c1c',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    fontWeight: '500'
                                }}>
                                    ⚠️ {profileError}
                                </div>
                            )}

                            {profileStatusText && (
                                <div style={{
                                    backgroundColor: '#eff6ff',
                                    border: '1px solid #93c5fd',
                                    color: '#1d4ed8',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>⏳</span> {profileStatusText}
                                </div>
                            )}

                            {/* Restaurant Name Field */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                                    Restaurant Name *
                                </label>
                                <input
                                    type="text"
                                    value={modalEditName}
                                    onChange={(e) => setModalEditName(e.target.value)}
                                    placeholder="Enter restaurant name"
                                    disabled={savingProfile}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '1rem',
                                        color: '#1e293b',
                                        backgroundColor: '#ffffff',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                />
                                <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                    Changing name updates the restaurant brand and internal collection.
                                </span>
                            </div>

                            {/* Restaurant Picture Field */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                                    Restaurant Picture (Logo)
                                </label>

                                <div style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    backgroundColor: '#f8fafc',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px'
                                }}>
                                    {/* Previews Comparison */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                        {/* Current Picture */}
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{
                                                width: '90px',
                                                height: '90px',
                                                borderRadius: '50%',
                                                overflow: 'hidden',
                                                border: '2px solid #cbd5e1',
                                                margin: '0 auto',
                                                backgroundColor: '#ffffff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {details?.logoUrl ? (
                                                    <img
                                                        src={details.logoUrl}
                                                        alt="Current Logo"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <span style={{ fontSize: '28px' }}>🍽️</span>
                                                )}
                                            </div>
                                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '6px', fontWeight: '600' }}>
                                                Current Picture
                                            </span>
                                        </div>

                                        {/* Arrow indicator when new picture is selected */}
                                        {picturePreviewUrl && (
                                            <>
                                                <div style={{ fontSize: '1.5rem', color: '#8e44ad', fontWeight: 'bold' }}>
                                                    ➔
                                                </div>

                                                {/* New Selected Picture */}
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{
                                                        width: '90px',
                                                        height: '90px',
                                                        borderRadius: '50%',
                                                        overflow: 'hidden',
                                                        border: '3px solid #10b981',
                                                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
                                                        margin: '0 auto',
                                                        backgroundColor: '#ffffff'
                                                    }}>
                                                        <img
                                                            src={picturePreviewUrl}
                                                            alt="New Selected Logo"
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#059669', marginTop: '6px', fontWeight: '700' }}>
                                                        ✓ New (Replaces Old)
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Upload Controls */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <label style={{
                                            backgroundColor: '#8e44ad',
                                            color: 'white',
                                            padding: '8px 18px',
                                            borderRadius: '8px',
                                            cursor: savingProfile ? 'not-allowed' : 'pointer',
                                            fontWeight: '600',
                                            fontSize: '0.9rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 2px 6px rgba(142, 68, 173, 0.3)',
                                            transition: 'background-color 0.2s'
                                        }}>
                                            <span>📷</span>
                                            <span>{selectedPictureFile ? 'Change Selected Picture' : (details?.logoUrl ? 'Choose Picture to Replace' : 'Upload Restaurant Picture')}</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePictureChange}
                                                disabled={savingProfile}
                                                style={{ display: 'none' }}
                                            />
                                        </label>

                                        {selectedPictureFile && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: '600' }}>
                                                    📁 {selectedPictureFile.name} ({(selectedPictureFile.size / 1024).toFixed(1)} KB)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleClearSelectedPicture}
                                                    disabled={savingProfile}
                                                    style={{
                                                        backgroundColor: '#fee2e2',
                                                        color: '#dc2626',
                                                        border: 'none',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    ✕ Cancel New Picture
                                                </button>
                                            </div>
                                        )}

                                        <span style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                                            The new picture will be automatically compressed (~65KB) and replace the existing one in database and S3 storage.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Buttons */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '10px',
                                paddingTop: '16px',
                                borderTop: '1px solid #e2e8f0'
                            }}>
                                <button
                                    type="button"
                                    onClick={handleCloseEditModal}
                                    disabled={savingProfile}
                                    style={{
                                        backgroundColor: '#e2e8f0',
                                        color: '#334155',
                                        border: 'none',
                                        padding: '10px 18px',
                                        borderRadius: '8px',
                                        cursor: savingProfile ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    style={{
                                        backgroundColor: '#8e44ad',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 24px',
                                        borderRadius: '8px',
                                        cursor: savingProfile ? 'not-allowed' : 'pointer',
                                        fontWeight: '700',
                                        fontSize: '0.9rem',
                                        boxShadow: '0 4px 10px rgba(142, 68, 173, 0.35)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {savingProfile ? (
                                        <>
                                            <span>⏳</span>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>💾</span>
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
