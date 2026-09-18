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

    // Item Selection & Price Adjustment (Hike / Decrease) States
    const [selectedItemIds, setSelectedItemIds] = useState([]);
    const [hikeAction, setHikeAction] = useState('increase'); // 'increase' | 'decrease'
    const [hikeType, setHikeType] = useState('percentage'); // 'percentage' | 'fixed'
    const [hikeValue, setHikeValue] = useState('');
    const [roundToWhole, setRoundToWhole] = useState(true);
    const [isHiking, setIsHiking] = useState(false);
    const [hikeSuccessMsg, setHikeSuccessMsg] = useState('');
    const [hikeErrorMsg, setHikeErrorMsg] = useState('');

    const toggleSelectItem = (id) => {
        setSelectedItemIds(prev =>
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };

    const handleSelectAllFiltered = () => {
        const filteredIds = filteredItems.map(item => item._id);
        setSelectedItemIds(prev => {
            const combined = new Set([...prev, ...filteredIds]);
            return Array.from(combined);
        });
    };

    const handleSelectAllItems = () => {
        setSelectedItemIds(items.map(item => item._id));
    };

    const handleDeselectAll = () => {
        setSelectedItemIds([]);
    };

    const handleRemoveSelectedItem = (id) => {
        setSelectedItemIds(prev => prev.filter(itemId => itemId !== id));
    };

    const calculateNewPrice = (currentPrice, action = hikeAction, type = hikeType, val = hikeValue, round = roundToWhole) => {
        const numPrice = Number(currentPrice) || 0;
        const numVal = parseFloat(val);
        if (isNaN(numVal) || numVal <= 0) return numPrice;

        let result = numPrice;
        if (action === 'increase') {
            if (type === 'percentage') {
                result = numPrice + (numPrice * (numVal / 100));
            } else {
                result = numPrice + numVal;
            }
        } else {
            // Decrease / Discount
            if (type === 'percentage') {
                result = Math.max(0, numPrice - (numPrice * (numVal / 100)));
            } else {
                result = Math.max(0, numPrice - numVal);
            }
        }

        return round ? Math.round(result) : parseFloat(result.toFixed(2));
    };

    const handleApplyPriceHike = async () => {
        if (selectedItemIds.length === 0) {
            alert('Please select at least one item.');
            return;
        }

        const numVal = parseFloat(hikeValue);
        if (isNaN(numVal) || numVal <= 0) {
            alert('Please enter a valid positive value.');
            return;
        }

        const updates = selectedItemIds.map(id => {
            const item = items.find(i => i._id === id);
            const oldPrice = item ? Number(item.price) : 0;
            return {
                itemId: id,
                price: calculateNewPrice(oldPrice, hikeAction, hikeType, numVal, roundToWhole),
                oldprices: oldPrice
            };
        });

        const actionText = hikeAction === 'increase' ? 'increase' : 'decrease';
        const actionPast = hikeAction === 'increase' ? 'increased' : 'decreased';
        const hikeDescription = hikeType === 'percentage' ? `${numVal}%` : `₹${numVal}`;
        const confirmMsg = `Are you sure you want to ${actionText} the price of ${updates.length} selected item(s) by ${hikeDescription}? (Current prices will be saved in 'oldprices' for Undo)`;
        if (!window.confirm(confirmMsg)) {
            return;
        }

        setIsHiking(true);
        setHikeSuccessMsg('');
        setHikeErrorMsg('');

        try {
            const res = await fetch('/api/item-status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId,
                    bulkPriceUpdates: updates
                })
            });
            const data = await res.json();
            if (data.success) {
                setItems(prevItems =>
                    prevItems.map(item => {
                        const match = updates.find(u => u.itemId === item._id);
                        return match ? { ...item, price: match.price, oldprices: match.oldprices } : item;
                    })
                );
                setHikeSuccessMsg(`Successfully ${actionPast} prices for ${updates.length} item(s) by ${hikeDescription}! You can click UNDO anytime to revert.`);
                setHikeValue('');
                setTimeout(() => {
                    setHikeSuccessMsg('');
                }, 8000);
            } else {
                setHikeErrorMsg(data.error || 'Failed to update prices.');
            }
        } catch (err) {
            console.error('Price update error:', err);
            setHikeErrorMsg('Server error while updating prices.');
        } finally {
            setIsHiking(false);
        }
    };

    const [isUndoing, setIsUndoing] = useState(false);

    const handleUndoPriceChange = async (targetItemIds = null) => {
        let idsToUndo = targetItemIds;
        if (!idsToUndo) {
            if (selectedItemIds.length > 0) {
                idsToUndo = selectedItemIds.filter(id => {
                    const item = items.find(i => i._id === id);
                    return item && item.oldprices !== undefined && item.oldprices !== null;
                });
            } else {
                idsToUndo = items
                    .filter(item => item.oldprices !== undefined && item.oldprices !== null)
                    .map(item => item._id);
            }
        }

        if (!idsToUndo || idsToUndo.length === 0) {
            alert('No items with a previous old price were found to undo.');
            return;
        }

        const confirmMsg = `Are you sure you want to UNDO and restore previous prices for ${idsToUndo.length} item(s)?`;
        if (!window.confirm(confirmMsg)) return;

        setIsUndoing(true);
        setHikeSuccessMsg('');
        setHikeErrorMsg('');

        try {
            const res = await fetch('/api/item-status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId,
                    action: 'undo',
                    undoItemIds: idsToUndo
                })
            });
            const data = await res.json();
            if (data.success) {
                setItems(prevItems =>
                    prevItems.map(item => {
                        if (idsToUndo.includes(item._id)) {
                            const restoredPrice = item.oldprices !== undefined && item.oldprices !== null ? item.oldprices : item.price;
                            const copy = { ...item, price: restoredPrice };
                            delete copy.oldprices;
                            return copy;
                        }
                        return item;
                    })
                );
                setHikeSuccessMsg(`↺ Successfully restored previous prices for ${idsToUndo.length} item(s)!`);
                setTimeout(() => setHikeSuccessMsg(''), 6000);
            } else {
                setHikeErrorMsg(data.error || 'Failed to undo price changes.');
            }
        } catch (err) {
            console.error('Undo price error:', err);
            setHikeErrorMsg('Server error while undoing prices.');
        } finally {
            setIsUndoing(false);
        }
    };

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

                /* Selection Styling on Cards */
                .itemCard.itemCardSelected {
                    border: 2px solid #10b981;
                    background-color: #f7fdf9;
                    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.14);
                }
                .cardSelectBar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px dashed #e2e8f0;
                }
                .cardSelectLabel {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    user-select: none;
                    font-size: 0.88rem;
                    font-weight: 600;
                    color: #475569;
                    transition: color 0.15s;
                }
                .cardSelectLabel:hover {
                    color: #10b981;
                }
                .cardSelectLabel.selected {
                    color: #059669;
                    font-weight: 700;
                }
                .cardSelectCheckbox {
                    display: none;
                }
                .cardCustomBox {
                    width: 20px;
                    height: 20px;
                    border-radius: 6px;
                    border: 2px solid #cbd5e1;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    color: white;
                    font-weight: bold;
                    transition: all 0.2s;
                }
                .cardSelectLabel.selected .cardCustomBox {
                    background: #10b981;
                    border-color: #10b981;
                }
                .cardBadgeSelected {
                    background: #d1fae5;
                    color: #065f46;
                    font-size: 0.72rem;
                    font-weight: 700;
                    padding: 2px 7px;
                    border-radius: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                }

                /* Top Selection Toolbar */
                .selectionToolbar {
                    max-width: 1100px;
                    margin: -15px auto 25px auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: white;
                    padding: 12px 20px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    flex-wrap: wrap;
                    gap: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                }
                .selectionToolbarLeft {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .btnSelectAction {
                    background: #f1f5f9;
                    color: #334155;
                    border: 1px solid #cbd5e1;
                    padding: 7px 14px;
                    border-radius: 6px;
                    font-size: 0.88rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btnSelectAction:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }
                .btnSelectAction.outline {
                    background: #fff;
                    color: #e53e3e;
                    border-color: #fecaca;
                }
                .btnSelectAction.outline:hover {
                    background: #fee2e2;
                }
                .btnSelectAction.undo {
                    background: #eff6ff;
                    color: #1d4ed8;
                    border-color: #bfdbfe;
                }
                .btnSelectAction.undo:hover:not(:disabled) {
                    background: #dbeafe;
                    border-color: #93c5fd;
                }
                .cardOldPriceBadge {
                    background: #f8fafc;
                    color: #475569;
                    font-size: 0.78rem;
                    font-weight: 700;
                    padding: 2px 7px;
                    border-radius: 6px;
                    border: 1px dashed #cbd5e1;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .btnCardUndoInline {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 2px 6px;
                    font-size: 0.72rem;
                    cursor: pointer;
                    font-weight: 700;
                    transition: background 0.15s;
                }
                .btnCardUndoInline:hover:not(:disabled) {
                    background: #1d4ed8;
                }
                .btnUndoHikeBottom {
                    background: #eff6ff;
                    color: #1d4ed8;
                    border: 1.5px solid #93c5fd;
                    padding: 13px 20px;
                    border-radius: 10px;
                    font-size: 0.95rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .btnUndoHikeBottom:hover:not(:disabled) {
                    background: #dbeafe;
                    border-color: #60a5fa;
                    transform: translateY(-1px);
                }
                .btnUndoHikeBottom:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .selectionCountBadge {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #64748b;
                }
                .btnJumpToHike {
                    background: #10b981;
                    color: white;
                    text-decoration: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 0.88rem;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
                }
                .btnJumpToHike:hover {
                    background: #059669;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
                }

                /* Downside Price Hike Section */
                .priceHikeSection {
                    max-width: 1100px;
                    margin: 50px auto 20px auto;
                    background: white;
                    border-radius: 16px;
                    border: 2px solid #e2e8f0;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                    padding: 30px;
                    scroll-margin-top: 40px;
                }
                .hikeHeader {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 15px;
                    padding-bottom: 20px;
                    border-bottom: 1.5px solid #f1f5f9;
                    margin-bottom: 25px;
                }
                .hikeTitleBlock {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .hikeIcon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: #ecfdf5;
                    color: #059669;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.6rem;
                    border: 1px solid #a7f3d0;
                }
                .hikeTitle {
                    margin: 0;
                    font-size: 1.6rem;
                    font-weight: 800;
                    color: #1e293b;
                }
                .hikeSubtitle {
                    margin: 4px 0 0 0;
                    font-size: 0.95rem;
                    color: #64748b;
                }
                .hikeHeaderActions {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .btnClearSelection {
                    background: #fee2e2;
                    color: #b91c1c;
                    border: 1px solid #fecaca;
                    padding: 8px 14px;
                    border-radius: 8px;
                    font-size: 0.88rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btnClearSelection:hover {
                    background: #fecaca;
                }
                .btnSelectAllBottom {
                    background: #f1f5f9;
                    color: #334155;
                    border: 1px solid #cbd5e1;
                    padding: 8px 14px;
                    border-radius: 8px;
                    font-size: 0.88rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btnSelectAllBottom:hover {
                    background: #e2e8f0;
                }

                /* Alerts in Hike Section */
                .hikeAlert {
                    padding: 14px 18px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .hikeAlert.success {
                    background: #ecfdf5;
                    color: #065f46;
                    border: 1px solid #a7f3d0;
                }
                .hikeAlert.error {
                    background: #fef2f2;
                    color: #991b1b;
                    border: 1px solid #fecaca;
                }

                /* Empty state when no items selected */
                .hikeEmptyState {
                    text-align: center;
                    padding: 50px 20px;
                    background: #f8fafc;
                    border-radius: 12px;
                    border: 2px dashed #cbd5e1;
                }
                .hikeEmptyIcon {
                    font-size: 2.8rem;
                    margin-bottom: 12px;
                }
                .hikeEmptyTitle {
                    margin: 0 0 8px 0;
                    font-size: 1.3rem;
                    font-weight: 700;
                    color: #334155;
                }
                .hikeEmptyText {
                    margin: 0 0 20px 0;
                    color: #64748b;
                    font-size: 0.98rem;
                }
                .btnSelectAllPrompt {
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 10px 22px;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
                }
                .btnSelectAllPrompt:hover {
                    background: #059669;
                    transform: translateY(-2px);
                }

                /* Controls Card */
                .hikeControlsCard {
                    background: #f8fafc;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 24px;
                    margin-bottom: 30px;
                }
                .hikeControlsGrid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 24px;
                    margin-bottom: 24px;
                }
                .hikeControlGroup {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .hikeFieldLabel {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .hikeModeTabs {
                    display: flex;
                    background: #e2e8f0;
                    padding: 4px;
                    border-radius: 10px;
                    gap: 4px;
                }
                .hikeModeTab {
                    flex: 1;
                    border: none;
                    background: transparent;
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .hikeModeTab.active {
                    background: white;
                    color: #059669;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
                }
                .hikeActionTab {
                    flex: 1;
                    border: none;
                    background: transparent;
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                .hikeActionTab.active.increase {
                    background: #10b981;
                    color: white;
                    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
                }
                .hikeActionTab.active.decrease {
                    background: #e11d48;
                    color: white;
                    box-shadow: 0 2px 6px rgba(225, 29, 72, 0.25);
                }
                .hikeInputWrapper {
                    display: flex;
                    align-items: center;
                    position: relative;
                }
                .hikeInputPrefix {
                    position: absolute;
                    left: 14px;
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #059669;
                    transition: color 0.2s;
                }
                .hikeInputPrefix.decrease {
                    color: #e11d48;
                }
                .hikeInputField {
                    width: 100%;
                    padding: 12px 16px 12px 38px;
                    border-radius: 8px;
                    border: 1.5px solid #cbd5e1;
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: #1e293b;
                    background: white;
                    outline: none;
                    transition: all 0.2s;
                }
                .hikeInputField:focus {
                    border-color: #10b981;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }
                .hikeInputField.decrease:focus {
                    border-color: #e11d48;
                    box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.15);
                }
                .hikeChipsContainer {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-wrap: wrap;
                    margin-top: 4px;
                }
                .chipsLabel {
                    font-size: 0.78rem;
                    color: #64748b;
                    font-weight: 600;
                }
                .hikeChip {
                    background: white;
                    border: 1px solid #cbd5e1;
                    padding: 4px 9px;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #334155;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .hikeChip:hover {
                    border-color: #10b981;
                    color: #059669;
                    background: #f0fdf4;
                }
                .hikeChip.active {
                    background: #059669;
                    color: white;
                    border-color: #059669;
                }
                .hikeChip.active-decrease {
                    background: #e11d48;
                    color: white;
                    border-color: #e11d48;
                }
                .hikeCheckboxLabel {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-size: 0.92rem;
                    font-weight: 600;
                    color: #334155;
                }
                .hikeCheckboxLabel input {
                    width: 17px;
                    height: 17px;
                    cursor: pointer;
                    accent-color: #10b981;
                }
                .hikeFormulaBadge {
                    background: #e0f2fe;
                    color: #0369a1;
                    border: 1px solid #bae6fd;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 0.82rem;
                    font-weight: 600;
                    margin-top: 6px;
                }
                .hikeFormulaBadge.decrease {
                    background: #fff1f2;
                    color: #9f1239;
                    border-color: #fecdd3;
                }
                .hikeFormulaBadge code {
                    font-weight: 800;
                }
                .hikeApplyBar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: white;
                    padding: 16px 20px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                .hikeApplySummary {
                    font-size: 1rem;
                    color: #334155;
                }
                .btnApplyHike {
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 14px 28px;
                    border-radius: 10px;
                    font-size: 1.05rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.25);
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                .btnApplyHike:hover:not(:disabled) {
                    background: #059669;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 15px rgba(16, 185, 129, 0.35);
                }
                .btnApplyHike.decrease {
                    background: #e11d48;
                    box-shadow: 0 4px 10px rgba(225, 29, 72, 0.25);
                }
                .btnApplyHike.decrease:hover:not(:disabled) {
                    background: #be123c;
                    box-shadow: 0 6px 15px rgba(225, 29, 72, 0.35);
                }
                .btnApplyHike:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                    transform: none;
                }

                /* Table Preview */
                .hikePreviewContainer {
                    margin-top: 25px;
                }
                .hikePreviewHeader {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .hikePreviewTitle {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1e293b;
                }
                .hikePreviewHint {
                    font-size: 0.85rem;
                    color: #64748b;
                }
                .hikeItemsTableWrapper {
                    overflow-x: auto;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    background: white;
                }
                .hikeItemsTable {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                    font-size: 0.95rem;
                }
                .hikeItemsTable th {
                    background: #f8fafc;
                    color: #475569;
                    font-weight: 700;
                    padding: 12px 16px;
                    border-bottom: 1.5px solid #e2e8f0;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .hikeItemsTable td {
                    padding: 12px 16px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }
                .hikeItemsTable tr:last-child td {
                    border-bottom: none;
                }
                .tableItemInfo {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .tableItemImg {
                    width: 44px;
                    height: 44px;
                    border-radius: 8px;
                    object-fit: cover;
                }
                .tableItemImgPlaceholder {
                    width: 44px;
                    height: 44px;
                    border-radius: 8px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.3rem;
                }
                .tableItemName {
                    font-weight: 700;
                    color: #1e293b;
                }
                .tableItemId {
                    font-size: 0.78rem;
                    color: #94a3b8;
                }
                .tableOldPrice {
                    font-weight: 600;
                    color: #64748b;
                }
                .tableDiff {
                    font-weight: 700;
                    padding: 3px 8px;
                    border-radius: 6px;
                    display: inline-block;
                }
                .tableDiff.positive {
                    color: #059669;
                    background: #ecfdf5;
                }
                .tableDiff.negative {
                    color: #e11d48;
                    background: #fff1f2;
                }
                .tableNewPrice {
                    font-weight: 800;
                    color: #059669;
                    font-size: 1.1rem;
                }
                .tableNewPrice.decrease {
                    color: #e11d48;
                }
                .btnRemoveFromHike {
                    background: #fee2e2;
                    color: #b91c1c;
                    border: 1px solid #fecaca;
                    padding: 5px 10px;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btnRemoveFromHike:hover {
                    background: #fecaca;
                }

                /* Floating Pill */
                .floatingHikePill {
                    position: fixed;
                    bottom: 25px;
                    right: 25px;
                    background: #1e293b;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 50px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.25);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 999;
                    animation: slideUp 0.3s ease-out;
                }
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .floatingHikeLink {
                    background: #10b981;
                    color: white;
                    text-decoration: none;
                    padding: 6px 14px;
                    border-radius: 30px;
                    font-size: 0.85rem;
                    font-weight: 700;
                    transition: all 0.2s;
                }
                .floatingHikeLink:hover {
                    background: #059669;
                    transform: scale(1.04);
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

            {/* Selection & Batch Actions Toolbar */}
            <div className="selectionToolbar">
                <div className="selectionToolbarLeft">
                    <button
                        type="button"
                        className="btnSelectAction"
                        onClick={handleSelectAllFiltered}
                        title="Select all visible items"
                    >
                        ✓ Select All ({filteredItems.length})
                    </button>
                    {selectedItemIds.length > 0 && (
                        <button
                            type="button"
                            className="btnSelectAction outline"
                            onClick={handleDeselectAll}
                        >
                            ✕ Deselect All
                        </button>
                    )}
                    {items.some(i => i.oldprices !== undefined && i.oldprices !== null) && (
                        <button
                            type="button"
                            className="btnSelectAction undo"
                            onClick={() => handleUndoPriceChange()}
                            disabled={isUndoing}
                            title="Undo and restore previous prices"
                        >
                            {isUndoing ? 'Restoring...' : `↺ UNDO (${items.filter(i => i.oldprices !== undefined && i.oldprices !== null).length})`}
                        </button>
                    )}
                    <span className="selectionCountBadge">
                        <strong>{selectedItemIds.length}</strong> of {items.length} item(s) selected
                    </span>
                </div>
                {selectedItemIds.length > 0 && (
                    <a href="#price-hike-section" className="btnJumpToHike">
                        Go to Price Hike Section ({selectedItemIds.length}) ↓
                    </a>
                )}
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
                        <div key={item._id} className={`itemCard ${selectedItemIds.includes(item._id) ? 'itemCardSelected' : ''}`}>
                            <div className="cardSelectBar" onClick={(e) => e.stopPropagation()}>
                                <label className={`cardSelectLabel ${selectedItemIds.includes(item._id) ? 'selected' : ''}`}>
                                    <input
                                        type="checkbox"
                                        className="cardSelectCheckbox"
                                        checked={selectedItemIds.includes(item._id)}
                                        onChange={() => toggleSelectItem(item._id)}
                                    />
                                    <span className="cardCustomBox">{selectedItemIds.includes(item._id) ? '✓' : ''}</span>
                                    <span>{selectedItemIds.includes(item._id) ? 'Selected for Hike' : 'Select for Hike'}</span>
                                </label>
                                {selectedItemIds.includes(item._id) && (
                                    <span className="cardBadgeSelected">Selected</span>
                                )}
                            </div>
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
                                            {item.oldprices !== undefined && item.oldprices !== null && (
                                                <span className="cardOldPriceBadge" title="Previous price before last change">
                                                    Old: ₹{item.oldprices}
                                                    <button
                                                        type="button"
                                                        className="btnCardUndoInline"
                                                        title="Undo and revert to old price"
                                                        disabled={isUndoing}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUndoPriceChange([item._id]);
                                                        }}
                                                    >
                                                        ↺ Undo
                                                    </button>
                                                </span>
                                            )}
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

            {/* DOWNSIDE: SELECTED ITEMS & PRICE HIKE SECTION */}
            <div id="price-hike-section" className="priceHikeSection">
                <div className="hikeHeader">
                    <div className="hikeTitleBlock">
                        <div className="hikeIcon">📈</div>
                        <div>
                            <h2 className="hikeTitle">Price Hike & Batch Update</h2>
                            <p className="hikeSubtitle">
                                Increase prices for selected items by percentage (%) or flat amount (₹)
                            </p>
                        </div>
                    </div>
                    <div className="hikeHeaderActions">
                        {selectedItemIds.length > 0 && (
                            <button
                                type="button"
                                className="btnClearSelection"
                                onClick={handleDeselectAll}
                            >
                                Clear Selection ({selectedItemIds.length})
                            </button>
                        )}
                        <button
                            type="button"
                            className="btnSelectAllBottom"
                            onClick={handleSelectAllItems}
                        >
                            Select All Items ({items.length})
                        </button>
                    </div>
                </div>

                {hikeSuccessMsg && (
                    <div className="hikeAlert success">
                        <span>🎉 {hikeSuccessMsg}</span>
                    </div>
                )}

                {hikeErrorMsg && (
                    <div className="hikeAlert error">
                        <span>⚠️ {hikeErrorMsg}</span>
                    </div>
                )}

                {selectedItemIds.length === 0 ? (
                    <div className="hikeEmptyState">
                        <div className="hikeEmptyIcon">🛒</div>
                        <h3 className="hikeEmptyTitle">No Items Selected Yet</h3>
                        <p className="hikeEmptyText">
                            Check <strong>"Select for Hike"</strong> on any items above to adjust their prices, or select all below.
                        </p>
                        <button
                            type="button"
                            className="btnSelectAllPrompt"
                            onClick={handleSelectAllItems}
                        >
                            Select All {items.length} Items
                        </button>
                    </div>
                ) : (
                    <div className="hikeConfigArea">
                        {/* Control Card */}
                        <div className="hikeControlsCard">
                            <div className="hikeControlsGrid">
                                {/* 1. Action Selection: Increase or Decrease */}
                                <div className="hikeControlGroup">
                                    <label className="hikeFieldLabel">1. Price Action</label>
                                    <div className="hikeModeTabs">
                                        <button
                                            type="button"
                                            className={`hikeActionTab ${hikeAction === 'increase' ? 'active increase' : ''}`}
                                            onClick={() => setHikeAction('increase')}
                                        >
                                            📈 Increase (Hike)
                                        </button>
                                        <button
                                            type="button"
                                            className={`hikeActionTab ${hikeAction === 'decrease' ? 'active decrease' : ''}`}
                                            onClick={() => setHikeAction('decrease')}
                                        >
                                            📉 Decrease (Cut / Off)
                                        </button>
                                    </div>
                                </div>

                                {/* 2. Method Selection: Percentage or Flat Amount */}
                                <div className="hikeControlGroup">
                                    <label className="hikeFieldLabel">2. Adjustment Method</label>
                                    <div className="hikeModeTabs">
                                        <button
                                            type="button"
                                            className={`hikeModeTab ${hikeType === 'percentage' ? 'active' : ''}`}
                                            onClick={() => setHikeType('percentage')}
                                        >
                                            📊 Percentage (%)
                                        </button>
                                        <button
                                            type="button"
                                            className={`hikeModeTab ${hikeType === 'fixed' ? 'active' : ''}`}
                                            onClick={() => setHikeType('fixed')}
                                        >
                                            💵 Flat Amount (₹)
                                        </button>
                                    </div>
                                </div>

                                {/* 3. Value Input & Presets */}
                                <div className="hikeControlGroup">
                                    <label className="hikeFieldLabel">
                                        {`3. Enter ${hikeAction === 'increase' ? 'Increase' : 'Decrease'} ${hikeType === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}`}
                                    </label>
                                    <div className="hikeInputWrapper">
                                        <span className={`hikeInputPrefix ${hikeAction === 'decrease' ? 'decrease' : ''}`}>
                                            {hikeType === 'percentage' ? '%' : '₹'}
                                        </span>
                                        <input
                                            type="number"
                                            className={`hikeInputField ${hikeAction === 'decrease' ? 'decrease' : ''}`}
                                            placeholder={hikeType === 'percentage' ? (hikeAction === 'increase' ? 'e.g. 10 for 10% hike' : 'e.g. 10 for 10% off') : (hikeAction === 'increase' ? 'e.g. 20 for ₹20 hike' : 'e.g. 20 for ₹20 off')}
                                            value={hikeValue}
                                            onChange={(e) => setHikeValue(e.target.value)}
                                            min="0.1"
                                            step={hikeType === 'percentage' ? '0.5' : '1'}
                                        />
                                    </div>

                                    {/* Preset Quick Chips */}
                                    <div className="hikeChipsContainer">
                                        <span className="chipsLabel">Presets:</span>
                                        {hikeType === 'percentage' ? (
                                            [5, 10, 15, 20, 25, 30].map(pct => (
                                                <button
                                                    key={pct}
                                                    type="button"
                                                    className={`hikeChip ${parseFloat(hikeValue) === pct ? (hikeAction === 'decrease' ? 'active-decrease' : 'active') : ''}`}
                                                    onClick={() => setHikeValue(pct.toString())}
                                                >
                                                    {hikeAction === 'increase' ? `+${pct}%` : `-${pct}%`}
                                                </button>
                                            ))
                                        ) : (
                                            [10, 20, 30, 50, 100].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    className={`hikeChip ${parseFloat(hikeValue) === amt ? (hikeAction === 'decrease' ? 'active-decrease' : 'active') : ''}`}
                                                    onClick={() => setHikeValue(amt.toString())}
                                                >
                                                    {hikeAction === 'increase' ? `+₹${amt}` : `-₹${amt}`}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* 4. Rounding & Formula */}
                                <div className="hikeControlGroup">
                                    <label className="hikeFieldLabel">4. Pricing Options</label>
                                    <label className="hikeCheckboxLabel">
                                        <input
                                            type="checkbox"
                                            checked={roundToWhole}
                                            onChange={(e) => setRoundToWhole(e.target.checked)}
                                        />
                                        <span>Round new prices to nearest whole rupee (₹)</span>
                                    </label>
                                    <div className={`hikeFormulaBadge ${hikeAction === 'decrease' ? 'decrease' : ''}`}>
                                        {hikeAction === 'increase' ? (
                                            hikeType === 'percentage' ? (
                                                <span>Formula: <code>Existing Price + {hikeValue && parseFloat(hikeValue) > 0 ? `${hikeValue}%` : 'X%'}</code></span>
                                            ) : (
                                                <span>Formula: <code>Existing Price + {hikeValue && parseFloat(hikeValue) > 0 ? `₹${hikeValue}` : '₹X'}</code></span>
                                            )
                                        ) : (
                                            hikeType === 'percentage' ? (
                                                <span>Formula: <code>Existing Price - {hikeValue && parseFloat(hikeValue) > 0 ? `${hikeValue}%` : 'X%'} (Min ₹0)</code></span>
                                            ) : (
                                                <span>Formula: <code>Existing Price - {hikeValue && parseFloat(hikeValue) > 0 ? `₹${hikeValue}` : '₹X'} (Min ₹0)</code></span>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Button Bar */}
                            <div className="hikeApplyBar">
                                <div className="hikeApplySummary">
                                    <strong>{selectedItemIds.length}</strong> item(s) selected
                                    {hikeValue && parseFloat(hikeValue) > 0 && (
                                        <span> • {hikeAction === 'increase' ? 'Hike: ' : 'Decrease: '}
                                            <strong style={{ color: hikeAction === 'increase' ? '#059669' : '#e11d48' }}>
                                                {hikeAction === 'increase' ? '+' : '-'}{hikeType === 'percentage' ? `${hikeValue}%` : `₹${hikeValue}`}
                                            </strong>
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {items.some(i => i.oldprices !== undefined && i.oldprices !== null) && (
                                        <button
                                            type="button"
                                            className="btnUndoHikeBottom"
                                            onClick={() => handleUndoPriceChange()}
                                            disabled={isUndoing}
                                            title="Restore previous old prices and remove oldprices variable"
                                        >
                                            {isUndoing ? 'Restoring...' : `↺ UNDO (${items.filter(i => i.oldprices !== undefined && i.oldprices !== null).length})`}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className={`btnApplyHike ${hikeAction === 'decrease' ? 'decrease' : ''}`}
                                        disabled={isHiking || !hikeValue || parseFloat(hikeValue) <= 0}
                                        onClick={handleApplyPriceHike}
                                    >
                                        {isHiking ? (
                                            <>⏳ Updating {selectedItemIds.length} Items...</>
                                        ) : hikeAction === 'increase' ? (
                                            <>🚀 Increase Price for {selectedItemIds.length} Item(s)</>
                                        ) : (
                                            <>📉 Decrease Price for {selectedItemIds.length} Item(s)</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Selected Items Live Preview List */}
                        <div className="hikePreviewContainer">
                            <div className="hikePreviewHeader">
                                <h3 className="hikePreviewTitle">
                                    Selected Items ({selectedItemIds.length}) & Price Preview
                                </h3>
                                <span className="hikePreviewHint">
                                    Review the before & after prices below
                                </span>
                            </div>

                            <div className="hikeItemsTableWrapper">
                                <table className="hikeItemsTable">
                                    <thead>
                                        <tr>
                                            <th>Item Details</th>
                                            <th>Current Price</th>
                                            <th>{hikeAction === 'increase' ? 'Hike Amount' : 'Discount / Cut'}</th>
                                            <th>New Price</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedItemIds.map(id => {
                                            const item = items.find(i => i._id === id);
                                            if (!item) return null;
                                            const oldPrice = Number(item.price) || 0;
                                            const newPrice = calculateNewPrice(oldPrice);
                                            const diff = newPrice - oldPrice;

                                            return (
                                                <tr key={item._id}>
                                                    <td>
                                                        <div className="tableItemInfo">
                                                            {item.photoUrl ? (
                                                                <img src={item.photoUrl} alt={item.itemName} className="tableItemImg" />
                                                            ) : (
                                                                <div className="tableItemImgPlaceholder">🍽️</div>
                                                            )}
                                                            <div>
                                                                <div className="tableItemName">{item.itemName}</div>
                                                                {item.itemId && <div className="tableItemId">ID: {item.itemId}</div>}
                                                                {item.oldprices !== undefined && item.oldprices !== null && (
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                        Previous: ₹{item.oldprices}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="tableOldPrice">₹{oldPrice}</span>
                                                    </td>
                                                    <td>
                                                        <span className={`tableDiff ${diff > 0 ? 'positive' : diff < 0 ? 'negative' : ''}`}>
                                                            {diff > 0 ? `+₹${diff.toFixed(roundToWhole ? 0 : 2)}` : diff < 0 ? `-₹${Math.abs(diff).toFixed(roundToWhole ? 0 : 2)}` : '—'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`tableNewPrice ${hikeAction === 'decrease' ? 'decrease' : ''}`}>₹{newPrice}</span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btnRemoveFromHike"
                                                            title="Remove from selected"
                                                            onClick={() => handleRemoveSelectedItem(item._id)}
                                                        >
                                                            ✕ Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating indicator when items are selected */}
            {selectedItemIds.length > 0 && (
                <div className="floatingHikePill">
                    <span>✨ <strong>{selectedItemIds.length}</strong> items selected</span>
                    <a href="#price-hike-section" className="floatingHikeLink">
                        Go to Price Hike Section ↓
                    </a>
                </div>
            )}
        </div>
    );
}
