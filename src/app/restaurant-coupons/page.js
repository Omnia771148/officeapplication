'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './restaurant-coupons.css';

export default function RestaurantCoupons() {
    const router = useRouter();

    // Data States
    const [restaurants, setRestaurants] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [couponCode, setCouponCode] = useState('');
    const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
    const [offerType, setOfferType] = useState('percentage'); // 'percentage' | 'money'
    const [offerValue, setOfferValue] = useState('');

    // Action States
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

    // Filter
    const [selectedFilterRest, setSelectedFilterRest] = useState('ALL');

    // Fetch initial restaurants and coupons
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

    // Handle Form Submit
    const handleSubmit = async (e) => {
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
            setSubmitting(true);
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
                // Reset form
                setCouponCode('');
                setOfferValue('');
                // Refresh list
                await fetchData();
            } else {
                showAlert(data.message || data.error || 'Failed to save coupon', 'error');
            }
        } catch (err) {
            console.error('Error adding coupon:', err);
            showAlert('Server error while saving coupon', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Delete
    const handleDelete = async (coupon) => {
        const confirmDelete = window.confirm(
            `Are you sure you want to delete coupon "${coupon.couponCode}" for ${coupon.restaurantName}?`
        );
        if (!confirmDelete) return;

        try {
            setDeletingId(coupon._id);
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
            setDeletingId(null);
        }
    };

    // Filtered coupons
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
                    <h1 className="rcMainTitle">Restaurant Coupon Codes</h1>
                    <p className="rcSubtitle">Manage discount coupons directly for each restaurant</p>
                </div>
                <div style={{ width: '130px' }} /> {/* Spacer to balance header */}
            </div>

            {/* Notification Alert */}
            {alertMsg.text && (
                <div style={{ width: '100%', maxWidth: '900px' }}>
                    <div className={`rcAlert ${alertMsg.type === 'error' ? 'rcAlertError' : 'rcAlertSuccess'}`}>
                        <span>{alertMsg.type === 'error' ? '⚠️' : '✅'}</span>
                        <span>{alertMsg.text}</span>
                    </div>
                </div>
            )}

            {/* Creation Form Card */}
            <div className="rcFormCard">
                <div className="rcFormHeading">
                    <span>🏷️</span>
                    <span>Create Restaurant Coupon</span>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Row 1: Coupon Code & Restaurant Dropdown Beside It */}
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
                        disabled={submitting || loading}
                    >
                        {submitting ? (
                            <>
                                <span className="rcSpinner" />
                                <span>Saving to Restaurant Users...</span>
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
                                        disabled={deletingId === coupon._id}
                                        onClick={() => handleDelete(coupon)}
                                        title="Delete this coupon"
                                    >
                                        {deletingId === coupon._id ? (
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
        </div>
    );
}
