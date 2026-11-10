'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './customers.css';

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [coinFilter, setCoinFilter] = useState('all');
    const [coinDeltas, setCoinDeltas] = useState({});
    const [coinModes, setCoinModes] = useState({});
    const [bulkAmounts, setBulkAmounts] = useState({});
    const [activePayUser, setActivePayUser] = useState(null);
    const [txnId, setTxnId] = useState('');
    const [txnCoinsAmount, setTxnCoinsAmount] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState({});
    const [showAllPasswords, setShowAllPasswords] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const router = useRouter();

    // Customer-Specific One-Time Coupon Modal States
    const [activeCouponUser, setActiveCouponUser] = useState(null);
    const [couponModalType, setCouponModalType] = useState('delivery'); // 'delivery' | 'items'
    const [newCouponCode, setNewCouponCode] = useState('');
    const [newDiscountType, setNewDiscountType] = useState('percentage'); // 'percentage' | 'flat'
    const [newDiscountValue, setNewDiscountValue] = useState('');
    const [selectedCouponRestId, setSelectedCouponRestId] = useState('all');
    const [availableRestaurantsForCoupon, setAvailableRestaurantsForCoupon] = useState([]);
    const [customerCouponsList, setCustomerCouponsList] = useState([]);
    const [couponLoadingList, setCouponLoadingList] = useState(false);
    const [couponSubmitting, setCouponSubmitting] = useState(false);
    const [couponModalMsg, setCouponModalMsg] = useState({ text: '', type: '' });

    const openCouponModal = async (customer, type = 'delivery') => {
        setActiveCouponUser(customer);
        setCouponModalType(type);
        setNewCouponCode('');
        setNewDiscountType('percentage');
        setNewDiscountValue('');
        setSelectedCouponRestId('all');
        setCouponModalMsg({ text: '', type: '' });
        setCouponLoadingList(true);
        try {
            const res = await fetch(`/api/customer-coupons?userId=${customer.id}`);
            const data = await res.json();
            if (data.success) {
                setCustomerCouponsList(data.coupons || []);
                setAvailableRestaurantsForCoupon(data.restaurants || []);
            } else {
                setCustomerCouponsList([]);
            }
        } catch (e) {
            console.error('Error fetching customer coupons:', e);
            setCustomerCouponsList([]);
        } finally {
            setCouponLoadingList(false);
        }
    };

    const handleCreateCustomerCoupon = async () => {
        if (!activeCouponUser || !newCouponCode.trim() || !newDiscountValue) {
            setCouponModalMsg({ text: 'Please fill in coupon code and discount value', type: 'error' });
            return;
        }
        setCouponSubmitting(true);
        setCouponModalMsg({ text: '', type: '' });
        try {
            const matchedRest = (availableRestaurantsForCoupon || []).find(r => String(r.restId) === String(selectedCouponRestId));
            const selectedRestName = selectedCouponRestId === 'all' ? 'All Restaurants' : (matchedRest?.name || 'Specific Restaurant');
            const res = await fetch('/api/customer-coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: activeCouponUser.id,
                    couponCode: newCouponCode.trim().toUpperCase(),
                    couponType: couponModalType,
                    discountType: newDiscountType,
                    discountValue: Number(newDiscountValue),
                    restId: selectedCouponRestId,
                    restaurantName: selectedRestName
                })
            });
            const data = await res.json();
            if (data.success) {
                setCouponModalMsg({ text: data.message || 'Coupon assigned successfully!', type: 'success' });
                setCustomerCouponsList(data.coupons || []);
                setNewCouponCode('');
                setNewDiscountValue('');
            } else {
                setCouponModalMsg({ text: data.error || 'Failed to assign coupon', type: 'error' });
            }
        } catch (err) {
            setCouponModalMsg({ text: 'Network error assigning coupon', type: 'error' });
        } finally {
            setCouponSubmitting(false);
        }
    };

    const handleDeleteCustomerCoupon = async (cCode) => {
        if (!activeCouponUser || !cCode) return;
        if (!confirm(`Delete unredeemed coupon ${cCode}?`)) return;
        try {
            const res = await fetch(`/api/customer-coupons?userId=${activeCouponUser.id}&couponCode=${encodeURIComponent(cCode)}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setCustomerCouponsList(data.coupons || []);
                setCouponModalMsg({ text: `Coupon ${cCode} removed`, type: 'success' });
            } else {
                setCouponModalMsg({ text: data.error || 'Failed to delete coupon', type: 'error' });
            }
        } catch (e) {
            setCouponModalMsg({ text: 'Error deleting coupon', type: 'error' });
        }
    };

    const isPasswordVisible = (userId) => {
        if (visiblePasswords[userId] !== undefined) {
            return visiblePasswords[userId];
        }
        return showAllPasswords;
    };

    const togglePasswordVisibility = (userId) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [userId]: prev[userId] !== undefined ? !prev[userId] : !showAllPasswords
        }));
    };

    const toggleShowAllPasswords = () => {
        setShowAllPasswords(prev => {
            const next = !prev;
            setVisiblePasswords({});
            return next;
        });
    };

    const copyPassword = (id, pwd) => {
        if (!pwd || pwd === 'N/A') return;
        navigator.clipboard.writeText(pwd);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/users');
                const result = await response.json();

                if (result.success) {
                    const userData = result.data.map(user => ({
                        id: user._id,
                        name: user.name || user.fullName || user.username || 'Unknown',
                        phone: user.phone || user.mobile || user.phoneNumber || 'N/A',
                        email: user.email || 'N/A',
                        password: user.password || user.pass || user.userPassword || user.plainPassword || '',
                        address: user.address || (user.location ? `${user.location.address || ''}` : 'No Address'),
                        createdAt: user.createdAt || user.joinedAt || (user._id && user._id.length >= 8 ? new Date(parseInt(user._id.substring(0, 8), 16) * 1000) : null),
                        blickstatus: user.blickstatus ?? true,
                        inconvinience: Number(user.inconvinience) || 0,
                        coins: Number(user.coins) || 0,
                        transactionofcoins: user.transactionofcoins || []
                    }));
                    setCustomers(userData);
                }
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const updateBlickStatus = async (userId, newValue) => {
        try {
            const response = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, blickstatus: newValue })
            });
            const result = await response.json();
            if (result.success) {
                setCustomers(prev => prev.map(c =>
                    c.id === userId ? { ...c, blickstatus: newValue } : c
                ));
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const updateInconvinience = async (userId, newValue) => {
        const safeValue = Number(newValue) || 0;
        if (safeValue < 0) return;
        try {
            const response = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, inconvinience: safeValue })
            });
            const result = await response.json();
            if (result.success) {
                setCustomers(prev => prev.map(c =>
                    c.id === userId ? { ...c, inconvinience: safeValue } : c
                ));
            }
        } catch (error) {
            console.error('Error updating inconvinience:', error);
        }
    };

    const updateCoins = async (userId, newValue) => {
        const safeValue = Number(newValue) || 0;
        if (safeValue < 0) return;
        try {
            const response = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, coins: safeValue })
            });
            const result = await response.json();
            if (result.success) {
                setCustomers(prev => prev.map(c =>
                    c.id === userId ? { ...c, coins: safeValue } : c
                ));
            }
        } catch (error) {
            console.error('Error updating coins:', error);
        }
    };

    const addTransaction = async (userId, transactionId, noofcoins) => {
        if (!transactionId.trim()) return;
        const coinsVal = Number(noofcoins) || 0;
        try {
            const response = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, transactionId, noofcoins: coinsVal })
            });
            const result = await response.json();
            if (result.success) {
                setCustomers(prev => prev.map(c =>
                    c.id === userId 
                        ? { 
                            ...c, 
                            coins: c.coins - coinsVal,
                            transactionofcoins: [
                                ...(c.transactionofcoins || []), 
                                { transactionId, noofcoins: coinsVal, createdAt: new Date().toISOString() }
                            ] 
                          } 
                        : c
                ));
                setTxnId('');
                setTxnCoinsAmount('');
                setActivePayUser(null);
            }
        } catch (error) {
            console.error('Error adding transaction:', error);
        }
    };

    const filteredCustomers = customers.filter(customer => {
        const matchesSearch = customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;
        
        if (coinFilter === 'all') return true;
        return customer.coins >= Number(coinFilter);
    });

    if (loading) {
        return <div className="loadingContainer">Loading Customers...</div>;
    }

    return (
        <div className="customersContainer">
            <div className="header">
                <button className="backButton" onClick={() => router.back()}>← Back</button>
                <div className="headerContent">
                    <h1>Customers & Details</h1>
                    <div className="searchContainer">
                        <input
                            type="text"
                            placeholder="Search by name or phone number..."
                            className="searchInput"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filterContainer">
                        <span className="filterLabel">Filter by Coins:</span>
                        <div className="filterPills">
                            {[
                                { label: 'All', value: 'all' },
                                { label: '100+', value: '100' },
                                { label: '200+', value: '200' },
                                { label: '300+', value: '300' },
                                { label: '400+', value: '400' }
                            ].map((pill) => (
                                <button
                                    key={pill.value}
                                    className={`filterPill ${coinFilter === pill.value ? 'active' : ''}`}
                                    onClick={() => setCoinFilter(pill.value)}
                                >
                                    {pill.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            className={`toggleAllPasswordsBtn ${showAllPasswords ? 'active' : ''}`}
                            onClick={toggleShowAllPasswords}
                            style={{ marginTop: '6px' }}
                        >
                            {showAllPasswords ? '🙈 Hide All Passwords' : '👁️ Show All Passwords'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="customerGrid">
                {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer, index) => (
                        <div key={index} className="customerCard">
                            <h3>
                                {customer.name}
                                {customer.isWhitelisted && (
                                    <span style={{ marginLeft: '8px', background: '#dcfce7', color: '#15803d', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', verticalAlign: 'middle' }}>
                                        🛡️ Whitelisted
                                    </span>
                                )}
                            </h3>
                            <p><strong>Phone:</strong> {customer.phone}</p>
                            <p><strong>Email:</strong> {customer.email}</p>
                            <div className="passwordRow">
                                <div className="passwordInfo">
                                    <span className="passwordLabel">Password:</span>
                                    <span className="passwordValue">
                                        {customer.password 
                                            ? (isPasswordVisible(customer.id) ? customer.password : '••••••••') 
                                            : 'N/A'}
                                    </span>
                                </div>
                                {customer.password ? (
                                    <div className="passwordActionGroup">
                                        <button
                                            type="button"
                                            className="passwordToggleBtn"
                                            onClick={() => togglePasswordVisibility(customer.id)}
                                        >
                                            {isPasswordVisible(customer.id) ? 'Hide' : 'Show'}
                                        </button>
                                        <button
                                            type="button"
                                            className="passwordCopyBtn"
                                            onClick={() => copyPassword(customer.id, customer.password)}
                                            title="Copy password"
                                        >
                                            {copiedId === customer.id ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                            <p><strong>Address:</strong> {customer.address}</p>
                            <div className="coinsRow">
                                <p className="coinsDisplay">
                                    <strong>Coins:</strong> <span className="coinsValue">{customer.coins}</span>
                                </p>
                                <div className="coinsControls">
                                    {/* Segmented control for Bulk vs Individual */}
                                    <div className="coinsModeToggle">
                                        <button
                                            className={`modeToggleBtn ${(!coinModes[customer.id] || coinModes[customer.id] === 'individual') ? 'active' : ''}`}
                                            onClick={() => setCoinModes({ ...coinModes, [customer.id]: 'individual' })}
                                        >
                                            Indiv
                                        </button>
                                        <button
                                            className={`modeToggleBtn ${coinModes[customer.id] === 'bulk' ? 'active' : ''}`}
                                            onClick={() => setCoinModes({ ...coinModes, [customer.id]: 'bulk' })}
                                        >
                                            Bulk
                                        </button>
                                    </div>

                                    {/* Action controls */}
                                    {(!coinModes[customer.id] || coinModes[customer.id] === 'individual') ? (
                                        <div className="coinsActions">
                                            <button
                                                className="coinActionBtn minus"
                                                onClick={() => {
                                                    const delta = coinDeltas[customer.id] || 0;
                                                    setCoinDeltas({ ...coinDeltas, [customer.id]: delta - 1 });
                                                }}
                                            >
                                                -
                                            </button>
                                            <span className={`coinDeltaValue ${(coinDeltas[customer.id] || 0) > 0 ? 'positive' : (coinDeltas[customer.id] || 0) < 0 ? 'negative' : ''}`}>
                                                {(coinDeltas[customer.id] || 0) > 0 ? `+${coinDeltas[customer.id]}` : (coinDeltas[customer.id] || 0)}
                                            </span>
                                            <button
                                                className="coinActionBtn plus"
                                                onClick={() => {
                                                    const delta = coinDeltas[customer.id] || 0;
                                                    setCoinDeltas({ ...coinDeltas, [customer.id]: delta + 1 });
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    ) : (
                                        <input
                                            type="number"
                                            placeholder="Amount"
                                            value={bulkAmounts[customer.id] || ''}
                                            onChange={(e) => setBulkAmounts({ ...bulkAmounts, [customer.id]: e.target.value })}
                                            className="bulkCoinsInput"
                                        />
                                    )}

                                    {/* Add Button */}
                                    <button
                                        className="addCoinsConfirmBtn"
                                        disabled={
                                            (!coinModes[customer.id] || coinModes[customer.id] === 'individual')
                                                ? !(coinDeltas[customer.id])
                                                : !bulkAmounts[customer.id] || Number(bulkAmounts[customer.id]) === 0
                                        }
                                        onClick={async () => {
                                            const isIndiv = !coinModes[customer.id] || coinModes[customer.id] === 'individual';
                                            if (isIndiv) {
                                                const delta = coinDeltas[customer.id] || 0;
                                                if (delta !== 0) {
                                                    await updateCoins(customer.id, customer.coins + delta);
                                                    setCoinDeltas(prev => {
                                                        const next = { ...prev };
                                                        delete next[customer.id];
                                                        return next;
                                                    });
                                                }
                                            } else {
                                                const val = Number(bulkAmounts[customer.id]) || 0;
                                                if (val !== 0) {
                                                    await updateCoins(customer.id, customer.coins + val);
                                                    setBulkAmounts(prev => {
                                                        const next = { ...prev };
                                                        delete next[customer.id];
                                                        return next;
                                                    });
                                                }
                                            }
                                        }}
                                    >
                                        Add
                                    </button>

                                    {/* Pay Button */}
                                    <button
                                        className="payCoinsBtn"
                                        onClick={() => {
                                            setActivePayUser(customer);
                                            setTxnId('');
                                            setTxnCoinsAmount('');
                                        }}
                                    >
                                        Pay
                                    </button>
                                </div>
                            </div>

                            <div className="stats" style={{ flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <span>Joined: {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}</span>
                                    <span className={`statusToggle ${customer.blickstatus ? 'active' : 'blocked'}`}>
                                        {customer.blickstatus ? 'Active' : 'Blocked'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                    <button
                                        className={`statusToggle ${customer.blickstatus === true ? 'active' : ''}`}
                                        style={{ flex: 1, cursor: 'pointer', opacity: customer.blickstatus === true ? 1 : 0.6 }}
                                        onClick={() => updateBlickStatus(customer.id, true)}
                                    >
                                        Unblock
                                    </button>
                                    <button
                                        className={`statusToggle ${customer.blickstatus === false ? 'blocked' : ''}`}
                                        style={{ flex: 1, cursor: 'pointer', opacity: customer.blickstatus === false ? 1 : 0.6 }}
                                        onClick={() => updateBlickStatus(customer.id, false)}
                                    >
                                        Block
                                    </button>
                                </div>
                                <div className="inconvinienceContainer">
                                    <span className="inconvinienceLabel">Inconvenience:</span>
                                    <div className="counterBox">
                                        <button
                                            className="counterBtn minus"
                                            onClick={() => updateInconvinience(customer.id, customer.inconvinience - 1)}
                                        >
                                            -
                                        </button>
                                        <span className="counterValue">{Number(customer.inconvinience) || 0}</span>
                                        <button
                                            className="counterBtn plus"
                                            onClick={() => updateInconvinience(customer.id, customer.inconvinience + 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Dedicated One-Time Customer Coupon Buttons */}
                                <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '6px' }}>
                                    <button
                                        type="button"
                                        style={{
                                            flex: 1,
                                            padding: '8px 6px',
                                            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                        onClick={() => openCouponModal(customer, 'delivery')}
                                        title="Add one-time delivery fee discount coupon for this customer"
                                    >
                                        🚚 Delivery Coupon
                                    </button>
                                    <button
                                        type="button"
                                        style={{
                                            flex: 1,
                                            padding: '8px 6px',
                                            background: 'linear-gradient(135deg, #059669, #047857)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                        onClick={() => openCouponModal(customer, 'items')}
                                        title="Add one-time overall items discount coupon for this customer"
                                    >
                                        🏷️ Items Coupon
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="noData">No customers found.</div>
                )}
            </div>

            {/* Modal Dialog Window for Assigning Customer-Specific One-Time Coupon */}
            {activeCouponUser && (
                <div className="txnModalOverlay" style={{ zIndex: 10000 }}>
                    <div className="txnModalContainer" style={{ maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="txnModalHeader" style={{ borderBottom: '1px solid #e2e8f0', background: couponModalType === 'delivery' ? '#f0f9ff' : '#ecfdf5' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.4rem' }}>{couponModalType === 'delivery' ? '🚚' : '🏷️'}</span>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b' }}>
                                        {couponModalType === 'delivery' ? 'Delivery Fee Discount Coupon' : 'Overall Items Discount Coupon'}
                                    </h3>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Valid for 1-Time Use Only</span>
                                </div>
                            </div>
                            <button
                                className="txnModalCloseBtn"
                                onClick={() => setActiveCouponUser(null)}
                            >
                                &times;
                            </button>
                        </div>

                        <div className="txnModalBody" style={{ gap: '14px' }}>
                            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#334155' }}>
                                    Customer: <strong>{activeCouponUser.name}</strong>
                                </p>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                                    Phone: <strong>{activeCouponUser.phone}</strong>
                                </p>
                            </div>

                            {/* Coupon Type Switcher Tab inside modal */}
                            <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setCouponModalType('delivery')}
                                    style={{
                                        flex: 1,
                                        padding: '7px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '0.82rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        background: couponModalType === 'delivery' ? '#0284c7' : 'transparent',
                                        color: couponModalType === 'delivery' ? '#fff' : '#475569',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    🚚 Delivery Discount
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCouponModalType('items')}
                                    style={{
                                        flex: 1,
                                        padding: '7px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '0.82rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        background: couponModalType === 'items' ? '#059669' : 'transparent',
                                        color: couponModalType === 'items' ? '#fff' : '#475569',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    🏷️ Items Discount
                                </button>
                            </div>

                            {/* Applicable Restaurant Selector */}
                            <div className="txnModalField">
                                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>
                                    Applicable Restaurant (Select Specific or All) *
                                </label>
                                <select
                                    value={selectedCouponRestId}
                                    onChange={(e) => setSelectedCouponRestId(e.target.value)}
                                    className="txnModalInput"
                                    style={{ height: '42px', fontWeight: '600', cursor: 'pointer', borderColor: selectedCouponRestId !== 'all' ? '#0284c7' : '#dfe6e9' }}
                                >
                                    <option value="all">🌟 All Restaurants (Valid for any restaurant)</option>
                                    {(availableRestaurantsForCoupon || []).map((r) => (
                                        <option key={r.restId || r._id} value={r.restId}>
                                            🍽️ {r.name} {r.restLocation ? '(' + r.restLocation + ')' : '(ID: ' + r.restId + ')'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Coupon Code Input */}
                            <div className="txnModalField">
                                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>Coupon Code *</label>
                                <input
                                    type="text"
                                    placeholder={couponModalType === 'delivery' ? 'e.g. FREEDEL50, ZEROFEES' : 'e.g. SPECIAL20, SAVE50'}
                                    value={newCouponCode}
                                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                                    className="txnModalInput"
                                    style={{ textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px' }}
                                />
                            </div>

                            {/* Discount Type & Value Row */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }} className="txnModalField">
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>Discount Type</label>
                                    <select
                                        value={newDiscountType}
                                        onChange={(e) => setNewDiscountType(e.target.value)}
                                        className="txnModalInput"
                                        style={{ height: '42px', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        <option value="percentage">% Percentage Off</option>
                                        <option value="flat">₹ Flat Amount Off</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }} className="txnModalField">
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>
                                        {newDiscountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'} *
                                    </label>
                                    <input
                                        type="number"
                                        placeholder={newDiscountType === 'percentage' ? 'e.g. 50 (for 50%)' : 'e.g. 30 (for ₹30)'}
                                        value={newDiscountValue}
                                        onChange={(e) => setNewDiscountValue(e.target.value)}
                                        className="txnModalInput"
                                        min="1"
                                        max={newDiscountType === 'percentage' ? '100' : '9999'}
                                        style={{ fontWeight: '700' }}
                                    />
                                </div>
                            </div>

                            {/* Alert Message */}
                            {couponModalMsg.text ? (
                                <div style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    background: couponModalMsg.type === 'error' ? '#fef2f2' : '#f0fdf4',
                                    color: couponModalMsg.type === 'error' ? '#dc2626' : '#16a34a',
                                    border: `1px solid ${couponModalMsg.type === 'error' ? '#fca5a5' : '#86efac'}`
                                }}>
                                    {couponModalMsg.text}
                                </div>
                            ) : null}

                            {/* Assigned Coupons for this User */}
                            <div style={{ marginTop: '4px' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                                    Coupons Assigned to this Customer:
                                </label>
                                {couponLoadingList ? (
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Loading customer coupons...</div>
                                ) : customerCouponsList.length === 0 ? (
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No coupons assigned yet for this customer.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                                        {customerCouponsList.map((c, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: c.isUsed ? '#f1f5f9' : '#f8fafc',
                                                border: `1px solid ${c.isUsed ? '#cbd5e1' : '#e2e8f0'}`,
                                                padding: '6px 10px',
                                                borderRadius: '6px'
                                            }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <strong style={{ fontSize: '0.85rem', color: c.isUsed ? '#64748b' : '#0f172a' }}>{c.couponCode}</strong>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontWeight: '700',
                                                            background: c.couponType === 'delivery' ? '#e0f2fe' : '#dcfce7',
                                                            color: c.couponType === 'delivery' ? '#0369a1' : '#15803d'
                                                        }}>
                                                            {c.couponType === 'delivery' ? '🚚 Delivery' : '🍔 Items'}
                                                        </span>
                                                        <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                                                            ({c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`} OFF)
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontWeight: '600', color: c.restId ? '#0284c7' : '#059669' }}>
                                                            {c.restId ? ('📍 ' + (c.restaurantName || 'Specific Restaurant')) : '🌟 All Restaurants'}
                                                        </span>
                                                        <span>•</span>
                                                        <span style={{ color: c.isUsed ? '#94a3b8' : '#16a34a', fontWeight: '600' }}>
                                                            {c.isUsed ? `Redeemed on ${c.usedAt ? new Date(c.usedAt).toLocaleDateString() : 'past order'}` : 'Active (Valid 1 time)'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        fontSize: '0.72rem',
                                                        fontWeight: '700',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        background: c.isUsed ? '#fee2e2' : '#dcfce7',
                                                        color: c.isUsed ? '#991b1b' : '#166534'
                                                    }}>
                                                        {c.isUsed ? 'Used' : 'Unused'}
                                                    </span>
                                                    {!c.isUsed && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteCustomerCoupon(c.couponCode)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#ef4444',
                                                                cursor: 'pointer',
                                                                fontSize: '0.9rem',
                                                                padding: '2px'
                                                            }}
                                                            title="Delete coupon"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="txnModalFooter">
                            <button
                                onClick={() => setActiveCouponUser(null)}
                                className="txnModalCancelBtn"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleCreateCustomerCoupon}
                                disabled={couponSubmitting || !newCouponCode.trim() || !newDiscountValue}
                                style={{
                                    background: couponModalType === 'delivery' ? '#0284c7' : '#059669',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    cursor: (couponSubmitting || !newCouponCode.trim() || !newDiscountValue) ? 'not-allowed' : 'pointer',
                                    opacity: (couponSubmitting || !newCouponCode.trim() || !newDiscountValue) ? 0.6 : 1
                                }}
                            >
                                {couponSubmitting ? 'Assigning...' : `Add ${couponModalType === 'delivery' ? 'Delivery' : 'Items'} Coupon`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Dialog Window for entering Transaction ID & No of Coins */}
            {activePayUser && (
                <div className="txnModalOverlay">
                    <div className="txnModalContainer">
                        <div className="txnModalHeader">
                            <h3>Register Payment</h3>
                            <button
                                className="txnModalCloseBtn"
                                onClick={() => setActivePayUser(null)}
                            >
                                &times;
                            </button>
                        </div>
                        <div className="txnModalBody">
                            <p className="txnModalUser">
                                Customer: <strong>{activePayUser.name}</strong>
                            </p>
                            
                            <div className="txnModalField">
                                <label>Transaction ID</label>
                                <input
                                    type="text"
                                    placeholder="Enter Transaction ID"
                                    value={txnId}
                                    onChange={(e) => setTxnId(e.target.value)}
                                    className="txnModalInput"
                                />
                            </div>

                            <div className="txnModalField">
                                <label>No of Coins</label>
                                <input
                                    type="number"
                                    placeholder="Enter number of coins"
                                    value={txnCoinsAmount}
                                    onChange={(e) => setTxnCoinsAmount(e.target.value)}
                                    className="txnModalInput"
                                />
                            </div>
                        </div>
                        <div className="txnModalFooter">
                            <button
                                onClick={() => setActivePayUser(null)}
                                className="txnModalCancelBtn"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => addTransaction(activePayUser.id, txnId, txnCoinsAmount)}
                                disabled={!txnId.trim()}
                                className="txnModalOkBtn"
                            >
                                Confirm & Pay
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
