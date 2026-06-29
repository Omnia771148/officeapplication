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

            <div style={{ width: '90%', maxWidth: '800px', marginBottom: '20px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#E91E63' }}
                    onClick={() => router.push('/live')}
                >
                    Live Orders
                </button>
            </div>

            <div style={{ width: '90%', maxWidth: '800px', marginBottom: '20px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#8e44ad' }}
                    onClick={() => router.push('/viewdeliveryboys')}
                >
                    New Delivery Boys
                </button>
            </div>

            <div style={{ width: '90%', maxWidth: '800px', marginBottom: '20px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#009688' }}
                    onClick={() => router.push('/restaurants')}
                >
                    Restaurants
                </button>
            </div>

            <div style={{ width: '90%', maxWidth: '800px', marginBottom: '20px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#2ecc71' }}
                    onClick={() => router.push('/add-item')}
                >
                    Add Item
                </button>
            </div>

            <div style={{ width: '90%', maxWidth: '800px', marginBottom: '20px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#9b59b6' }}
                    onClick={() => router.push('/deliveryboy-details')}
                >
                    Delivery Boy Details
                </button>
            </div>

            <div style={{ width: '90%', maxWidth: '800px', marginBottom: '20px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#3F51B5' }}
                    onClick={() => router.push('/restaurant-timings')}
                >
                    Manage Restaurant Timings & Status
                </button>
            </div>

            <div style={{ width: '90%', maxWidth: '800px', marginBottom: '20px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#009688' }}
                    onClick={() => router.push('/customers')}
                >
                    CUSTOMERS AND DETAILS
                </button>
            </div>

            <div style={{ width: '90%', maxWidth: '800px', marginBottom: '20px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#673AB7' }}
                    onClick={() => router.push('/deliveryboypendingpayments')}
                >
                    Delivery Boy Pending Payments
                </button>
            </div>

            <div style={{ width: '90%', maxWidth: '800px', marginBottom: '20px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#FF9800' }}
                    onClick={() => router.push('/restaurant-register')}
                >
                    Register New Restaurant
                </button>
            </div>

            <div style={{ width: '90%', maxWidth: '800px', marginBottom: '20px' }}>
                <button
                    className="branchButton"
                    style={{ '--btn-color': '#607D8B' }}
                    onClick={() => setShowMoreOptions(!showMoreOptions)}
                >
                    {showMoreOptions ? 'Hide Options ▲' : 'More Options ▼'}
                </button>
            </div>

            {showMoreOptions && (
                <div style={{ width: '90%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                    <button
                        className="branchButton"
                        style={{ '--btn-color': '#9C27B0' }}
                        onClick={() => router.push('/influencer-coupons')}
                    >
                        Coupon Codes for Influencers
                    </button>
                    
                    <button
                        className="branchButton"
                        style={{ '--btn-color': '#34495e' }}
                        onClick={() => router.push('/add-carousel')}
                    >
                        🖼️ Add Carousel Slide
                    </button>
                </div>
            )}
        </div>
    );
}
