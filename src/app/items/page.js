'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Utility to compress and resize image to target size in KB using HTML5 Canvas
const compressImage = (file, targetSizeKb = 70) => {
  if (!file || !file.type || !file.type.startsWith("image/")) {
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
                return;
              }
              const blobSizeKb = blob.size / 1024;
              if (blobSizeKb > targetSizeKb && quality > 0.2) {
                quality -= 0.15;
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
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function BranchItemsPage() {
    const router = useRouter();
    const [restaurantId, setRestaurantId] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [togglingId, setTogglingId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [deletingAll, setDeletingAll] = useState(false);

    // Editing States
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editVegOrNonVeg, setEditVegOrNonVeg] = useState('Both');
    const [editRating, setEditRating] = useState('0');
    const [editPhotoUrl, setEditPhotoUrl] = useState('');
    const [editPhotoFile, setEditPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [savingId, setSavingId] = useState(null);

    const startEditing = (item) => {
        setEditingId(item._id);
        setEditName(item.itemName || '');
        setEditPrice(item.price !== undefined && item.price !== null ? item.price.toString() : '0');
        setEditVegOrNonVeg(item.vegOrNonVeg || 'Both');
        setEditRating(item.rating !== undefined && item.rating !== null ? item.rating.toString() : '0');
        setEditPhotoUrl(item.photoUrl || '');
        setEditPhotoFile(null);
        setPhotoPreview(item.photoUrl || '');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName('');
        setEditPrice('');
        setEditVegOrNonVeg('Both');
        setEditRating('0');
        setEditPhotoUrl('');
        setEditPhotoFile(null);
        setPhotoPreview('');
        setUploadingImage(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            setEditPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveEdit = async (itemId) => {
        if (!editName.trim()) {
            alert('Item name cannot be empty');
            return;
        }
        const parsedPrice = Number(editPrice);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            alert('Price must be a valid non-negative number');
            return;
        }
        const parsedRating = Number(editRating);
        if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
            alert('Rating must be a number between 0 and 5');
            return;
        }

        setSavingId(itemId);
        let finalPhotoUrl = editPhotoUrl;

        try {
            if (editPhotoFile) {
                setUploadingImage(true);
                const compressed = await compressImage(editPhotoFile, 70);
                const formData = new FormData();
                formData.append('file', compressed);
                formData.append('id', restaurantId || itemId);
                formData.append('folder', 'items');

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success && uploadData.url) {
                    finalPhotoUrl = uploadData.url;
                } else {
                    alert(uploadData.error || 'Failed to upload image. Item update aborted.');
                    setSavingId(null);
                    setUploadingImage(false);
                    return;
                }
                setUploadingImage(false);
            }

            const res = await fetch('/api/item-status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    itemId, 
                    itemName: editName.trim(), 
                    price: parsedPrice,
                    vegOrNonVeg: editVegOrNonVeg,
                    rating: parsedRating,
                    photoUrl: finalPhotoUrl,
                    restaurantId
                })
            });
            const data = await res.json();
            if (data.success) {
                setItems(prevItems =>
                    prevItems.map(item =>
                        item._id === itemId ? { ...item, ...data.data } : item
                    )
                );
                cancelEditing();
            } else {
                alert(data.error || 'Failed to update item.');
            }
        } catch (err) {
            console.error("Save edit error:", err);
            alert('Server communication error.');
        } finally {
            setSavingId(null);
            setUploadingImage(false);
        }
    };

    useEffect(() => {
        const storedId = localStorage.getItem('restaurantId');
        setRestaurantId(storedId);

        if (!storedId) {
            setLoading(false);
            return;
        }

        const fetchItems = async () => {
            try {
                const res = await fetch(`/api/item-status?restaurantId=${storedId}`);
                const data = await res.json();
                if (data.success) {
                    setItems(data.data);
                } else {
                    setErrorMessage(data.error || 'Failed to fetch items');
                }
            } catch (err) {
                setErrorMessage('Error connecting to server.');
            } finally {
                setLoading(false);
            }
        };

        fetchItems();
    }, []);

    const handleToggleProperty = async (itemId, propertyName, currentStatus) => {
        setTogglingId(itemId);
        try {
            const nextStatus = !currentStatus;
            const res = await fetch('/api/item-status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    itemId, 
                    [propertyName]: nextStatus,
                    restaurantId
                })
            });
            const data = await res.json();
            if (data.success) {
                setItems(prevItems =>
                    prevItems.map(item =>
                        item._id === itemId ? { ...item, ...data.data } : item
                    )
                );
            } else {
                alert(data.error || 'Failed to update item setting.');
            }
        } catch (err) {
            alert('Server communication error.');
        } finally {
            setTogglingId(null);
        }
    };

    const handleDeleteItem = async (itemId, itemName) => {
        if (!confirm(`Are you sure you want to delete "${itemName}"?`)) {
            return;
        }

        setDeletingId(itemId);
        try {
            const res = await fetch(`/api/item-status?itemId=${itemId}&restaurantId=${restaurantId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setItems(prevItems => prevItems.filter(item => item._id !== itemId));
            } else {
                alert(data.error || 'Failed to delete item.');
            }
        } catch (err) {
            alert('Server communication error.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteAllItems = async () => {
        if (!restaurantId) return;

        const confirmation1 = confirm('WARNING: Are you sure you want to delete ALL items for this restaurant branch? This action cannot be undone.');
        if (!confirmation1) return;

        const confirmation2 = confirm('Please confirm once more: Do you really want to delete ALL menu items?');
        if (!confirmation2) return;

        setDeletingAll(true);
        try {
            const res = await fetch(`/api/item-status?restaurantId=${restaurantId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setItems([]);
                alert('All items deleted successfully.');
            } else {
                alert(data.error || 'Failed to delete all items.');
            }
        } catch (err) {
            alert('Server communication error.');
        } finally {
            setDeletingAll(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="loadingContainer">
                <style>{`
                    .loadingContainer {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        background: #f8f9fa;
                        font-family: 'Inter', -apple-system, sans-serif;
                    }
                    .spinner {
                        border: 4px solid rgba(46, 204, 113, 0.1);
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        border-left-color: #2ecc71;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
                <div className="spinner"></div>
                <h3 style={{ color: '#555', fontWeight: '500' }}>Loading items availability...</h3>
            </div>
        );
    }

    if (!restaurantId) {
        return (
            <div className="errorContainer">
                <style>{`
                    .errorContainer {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        background: #f8f9fa;
                        font-family: 'Inter', -apple-system, sans-serif;
                        padding: 20px;
                        text-align: center;
                    }
                    .errorCard {
                        background: white;
                        border-radius: 12px;
                        padding: 30px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                        max-width: 400px;
                        border: 1px solid #ffebeb;
                    }
                    .btnBack {
                        background: #2ecc71;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        margin-top: 20px;
                        transition: background-color 0.2s;
                    }
                    .btnBack:hover {
                        background-color: #27ae60;
                    }
                `}</style>
                <div className="errorCard">
                    <h2 style={{ color: '#e74c3c', marginBottom: '10px' }}>No Branch Selected</h2>
                    <p style={{ color: '#666' }}>Please select a restaurant branch from the dashboard first.</p>
                    <button className="btnBack" onClick={() => router.push('/dashboard')}>
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="itemsPageContainer">
            <style>{`
                .itemsPageContainer {
                    padding: 40px;
                    background-color: #f8f9fa;
                    min-height: 100vh;
                    font-family: 'Inter', -apple-system, sans-serif;
                }
                .itemsHeader {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    max-width: 1100px;
                    margin: 0 auto 30px auto;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                .btnBackHeader {
                    background: #fff;
                    border: 1px solid #dfe6e9;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    color: #2d3436;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    transition: all 0.2s;
                }
                .btnBackHeader:hover {
                    background: #f1f2f6;
                    transform: translateX(-2px);
                }
                .btnAddItem {
                    background: #2ecc71;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 700;
                    box-shadow: 0 4px 6px rgba(46, 204, 113, 0.2);
                    transition: all 0.2s;
                    text-decoration: none;
                }
                .btnAddItem:hover {
                    background-color: #27ae60;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 12px rgba(46, 204, 113, 0.3);
                }
                .btnDeleteAll {
                    background: #e74c3c;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 700;
                    box-shadow: 0 4px 6px rgba(231, 76, 60, 0.2);
                    transition: all 0.2s;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .btnDeleteAll:hover:not(:disabled) {
                    background-color: #c0392b;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 12px rgba(231, 76, 60, 0.3);
                }
                .btnDeleteAll:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .itemsTitle {
                    text-align: center;
                    font-size: 2.5rem;
                    color: #2d3748;
                    font-weight: 800;
                    margin-bottom: 5px;
                }
                .itemsSubtitle {
                    text-align: center;
                    color: #64748b;
                    font-size: 1.1rem;
                    margin-bottom: 40px;
                }
                .searchAndFilter {
                    max-width: 1100px;
                    margin: 0 auto 30px auto;
                    display: flex;
                    gap: 15px;
                }
                .searchInputField {
                    flex: 1;
                    padding: 14px 20px;
                    border-radius: 10px;
                    border: 1.5px solid #e2e8f0;
                    background: white;
                    color: black !important;
                    font-size: 1rem;
                    outline: none;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                }
                .searchInputField::placeholder {
                    color: #888888 !important;
                }
                .searchInputField:focus {
                    border-color: #2ecc71;
                    box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.15);
                }
                .itemsGrid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 25px;
                    max-width: 1100px;
                    margin: 0 auto;
                }
                .itemCard {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.02);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    transition: transform 0.2s, box-shadow 0.2s;
                    position: relative;
                }
                .itemCard:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.05);
                }
                .itemName {
                    font-size: 1.3rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 8px;
                    word-wrap: break-word;
                }
                .itemPrice {
                    font-size: 1.1rem;
                    color: #27ae60;
                    font-weight: 700;
                    margin-bottom: 20px;
                }
                .itemControlArea {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    border-top: 1px solid #f1f5f9;
                    padding-top: 15px;
                    margin-top: auto;
                }
                .toggleLabelContainer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                }
                .toggleLabelText {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #475569;
                    line-height: 1.3;
                }
                .indicatorText {
                    font-size: 0.85rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .indicatorText.active {
                    color: #2ecc71;
                }
                .indicatorText.inactive {
                    color: #e74c3c;
                }
                
                /* Styled Switch Toggle */
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 26px;
                    flex-shrink: 0;
                }
                .switch input { 
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e1;
                    transition: .4s;
                    border-radius: 34px;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
                }
                input:checked + .slider {
                    background-color: #2ecc71;
                }
                input:checked + .slider:before {
                    transform: translateX(24px);
                }
                .disabledSlider {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .noItemsText {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 50px;
                    background: white;
                    border-radius: 12px;
                    border: 2px dashed #cbd5e1;
                    color: #64748b;
                }
                
                /* Editing UI styles */
                .editFieldsContainer {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 20px;
                    animation: fadeIn 0.2s ease-in-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .editFieldGroup {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .editFieldLabel {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .editInputField {
                    padding: 10px 14px;
                    border-radius: 8px;
                    border: 1.5px solid #cbd5e1;
                    font-size: 1rem;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    color: #1e293b !important;
                    background-color: #f8fafc;
                }
                .editInputField:focus {
                    border-color: #2ecc71;
                    box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.1);
                    background-color: #ffffff;
                }
                .editActions {
                    display: flex;
                    gap: 10px;
                    margin-top: 15px;
                }
                .btnSave {
                    flex: 1;
                    background: #2ecc71;
                    color: white;
                    border: none;
                    padding: 10px;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 5px;
                }
                .btnSave:hover:not(:disabled) {
                    background-color: #27ae60;
                }
                .btnSave:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .btnCancel {
                    flex: 1;
                    background: #f1f5f9;
                    color: #64748b;
                    border: 1px solid #e2e8f0;
                    padding: 10px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btnCancel:hover:not(:disabled) {
                    background-color: #cbd5e1;
                    color: #334155;
                }
                .btnCancel:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .btnEditCard {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 6px 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .btnEditCard:hover {
                    background: #f1f5f9;
                    color: #1e293b;
                    border-color: #cbd5e1;
                }
                .btnDeleteCard {
                    background: #fff5f5;
                    border: 1px solid #fed7d7;
                    border-radius: 6px;
                    padding: 6px 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #e53e3e;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .btnDeleteCard:hover:not(:disabled) {
                    background: #fed7d7;
                    color: #c53030;
                    border-color: #feb2b2;
                }
                .btnDeleteCard:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                @media (max-width: 600px) {
                    .itemsPageContainer {
                        padding: 20px;
                    }
                    .itemsHeader {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .btnBackHeader, .btnAddItem, .btnDeleteAll {
                        width: 100%;
                        text-align: center;
                    }
                    .searchAndFilter {
                        flex-direction: column;
                    }
                    .itemsGrid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            <div className="itemsHeader">
                <button onClick={() => window.history.back()} className="btnBackHeader">
                    ← Back to Branch
                </button>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Link href={restaurantId ? `/add-item-customer?restaurantId=${restaurantId}` : "/add-item-customer"} className="btnAddItem">
                        + Add New Item
                    </Link>
                    {items.length > 0 && (
                        <button
                            onClick={handleDeleteAllItems}
                            className="btnDeleteAll"
                            disabled={deletingAll}
                        >
                            {deletingAll ? 'Deleting All...' : '🗑️ Delete All Items'}
                        </button>
                    )}
                </div>
            </div>

            <h1 className="itemsTitle">🍴 Menu Item Status</h1>
            <p className="itemsSubtitle">Branch ID: {restaurantId} • Turn items on or off dynamically</p>

            <div className="searchAndFilter">
                <input
                    type="text"
                    placeholder="Search menu items..."
                    className="searchInputField"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {errorMessage && (
                <div style={{
                    maxWidth: '1100px',
                    margin: '0 auto 20px auto',
                    padding: '14px',
                    backgroundColor: '#fce8e6',
                    color: '#c5221f',
                    borderRadius: '8px',
                    fontWeight: '500',
                    textAlign: 'center'
                }}>
                    {errorMessage}
                </div>
            )}

            <div className="itemsGrid">
                {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                        <div key={item._id} className="itemCard">
                            {editingId === item._id ? (
                                <div className="editFieldsContainer">
                                    <div className="editFieldGroup">
                                        <span className="editFieldLabel">Item Photo</span>
                                        {photoPreview ? (
                                            <div style={{ width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', marginBottom: '6px', backgroundColor: '#f1f5f9' }}>
                                                <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ) : null}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="editInputField"
                                            style={{ padding: '6px' }}
                                            disabled={savingId === item._id || uploadingImage}
                                            onChange={handleFileChange}
                                        />
                                        {editPhotoFile && (
                                            <span style={{ fontSize: '0.8rem', color: '#27ae60', fontWeight: '600' }}>
                                                📷 New image selected: {editPhotoFile.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="editFieldGroup">
                                        <span className="editFieldLabel">Item Name</span>
                                        <input
                                            type="text"
                                            className="editInputField"
                                            value={editName}
                                            disabled={savingId === item._id || uploadingImage}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Enter item name"
                                        />
                                    </div>
                                    <div className="editFieldGroup">
                                        <span className="editFieldLabel">Price (₹)</span>
                                        <input
                                            type="number"
                                            className="editInputField"
                                            value={editPrice}
                                            disabled={savingId === item._id || uploadingImage}
                                            onChange={(e) => setEditPrice(e.target.value)}
                                            placeholder="Enter price"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="editFieldGroup">
                                        <span className="editFieldLabel">Type (Veg / Non-Veg)</span>
                                        <select
                                            className="editInputField"
                                            value={editVegOrNonVeg}
                                            disabled={savingId === item._id || uploadingImage}
                                            onChange={(e) => setEditVegOrNonVeg(e.target.value)}
                                        >
                                            <option value="Veg">🟢 Veg</option>
                                            <option value="Non-Veg">🔴 Non-Veg</option>
                                            <option value="Both">🟡 Both</option>
                                        </select>
                                    </div>
                                    <div className="editFieldGroup">
                                        <span className="editFieldLabel">Rating (0 - 5)</span>
                                        <input
                                            type="number"
                                            className="editInputField"
                                            value={editRating}
                                            disabled={savingId === item._id || uploadingImage}
                                            onChange={(e) => setEditRating(e.target.value)}
                                            placeholder="Enter rating e.g. 4.5"
                                            min="0"
                                            max="5"
                                            step="0.1"
                                        />
                                    </div>
                                    {item.itemId && (
                                        <div style={{ fontSize: '0.9rem', color: '#7f8c8d', fontWeight: '500' }}>
                                            Item ID: {item.itemId}
                                        </div>
                                    )}
                                    <div className="editActions">
                                        <button
                                            className="btnSave"
                                            disabled={savingId === item._id || uploadingImage}
                                            onClick={() => handleSaveEdit(item._id)}
                                        >
                                            {uploadingImage ? 'Uploading Image...' : savingId === item._id ? 'Saving...' : '💾 Save'}
                                        </button>
                                        <button
                                            className="btnCancel"
                                            disabled={savingId === item._id || uploadingImage}
                                            onClick={cancelEditing}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {item.photoUrl ? (
                                        <div style={{ width: '100%', height: '160px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', backgroundColor: '#f1f5f9' }}>
                                            <img src={item.photoUrl} alt={item.itemName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ) : null}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                            <h3 className="itemName" style={{ margin: 0, flex: 1 }}>{item.itemName}</h3>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button className="btnEditCard" onClick={() => startEditing(item)}>
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    className="btnDeleteCard"
                                                    onClick={() => handleDeleteItem(item._id, item.itemName)}
                                                    disabled={deletingId === item._id}
                                                >
                                                    {deletingId === item._id ? '...' : '🗑️ Delete'}
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                                            <div className="itemPrice" style={{ margin: 0 }}>₹{item.price}</div>
                                            {item.vegOrNonVeg && (
                                                <span style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    backgroundColor: item.vegOrNonVeg === 'Veg' ? '#e6f4ea' : item.vegOrNonVeg === 'Non-Veg' ? '#fce8e6' : '#fef7e0',
                                                    color: item.vegOrNonVeg === 'Veg' ? '#137333' : item.vegOrNonVeg === 'Non-Veg' ? '#c5221f' : '#b06000',
                                                    border: `1px solid ${item.vegOrNonVeg === 'Veg' ? '#a8dab5' : item.vegOrNonVeg === 'Non-Veg' ? '#f5c2c0' : '#fcdc8e'}`
                                                }}>
                                                    {item.vegOrNonVeg === 'Veg' ? '🟢 Veg' : item.vegOrNonVeg === 'Non-Veg' ? '🔴 Non-Veg' : '🟡 Both'}
                                                </span>
                                            )}
                                            {item.rating !== undefined && item.rating !== null && (
                                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#f39c12', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                    ⭐ {item.rating}
                                                </span>
                                            )}
                                        </div>

                                        {item.itemId && (
                                            <div style={{ fontSize: '0.9rem', color: '#7f8c8d', fontWeight: '500', marginBottom: '15px' }}>
                                                Item ID: {item.itemId}
                                            </div>
                                        )}
                                    </div>

                                    <div className="itemControlArea">
                                        {/* First Toggle: Item Availability Status */}
                                        <div className="toggleLabelContainer">
                                            <span className="toggleLabelText">
                                                Item Availability Status
                                            </span>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={item.itemStatus !== false}
                                                    disabled={togglingId === item._id}
                                                    onChange={() => handleToggleProperty(item._id, 'itemStatus', item.itemStatus !== false)}
                                                />
                                                <span className={`slider ${togglingId === item._id ? 'disabledSlider' : ''}`}></span>
                                            </label>
                                        </div>
                                        <div className={`indicatorText ${item.itemStatus !== false ? 'active' : 'inactive'}`} style={{ marginBottom: '8px' }}>
                                            {item.itemStatus !== false ? '● Available' : '○ Unavailable'}
                                        </div>

                                        {/* Second Toggle: Item to display in the restaurant app */}
                                        <div className="toggleLabelContainer" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                                            <span className="toggleLabelText">
                                                Item to display in the restaurant app
                                            </span>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={item.itemtodisplayintherestuarentapp !== false}
                                                    disabled={togglingId === item._id}
                                                    onChange={() => handleToggleProperty(item._id, 'itemtodisplayintherestuarentapp', item.itemtodisplayintherestuarentapp !== false)}
                                                />
                                                <span className={`slider ${togglingId === item._id ? 'disabledSlider' : ''}`}></span>
                                            </label>
                                        </div>
                                        <div className={`indicatorText ${item.itemtodisplayintherestuarentapp !== false ? 'active' : 'inactive'}`}>
                                            {item.itemtodisplayintherestuarentapp !== false ? '● Displayed' : '○ Hidden'}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="noItemsText">
                        <h3>{items.length === 0 ? "No items found in this branch." : "No items matches your search."}</h3>
                        <p style={{ marginTop: '5px' }}>{items.length === 0 ? "Click '+ Add New Item' to list your first menu item." : "Try adjusting your search query."}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
