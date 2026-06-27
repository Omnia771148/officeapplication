'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import '../dashboard/dashboard.css';

function SingleAddItemForm({ defaultRestaurantId }) {
    const [itemName, setItemName] = useState('');
    const [itemId, setItemId] = useState('');
    const [price, setPrice] = useState('');
    const [restaurantId, setRestaurantId] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (defaultRestaurantId) {
            setRestaurantId(defaultRestaurantId);
        }
    }, [defaultRestaurantId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Client-side validation to ensure all fields are filled
        if (!itemName.trim() || !itemId.trim() || !price.toString().trim() || !restaurantId.trim()) {
            setError('All fields (Item Name, Price, Item ID, and Restaurant ID) are mandatory.');
            return;
        }

        const parsedPrice = Number(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            setError('Please enter a valid positive price.');
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const res = await fetch('/api/add-item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    itemName,
                    itemId,
                    price: Number(price),
                    restaurantId,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage('Item added successfully!');
                setItemName('');
                setItemId('');
                setPrice('');
                // Keep the restaurantId populated so the user doesn't have to retype it
                if (defaultRestaurantId) {
                    setRestaurantId(defaultRestaurantId);
                } else {
                    setRestaurantId('');
                }
            } else {
                setError(data.message || 'Something went wrong.');
            }
        } catch (err) {
            setError('Failed to connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            flex: '1 1 350px',
            maxWidth: '420px',
            backgroundColor: 'white',
            borderRadius: '15px',
            padding: '30px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            border: '1px solid #f0f0f0',
            boxSizing: 'border-box'
        }}>
            <form onSubmit={handleSubmit}>
                {message && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#e6f4ea',
                        color: '#137333',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        textAlign: 'center'
                    }}>
                        {message}
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#fce8e6',
                        color: '#c5221f',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                        Item Name
                    </label>
                    <input
                        type="text"
                        required
                        className="formInput"
                        placeholder="Enter item name (e.g. Butter Chicken)"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 15px',
                            border: '1.5px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.2s',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                        Price
                    </label>
                    <input
                        type="number"
                        required
                        className="formInput"
                        step="0.01"
                        min="0"
                        placeholder="Enter price (e.g. 12.99)"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 15px',
                            border: '1.5px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.2s',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                        Item ID
                    </label>
                    <input
                        type="text"
                        required
                        className="formInput"
                        placeholder="Enter item ID (e.g. 1001)"
                        value={itemId}
                        onChange={(e) => setItemId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 15px',
                            border: '1.5px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.2s',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                        Restaurant ID
                    </label>
                    <input
                        type="text"
                        required
                        className="formInput"
                        placeholder="Enter restaurant ID"
                        value={restaurantId}
                        onChange={(e) => setRestaurantId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 15px',
                            border: '1.5px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.2s',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: loading ? '#a8eec1' : '#2ecc71',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        boxShadow: '0 4px 6px rgba(46, 204, 113, 0.2)',
                        fontFamily: 'inherit'
                    }}
                >
                    {loading ? 'Adding...' : 'Add Item'}
                </button>
            </form>
        </div>
    );
}

export default function AddItemPage() {
    const router = useRouter();
    const [defaultRestaurantId, setDefaultRestaurantId] = useState('');

    useEffect(() => {
        const storedId = localStorage.getItem('restaurantId');
        if (storedId) {
            setDefaultRestaurantId(storedId);
        }
    }, []);

    return (
        <div className="dashboardContainer" style={{ position: 'relative', paddingTop: '80px', paddingBottom: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', boxSizing: 'border-box' }}>
            <style>{`
                .formInput {
                    background-color: white !important;
                    color: black !important;
                    caret-color: black !important;
                }
                .formInput::placeholder {
                    color: #888888 !important;
                    opacity: 1 !important;
                }
                .formInput:focus {
                    border-color: #2ecc71 !important;
                    box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.2) !important;
                }
            `}</style>
            
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
                    ← Back
                </button>
            </div>
            
            <h1 className="dashboardTitle" style={{ fontSize: '2.5rem', color: '#2ecc71', marginBottom: '40px', textAlign: 'center' }}>
                Add New Items
            </h1>

            <div style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '30px',
                width: '100%',
                maxWidth: '1400px',
                padding: '0 20px',
                boxSizing: 'border-box'
            }}>
                <SingleAddItemForm defaultRestaurantId={defaultRestaurantId} />
                <SingleAddItemForm defaultRestaurantId={defaultRestaurantId} />
                <SingleAddItemForm defaultRestaurantId={defaultRestaurantId} />
            </div>
        </div>
    );
}
