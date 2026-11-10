'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import './restaurant-coupons.css';

export default function RestaurantCoupons() {
    const router = useRouter();

    // Active Tab: 'free_delivery' | 'coupons'
    const [activeTab, setActiveTab] = useState('free_delivery');

    // Data States
    const [restaurants, setRestaurants] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);

    // Free Delivery Selection & Action States
    const [selectedRestIds, setSelectedRestIds] = useState(new Set());
    const [restSearchQuery, setRestSearchQuery] = useState('');
    const [restFilterMode, setRestFilterMode] = useState('all'); // 'all' | 'without_free' | 'with_free'
    const [submittingFreeDelivery, setSubmittingFreeDelivery] = useState(false);
    const [deletingFreeId, setDeletingFreeId] = useState(null);
    const [freeSearchQuery, setFreeSearchQuery] = useState('');

    // Coupon Code Form States
    const [couponCode, setCouponCode] = useState('');
    const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
    const [offerType, setOfferType] = useState('percentage'); // 'percentage' | 'money'
    const [offerValue, setOfferValue] = useState('');
    const [submittingCoupon, setSubmittingCoupon] = useState(false);
    const [deletingCouponId, setDeletingCouponId] = useState(null);
    const [selectedFilterRest, setSelectedFilterRest] = useState('ALL');

    // Feedback Alert
    const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

    // Fetch initial restaurants, coupons, and free delivery info
    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/restaurant-coupons');
            const data = await res.json();
            if (data.success) {
                setRestaurants(data.restaurants || []);
                setCoupons(data.coupons || []);
            } else {
                showAlert(data.error || 'Failed to fetch data', 'error');
            }
        } catch (err) {
            console.error('Error fetching restaurant coupons:', err);
            showAlert('Network error while fetching data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const showAlert = (text, type = 'success') => {
        setAlertMsg({ text, type });
        setTimeout(() => {
            setAlertMsg({ text: '', type: '' });
        }, 5000);
    };

    // Derived active free delivery restaurants list
    const freeDeliveryRestaurants = useMemo(() => {
        return restaurants.filter(r => r.isFreeDelivery);
    }, [restaurants]);

    // Filtered restaurants for multi-select selector
    const filteredRestaurantsForSelection = useMemo(() => {
        return restaurants.filter(r => {
            // Filter by search query
            const q = restSearchQuery.trim().toLowerCase();
            const matchesQuery = !q ||
                (r.name && r.name.toLowerCase().includes(q)) ||
                (r.restLocation && r.restLocation.toLowerCase().includes(q)) ||
                (r.restId && String(r.restId).toLowerCase().includes(q));

            if (!matchesQuery) return false;

            // Filter by mode
            if (restFilterMode === 'without_free') {
                return !r.isFreeDelivery;
            }
            if (restFilterMode === 'with_free') {
                return r.isFreeDelivery;
            }
            return true;
        });
    }, [restaurants, restSearchQuery, restFilterMode]);

    // Filtered active free delivery restaurants for the display list
    const displayedFreeDeliveryList = useMemo(() => {
        const q = freeSearchQuery.trim().toLowerCase();
        if (!q) return freeDeliveryRestaurants;
        return freeDeliveryRestaurants.filter(r =>
            (r.name && r.name.toLowerCase().includes(q)) ||
            (r.restLocation && r.restLocation.toLowerCase().includes(q)) ||
            (r.restId && String(r.restId).toLowerCase().includes(q))
        );
    }, [freeDeliveryRestaurants, freeSearchQuery]);

    // Handle restaurant selection toggle
    const handleToggleSelectRest = (id) => {
        setSelectedRestIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Select all filtered restaurants
    const handleSelectAllFiltered = () => {
        setSelectedRestIds(prev => {
            const next = new Set(prev);
            filteredRestaurantsForSelection.forEach(r => next.add(r._id));
            return next;
        });
    };

    // Deselect all
    const handleDeselectAll = () => {
        setSelectedRestIds(new Set());
    };

    // Apply Free Delivery to selected restaurants
    const handleApplyFreeDelivery = async () => {
        if (selectedRestIds.size === 0) {
            showAlert('Please select at least one restaurant to apply Free Delivery', 'error');
            return;
        }

        try {
            setSubmittingFreeDelivery(true);
            const res = await fetch('/api/restaurant-coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set_free_delivery',
                    restaurantIds: Array.from(selectedRestIds)
                })
            });

            const data = await res.json();
            if (data.success) {
                showAlert(data.message || `Free delivery offer applied to ${selectedRestIds.size} restaurant(s)!`, 'success');
                // Optimistically update restaurants list
                setRestaurants(prev =>
                    prev.map(r => selectedRestIds.has(r._id) ? { ...r, isFreeDelivery: true, freeDeliveryAddedAt: new Date() } : r)
                );
                setSelectedRestIds(new Set());
                await fetchData();
            } else {
                showAlert(data.message || data.error || 'Failed to update Free Delivery', 'error');
            }
        } catch (err) {
            console.error('Error enabling free delivery:', err);
            showAlert('Server error while saving Free Delivery offer', 'error');
        } finally {
            setSubmittingFreeDelivery(false);
        }
    };

    // Remove Free Delivery from selected restaurants
    const handleRemoveSelectedFreeDelivery = async () => {
        if (selectedRestIds.size === 0) {
            showAlert('Please select at least one restaurant to remove Free Delivery', 'error');
            return;
        }

        const confirmRemove = window.confirm(
            `Are you sure you want to remove Free Delivery from the ${selectedRestIds.size} selected restaurant(s)?`
        );
        if (!confirmRemove) return;

        try {
            setSubmittingFreeDelivery(true);
            const res = await fetch('/api/restaurant-coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'remove_free_delivery',
                    restaurantIds: Array.from(selectedRestIds)
                })
            });

            const data = await res.json();
            if (data.success) {
                showAlert(data.message || 'Free delivery offer removed from selected restaurants', 'success');
                setRestaurants(prev =>
                    prev.map(r => selectedRestIds.has(r._id) ? { ...r, isFreeDelivery: false, freeDeliveryAddedAt: null } : r)
                );
                setSelectedRestIds(new Set());
                await fetchData();
            } else {
                showAlert(data.message || data.error || 'Failed to remove Free Delivery', 'error');
            }
        } catch (err) {
            console.error('Error removing free delivery:', err);
            showAlert('Server error while removing Free Delivery', 'error');
        } finally {
            setSubmittingFreeDelivery(false);
        }
    };

    // Delete / Remove single Free Delivery offer
    const handleDeleteSingleFreeDelivery = async (restaurant) => {
        const confirmDelete = window.confirm(
            `Are you sure you want to remove Free Delivery offer from "${restaurant.name}"? Customers will be charged normal delivery fees.`
        );
        if (!confirmDelete) return;

        try {
            setDeletingFreeId(restaurant._id);
            const res = await fetch(
                `/api/restaurant-coupons?action=free_delivery&restaurantId=${encodeURIComponent(restaurant._id)}`,
                { method: 'DELETE' }
            );

            const data = await res.json();
            if (data.success) {
                showAlert(`Free delivery removed from "${restaurant.name}"`, 'success');
                setRestaurants(prev =>
                    prev.map(r => r._id === restaurant._id ? { ...r, isFreeDelivery: false, freeDeliveryAddedAt: null } : r)
                );
            } else {
                showAlert(data.message || data.error || 'Failed to remove Free Delivery', 'error');
            }
        } catch (err) {
            console.error('Error deleting free delivery offer:', err);
            showAlert('Server error while removing Free Delivery offer', 'error');
        } finally {
            setDeletingFreeId(null);
        }
    };

    // Handle Coupon Form Submit
    const handleSubmitCoupon = async (e) => {
        e.preventDefault();

        const trimmedCode = couponCode.trim().toUpperCase();
        if (!trimmedCode) {
            showAlert('Please enter a coupon code', 'error');
            return;
        }

        if (!selectedRestaurantId) {
            showAlert('Please select a restaurant from the dropdown', 'error');
            return;
        }

        const numVal = Number(offerValue);
        if (!offerValue || isNaN(numVal) || numVal <= 0) {
            showAlert('Please enter a valid positive discount value', 'error');
            return;
        }

        if (offerType === 'percentage' && numVal > 100) {
            showAlert('Percentage offer cannot be greater than 100%', 'error');
            return;
        }

        try {
            setSubmittingCoupon(true);
            const res = await fetch('/api/restaurant-coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: selectedRestaurantId,
                    couponCode: trimmedCode,
                    offerType,
                    offerValue: numVal
                })
            });

            const data = await res.json();
            if (data.success) {
                showAlert(data.message || 'Coupon added successfully!', 'success');
                setCouponCode('');
                setOfferValue('');
                await fetchData();
            } else {
                showAlert(data.message || data.error || 'Failed to save coupon', 'error');
            }
        } catch (err) {
            console.error('Error adding coupon:', err);
            showAlert('Server error while saving coupon', 'error');
        } finally {
            setSubmittingCoupon(false);
        }
    };

    // Handle Coupon Delete
    const handleDeleteCoupon = async (coupon) => {
        const confirmDelete = window.confirm(
            `Are you sure you want to delete coupon "${coupon.couponCode}" for ${coupon.restaurantName}?`
        );
        if (!confirmDelete) return;

        try {
            setDeletingCouponId(coupon._id);
            const res = await fetch(
                `/api/restaurant-coupons?restaurantId=${encodeURIComponent(coupon.restaurantId)}&couponId=${encodeURIComponent(coupon._id)}&couponCode=${encodeURIComponent(coupon.couponCode)}`,
                { method: 'DELETE' }
            );

            const data = await res.json();
            if (data.success) {
                showAlert(`Coupon "${coupon.couponCode}" deleted successfully`, 'success');
                setCoupons(prev => prev.filter(c => c._id !== coupon._id));
            } else {
                showAlert(data.message || data.error || 'Failed to delete coupon', 'error');
            }
        } catch (err) {
            console.error('Error deleting coupon:', err);
            showAlert('Server error while deleting coupon', 'error');
        } finally {
            setDeletingCouponId(null);
        }
    };

    // Filtered coupons for Coupons tab
    const filteredCoupons = selectedFilterRest === 'ALL'
        ? coupons
        : coupons.filter(c => c.restaurantId === selectedFilterRest || c.restId === selectedFilterRest);

    return (
        <div className="rcPageContainer">
            {/* Top Navigation */}
            <div className="rcHeader">
                <button className="rcBackBtn" onClick={() => router.push('/dashboard')}>
                    ← Back to Dashboard
                </button>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <h1 className="rcMainTitle">Restaurant Coupons & Offers</h1>
                    <p className="rcSubtitle">Manage 100% Free Delivery offers and discount coupon codes for restaurants</p>
                </div>
                <div style={{ width: '130px' }} /> {/* Header spacer */}
            </div>

            {/* Notification Alert */}
            {alertMsg.text && (
                <div style={{ width: '100%', maxWidth: '950px' }}>
                    <div className={`rcAlert ${alertMsg.type === 'error' ? 'rcAlertError' : 'rcAlertSuccess'}`}>
                        <span>{alertMsg.type === 'error' ? '⚠️' : '✅'}</span>
                        <span>{alertMsg.text}</span>
                    </div>
                </div>
            )}

            {/* Tab Switcher */}
            <div className="rcTabsContainer">
                <button
                    type="button"
                    className={`rcTabButton ${activeTab === 'free_delivery' ? 'active' : ''}`}
                    onClick={() => setActiveTab('free_delivery')}
                >
                    <span>🚚 Free Delivery Offer</span>
                    <span className="rcTabBadge">{freeDeliveryRestaurants.length} Active</span>
                </button>

                <button
                    type="button"
                    className={`rcTabButton ${activeTab === 'coupons' ? 'active' : ''}`}
                    onClick={() => setActiveTab('coupons')}
                >
                    <span>🏷️ Discount Coupon Codes</span>
                    <span className="rcTabBadge">{coupons.length} Active</span>
                </button>
            </div>

            {/* ========================================================= */}
            {/* TAB 1: FREE DELIVERY OFFER MANAGER                       */}
            {/* ========================================================= */}
            {activeTab === 'free_delivery' && (
                <>
                    {/* Stats Row */}
                    <div className="rcStatsRow">
                        <div className="rcStatCard">
                            <div className="rcStatIcon">🏪</div>
                            <div className="rcStatInfo">
                                <div className="rcStatVal">{restaurants.length}</div>
                                <div className="rcStatLabel">Total Restaurants</div>
                            </div>
                        </div>

                        <div className="rcStatCard" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                            <div className="rcStatIcon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>🚚</div>
                            <div className="rcStatInfo">
                                <div className="rcStatVal" style={{ color: '#34d399' }}>{freeDeliveryRestaurants.length}</div>
                                <div className="rcStatLabel">Free Delivery Active (₹0 Fee)</div>
                            </div>
                        </div>

                        <div className="rcStatCard">
                            <div className="rcStatIcon">📦</div>
                            <div className="rcStatInfo">
                                <div className="rcStatVal">{Math.max(0, restaurants.length - freeDeliveryRestaurants.length)}</div>
                                <div className="rcStatLabel">Standard Delivery Charge</div>
                            </div>
                        </div>
                    </div>

                    {/* Restaurant Multi-Select & Apply Card */}
                    <div className="rcFormCard">
                        <div className="rcFormHeading">
                            <span>🎁</span>
                            <span>Give Free Delivery to Restaurants</span>
                        </div>
                        <p className="rcFormDesc">
                            Select all restaurants or choose specific restaurants what you have. Customers ordering from these restaurants will enjoy <strong>100% Free Delivery (₹0 delivery charge)</strong> in the Customer App.
                        </p>

                        {/* Search & Bulk Selection Toolbar */}
                        <div className="rcToolbar">
                            <div className="rcSearchBox">
                                <span className="rcSearchIcon">🔍</span>
                                <input
                                    type="text"
                                    className="rcSearchInput"
                                    placeholder="Search restaurants by name, location or ID..."
                                    value={restSearchQuery}
                                    onChange={(e) => setRestSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="rcBtnGroup">
                                <button
                                    type="button"
                                    className="rcSmallBtn"
                                    onClick={handleSelectAllFiltered}
                                    title="Select all visible restaurants"
                                >
                                    ✓ Select All ({filteredRestaurantsForSelection.length})
                                </button>
                                <button
                                    type="button"
                                    className="rcSmallBtn"
                                    onClick={handleDeselectAll}
                                    title="Deselect all"
                                >
                                    ✕ Clear
                                </button>

                                <select
                                    className="rcFilterSelect"
                                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                    value={restFilterMode}
                                    onChange={(e) => setRestFilterMode(e.target.value)}
                                >
                                    <option value="all">All Restaurants ({restaurants.length})</option>
                                    <option value="without_free">
                                        Without Free Delivery ({restaurants.filter(r => !r.isFreeDelivery).length})
                                    </option>
                                    <option value="with_free">
                                        With Free Delivery ({freeDeliveryRestaurants.length})
                                    </option>
                                </select>
                            </div>
                        </div>

                        {/* Interactive Restaurant Cards Grid with Checkboxes */}
                        {loading ? (
                            <div className="rcEmptyBox" style={{ padding: '30px' }}>
                                <div className="rcEmptyIcon">⏳</div>
                                <div>Loading restaurants...</div>
                            </div>
                        ) : filteredRestaurantsForSelection.length === 0 ? (
                            <div className="rcEmptyBox" style={{ padding: '30px' }}>
                                <div className="rcEmptyIcon">🔍</div>
                                <div>No restaurants match your search query or filter.</div>
                            </div>
                        ) : (
                            <div className="rcSelectionGrid">
                                {filteredRestaurantsForSelection.map((rest) => {
                                    const isSelected = selectedRestIds.has(rest._id);
                                    return (
                                        <div
                                            key={rest._id}
                                            className={`rcRestSelectCard ${isSelected ? 'selected' : ''} ${rest.isFreeDelivery ? 'hasFree' : ''}`}
                                            onClick={() => handleToggleSelectRest(rest._id)}
                                        >
                                            <input
                                                type="checkbox"
                                                className="rcCheckbox"
                                                checked={isSelected}
                                                onChange={() => {}} // Controlled by card onClick
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="rcRestCardBody">
                                                <div className="rcRestCardName" title={rest.name}>
                                                    {rest.name}
                                                </div>
                                                <div className="rcRestCardLoc" title={rest.restLocation || rest.restId}>
                                                    {rest.restLocation ? `📍 ${rest.restLocation}` : `ID: ${rest.restId}`}
                                                </div>
                                                {rest.isFreeDelivery && (
                                                    <span className="rcBadgeActiveFree">
                                                        🚚 Free Delivery Active
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Footer Action Bar */}
                        <div className="rcActionFooter">
                            <div className="rcSelectedSummary">
                                Selected: <strong>{selectedRestIds.size}</strong> of {restaurants.length} restaurant(s)
                            </div>

                            <div className="rcActionButtons">
                                {selectedRestIds.size > 0 && (
                                    <button
                                        type="button"
                                        className="rcSecondaryRemoveBtn"
                                        disabled={submittingFreeDelivery || loading}
                                        onClick={handleRemoveSelectedFreeDelivery}
                                        title="Remove Free Delivery from selected"
                                    >
                                        <span>🗑️ Remove Free Delivery</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="rcPrimaryApplyBtn"
                                    disabled={submittingFreeDelivery || loading || selectedRestIds.size === 0}
                                    onClick={handleApplyFreeDelivery}
                                >
                                    {submittingFreeDelivery ? (
                                        <>
                                            <span className="rcSpinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                                            <span>Applying Free Delivery to DB...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>🚀</span>
                                            <span>Give Free Delivery ({selectedRestIds.size} Selected)</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Active Free Delivery Restaurants List (with Delete Option) */}
                    <div className="rcActiveSection">
                        <div className="rcListHeaderRow">
                            <div className="rcSectionTitle">
                                <span>🚚</span>
                                <span>Restaurants with Active Free Delivery Offer</span>
                                <span className="rcCountBadgeGreen">{freeDeliveryRestaurants.length}</span>
                            </div>

                            {/* Search box for active free delivery list */}
                            {freeDeliveryRestaurants.length > 0 && (
                                <div className="rcSearchBox" style={{ maxWidth: '280px' }}>
                                    <span className="rcSearchIcon">🔍</span>
                                    <input
                                        type="text"
                                        className="rcSearchInput"
                                        placeholder="Filter active restaurants..."
                                        value={freeSearchQuery}
                                        onChange={(e) => setFreeSearchQuery(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Empty State */}
                        {!loading && freeDeliveryRestaurants.length === 0 && (
                            <div className="rcEmptyBox">
                                <div className="rcEmptyIcon">🚚</div>
                                <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                                    No Restaurants Have Free Delivery Yet
                                </div>
                                <div>
                                    Select restaurants in the card above and click <strong>&quot;Give Free Delivery&quot;</strong> to grant ₹0 delivery charge to customers.
                                </div>
                            </div>
                        )}

                        {/* Active Cards Grid */}
                        {!loading && freeDeliveryRestaurants.length > 0 && (
                            <div className="rcActiveGrid">
                                {displayedFreeDeliveryList.map((rest) => (
                                    <div key={rest._id} className="rcActiveCard">
                                        <div className="rcCardTop">
                                            <div className="rcRestBadge">
                                                <div className="rcRestName">{rest.name}</div>
                                                {rest.restLocation && (
                                                    <div className="rcRestLoc">📍 {rest.restLocation}</div>
                                                )}
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                                                    ID: {rest.restId}
                                                </div>
                                            </div>

                                            <div className="rcActiveBadgePill">
                                                <span>🚚 ₹0 DELIVERY</span>
                                            </div>
                                        </div>

                                        <div className="rcCardBottom">
                                            <div className="rcDateText">
                                                {rest.freeDeliveryAddedAt
                                                    ? `Activated ${new Date(rest.freeDeliveryAddedAt).toLocaleDateString(undefined, {
                                                          month: 'short',
                                                          day: 'numeric',
                                                          year: 'numeric'
                                                      })}`
                                                    : 'Offer Active'}
                                            </div>

                                            {/* Delete Option */}
                                            <button
                                                type="button"
                                                className="rcDeleteBtn"
                                                disabled={deletingFreeId === rest._id}
                                                onClick={() => handleDeleteSingleFreeDelivery(rest)}
                                                title={`Remove Free Delivery offer from ${rest.name}`}
                                            >
                                                {deletingFreeId === rest._id ? (
                                                    <>
                                                        <span className="rcSpinner" style={{ width: 12, height: 12 }} />
                                                        <span>Deleting...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>🗑️</span>
                                                        <span>Delete Offer</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ========================================================= */}
            {/* TAB 2: REGULAR RESTAURANT COUPON CODES                   */}
            {/* ========================================================= */}
            {activeTab === 'coupons' && (
                <>
                    {/* Creation Form Card */}
                    <div className="rcFormCard">
                        <div className="rcFormHeading">
                            <span>🏷️</span>
                            <span>Create Restaurant Coupon</span>
                        </div>
                        <p className="rcFormDesc">
                            Generate unique coupon codes tied to specific restaurants. Customers can apply these codes at checkout for flat or percentage discounts.
                        </p>

                        <form onSubmit={handleSubmitCoupon}>
                            {/* Row 1: Coupon Code & Restaurant Dropdown */}
                            <div className="rcRow">
                                <div className="rcFieldCol">
                                    <label className="rcLabel" htmlFor="couponCodeInput">
                                        <span>🎟️</span>
                                        <span>Coupon Code Text</span>
                                    </label>
                                    <input
                                        id="couponCodeInput"
                                        type="text"
                                        className="rcInput"
                                        placeholder="e.g. WELCOME50"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>

                                <div className="rcFieldCol">
                                    <label className="rcLabel" htmlFor="restaurantSelect">
                                        <span>🏪</span>
                                        <span>Restaurant Name</span>
                                    </label>
                                    <select
                                        id="restaurantSelect"
                                        className="rcSelect"
                                        value={selectedRestaurantId}
                                        onChange={(e) => setSelectedRestaurantId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Choose a Restaurant --</option>
                                        {restaurants.map((rest) => (
                                            <option key={rest._id} value={rest._id}>
                                                {rest.name} {rest.restLocation ? `(${rest.restLocation})` : ''} [ID: {rest.restId}]
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Radio Button (Percent Offer or Money Offer) */}
                            <div className="rcRadioSection">
                                <label className="rcLabel">
                                    <span>🎁</span>
                                    <span>Offer Type (Choose Percentage or Flat Money)</span>
                                </label>
                                <div className="rcRadioGroup">
                                    <label className={`rcRadioLabel ${offerType === 'percentage' ? 'active' : ''}`}>
                                        <input
                                            type="radio"
                                            name="offerType"
                                            value="percentage"
                                            checked={offerType === 'percentage'}
                                            onChange={() => setOfferType('percentage')}
                                        />
                                        <span className="rcRadioText">Percentage Offer (%)</span>
                                        <span className="rcRadioSub">e.g. 20% OFF</span>
                                    </label>

                                    <label className={`rcRadioLabel ${offerType === 'money' ? 'active' : ''}`}>
                                        <input
                                            type="radio"
                                            name="offerType"
                                            value="money"
                                            checked={offerType === 'money'}
                                            onChange={() => setOfferType('money')}
                                        />
                                        <span className="rcRadioText">Money Offer (₹ Flat)</span>
                                        <span className="rcRadioSub">e.g. ₹50 OFF</span>
                                    </label>
                                </div>
                            </div>

                            {/* Row 3: Percentage / Money Offer Value */}
                            <div className="rcValueRow">
                                <div className="rcFieldCol">
                                    <label className="rcLabel" htmlFor="offerValueInput">
                                        <span>💰</span>
                                        <span>
                                            {offerType === 'percentage'
                                                ? 'Enter Percentage Value (1 - 100%)'
                                                : 'Enter Money Offer Amount (₹)'}
                                        </span>
                                    </label>
                                    <div className="rcInputWithIcon">
                                        <span className="rcPrefixBadge">
                                            {offerType === 'percentage' ? '%' : '₹'}
                                        </span>
                                        <input
                                            id="offerValueInput"
                                            type="number"
                                            min="1"
                                            max={offerType === 'percentage' ? '100' : '100000'}
                                            step="any"
                                            className="rcInput rcInputPadded"
                                            placeholder={offerType === 'percentage' ? 'e.g. 20' : 'e.g. 50'}
                                            value={offerValue}
                                            onChange={(e) => setOfferValue(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="rcSubmitBtn"
                                disabled={submittingCoupon || loading}
                            >
                                {submittingCoupon ? (
                                    <>
                                        <span className="rcSpinner" />
                                        <span>Saving Coupon Code...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>💾</span>
                                        <span>Save Coupon Code</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Existing Coupons Section with Delete Option */}
                    <div className="rcListSection">
                        <div className="rcListHeaderRow">
                            <div className="rcSectionTitle">
                                <span>📋</span>
                                <span>Existing Restaurant Coupons</span>
                                <span className="rcCountBadge">{filteredCoupons.length}</span>
                            </div>

                            {/* Filter Dropdown */}
                            <div className="rcFilterBox">
                                <span style={{ fontSize: '0.88rem', color: '#94a3b8' }}>Filter:</span>
                                <select
                                    className="rcFilterSelect"
                                    value={selectedFilterRest}
                                    onChange={(e) => setSelectedFilterRest(e.target.value)}
                                >
                                    <option value="ALL">All Restaurants</option>
                                    {restaurants.map((rest) => (
                                        <option key={rest._id} value={rest._id}>
                                            {rest.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="rcEmptyBox">
                                <div className="rcEmptyIcon">⏳</div>
                                <div>Loading restaurant coupons...</div>
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && filteredCoupons.length === 0 && (
                            <div className="rcEmptyBox">
                                <div className="rcEmptyIcon">🏷️</div>
                                <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                                    No Coupons Found
                                </div>
                                <div>
                                    {selectedFilterRest === 'ALL'
                                        ? 'No restaurant coupons have been added yet. Use the form above to create one.'
                                        : 'No coupons exist for the selected restaurant.'}
                                </div>
                            </div>
                        )}

                        {/* Cards Grid */}
                        {!loading && filteredCoupons.length > 0 && (
                            <div className="rcCardsGrid">
                                {filteredCoupons.map((coupon) => (
                                    <div key={coupon._id} className="rcCouponCard">
                                        <div className="rcCardTop">
                                            <div className="rcRestBadge">
                                                <div className="rcRestName">{coupon.restaurantName}</div>
                                                {coupon.restLocation && (
                                                    <div className="rcRestLoc">📍 {coupon.restLocation}</div>
                                                )}
                                            </div>
                                            <span
                                                className={`rcOfferBadge ${
                                                    coupon.offerType === 'percentage'
                                                        ? 'rcOfferPercentage'
                                                        : 'rcOfferMoney'
                                                }`}
                                            >
                                                {coupon.offerType === 'percentage'
                                                    ? `${coupon.offerValue}% OFF`
                                                    : `₹${coupon.offerValue} FLAT`}
                                            </span>
                                        </div>

                                        <div className="rcCodeDisplay">
                                            <div className="rcCodeTag">{coupon.couponCode}</div>
                                        </div>

                                        <div className="rcCardBottom">
                                            <div className="rcDateText">
                                                {coupon.createdAt
                                                    ? new Date(coupon.createdAt).toLocaleDateString(undefined, {
                                                          month: 'short',
                                                          day: 'numeric',
                                                          year: 'numeric'
                                                      })
                                                    : ''}
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                type="button"
                                                className="rcDeleteBtn"
                                                disabled={deletingCouponId === coupon._id}
                                                onClick={() => handleDeleteCoupon(coupon)}
                                                title="Delete this coupon"
                                            >
                                                {deletingCouponId === coupon._id ? (
                                                    <>
                                                        <span className="rcSpinner" style={{ width: 12, height: 12 }} />
                                                        <span>Deleting...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>🗑️</span>
                                                        <span>Delete</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
