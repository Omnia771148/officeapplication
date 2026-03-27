'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './customers.css';

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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
                        createdAt: user.createdAt || user.joinedAt || null,
                        blickstatus: user.blickstatus ?? true,
                        inconvinience: Number(user.inconvinience) || 0,
                        coins: Number(user.coins) || 0
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

    const filteredCustomers = customers.filter(customer =>
        customer.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                            placeholder="Search by phone number..."
                            className="searchInput"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                            <p><strong>Coins:</strong> <span style={{ color: '#b7950b', fontWeight: 'bold' }}>{customer.coins}</span></p>
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
        </div>
    );
}
