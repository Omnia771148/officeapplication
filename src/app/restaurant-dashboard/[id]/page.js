'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BranchStats from '@/components/BranchStats';
import '@/components/BranchPage.css';

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

export default function RestaurantDashboardPage({ params }) {
    const router = useRouter();
    // Resolve params using React.use()
    const resolvedParams = use(params);
    const id = resolvedParams.id;
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

    // Restaurant name inline edit states
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState('');
    const [updatingName, setUpdatingName] = useState(false);

    const handleOpenEditModal = () => {
        setModalEditName(details?.name || '');
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
                formData.append('id', id);
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
                restId: id,
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
                    logoUrl: data.data.logoUrl || prev.logoUrl
                }));

                const cached = localStorage.getItem('registeredRestaurantsCache');
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        const updated = parsed.map(b => b.id === id ? { ...b, name: data.data.name } : b);
                        localStorage.setItem('registeredRestaurantsCache', JSON.stringify(updated));
                    } catch (e) {
                        console.error('Error updating cache:', e);
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

    // Offer title edit states
    const [isEditingOfferTitle, setIsEditingOfferTitle] = useState(false);
    const [editOfferTitle, setEditOfferTitle] = useState('');
    const [updatingOfferTitle, setUpdatingOfferTitle] = useState(false);

    // Packaging fee states
    const [isEditingPackagingFee, setIsEditingPackagingFee] = useState(false);
    const [editPackagingFee, setEditPackagingFee] = useState('');
    const [updatingPackagingFee, setUpdatingPackagingFee] = useState(false);
    const [togglingPackagingFee, setTogglingPackagingFee] = useState(false);

    // Rating edit states
    const [isEditingRating, setIsEditingRating] = useState(false);
    const [editRating, setEditRating] = useState('');
    const [updatingRating, setUpdatingRating] = useState(false);

    // Active status toggle state
    const [togglingActive, setTogglingActive] = useState(false);

    // Customer display toggle state
    const [togglingDisplayToCustomer, setTogglingDisplayToCustomer] = useState(false);

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

    const handleToggleDisplayToCustomer = async (nextStatus) => {
        setTogglingDisplayToCustomer(true);
        try {
            const res = await fetch('/api/restaurant-timings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restId: id,
                    todisplaytocustomer: nextStatus
                })
            });
            const data = await res.json();
            if (data.success) {
                setDetails(prev => ({
                    ...prev,
                    todisplaytocustomer: nextStatus
                }));
            } else {
                alert(data.error || 'Failed to update customer display status.');
            }
        } catch (err) {
            console.error("Error toggling customer display status:", err);
            alert("Server communication error.");
        } finally {
            setTogglingDisplayToCustomer(false);
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

        const handleTogglePackagingFee = async (nextStatus) => {
        setTogglingPackagingFee(true);
        try {
            const res = await fetch('/api/restaurant-timings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restId: id,
                    isPackagingFeeActive: nextStatus
                })
            });
            const data = await res.json();
            if (data.success) {
                setDetails(prev => ({
                    ...prev,
                    isPackagingFeeActive: nextStatus
                }));
            } else {
                alert(data.error || 'Failed to update packaging fee status.');
            }
        } catch (err) {
            console.error("Error toggling packaging fee status:", err);
            alert("Server communication error.");
        } finally {
            setTogglingPackagingFee(false);
        }
    };

    const handleSavePackagingFee = async () => {
        const parsedFee = parseFloat(editPackagingFee);
        if (isNaN(parsedFee) || parsedFee < 0) {
            alert('Please enter a valid packaging fee amount (0 or more)');
            return;
        }
        setUpdatingPackagingFee(true);
        try {
            const res = await fetch('/api/restaurant-timings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restId: id,
                    packagingFee: parsedFee
                })
            });
            const data = await res.json();
            if (data.success) {
                setDetails(prev => ({
                    ...prev,
                    packagingFee: parsedFee
                }));
                setIsEditingPackagingFee(false);
                alert('Packaging fee updated successfully!');
            } else {
                alert(data.error || 'Failed to update packaging fee.');
            }
        } catch (err) {
            console.error("Error updating packaging fee:", err);
            alert("Server communication error.");
        } finally {
            setUpdatingPackagingFee(false);
        }
    };

    const handleSaveRating = async () => {
        const parsedRating = parseFloat(editRating);
        if (isNaN(parsedRating) || parsedRating < 1.0 || parsedRating > 5.0) {
            alert('Please enter a valid rating between 1.0 and 5.0');
            return;
        }
        setUpdatingRating(true);
        try {
            const res = await fetch('/api/restaurant-timings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restId: id,
                    rating: parsedRating
                })
            });
            const data = await res.json();
            if (data.success) {
                setDetails(prev => ({
                    ...prev,
                    rating: parsedRating
                }));
                setIsEditingRating(false);
                alert('Restaurant rating updated successfully!');
            } else {
                alert(data.error || 'Failed to update restaurant rating.');
            }
        } catch (err) {
            console.error("Error updating rating:", err);
            alert("Server communication error.");
        } finally {
            setUpdatingRating(false);
        }
    };

    const handleSaveOfferTitle = async () => {
        setUpdatingOfferTitle(true);
        try {
            const trimmedTitle = editOfferTitle.trim();
            const res = await fetch('/api/restaurant-timings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restId: id,
                    offerTitle: trimmedTitle
                })
            });
            const data = await res.json();
            if (data.success) {
                setDetails(prev => ({
                    ...prev,
                    offerTitle: trimmedTitle
                }));
                setIsEditingOfferTitle(false);
                alert('Offer title updated successfully!');
            } else {
                alert(data.error || 'Failed to update offer title.');
            }
        } catch (err) {
            console.error("Error updating offer title:", err);
            alert("Server communication error.");
        } finally {
            setUpdatingOfferTitle(false);
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

                <button 
                    onClick={() => {
                        const currentStatus = details?.todisplaytocustomer !== false;
                        handleToggleDisplayToCustomer(!currentStatus);
                    }}
                    disabled={togglingDisplayToCustomer}
                    className="branchActionButton"
                    style={{ 
                        backgroundColor: (details?.todisplaytocustomer !== false) ? '#10b981' : '#ef4444', 
                        color: 'white',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: togglingDisplayToCustomer ? 'not-allowed' : 'pointer',
                        boxShadow: (details?.todisplaytocustomer !== false)
                            ? '0 4px 12px rgba(16, 185, 129, 0.35)'
                            : '0 4px 12px rgba(239, 68, 68, 0.35)',
                        transition: 'all 0.2s ease',
                        border: 'none',
                        minWidth: '220px'
                    }}
                    title="Click to toggle restaurant display to customers"
                >
                    <span style={{ fontSize: '1.15rem' }}>
                        {(details?.todisplaytocustomer !== false) ? '👁️' : '🙈'}
                    </span>
                    <span>
                        {togglingDisplayToCustomer 
                            ? 'Updating...' 
                            : ((details?.todisplaytocustomer !== false) ? 'Display to Customer: ON' : 'Display to Customer: OFF')}
                    </span>
                    <span style={{
                        display: 'inline-block',
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        opacity: (details?.todisplaytocustomer !== false) ? 1 : 0.6,
                        boxShadow: '0 0 6px rgba(255,255,255,0.8)'
                    }} />
                </button>

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
                        minWidth: '220px'
                    }}
                    title="Click to edit restaurant name and replace picture"
                >
                    <span style={{ fontSize: '1.15rem' }}>✏️</span>
                    <span>Edit Name & Picture</span>
                </button>
            </div>

            {details && (
                <div className="branchDetailsCard">
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

                    {/* Prominent Restaurant Logo / Picture with Replace Option */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px', position: 'relative' }}>
                        <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                            {details.logoUrl ? (
                                <img 
                                    src={details.logoUrl} 
                                    alt={`${details.name || 'Restaurant'} Logo`} 
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
                                    <span className="detailValue" style={{ fontWeight: '700' }}>{details.name || 'N/A'}</span>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button 
                                            className="passwordToggleBtn" 
                                            onClick={handleOpenEditModal}
                                            title="Edit name and picture"
                                        >
                                            ✏️ Edit
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Packaging Fee</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: details.isPackagingFeeActive ? '#10b981' : '#94a3b8'
                                        }}></span>
                                        <span style={{
                                            fontWeight: '700',
                                            fontSize: '0.95rem',
                                            color: details.isPackagingFeeActive ? '#059669' : '#64748b'
                                        }}>
                                            {details.isPackagingFeeActive ? `ON (₹${Number(details.packagingFee || 0).toFixed(2)})` : `OFF (₹${Number(details.packagingFee || 0).toFixed(2)})`}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            onClick={() => handleTogglePackagingFee(!details.isPackagingFeeActive)}
                                            disabled={togglingPackagingFee}
                                            style={{
                                                backgroundColor: details.isPackagingFeeActive ? '#ef4444' : '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            {togglingPackagingFee ? '...' : (details.isPackagingFeeActive ? 'Turn OFF' : 'Turn ON')}
                                        </button>
                                        {!isEditingPackagingFee && (
                                            <button 
                                                className="passwordToggleBtn" 
                                                onClick={() => {
                                                    setEditPackagingFee(String(details.packagingFee !== undefined && details.packagingFee !== null ? details.packagingFee : '0'));
                                                    setIsEditingPackagingFee(true);
                                                }}
                                            >
                                                ✏️ Edit
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isEditingPackagingFee && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            placeholder="Enter fee in ₹"
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.95rem',
                                                color: '#1e293b',
                                                backgroundColor: '#ffffff',
                                                width: '120px',
                                                boxSizing: 'border-box'
                                            }}
                                            value={editPackagingFee}
                                            onChange={(e) => setEditPackagingFee(e.target.value)}
                                            disabled={updatingPackagingFee}
                                        />
                                        <button 
                                            onClick={handleSavePackagingFee}
                                            disabled={updatingPackagingFee}
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
                                            {updatingPackagingFee ? '...' : 'Save'}
                                        </button>
                                        <button 
                                            onClick={() => setIsEditingPackagingFee(false)}
                                            disabled={updatingPackagingFee}
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
                                )}
                            </div>
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Restaurant Rating</span>
                            {isEditingRating ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="1.0"
                                        max="5.0"
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.95rem',
                                            color: '#1e293b',
                                            backgroundColor: '#ffffff',
                                            width: '100px',
                                            boxSizing: 'border-box'
                                        }}
                                        value={editRating}
                                        onChange={(e) => setEditRating(e.target.value)}
                                        disabled={updatingRating}
                                    />
                                    <button 
                                        onClick={handleSaveRating}
                                        disabled={updatingRating}
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
                                        {updatingRating ? '...' : 'Save'}
                                    </button>
                                    <button 
                                        onClick={() => setIsEditingRating(false)}
                                        disabled={updatingRating}
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
                                    <span className="detailValue" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: '#f59e0b' }}>
                                        ★ {details.rating !== undefined && details.rating !== null && details.rating !== '' ? Number(details.rating).toFixed(1) : '4.2'}
                                    </span>
                                    <button 
                                        className="passwordToggleBtn" 
                                        onClick={() => {
                                            setEditRating(String(details.rating !== undefined && details.rating !== null && details.rating !== '' ? details.rating : '4.2'));
                                            setIsEditingRating(true);
                                        }}
                                    >
                                        ✏️ Edit
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Offer Title</span>
                            {isEditingOfferTitle ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            style={{
                                                padding: '6px 28px 6px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.95rem',
                                                color: '#1e293b',
                                                backgroundColor: '#ffffff',
                                                width: '100%',
                                                boxSizing: 'border-box'
                                            }}
                                            value={editOfferTitle}
                                            onChange={(e) => setEditOfferTitle(e.target.value)}
                                            placeholder="Enter offer title (or empty to clear)"
                                            disabled={updatingOfferTitle}
                                        />
                                        {editOfferTitle && (
                                            <button
                                                type="button"
                                                onClick={() => setEditOfferTitle('')}
                                                disabled={updatingOfferTitle}
                                                style={{
                                                    position: 'absolute',
                                                    right: '6px',
                                                    background: '#e2e8f0',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '18px',
                                                    height: '18px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    fontSize: '10px',
                                                    color: '#64748b',
                                                    padding: 0
                                                }}
                                                title="Clear offer title"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    <button 
                                        onClick={handleSaveOfferTitle}
                                        disabled={updatingOfferTitle}
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
                                        {updatingOfferTitle ? '...' : 'Save'}
                                    </button>
                                    <button 
                                        onClick={() => setIsEditingOfferTitle(false)}
                                        disabled={updatingOfferTitle}
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
                                    <span className="detailValue">{details.offerTitle || 'N/A'}</span>
                                    <button 
                                        className="passwordToggleBtn" 
                                        onClick={() => {
                                            setEditOfferTitle(details.offerTitle || '');
                                            setIsEditingOfferTitle(true);
                                        }}
                                    >
                                        ✏️ Edit
                                    </button>
                                </div>
                            )}
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
                        <div className="detailItem">
                            <span className="detailLabel">Display to Customer</span>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: '700',
                                    color: (details.todisplaytocustomer !== false) ? '#2ecc71' : '#e74c3c'
                                }}>
                                    {(details.todisplaytocustomer !== false) ? '● Displayed' : '○ Hidden'}
                                </span>
                                <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', flexShrink: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={details.todisplaytocustomer !== false}
                                        disabled={togglingDisplayToCustomer}
                                        onChange={(e) => handleToggleDisplayToCustomer(e.target.checked)}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        cursor: togglingDisplayToCustomer ? 'not-allowed' : 'pointer',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundColor: (details.todisplaytocustomer !== false) ? '#2ecc71' : '#cbd5e1',
                                        transition: '.3s',
                                        borderRadius: '24px',
                                        opacity: togglingDisplayToCustomer ? 0.6 : 1
                                    }}>
                                        <span style={{
                                            position: 'absolute',
                                            content: '""',
                                            height: '18px',
                                            width: '18px',
                                            left: (details.todisplaytocustomer !== false) ? '24px' : '4px',
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
