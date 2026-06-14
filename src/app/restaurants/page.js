'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import '../dashboard/dashboard.css';

export default function RestaurantsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');

    const branches = [
        { name: 'Kushas', path: '/kushas', color: '#4ECDC4', id: '1' },
        { name: 'Knl', path: '/knl', color: '#45B7D1', id: '2' },
        { name: 'Snofield', path: '/snofield', color: '#FF6B6B', id: '3' },
        { name: 'Bros', path: '/bros', color: '#FFA07A', id: '4' },
        { name: 'Mayuri', path: '/mayuri', color: '#98D8C8', id: '5' },
    ];

    const handleBranchClick = (branch) => {
        localStorage.setItem('restaurantId', branch.id);
        router.push(branch.path);
    };

    const filteredBranches = branches.filter((branch) =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="dashboardContainer" style={{ position: 'relative', paddingTop: '80px' }}>
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
            
            <h1 className="dashboardTitle">Select a Restaurant Branch</h1>

            <div className="searchContainer">
                <input
                    type="text"
                    placeholder="Search restaurant by name..."
                    className="searchInput"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="buttonGrid">
                {filteredBranches.length > 0 ? (
                    filteredBranches.map((branch) => (
                        <button
                            key={branch.name}
                            className="branchButton"
                            style={{ '--btn-color': branch.color }}
                            onClick={() => handleBranchClick(branch)}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span>{branch.name}</span>
                                <span style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '5px', fontWeight: 'normal' }}>ID: {branch.id}</span>
                            </div>
                        </button>
                    ))
                ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666', padding: '20px', fontSize: '1.1rem' }}>
                        No branches found matching "{searchTerm}"
                    </div>
                )}
            </div>
        </div>
    );
}

