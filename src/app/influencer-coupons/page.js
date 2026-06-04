'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './influencer-coupons.css';

export default function InfluencerCoupons() {
    const router = useRouter();
    const [influencerName, setInfluencerName] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!influencerName || !couponCode) {
            alert('Please fill out all fields');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/coupon-codes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ influencerName, couponCode })
            });

            const data = await res.json();

            if (data.success) {
                alert('Coupon code added successfully!');
                setInfluencerName('');
                setCouponCode('');
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

                <button type="submit" className="submitBtn" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit'}
                </button>
            </form>

            <button 
                className="backBtn"
                onClick={() => router.push('/dashboard')}
            >
                Back to Dashboard
            </button>
        </div>
    );
}
