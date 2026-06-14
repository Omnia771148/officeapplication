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

    return (
        <div className="dashboardContainer">
            <h1 className="dashboardTitle">Management Dashboard</h1>

            <div style={{ width: '90%', maxWidth: '800px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#009688', marginBottom: '20px' }}
                    onClick={() => router.push('/restaurants')}
                >
                    Restaurants
                </button>
            </div>

            <div style={{ width: '90%', maxWidth: '800px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#8e44ad', marginBottom: '20px' }}
                    onClick={() => router.push('/viewdeliveryboys')}
                >
                    New Delivery Boys
                </button>
            </div>

            <div style={{ width: '90%', maxWidth: '800px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#9b59b6' }}
                    onClick={() => router.push('/deliveryboy-details')}
                >
                    Delivery Boy Details
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
