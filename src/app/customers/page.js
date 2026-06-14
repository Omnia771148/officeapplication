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
    const router = useRouter();

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
                    </div>
                </div>
            </div>

            <div className="customerGrid">
                {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer, index) => (
                        <div key={index} className="customerCard">
                            <h3>{customer.name}</h3>
                            <p><strong>Phone:</strong> {customer.phone}</p>
                            <p><strong>Email:</strong> {customer.email}</p>
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
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="noData">No customers found.</div>
                )}
            </div>

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
