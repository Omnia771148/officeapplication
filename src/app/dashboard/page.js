'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import './dashboard.css';
import { requestForToken, onMessageListener } from '../../../lib/firebase'; // Ensure correct path

export default function Dashboard() {
    const router = useRouter();
    const [alertedOrders, setAlertedOrders] = useState(new Set()); // Track notified order IDs
    const [userInteracted, setUserInteracted] = useState(false); // Browser requirement for audio
    const [showMoreOptions, setShowMoreOptions] = useState(false); // Toggle more options
    
    // Add interaction listener and Firebase token registration
    useEffect(() => {
        // Request Firebase Token for Push Notifications
        requestForToken();
        
        // Handle foreground notifications
        onMessageListener()
            .then((payload) => {
                if (typeof Notification !== "undefined") {
                    new Notification(payload.notification.title, {
                        body: payload.notification.body,
                        icon: '/next.svg'
                    });
                }
            })
            .catch((err) => console.log('failed: ', err));

        const handleInteraction = () => setUserInteracted(true);
        window.addEventListener('mousedown', handleInteraction);
        window.addEventListener('keydown', handleInteraction);
        return () => {
            window.removeEventListener('mousedown', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
        };
    }, []);
    
    // Polling logic for pending orders > 30 seconds
    useEffect(() => {
        const checkPendingOrders = async () => {
            try {
                const res = await fetch('/api/check-pending');
                const data = await res.json();
                
                if (data.success && data.status === 'ALERT') {
                    // Extract IDs we haven't alerted yet
                    const newStaleOrders = data.orders.filter(o => !alertedOrders.has(o.id.toString()));
                    
                    if (newStaleOrders.length > 0) {
                        // Add new IDs to the set to prevent repeated notifications for same IDs
                        setAlertedOrders(prev => {
                            const next = new Set(prev);
                            newStaleOrders.forEach(o => next.add(o.id.toString()));
                            return next;
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to check pending orders:', err);
            }
        };

        // Check every 20 seconds
        const intervalId = setInterval(checkPendingOrders, 20000);
        checkPendingOrders(); // Initial check

        return () => clearInterval(intervalId);
    }, [alertedOrders, userInteracted]);

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

    return (
        <div className="dashboardContainer">
            <h1 className="dashboardTitle">Select a Branch</h1>
            <div className="buttonGrid">
                {branches.map((branch) => (
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
                ))}
            </div>

            <div style={{ marginTop: '30px', width: '90%', maxWidth: '800px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#8e44ad' }}
                    onClick={() => router.push('/viewdeliveryboys')}
                >
                    New Delivery Boys
                </button>
            </div>

            <button
                className="branchButton"
                style={{
                    marginTop: '30px',
                    width: '90%',
                    maxWidth: '400px',
                    backgroundColor: '#E91E63'
                }}
                onClick={() => router.push('/live')}
            >
                Live Orders
            </button>

            <button
                className="branchButton"
                style={{
                    marginTop: '20px',
                    width: '90%',
                    maxWidth: '400px',
                    backgroundColor: '#FF9800', // Orange
                    height: 'auto', 
                    padding: '15px' 
                }}
                onClick={() => router.push('/restaurant-register')}
            >
                Register New Restaurant
            </button>

            <button
                className="branchButton"
                style={{
                    marginTop: '20px',
                    width: '90%',
                    maxWidth: '400px',
                    backgroundColor: '#3F51B5', // Indigo
                    height: 'auto', 
                    padding: '15px' 
                }}
                onClick={() => router.push('/restaurant-timings')}
            >
                Manage Restaurant Timings & Status
            </button>

            <button
                className="branchButton"
                style={{
                    marginTop: '20px',
                    width: '90%',
                    maxWidth: '400px',
                    backgroundColor: '#673AB7', // Deep Purple
                    height: 'auto', // Allow height to adjust for potentially long text
                    padding: '15px' // Add padding since height is auto
                }}
                onClick={() => router.push('/deliveryboypendingpayments')}
            >
                Delivery Boy Pending Payments
            </button>

            <button
                className="branchButton"
                style={{
                    marginTop: '20px',
                    width: '90%',
                    maxWidth: '400px',
                    backgroundColor: '#009688', // Teal
                    height: 'auto',
                    padding: '15px'
                }}
                onClick={() => router.push('/customers')}
            >
                CUSTOMERS AND DETAILS
            </button>

            <button
                className="branchButton"
                style={{
                    marginTop: '20px',
                    width: '90%',
                    maxWidth: '400px',
                    backgroundColor: '#607D8B', // Blue Grey
                    height: 'auto',
                    padding: '15px'
                }}
                onClick={() => setShowMoreOptions(!showMoreOptions)}
            >
                {showMoreOptions ? 'Hide Options ▲' : 'More Options ▼'}
            </button>

            {showMoreOptions && (
                <div style={{ marginTop: '20px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
             
                    <button
                        className="branchButton"
                        style={{ width: '100%', backgroundColor: '#9C27B0', color: '#fff', height: 'auto', padding: '15px' }}
                        onClick={() => router.push('/influencer-coupons')}
                    >
                        Coupon Codes for Influencers
                    </button>
                </div>
            )}
        </div>
    );
}
