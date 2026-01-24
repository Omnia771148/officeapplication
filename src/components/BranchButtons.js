'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function BranchButtons({ restaurantId }) {
    const router = useRouter();

    const handleNavigation = (path) => {
        localStorage.setItem('restaurantId', restaurantId);
        alert(`Restaurant ID: ${restaurantId}`);
        router.push(path);
    };

    const buttonStyle = {
        padding: '15px 30px',
        fontSize: '1.2rem',
        borderRadius: '10px',
        border: 'none',
        width: '200px',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'transform 0.2s',
        margin: '10px',
        color: '#fff',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '30px' }}>

            <button
                style={{ ...buttonStyle, backgroundColor: '#FF9800' }}
                onClick={() => handleNavigation('/yet-to-accept')}
            >
                Yet To Accept
            </button>
            <button
                style={{ ...buttonStyle, backgroundColor: '#2196F3' }}
                onClick={() => handleNavigation('/accepted')}
            >
                Accepted
            </button>
        </div>
    );
}
