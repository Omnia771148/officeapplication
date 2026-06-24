'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BranchItemsPage() {
    const router = useRouter();
    const [restaurantId, setRestaurantId] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [togglingId, setTogglingId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

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
                body: JSON.stringify({ itemId, [propertyName]: nextStatus })
            });
            const data = await res.json();
            if (data.success) {
                setItems(prevItems => 
                    prevItems.map(item => 
                        item._id === itemId ? { ...item, [propertyName]: nextStatus } : item
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
                @media (max-width: 600px) {
                    .itemsPageContainer {
                        padding: 20px;
                    }
                    .itemsHeader {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .btnBackHeader, .btnAddItem {
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
                <Link href="/add-item" className="btnAddItem">
                    + Add New Item
                </Link>
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
                            <div>
                                <h3 className="itemName">{item.itemName}</h3>
                                <div className="itemPrice">₹{item.price}</div>
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
