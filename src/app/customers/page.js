'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './customers.css';

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
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
                        blickstatus: user.blickstatus ?? true 
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

    if (loading) {
        return <div className="loadingContainer">Loading Customers...</div>;
    }

    return (
        <div className="customersContainer">
            <div className="header">
                <button className="backButton" onClick={() => router.back()}>← Back</button>
                <h1>Customers & Details</h1>
            </div>

            <div className="customerGrid">
                {customers.length > 0 ? (
                    customers.map((customer, index) => (
                        <div key={index} className="customerCard">
                            <h3>{customer.name}</h3>
                            <p><strong>Phone:</strong> {customer.phone}</p>
                            <p><strong>Email:</strong> {customer.email}</p>
                            <p><strong>Address:</strong> {customer.address}</p>
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
