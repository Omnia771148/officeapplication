'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './offers.css';

export default function OffersPage() {
    const router = useRouter();
    const [restaurantId, setRestaurantId] = useState(null);
    const [restaurantName, setRestaurantName] = useState('');
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [activeTab, setActiveTab] = useState('tiered'); // 'tiered', 'bogo', 'category', 'item'
    
    // Existing item-level offer states
    const [offerEdits, setOfferEdits] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [successId, setSuccessId] = useState(null);

    // Existing bulk offer states
    const [bulkOffer, setBulkOffer] = useState('0');
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkSuccess, setBulkSuccess] = useState(false);

    // New Advanced Offers States
    const [bogoOffers, setBogoOffers] = useState([]);
    const [categoryDiscounts, setCategoryDiscounts] = useState([]);
    const [tieredDiscounts, setTieredDiscounts] = useState([
        { minBillAmount: 500, discountType: 'percentage', discountPercentage: 5, discountAmount: 0, label: '5% OFF on orders ₹500+', isActive: true },
        { minBillAmount: 2000, discountType: 'flat', discountPercentage: 0, discountAmount: 20, label: '₹20 OFF on orders ₹2000+', isActive: true }
    ]);
    const [savingOffers, setSavingOffers] = useState(false);
    const [offersSuccessMsg, setOffersSuccessMsg] = useState('');

    // Form states for adding new 1+1 rule
    const [newBogoSource, setNewBogoSource] = useState('');
    const [newBogoTarget, setNewBogoTarget] = useState('');
    const [bogoRuleType, setBogoRuleType] = useState('item');
    const [newBogoSourceItemId, setNewBogoSourceItemId] = useState('');
    const [newBogoTargetItemId, setNewBogoTargetItemId] = useState('');

    useEffect(() => {
        const storedId = localStorage.getItem('restaurantId');
        setRestaurantId(storedId);

        if (!storedId) {
            setLoading(false);
            return;
        }

        const fetchAllData = async () => {
            try {
                // 1. Fetch branch details/name
                const detailsRes = await fetch(`/api/branch-stats?restaurantId=${storedId}`);
                const detailsData = await detailsRes.json();
                if (detailsData.success && detailsData.restaurantDetails) {
                    setRestaurantName(detailsData.restaurantDetails.name || `Restaurant ${storedId}`);
                } else {
                    setRestaurantName(`Restaurant ${storedId}`);
                }

                // 2. Fetch categories
                const catRes = await fetch(`/api/categories?restaurantId=${storedId}`);
                const catData = await catRes.json();
                if (catData.success && Array.isArray(catData.data)) {
                    setCategories(catData.data);
                    if (catData.data.length > 0) {
                        setNewBogoSource(catData.data[0].name);
                        setNewBogoTarget(catData.data[0].name);
                    }
                }

                // 3. Fetch items list
                const itemsRes = await fetch(`/api/item-status?restaurantId=${storedId}`);
                const itemsData = await itemsRes.json();
                if (itemsData.success) {
                    setItems(itemsData.data);
                    const initialEdits = {};
                    itemsData.data.forEach(item => {
                        initialEdits[item._id] = item.offerpercentage !== undefined ? item.offerpercentage.toString() : '0';
                    });
                    setOfferEdits(initialEdits);
                } else {
                    setErrorMessage(itemsData.error || 'Failed to fetch items');
                }

                // 4. Fetch advanced offers (1+1, category, tiered)
                const offersRes = await fetch(`/api/restaurant-offers?restaurantId=${storedId}`);
                const offersData = await offersRes.json();
                if (offersData.success && offersData.data) {
                    if (Array.isArray(offersData.data.bogoOffers) && offersData.data.bogoOffers.length > 0) {
                        setBogoOffers(offersData.data.bogoOffers);
                    }
                    if (Array.isArray(offersData.data.categoryDiscounts) && offersData.data.categoryDiscounts.length > 0) {
                        setCategoryDiscounts(offersData.data.categoryDiscounts);
                    }
                    if (Array.isArray(offersData.data.tieredDiscounts) && offersData.data.tieredDiscounts.length > 0) {
                        setTieredDiscounts(offersData.data.tieredDiscounts);
                    }
                }
            } catch (err) {
                setErrorMessage('Error connecting to server.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    // Save Advanced Offers to DB
    const handleSaveAdvancedOffers = async (updatedBogo, updatedCat, updatedTiered) => {
        setSavingOffers(true);
        setOffersSuccessMsg('');
        try {
            const res = await fetch('/api/restaurant-offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId,
                    bogoOffers: updatedBogo !== undefined ? updatedBogo : bogoOffers,
                    categoryDiscounts: updatedCat !== undefined ? updatedCat : categoryDiscounts,
                    tieredDiscounts: updatedTiered !== undefined ? updatedTiered : tieredDiscounts
                })
            });
            const data = await res.json();
            if (data.success) {
                setOffersSuccessMsg('Offers updated and saved successfully! 🎉');
                setTimeout(() => setOffersSuccessMsg(''), 4000);
            } else {
                alert(data.error || 'Failed to save offers.');
            }
        } catch (err) {
            console.error('Save offers error:', err);
            alert('Failed to connect to server.');
        } finally {
            setSavingOffers(false);
        }
    };

    // Tiered Discount Handlers
    const handleAddTier = () => {
        const newTier = { minBillAmount: 1000, discountType: 'percentage', discountPercentage: 10, discountAmount: 0, label: '', isActive: true };
        const updated = [...tieredDiscounts, newTier].sort((a, b) => a.minBillAmount - b.minBillAmount);
        setTieredDiscounts(updated);
    };

    const handleUpdateTier = (index, field, value) => {
        const updated = [...tieredDiscounts];
        updated[index] = { ...updated[index], [field]: value };
        setTieredDiscounts(updated);
    };

    const handleDeleteTier = (index) => {
        const updated = tieredDiscounts.filter((_, i) => i !== index);
        setTieredDiscounts(updated);
    };

    // 1+1 BOGO Handlers (Supports Item-Wise & Category-Wise)
    const handleAddBogoRule = () => {
        if (bogoRuleType === 'item') {
            const sourceItem = items.find(i => String(i._id || i.itemId) === String(newBogoSourceItemId));
            const targetItem = items.find(i => String(i._id || i.itemId) === String(newBogoTargetItemId));
            if (!sourceItem || !targetItem) {
                alert('Please select both Buy Item and Free Item.');
                return;
            }
            const sourceName = sourceItem.itemName || sourceItem.name || 'Item';
            const targetName = targetItem.itemName || targetItem.name || 'Item';
            const newRule = {
                type: 'item',
                sourceItemId: String(sourceItem._id || sourceItem.itemId || ''),
                sourceItemName: sourceName,
                sourceCategory: sourceItem.category || '',
                targetItemId: String(targetItem._id || targetItem.itemId || ''),
                targetItemName: targetName,
                targetCategory: targetItem.category || '',
                offerTitle: '1+1: Buy ' + sourceName + ' Get ' + targetName + ' Free',
                isActive: true
            };
            const updated = [...bogoOffers, newRule];
            setBogoOffers(updated);
            handleSaveAdvancedOffers(updated, categoryDiscounts, tieredDiscounts);
        } else {
            if (!newBogoSource || !newBogoTarget) {
                alert('Please select both Buy Category and Get Category.');
                return;
            }
            const newRule = {
                type: 'category',
                sourceCategory: newBogoSource,
                targetCategory: newBogoTarget,
                offerTitle: '1+1: Buy ' + newBogoSource + ' Get ' + newBogoTarget + ' Free',
                isActive: true
            };
            const updated = [...bogoOffers, newRule];
            setBogoOffers(updated);
            handleSaveAdvancedOffers(updated, categoryDiscounts, tieredDiscounts);
        }
    };

    const handleDeleteBogoRule = (index) => {
        const updated = bogoOffers.filter((_, i) => i !== index);
        setBogoOffers(updated);
        handleSaveAdvancedOffers(updated, categoryDiscounts, tieredDiscounts);
    };

    const handleToggleBogoRule = (index) => {
        const updated = [...bogoOffers];
        updated[index].isActive = !updated[index].isActive;
        setBogoOffers(updated);
        handleSaveAdvancedOffers(updated, categoryDiscounts, tieredDiscounts);
    };

    // Category % Discount Handlers
    const handleCategoryDiscountChange = (catName, percent) => {
        const num = Number(percent) || 0;
        let updated = [...categoryDiscounts];
        const existingIdx = updated.findIndex(c => c.category === catName);
        if (existingIdx > -1) {
            if (num <= 0) {
                updated = updated.filter(c => c.category !== catName);
            } else {
                updated[existingIdx].discountPercentage = num;
            }
        } else if (num > 0) {
            updated.push({ category: catName, discountPercentage: num, isActive: true });
        }
        setCategoryDiscounts(updated);
    };

    // Item-level existing handlers
    const handlePercentageChange = (itemId, val) => {
        if (val !== '' && (isNaN(Number(val)) || Number(val) < 0 || Number(val) > 100)) {
            return;
        }
        setOfferEdits(prev => ({ ...prev, [itemId]: val }));
    };

    const applyPreset = (itemId, percent) => {
        setOfferEdits(prev => ({ ...prev, [itemId]: percent.toString() }));
    };

    const handleSaveOffer = async (itemId) => {
        const editVal = offerEdits[itemId];
        const offerpercentage = editVal === '' ? 0 : Number(editVal);
        if (isNaN(offerpercentage) || offerpercentage < 0 || offerpercentage > 100) {
            alert('Offer percentage must be between 0 and 100.');
            return;
        }

        setSavingId(itemId);
        try {
            const res = await fetch('/api/item-status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId, itemId, offerpercentage })
            });
            const data = await res.json();
            if (data.success) {
                setItems(prev => prev.map(item => item._id === itemId ? { ...item, offerpercentage } : item));
                setSuccessId(itemId);
                setTimeout(() => setSuccessId(null), 3000);
            } else {
                alert(data.error || 'Failed to update offer');
            }
        } catch (err) {
            alert('Error updating offer');
        } finally {
            setSavingId(null);
        }
    };

    const handleSaveBulkOffer = async () => {
        const pct = Number(bulkOffer);
        if (isNaN(pct) || pct < 0 || pct > 100) {
            alert('Please enter a valid percentage between 0 and 100.');
            return;
        }
        if (!confirm(`Are you sure you want to set a ${pct}% discount for ALL items in ${restaurantName}?`)) {
            return;
        }
        setBulkSaving(true);
        try {
            const res = await fetch('/api/item-status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId, offerpercentage: pct })
            });
            const data = await res.json();
            if (data.success) {
                setItems(prev => prev.map(item => ({ ...item, offerpercentage: pct })));
                const updatedEdits = {};
                items.forEach(item => { updatedEdits[item._id] = pct.toString(); });
                setOfferEdits(updatedEdits);
                setBulkSuccess(true);
                setTimeout(() => setBulkSuccess(false), 4000);
            } else {
                alert(data.error || 'Failed to apply bulk offer');
            }
        } catch (err) {
            alert('Error updating bulk offers');
        } finally {
            setBulkSaving(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ fontSize: '1.2rem', color: '#666' }}>Loading restaurant offers...</div>
            </div>
        );
    }

    return (
        <div className="offers-page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <button 
                        onClick={() => router.back()} 
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600', color: '#475569', marginBottom: '10px' }}
                    >
                        ← Back to Dashboard
                    </button>
                    <h1 style={{ fontSize: '2rem', color: '#0f172a', fontWeight: '700', margin: 0 }}>
                        {restaurantName} — Offers & Discounts
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.95rem' }}>
                        Configure 1+1 BOGO deals, tiered cart bill discounts, and category offers.
                    </p>
                </div>
            </div>

            {/* Notification Bar */}
            {offersSuccessMsg && (
                <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '14px 20px', borderRadius: '10px', marginBottom: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{offersSuccessMsg}</span>
                </div>
            )}

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', overflowX: 'auto', paddingBottom: '2px' }}>
                <button
                    onClick={() => setActiveTab('tiered')}
                    style={{
                        padding: '12px 20px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        color: activeTab === 'tiered' ? '#f59e0b' : '#64748b',
                        borderBottom: activeTab === 'tiered' ? '3px solid #f59e0b' : '3px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    💰 Tiered Bill Discounts (Cart)
                </button>
                <button
                    onClick={() => setActiveTab('bogo')}
                    style={{
                        padding: '12px 20px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        color: activeTab === 'bogo' ? '#f59e0b' : '#64748b',
                        borderBottom: activeTab === 'bogo' ? '3px solid #f59e0b' : '3px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    🎁 1+1 (BOGO) Category Offers
                </button>
                <button
                    onClick={() => setActiveTab('category')}
                    style={{
                        padding: '12px 20px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        color: activeTab === 'category' ? '#f59e0b' : '#64748b',
                        borderBottom: activeTab === 'category' ? '3px solid #f59e0b' : '3px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    🏷️ Category % Discounts
                </button>
                <button
                    onClick={() => setActiveTab('item')}
                    style={{
                        padding: '12px 20px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        color: activeTab === 'item' ? '#f59e0b' : '#64748b',
                        borderBottom: activeTab === 'item' ? '3px solid #f59e0b' : '3px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    🍔 Item & Bulk Offers
                </button>
            </div>

            {/* TAB 1: TIERED RESTAURANT BILL DISCOUNTS */}
            {activeTab === 'tiered' && (
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                Tiered Restaurant Bill Discounts
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                                Give percentage discounts in customer cart based on order amount (e.g. ₹500 → 5% OFF, ₹2000 → 12% OFF).
                            </p>
                        </div>
                        <button
                            onClick={handleAddTier}
                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                        >
                            + Add Discount Tier
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                        {tieredDiscounts.map((tier, idx) => {
                            const isFlat = tier.discountType === 'flat';
                            return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Min Bill Amount:</span>
                                    <span style={{ fontWeight: '700', color: '#0f172a' }}>₹</span>
                                    <input
                                        type="number"
                                        value={tier.minBillAmount}
                                        onChange={(e) => handleUpdateTier(idx, 'minBillAmount', Number(e.target.value))}
                                        style={{ width: '110px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#000000', backgroundColor: '#ffffff' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Type:</span>
                                    <select
                                        value={tier.discountType || 'percentage'}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            const updated = [...tieredDiscounts];
                                            updated[idx] = {
                                                ...updated[idx],
                                                discountType: type,
                                                discountPercentage: type === 'percentage' ? (updated[idx].discountPercentage || 10) : 0,
                                                discountAmount: type === 'flat' ? (updated[idx].discountAmount || 20) : 0
                                            };
                                            setTieredDiscounts(updated);
                                        }}
                                        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', background: '#ffffff', color: '#000000', cursor: 'pointer' }}
                                    >
                                        <option value="percentage" style={{ color: '#000000', background: '#ffffff' }}>Percentage (%)</option>
                                        <option value="flat" style={{ color: '#000000', background: '#ffffff' }}>Flat Money (₹)</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Discount:</span>
                                    {isFlat ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ fontWeight: '700', color: '#10b981' }}>-₹</span>
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="20"
                                                value={tier.discountAmount !== undefined ? tier.discountAmount : ''}
                                                onChange={(e) => handleUpdateTier(idx, 'discountAmount', Number(e.target.value))}
                                                style={{ width: '90px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #10b981', fontWeight: '700', color: '#000000', backgroundColor: '#ffffff' }}
                                            />
                                            <span style={{ fontWeight: '700', color: '#10b981' }}>OFF</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={tier.discountPercentage !== undefined ? tier.discountPercentage : ''}
                                                onChange={(e) => handleUpdateTier(idx, 'discountPercentage', Number(e.target.value))}
                                                style={{ width: '80px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#000000', backgroundColor: '#ffffff' }}
                                            />
                                            <span style={{ fontWeight: '700', color: '#0f172a' }}>% OFF</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
                                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Label:</span>
                                    <input
                                        type="text"
                                        placeholder="e.g. 12% OFF on ₹2000+"
                                        value={tier.label || ''}
                                        onChange={(e) => handleUpdateTier(idx, 'label', e.target.value)}
                                        style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#000000', backgroundColor: '#ffffff' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: tier.isActive ? '#10b981' : '#94a3b8' }}>
                                        <input
                                            type="checkbox"
                                            checked={tier.isActive !== false}
                                            onChange={(e) => handleUpdateTier(idx, 'isActive', e.target.checked)}
                                        />
                                        Active
                                    </label>

                                    <button
                                        onClick={() => handleDeleteTier(idx)}
                                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => handleSaveAdvancedOffers(bogoOffers, categoryDiscounts, tieredDiscounts)}
                            disabled={savingOffers}
                            style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '8px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(245,158,11,0.2)' }}
                        >
                            {savingOffers ? 'Saving Tiers...' : 'Save Tiered Discounts'}
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 2: 1+1 BOGO OFFERS (ITEM-WISE & CATEGORY-WISE) */}
            {activeTab === 'bogo' && (
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                1+1 (Buy 1 Get 1) Deals & Pairings
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px', marginBottom: 0 }}>
                                Create item-specific 1+1 deals (e.g., Buy Pizza → Get Coca Cola Free) or category-wide 1+1 offers.
                            </p>
                        </div>

                        {/* Mode Selector Pill Buttons */}
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                            <button
                                type="button"
                                onClick={() => setBogoRuleType('item')}
                                style={{
                                    border: 'none',
                                    background: bogoRuleType === 'item' ? '#d97706' : 'transparent',
                                    color: bogoRuleType === 'item' ? '#ffffff' : '#64748b',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontWeight: '700',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                🍔 Items Wise 1+1
                            </button>
                            <button
                                type="button"
                                onClick={() => setBogoRuleType('category')}
                                style={{
                                    border: 'none',
                                    background: bogoRuleType === 'category' ? '#d97706' : 'transparent',
                                    color: bogoRuleType === 'category' ? '#ffffff' : '#64748b',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontWeight: '700',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                🏷️ Category Wise 1+1
                            </button>
                        </div>
                    </div>

                    {/* New Rule Creator Box */}
                    <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '10px', border: '1px solid #fde68a', marginTop: '16px', marginBottom: '24px' }}>
                        <div style={{ fontWeight: '800', color: '#92400e', fontSize: '0.95rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>✨ Create New {bogoRuleType === 'item' ? 'Item-Wise 1+1 Deal' : 'Category-Wise 1+1 Deal'}</span>
                        </div>

                        {bogoRuleType === 'item' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '220px' }}>
                                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#92400e', marginBottom: '6px' }}>
                                        🍔 BUY THIS ITEM:
                                    </label>
                                    <select
                                        value={newBogoSourceItemId}
                                        onChange={(e) => setNewBogoSourceItemId(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600', background: '#ffffff', color: '#000000', fontSize: '0.95rem' }}
                                    >
                                        {items.map(item => {
                                            const name = item.itemName || item.name || 'Food Item';
                                            return (
                                                <option key={item._id} value={item._id} style={{ color: '#000000', background: '#ffffff' }}>
                                                    {name} — ₹{item.price} {item.category ? '(' + item.category + ')' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <span style={{ fontWeight: '900', fontSize: '1.4rem', color: '#d97706', alignSelf: 'center', marginTop: '20px' }}>➔</span>

                                <div style={{ flex: 1, minWidth: '220px' }}>
                                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#92400e', marginBottom: '6px' }}>
                                        🎁 GET THIS FREE (+1):
                                    </label>
                                    <select
                                        value={newBogoTargetItemId}
                                        onChange={(e) => setNewBogoTargetItemId(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600', background: '#ffffff', color: '#000000', fontSize: '0.95rem' }}
                                    >
                                        {items.map(item => {
                                            const name = item.itemName || item.name || 'Food Item';
                                            return (
                                                <option key={item._id} value={item._id} style={{ color: '#000000', background: '#ffffff' }}>
                                                    {name} — ₹{item.price} {item.category ? '(' + item.category + ')' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddBogoRule}
                                    style={{ background: '#d97706', color: 'white', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-end', marginTop: '20px', boxShadow: '0 2px 4px rgba(217,119,6,0.25)' }}
                                >
                                    + Add Item 1+1 Offer
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '180px' }}>
                                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#92400e', marginBottom: '6px' }}>
                                        🏷️ BUY FROM CATEGORY:
                                    </label>
                                    <select
                                        value={newBogoSource}
                                        onChange={(e) => setNewBogoSource(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600', background: '#ffffff', color: '#000000' }}
                                    >
                                        {categories.map(c => <option key={c._id} value={c.name} style={{ color: '#000000', background: '#ffffff' }}>{c.name}</option>)}
                                    </select>
                                </div>

                                <span style={{ fontWeight: '900', fontSize: '1.4rem', color: '#d97706', alignSelf: 'center', marginTop: '20px' }}>➔</span>

                                <div style={{ flex: 1, minWidth: '180px' }}>
                                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#92400e', marginBottom: '6px' }}>
                                        🎁 GET FREE FROM CATEGORY:
                                    </label>
                                    <select
                                        value={newBogoTarget}
                                        onChange={(e) => setNewBogoTarget(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600', background: '#ffffff', color: '#000000' }}
                                    >
                                        {categories.map(c => <option key={c._id} value={c.name} style={{ color: '#000000', background: '#ffffff' }}>{c.name}</option>)}
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddBogoRule}
                                    style={{ background: '#d97706', color: 'white', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-end', marginTop: '20px', boxShadow: '0 2px 4px rgba(217,119,6,0.25)' }}
                                >
                                    + Add Category 1+1 Offer
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Active BOGO Rules List */}
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#334155', marginBottom: '12px' }}>
                        Active 1+1 Offer Rules ({bogoOffers.length})
                    </h3>

                    {bogoOffers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                            No 1+1 offers created yet. Create one above!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {bogoOffers.map((bogo, idx) => {
                                const isItemRule = bogo.type === 'item';
                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{
                                                background: isItemRule ? '#fed7aa' : '#fef3c7',
                                                color: isItemRule ? '#c2410c' : '#b45309',
                                                fontWeight: '800',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.82rem'
                                            }}>
                                                {isItemRule ? '🍔 ITEM 1+1' : '🏷️ CATEGORY 1+1'}
                                            </span>
                                            {isItemRule ? (
                                                <span style={{ fontWeight: '600', color: '#1e293b' }}>
                                                    Buy <strong>{bogo.sourceItemName || 'Item'}</strong> ➔ Get <strong>{bogo.targetItemName || 'Free Item'}</strong> <span style={{ color: '#15803d', fontWeight: '800' }}>FREE (+1)</span>
                                                </span>
                                            ) : (
                                                <span style={{ fontWeight: '600', color: '#1e293b' }}>
                                                    Buy <strong>{bogo.sourceCategory}</strong> ➔ Get <strong>{bogo.targetCategory}</strong> <span style={{ color: '#15803d', fontWeight: '800' }}>FREE</span>
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleBogoRule(idx)}
                                                style={{
                                                    background: bogo.isActive !== false ? '#dcfce7' : '#f1f5f9',
                                                    color: bogo.isActive !== false ? '#15803d' : '#64748b',
                                                    border: 'none',
                                                    padding: '6px 14px',
                                                    borderRadius: '6px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {bogo.isActive !== false ? '✓ Enabled' : 'Disabled'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteBogoRule(idx)}
                                                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: CATEGORY % DISCOUNTS */}
            {activeTab === 'category' && (
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                        Category-Wide Percentage Discounts
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px', marginBottom: '20px' }}>
                        Set discount percentage for entire categories. All items belonging to the category will receive this discount.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {categories.map((cat) => {
                            const found = categoryDiscounts.find(c => c.category === cat.name);
                            const currentPct = found ? found.discountPercentage : 0;
                            return (
                                <div key={cat._id} style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '1.05rem' }}>{cat.name}</span>
                                        {currentPct > 0 && (
                                            <span style={{ background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem' }}>
                                                {currentPct}% OFF Active
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                                        {[0, 10, 20, 30, 50].map((pct) => (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => handleCategoryDiscountChange(cat.name, pct)}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 0',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    background: currentPct === pct ? '#f59e0b' : '#ffffff',
                                                    color: currentPct === pct ? '#ffffff' : '#334155',
                                                    fontWeight: '700',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={currentPct}
                                            onChange={(e) => handleCategoryDiscountChange(cat.name, e.target.value)}
                                            style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#000000', backgroundColor: '#ffffff' }}
                                        />
                                        <span style={{ fontWeight: '600', color: '#64748b' }}>% Discount</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => handleSaveAdvancedOffers(bogoOffers, categoryDiscounts, tieredDiscounts)}
                            disabled={savingOffers}
                            style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '8px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}
                        >
                            {savingOffers ? 'Saving Category Discounts...' : 'Save Category Discounts'}
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 4: EXISTING ITEM & BULK OFFERS (PRESERVED 100%) */}
            {activeTab === 'item' && (
                <div>
                    {/* Existing Bulk Offer Section */}
                    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                            ⚡ Instant Bulk Item Offer
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px', marginBottom: '16px' }}>
                            Apply a flat discount percentage across all individual menu items of {restaurantName}.
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {[0, 10, 20, 30, 50].map((pct) => (
                                    <button
                                        key={pct}
                                        type="button"
                                        onClick={() => setBulkOffer(pct.toString())}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            background: Number(bulkOffer) === pct ? '#f59e0b' : '#f8fafc',
                                            color: Number(bulkOffer) === pct ? 'white' : '#334155',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {pct}%
                                    </button>
                                ))}
                            </div>

                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={bulkOffer}
                                onChange={(e) => setBulkOffer(e.target.value)}
                                style={{ width: '80px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#000000', backgroundColor: '#ffffff' }}
                            />
                            <span style={{ fontWeight: '600', color: '#475569' }}>% Off</span>

                            {bulkSuccess ? (
                                <button disabled style={{ background: '#10b981', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '6px', fontWeight: '700' }}>
                                    Applied Successfully! ✓
                                </button>
                            ) : (
                                <button
                                    disabled={bulkSaving}
                                    onClick={handleSaveBulkOffer}
                                    style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    {bulkSaving ? 'Applying...' : 'Apply to All Items'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Existing Search & Items List */}
                    <div style={{ marginBottom: '16px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Search menu items by name or category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box', color: '#000000', backgroundColor: '#ffffff' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {filteredItems.map((item) => {
                            const localVal = offerEdits[item._id] || '0';
                            const currentPct = localVal === '' ? 0 : Number(localVal);
                            const hasDiscount = currentPct > 0;
                            const finalPrice = hasDiscount ? (item.price * (1 - currentPct / 100)).toFixed(2) : item.price;

                            return (
                                <div key={item._id} style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0' }}>{item.itemName}</h3>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>{item.category || 'No Category'}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {hasDiscount ? (
                                                <>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981' }}>₹{finalPrice}</span>
                                                    <span style={{ fontSize: '0.9rem', color: '#94a3b8', textDecoration: 'line-through' }}>₹{item.price}</span>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>₹{item.price}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                                            {[0, 10, 20, 30, 50].map((pct) => (
                                                <button
                                                    key={pct}
                                                    type="button"
                                                    onClick={() => applyPreset(item._id, pct)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px 0',
                                                        borderRadius: '4px',
                                                        border: '1px solid #cbd5e1',
                                                        background: currentPct === pct ? '#f59e0b' : '#f8fafc',
                                                        color: currentPct === pct ? 'white' : '#334155',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {pct}%
                                                </button>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={localVal}
                                                onChange={(e) => handlePercentageChange(item._id, e.target.value)}
                                                style={{ width: '60px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#000000', backgroundColor: '#ffffff' }}
                                            />
                                            <button
                                                disabled={savingId === item._id}
                                                onClick={() => handleSaveOffer(item._id)}
                                                style={{
                                                    flex: 1,
                                                    background: successId === item._id ? '#10b981' : '#f59e0b',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {savingId === item._id ? 'Saving...' : successId === item._id ? 'Saved! ✓' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
