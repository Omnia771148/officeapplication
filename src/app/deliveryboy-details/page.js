'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/components/BranchPage.css';

export default function DeliveryBoyDetailsPage() {
    const router = useRouter();
    const [deliveryBoys, setDeliveryBoys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visiblePasswords, setVisiblePasswords] = useState({});
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const fetchDeliveryBoys = async () => {
            try {
                const res = await fetch('/api/deliveryboys');
                if (!res.ok) {
                    throw new Error('Failed to fetch delivery boys');
                }
                const data = await res.json();
                setDeliveryBoys(data);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDeliveryBoys();
    }, []);

    const togglePasswordVisibility = (id) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const filteredDeliveryBoys = deliveryBoys.filter(boy => {
        if (filter === 'active') return boy.isActive === true;
        if (filter === 'inactive') return boy.isActive !== true;
        return true;
    });

    return (
        <div className="deliveryBoyPageContainer">
            <div className="deliveryBoyHeader">
                <button className="branchBackButton" onClick={() => router.back()}>
                    ← Back
                </button>
            </div>

            <h1 className="deliveryBoyTitle">Delivery Boy Details</h1>
            <p className="deliveryBoySubtitle">
                View profiles and active documentation for all registered delivery personnel.
            </p>

            {!loading && !error && (
                <div className="filterContainer">
                    <button 
                        className={`filterBtn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All ({deliveryBoys.length})
                    </button>
                    <button 
                        className={`filterBtn ${filter === 'active' ? 'active' : ''}`}
                        onClick={() => setFilter('active')}
                    >
                        Active ({deliveryBoys.filter(b => b.isActive === true).length})
                    </button>
                    <button 
                        className={`filterBtn ${filter === 'inactive' ? 'active' : ''}`}
                        onClick={() => setFilter('inactive')}
                    >
                        Inactive ({deliveryBoys.filter(b => b.isActive !== true).length})
                    </button>
                </div>
            )}

            {loading && (
                <div style={{ textAlign: 'center', padding: '40px', fontSize: '1.2rem', color: '#636e72' }}>
                    ⌛ Loading delivery boy details...
                </div>
            )}

            {error && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#d63031', fontWeight: 'bold' }}>
                    ⚠️ Error: {error}
                </div>
            )}

            {!loading && !error && (
                <div className="deliveryBoyGrid">
                    {filteredDeliveryBoys.length === 0 ? (
                        <div className="noDeliveryBoys">
                            <h3>No Delivery Boys Found</h3>
                            <p>There are no delivery boys matching the selected filter.</p>
                        </div>
                    ) : (
                        filteredDeliveryBoys.map((boy) => (
                            <div key={boy._id} className="deliveryBoyCard">
                                <div className="deliveryBoyCardHeader">
                                    <h3 className="deliveryBoyName">{boy.name}</h3>
                                    <span className={`statusBadge ${boy.isActive ? 'active' : 'inactive'}`}>
                                        {boy.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                <div className="deliveryBoyCardBody">
                                    <div className="infoGroup">
                                        <span className="infoLabel">Email Address</span>
                                        <span className="infoValue">{boy.email}</span>
                                    </div>

                                    <div className="infoGroup">
                                        <span className="infoLabel">Phone Number</span>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span className="infoValue">{boy.phone}</span>
                                            <a href={`tel:${boy.phone}`} className="callActionButtonInline">📞 Call</a>
                                        </div>
                                    </div>

                                    <div className="infoGroup">
                                        <span className="infoLabel">Password</span>
                                        <div className="passwordContainer">
                                            <span className="infoValue password">
                                                {visiblePasswords[boy._id] ? boy.password : '••••••••'}
                                            </span>
                                            <button 
                                                className="passwordToggleBtn"
                                                onClick={() => togglePasswordVisibility(boy._id)}
                                            >
                                                {visiblePasswords[boy._id] ? 'Hide' : 'Show'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="infoGroup">
                                        <span className="infoLabel">Aadhar Number</span>
                                        <span className="infoValue">{boy.aadharNumber || 'N/A'}</span>
                                    </div>

                                    <div className="infoGroup">
                                        <span className="infoLabel">RC Number</span>
                                        <span className="infoValue">{boy.rcNumber || 'N/A'}</span>
                                    </div>

                                    <div className="infoGroup">
                                        <span className="infoLabel">License Number</span>
                                        <span className="infoValue">{boy.licenseNumber || 'N/A'}</span>
                                    </div>

                                    <div className="infoGroup">
                                        <span className="infoLabel">Bank Details</span>
                                        <span className="infoValue">
                                            {boy.accountNumber ? `A/C: ${boy.accountNumber}` : 'N/A'}
                                            {boy.ifscCode ? ` (IFSC: ${boy.ifscCode})` : ''}
                                        </span>
                                    </div>

                                    <div className="docLinksContainer">
                                        {boy.aadharUrl && (
                                            <a href={boy.aadharUrl} target="_blank" rel="noopener noreferrer" className="docButton">
                                                🪪 Aadhar Doc
                                            </a>
                                        )}
                                        {boy.rcUrl && (
                                            <a href={boy.rcUrl} target="_blank" rel="noopener noreferrer" className="docButton">
                                                📄 RC Doc
                                            </a>
                                        )}
                                        {boy.licenseUrl && (
                                            <a href={boy.licenseUrl} target="_blank" rel="noopener noreferrer" className="docButton">
                                                💳 License Doc
                                            </a>
                                        )}
                                        {!boy.aadharUrl && !boy.rcUrl && !boy.licenseUrl && (
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                                No document uploads available
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
