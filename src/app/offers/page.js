'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OffersPage() {
    const router = useRouter();
    const [restaurantId, setRestaurantId] = useState(null);
    const [restaurantName, setRestaurantName] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    // Track local edits to offer percentages: { [itemId]: value }
    const [offerEdits, setOfferEdits] = useState({});
    
    // Status tracking for save actions
    const [savingId, setSavingId] = useState(null);
    const [successId, setSuccessId] = useState(null);

    // Bulk offer states
    const [bulkOffer, setBulkOffer] = useState('0');
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkSuccess, setBulkSuccess] = useState(false);

    useEffect(() => {
        const storedId = localStorage.getItem('restaurantId');
        setRestaurantId(storedId);

        if (!storedId) {
            setLoading(false);
            return;
        }

        const fetchDetailsAndItems = async () => {
            try {
                // Fetch branch details/name
                const detailsRes = await fetch(`/api/branch-stats?restaurantId=${storedId}`);
                const detailsData = await detailsRes.json();
                if (detailsData.success && detailsData.restaurantDetails) {
                    setRestaurantName(detailsData.restaurantDetails.name || `Restaurant ${storedId}`);
                } else {
                    setRestaurantName(`Restaurant ${storedId}`);
                }

                // Fetch items list
                const itemsRes = await fetch(`/api/item-status?restaurantId=${storedId}`);
                const itemsData = await itemsRes.json();
                if (itemsData.success) {
                    setItems(itemsData.data);
                    
                    // Initialize local inputs with existing values
                    const initialEdits = {};
                    itemsData.data.forEach(item => {
                        initialEdits[item._id] = item.offerpercentage !== undefined ? item.offerpercentage.toString() : '0';
                    });
                    setOfferEdits(initialEdits);
                } else {
                    setErrorMessage(itemsData.error || 'Failed to fetch items');
                }
            } catch (err) {
                setErrorMessage('Error connecting to server.');
            } finally {
                setLoading(false);
            }
        };

        fetchDetailsAndItems();
    }, []);

    const handlePercentageChange = (itemId, val) => {
        // Prevent typing non-numeric characters except empty string
        if (val !== '' && (isNaN(Number(val)) || Number(val) < 0 || Number(val) > 100)) {
            return;
        }
        setOfferEdits(prev => ({
            ...prev,
            [itemId]: val
        }));
    };

    const applyPreset = (itemId, percent) => {
        setOfferEdits(prev => ({
            ...prev,
            [itemId]: percent.toString()
        }));
    };

    const handleSaveOffer = async (itemId) => {
        const editVal = offerEdits[itemId];
        const offerpercentage = editVal === '' ? 0 : Number(editVal);

        if (isNaN(offerpercentage) || offerpercentage < 0 || offerpercentage > 100) {
            alert('Offer percentage must be between 0 and 100.');
            return;
        }

        setSavingId(itemId);
        setSuccessId(null);
        
        try {
            const res = await fetch('/api/item-status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    itemId, 
                    offerpercentage,
                    restaurantId
                })
            });
            const data = await res.json();
            if (data.success) {
                setItems(prevItems =>
                    prevItems.map(item =>
                        item._id === itemId ? { ...item, offerpercentage: data.data.offerpercentage } : item
                    )
                );
                
                // Show temporary success feedback
                setSuccessId(itemId);
                setTimeout(() => {
                    setSuccessId(null);
                }, 3000);
            } else {
                alert(data.error || 'Failed to update offer percentage.');
            }
        } catch (err) {
            alert('Server communication error.');
        } finally {
            setSavingId(null);
        }
    };

    const handleSaveBulkOffer = async () => {
        const offerpercentage = bulkOffer === '' ? 0 : Number(bulkOffer);

        if (isNaN(offerpercentage) || offerpercentage < 0 || offerpercentage > 100) {
            alert('Offer percentage must be between 0 and 100.');
            return;
        }

        const confirmMsg = `Are you sure you want to apply a ${offerpercentage}% offer to ALL items in this restaurant? This will overwrite all individual item offers.`;
        if (!confirm(confirmMsg)) {
            return;
        }

        setBulkSaving(true);
        setBulkSuccess(false);

        try {
            const res = await fetch('/api/item-status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    offerpercentage,
                    restaurantId,
                    applyToAll: true
                })
            });
            const data = await res.json();
            if (data.success) {
                // Update local items state
                setItems(prevItems =>
                    prevItems.map(item => ({ ...item, offerpercentage }))
                );
                
                // Update local offerEdits inputs
                const updatedEdits = {};
                items.forEach(item => {
                    updatedEdits[item._id] = offerpercentage.toString();
                });
                setOfferEdits(updatedEdits);

                setBulkSuccess(true);
                setTimeout(() => {
                    setBulkSuccess(false);
                }, 3000);
            } else {
                alert(data.error || 'Failed to apply bulk offer.');
            }
        } catch (err) {
            alert('Server communication error.');
        } finally {
            setBulkSaving(false);
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
                        border: 4px solid rgba(230, 126, 34, 0.1);
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        border-left-color: #e67e22;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
                <div className="spinner"></div>
                <h3 style={{ color: '#555', fontWeight: '500' }}>Loading items & active offers...</h3>
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
                        background: #e67e22;
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
                        background-color: #d35400;
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
        <div className="offersPageContainer">
            <style>{`
                .offersPageContainer {
                    padding: 40px;
                    background-color: #f8f9fa;
                    min-height: 100vh;
                    font-family: 'Inter', -apple-system, sans-serif;
                }
                .offersHeader {
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
                .offersTitle {
                    text-align: center;
                    font-size: 2.5rem;
                    color: #2d3748;
                    font-weight: 800;
                    margin-bottom: 5px;
                }
                .offersSubtitle {
                    text-align: center;
                    color: #64748b;
                    font-size: 1.1rem;
                    margin-bottom: 40px;
                }
                .searchContainer {
                    max-width: 1100px;
                    margin: 0 auto 30px auto;
                }
                .searchInputField {
                    width: 100%;
                    padding: 14px 20px;
                    border-radius: 10px;
                    border: 1.5px solid #e2e8f0;
                    background: white;
                    color: black !important;
                    font-size: 1rem;
                    outline: none;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                    box-sizing: border-box;
                }
                .searchInputField::placeholder {
                    color: #888888 !important;
                }
                .searchInputField:focus {
                    border-color: #e67e22;
                    box-shadow: 0 0 0 3px rgba(230, 126, 34, 0.15);
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
                }
                .itemCard:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.05);
                }
                .itemName {
                    font-size: 1.3rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 4px 0;
                    word-wrap: break-word;
                }
                .itemCategory {
                    font-size: 0.85rem;
                    color: #e67e22;
                    font-weight: 600;
                    text-transform: uppercase;
                    margin-bottom: 12px;
                }
                .priceDisplay {
                    display: flex;
                    align-items: baseline;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .originalPrice {
                    font-size: 1.1rem;
                    color: #7f8c8d;
                    text-decoration: line-through;
                    font-weight: 500;
                }
                .discountedPrice {
                    font-size: 1.5rem;
                    color: #27ae60;
                    font-weight: 800;
                }
                .normalPrice {
                    font-size: 1.5rem;
                    color: #2c3e50;
                    font-weight: 800;
                }
                .offerInputArea {
                    border-top: 1px solid #f1f5f9;
                    padding-top: 15px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .inputLabel {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #64748b;
                }
                .inputRow {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                .pctInput {
                    width: 70px;
                    padding: 10px;
                    border-radius: 8px;
                    border: 1.5px solid #cbd5e1;
                    font-size: 1rem;
                    font-weight: 600;
                    text-align: center;
                    outline: none;
                    background-color: #f8fafc;
                    color: #1e293b !important;
                }
                .pctInput:focus {
                    border-color: #e67e22;
                    background-color: white;
                }
                .pctSymbol {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #64748b;
                }
                .btnSave {
                    flex: 1;
                    background: #e67e22;
                    color: white;
                    border: none;
                    padding: 10px;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                }
                .btnSave:hover:not(:disabled) {
                    background-color: #d35400;
                }
                .btnSave:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .btnSuccess {
                    flex: 1;
                    background: #2ecc71;
                    color: white;
                    border: none;
                    padding: 10px;
                    border-radius: 8px;
                    font-weight: 700;
                    text-align: center;
                }
                .presetsGrid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 6px;
                }
                .btnPreset {
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    padding: 6px 0;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.15s;
                    text-align: center;
                }
                .btnPreset:hover {
                    background: #cbd5e1;
                    color: #0f172a;
                }
                .btnPresetActive {
                    background: #ffebd9;
                    border-color: #ffd0a6;
                    color: #d35400;
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
                .bulkOfferCard {
                    background: #ffffff;
                    border: 1.5px solid #ffebd9;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 1100px;
                    margin: 0 auto 30px auto;
                    box-shadow: 0 4px 12px rgba(230, 126, 34, 0.03);
                    text-align: left;
                    box-sizing: border-box;
                }
                .bulkOfferTitle {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #2c3e50;
                    margin: 0 0 6px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .bulkOfferDescription {
                    font-size: 0.9rem;
                    color: #64748b;
                    margin-bottom: 20px;
                    line-height: 1.4;
                }
                .btnBulkSave {
                    background: #e67e22;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-width: 140px;
                    text-align: center;
                }
                .btnBulkSave:hover:not(:disabled) {
                    background-color: #d35400;
                }
                .btnBulkSave:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .btnBulkSuccess {
                    background: #2ecc71;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 700;
                    min-width: 140px;
                    text-align: center;
                }
                @media (max-width: 600px) {
                    .offersPageContainer {
                        padding: 20px;
                    }
                    .offersHeader {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .btnBackHeader {
                        width: 100%;
                        text-align: center;
                    }
                    .itemsGrid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            <div className="offersHeader">
                <button onClick={() => window.history.back()} className="btnBackHeader">
                    ← Back to Dashboard
                </button>
            </div>

            <h1 className="offersTitle">🏷️ Restaurant Offers</h1>
            <p className="offersSubtitle">
                {restaurantName} • Manage discount percentages for each menu item
            </p>

            {items.length > 0 && (
                <div className="bulkOfferCard">
                    <h3 className="bulkOfferTitle">📢 Apply Discount to All Items</h3>
                    <p className="bulkOfferDescription">
                        Setting a value here will instantly update the discount percentage for all items belonging to this restaurant.
                    </p>
                    
                    <div className="offerInputArea" style={{ borderTop: 'none', paddingTop: 0 }}>
                        <div className="presetsGrid" style={{ maxWidth: '400px' }}>
                            {[0, 10, 20, 30, 50].map((pct) => (
                                <button
                                    key={pct}
                                    type="button"
                                    className={`btnPreset ${Number(bulkOffer) === pct ? 'btnPresetActive' : ''}`}
                                    onClick={() => setBulkOffer(pct.toString())}
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>

                        <div className="inputRow" style={{ maxWidth: '400px' }}>
                            <input
                                type="text"
                                className="pctInput"
                                value={bulkOffer}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100)) {
                                        setBulkOffer(val);
                                    }
                                }}
                                placeholder="0"
                            />
                            <span className="pctSymbol">% Off</span>
                            
                            {bulkSuccess ? (
                                <button className="btnBulkSuccess" disabled>
                                    Applied Successfully! ✓
                                </button>
                            ) : (
                                <button
                                    className="btnBulkSave"
                                    disabled={bulkSaving}
                                    onClick={handleSaveBulkOffer}
                                >
                                    {bulkSaving ? 'Applying...' : 'Apply to All'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="searchContainer">
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
                    filteredItems.map((item) => {
                        const localVal = offerEdits[item._id] || '0';
                        const currentPct = localVal === '' ? 0 : Number(localVal);
                        
                        // Calculate price discount
                        const hasDiscount = currentPct > 0;
                        const finalPrice = hasDiscount 
                            ? (item.price * (1 - currentPct / 100)).toFixed(2)
                            : item.price;

                        return (
                            <div key={item._id} className="itemCard">
                                <div>
                                    <h3 className="itemName">{item.itemName}</h3>
                                    <div className="itemCategory">
                                        {item.category || 'No Category'}
                                    </div>
                                    
                                    <div className="priceDisplay">
                                        {hasDiscount ? (
                                            <>
                                                <span className="discountedPrice">₹{finalPrice}</span>
                                                <span className="originalPrice">₹{item.price}</span>
                                            </>
                                        ) : (
                                            <span className="normalPrice">₹{item.price}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="offerInputArea">
                                    <div className="inputLabel">Set Discount Percentage</div>
                                    
                                    <div className="presetsGrid">
                                        {[0, 10, 20, 30, 50].map((pct) => (
                                            <button
                                                key={pct}
                                                type="button"
                                                className={`btnPreset ${currentPct === pct ? 'btnPresetActive' : ''}`}
                                                onClick={() => applyPreset(item._id, pct)}
                                            >
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>

                                    <div className="inputRow">
                                        <input
                                            type="text"
                                            className="pctInput"
                                            value={localVal}
                                            onChange={(e) => handlePercentageChange(item._id, e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="pctSymbol">% Off</span>
                                        
                                        {successId === item._id ? (
                                            <button className="btnSuccess" disabled>
                                                Saved! ✓
                                            </button>
                                        ) : (
                                            <button
                                                className="btnSave"
                                                disabled={savingId === item._id}
                                                onClick={() => handleSaveOffer(item._id)}
                                            >
                                                {savingId === item._id ? 'Saving...' : 'Save'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="noItemsText">
                        <h3>No items found.</h3>
                        <p style={{ marginTop: '5px' }}>There are no menu items matching your query.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
