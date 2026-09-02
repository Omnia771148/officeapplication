'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './influencer-coupons.css';

export default function InfluencerCoupons() {
    const router = useRouter();
    const [influencerName, setInfluencerName] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [discountType, setDiscountType] = useState('flat');
    const [discountValue, setDiscountValue] = useState(50);
    const [loading, setLoading] = useState(false);
    const [coupons, setCoupons] = useState([]);
    const [fetchingCoupons, setFetchingCoupons] = useState(true);

    const fetchCoupons = async () => {
        try {
            const res = await fetch('/api/coupon-codes');
            const data = await res.json();
            if (data.success) {
                setCoupons(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch coupons:', error);
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
                    discountValue: value 
                })
            });

            const data = await res.json();

            if (data.success) {
                alert('Coupon code added successfully!');
                setInfluencerName('');
                setCouponCode('');
                setDiscountType('flat');
                setDiscountValue(50);
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
                                </div>
                                <div className="couponBodyRow">
                                    <p className="influencerText"><strong>Influencer:</strong> {coupon.influencerName}</p>
                                    {coupon.createdAt && (
                                        <p className="dateText">
                                            Added: {new Date(coupon.createdAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <button 
                                    type="button" 
                                    className="deleteCouponBtn" 
                                    onClick={() => handleDelete(coupon._id)}
                                >
                                    🗑️ Delete
                                </button>
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

