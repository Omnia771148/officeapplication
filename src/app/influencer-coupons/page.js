'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './influencer-coupons.css';

export default function InfluencerCoupons() {
    const [coupons, setCoupons] = useState([]);
    const [influencerName, setInfluencerName] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [discountType, setDiscountType] = useState('flat');
    const [discountValue, setDiscountValue] = useState(50);
    const [minOrderAmount, setMinOrderAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingCoupons, setFetchingCoupons] = useState(true);
    const router = useRouter();

    const fetchCoupons = async () => {
        try {
            setFetchingCoupons(true);
            const res = await fetch('/api/coupon-codes');
            const data = await res.json();
            if (data.success) {
                setCoupons(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching coupons', error);
        } finally {
            setFetchingCoupons(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleDiscountTypeChange = (type) => {
        setDiscountType(type);
        setDiscountValue(type === 'flat' ? 50 : 10);
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            const nextStatus = currentStatus === false ? true : false;
            const res = await fetch('/api/coupon-codes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: nextStatus })
            });
            const data = await res.json();
            if (data.success) {
                fetchCoupons();
            } else {
                alert(data.message || 'Failed to update coupon status');
            }
        } catch (error) {
            console.error('Error toggling coupon status:', error);
            alert('Failed to update status');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!influencerName || !couponCode || discountValue === undefined || discountValue === '') {
            alert('Please fill out all fields');
            return;
        }

        const value = Number(discountValue);
        if (isNaN(value) || value <= 0) {
            alert('Discount value must be a positive number');
            return;
        }

        if (discountType === 'percentage' && value > 100) {
            alert('Percentage discount cannot exceed 100%');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/coupon-codes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    influencerName, 
                    couponCode, 
                    discountType, 
                    discountValue: value,
                    minOrderAmount: minOrderAmount !== '' ? Number(minOrderAmount) : 0
                })
            });

            const data = await res.json();

            if (data.success) {
                alert('Coupon code added successfully!');
                setInfluencerName('');
                setCouponCode('');
                setDiscountType('flat');
                setDiscountValue(50);
                setMinOrderAmount('');
                fetchCoupons();
            } else {
                alert(data.message || 'Error adding coupon code');
            }
        } catch (error) {
            console.error('Error submitting form', error);
            alert('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this coupon code?')) return;
        try {
            const res = await fetch(`/api/coupon-codes?id=${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                alert('Coupon code deleted successfully!');
                fetchCoupons();
            } else {
                alert(data.message || 'Failed to delete coupon');
            }
        } catch (error) {
            console.error('Error deleting coupon:', error);
            alert('Failed to delete coupon');
        }
    };

    return (
        <div className="container">
            <h1 className="title">Add Influencer Coupon</h1>
            <form className="formCard" onSubmit={handleSubmit}>
                <div className="inputGroup">
                    <label>Influencer Name</label>
                    <input 
                        type="text" 
                        value={influencerName} 
                        onChange={(e) => setInfluencerName(e.target.value)} 
                        placeholder="e.g. John Doe"
                    />
                </div>
                
                <div className="inputGroup">
                    <label>Coupon Code</label>
                    <input 
                        type="text" 
                        value={couponCode} 
                        onChange={(e) => setCouponCode(e.target.value)} 
                        placeholder="e.g. JOHN50"
                    />
                </div>

                <div className="inputGroup">
                    <label>Discount Type</label>
                    <select 
                        value={discountType} 
                        onChange={(e) => handleDiscountTypeChange(e.target.value)}
                        className="selectField"
                    >
                        <option value="flat">Flat Amount (₹)</option>
                        <option value="percentage">Percentage (%)</option>
                    </select>
                </div>

                <div className="inputGroup">
                    <label>{discountType === 'flat' ? 'Discount Amount (₹)' : 'Discount Percentage (%)'}</label>
                    <input 
                        type="number" 
                        value={discountValue} 
                        onChange={(e) => setDiscountValue(e.target.value)} 
                        placeholder={discountType === 'flat' ? 'e.g. 50' : 'e.g. 10'}
                        min="1"
                        max={discountType === 'percentage' ? "100" : undefined}
                    />
                </div>

                <div className="inputGroup">
                    <label>Minimum Order Amount (₹)</label>
                    <input 
                        type="number" 
                        value={minOrderAmount} 
                        onChange={(e) => setMinOrderAmount(e.target.value)} 
                        placeholder="e.g. 199 (0 or empty for no minimum)"
                        min="0"
                    />
                </div>

                <button type="submit" className="submitBtn" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit'}
                </button>
            </form>

            <div className="couponsSection">
                <h2 className="sectionTitle">Existing Coupon Codes ({coupons.length})</h2>
                {fetchingCoupons ? (
                    <p className="loadingText">⏳ Loading coupon codes...</p>
                ) : coupons.length === 0 ? (
                    <p className="noCouponsText">No existing coupon codes found.</p>
                ) : (
                    <div className="couponsGrid">
                        {coupons.map((coupon) => (
                            <div key={coupon._id} className="couponItemCard">
                                <div className="couponHeaderRow">
                                    <span className="couponCodeBadge">{coupon.couponCode}</span>
                                    <span className="discountBadge">
                                        {coupon.discountType === 'percentage' 
                                            ? `${coupon.discountValue}% OFF` 
                                            : `₹${coupon.discountValue} OFF`}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#1B5E20', backgroundColor: '#E8F5E9', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold', border: '1px solid #C8E6C9' }}>
                                        1-Use Per Customer
                                    </span>
                                </div>
                                <div className="couponBodyRow">
                                    <p className="influencerText"><strong>Influencer:</strong> {coupon.influencerName}</p>
                                    <p className="influencerText"><strong>Min Order:</strong> {coupon.minOrderAmount ? `₹${coupon.minOrderAmount}` : 'No Minimum'}</p>
                                    {coupon.createdAt && (
                                        <p className="dateText">
                                            Added: {new Date(coupon.createdAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => handleToggleStatus(coupon._id, coupon.isActive)}
                                        style={{
                                            backgroundColor: coupon.isActive !== false ? '#2e7d32' : '#d32f2f',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        {coupon.isActive !== false ? '🟢 ON (Active)' : '🔴 OFF (Inactive)'}
                                    </button>

                                    <button 
                                        type="button" 
                                        className="deleteCouponBtn" 
                                        onClick={() => handleDelete(coupon._id)}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button 
                className="backBtn"
                onClick={() => router.push('/dashboard')}
            >
                Back to Dashboard
            </button>
        </div>
    );
}
