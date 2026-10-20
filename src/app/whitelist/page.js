'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './whitelist.css';

export default function WhitelistPage() {
    const router = useRouter();

    // Form inputs: exactly phone number and password as requested
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // List and UI states
    const [whitelistedUsers, setWhitelistedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingList, setFetchingList] = useState(true);
    const [alertMessage, setAlertMessage] = useState({ type: '', text: '' });
    const [visibleCardPasswords, setVisibleCardPasswords] = useState({});
    const [copiedKey, setCopiedKey] = useState(null);

    // Fetch existing whitelisted users on load
    useEffect(() => {
        fetchWhitelistedUsers();
    }, []);

    const fetchWhitelistedUsers = async () => {
        setFetchingList(true);
        try {
            const res = await fetch('/api/whitelist');
            const data = await res.json();
            if (data.success) {
                setWhitelistedUsers(data.data || []);
            } else {
                console.error('Failed to load whitelisted users:', data.error);
            }
        } catch (err) {
            console.error('Error fetching whitelisted users:', err);
        } finally {
            setFetchingList(false);
        }
    };

    const handleWhitelistSubmit = async (e) => {
        e.preventDefault();
        setAlertMessage({ type: '', text: '' });

        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        if (!cleanPhone || cleanPhone.length !== 10) {
            setAlertMessage({ type: 'error', text: 'Please enter a valid 10-digit mobile phone number.' });
            return;
        }

        if (!password.trim()) {
            setAlertMessage({ type: 'error', text: 'Please enter a password for this customer account.' });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/whitelist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: cleanPhone, password: password.trim() })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setAlertMessage({
                    type: 'success',
                    text: `Success! Account +91 ${cleanPhone} is now whitelisted with unrestricted customer app access.`
                });
                setPhone('');
                setPassword('');
                fetchWhitelistedUsers();
            } else {
                setAlertMessage({
                    type: 'error',
                    text: data.message || data.error || 'Failed to whitelist account.'
                });
            }
        } catch (err) {
            setAlertMessage({
                type: 'error',
                text: 'Network error. Could not connect to the office server.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveWhitelist = async (user) => {
        const confirmMsg = `Are you sure you want to remove whitelist access for +91 ${user.phone}? They will become a normal user.`;
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await fetch(`/api/whitelist?userId=${user._id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setAlertMessage({
                    type: 'success',
                    text: `Whitelist access removed for ${user.phone}.`
                });
                fetchWhitelistedUsers();
            } else {
                alert(data.message || 'Failed to remove whitelist.');
            }
        } catch (err) {
            alert('Error removing whitelist: ' + err.message);
        }
    };

    const toggleCardPassword = (userId) => {
        setVisibleCardPasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const handleCopy = (text, key) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        }
    };

    return (
        <div className="whitelistContainer">
            {/* Top Navigation */}
            <div className="topBar">
                <button className="backBtn" onClick={() => router.push('/dashboard')}>
                    ← Back to Dashboard
                </button>
            </div>

            {/* Header */}
            <div className="pageHeader">
                <h1>🛡️ Customer Whitelist Management</h1>
                <p>Register phone & password credentials for unrestricted Customer App access</p>
            </div>

            {/* Explanatory Notice */}
            <div className="noticeBanner">
                <span className="noticeIcon">💡</span>
                <div className="noticeText">
                    <h4>How Whitelist Access Works:</h4>
                    <p>
                        When a customer logs into the <strong>Customer App</strong> using the phone number and password specified below, their account is granted <strong>whitelisted status</strong>.
                        They will experience <strong>unrestricted access</strong>: bypassing maintenance mode screens, Kurnool geofence boundary restrictions, and paused checkout ordering controls.
                    </p>
                </div>
            </div>

            {/* Two-Field Form */}
            <div className="formCard">
                <div className="formTitle">
                    <span>✨</span>
                    <span>Whitelist Customer Credentials</span>
                </div>

                {alertMessage.text && (
                    <div className={`alertBox ${alertMessage.type}`}>
                        <span>{alertMessage.type === 'success' ? '✅' : '⚠️'}</span>
                        <span>{alertMessage.text}</span>
                    </div>
                )}

                <form onSubmit={handleWhitelistSubmit}>
                    {/* Field 1: Phone Number */}
                    <div className="fieldGroup">
                        <label className="fieldLabel" htmlFor="whitelist-phone">
                            Phone Number
                        </label>
                        <div className="inputWrapper">
                            <span className="phonePrefix">+91</span>
                            <input
                                id="whitelist-phone"
                                type="tel"
                                className="inputField withPrefix"
                                placeholder="Enter 10-digit mobile number"
                                value={phone}
                                maxLength={10}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                required
                            />
                        </div>
                        <div className="fieldHint">
                            Enter the 10-digit customer mobile number.
                        </div>
                    </div>

                    {/* Field 2: Password */}
                    <div className="fieldGroup">
                        <label className="fieldLabel" htmlFor="whitelist-password">
                            Password
                        </label>
                        <div className="inputWrapper">
                            <input
                                id="whitelist-password"
                                type={showPassword ? 'text' : 'password'}
                                className="inputField withSuffix"
                                placeholder="Enter login password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="passwordToggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                title={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        <div className="fieldHint">
                            Use this exact password when logging into the Customer App.
                        </div>
                    </div>

                    {/* Submit Action */}
                    <button
                        type="submit"
                        className="submitBtn"
                        disabled={loading || !phone || !password}
                    >
                        {loading ? 'Processing...' : '🛡️ Whitelist & Save Credentials'}
                    </button>
                </form>
            </div>

            {/* Whitelisted Accounts Section */}
            <div className="listSection">
                <div className="listHeader">
                    <div className="listHeaderTitle">
                        <span>Whitelisted Accounts</span>
                        <span className="badgeCount">{whitelistedUsers.length}</span>
                    </div>
                    <button className="refreshBtn" onClick={fetchWhitelistedUsers} disabled={fetchingList}>
                        🔄 {fetchingList ? 'Refreshing...' : 'Refresh List'}
                    </button>
                </div>

                {fetchingList ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Loading whitelisted accounts from database...
                    </div>
                ) : whitelistedUsers.length === 0 ? (
                    <div className="emptyState">
                        <span style={{ fontSize: '32px' }}>📋</span>
                        <p>No whitelisted accounts yet. Add a phone number and password above to whitelist an account.</p>
                    </div>
                ) : (
                    <div className="cardsGrid">
                        {whitelistedUsers.map((user) => {
                            const isPwdVisible = Boolean(visibleCardPasswords[user._id]);
                            const phoneKey = `phone_${user._id}`;
                            const pwdKey = `pwd_${user._id}`;

                            return (
                                <div key={user._id} className="userCard">
                                    <div className="cardTop">
                                        <span className="statusPill">✓ Whitelisted</span>
                                    </div>

                                    {/* Phone Field */}
                                    <div className="cardRow">
                                        <div className="cardRowLabel">Phone Number</div>
                                        <div className="cardRowValue">
                                            <span>+91 {user.phone}</span>
                                            <button
                                                className="copyBtn"
                                                onClick={() => handleCopy(user.phone, phoneKey)}
                                                title="Copy Phone"
                                            >
                                                {copiedKey === phoneKey ? '✓' : '📋'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Password Field */}
                                    <div className="cardRow">
                                        <div className="cardRowLabel">Password</div>
                                        <div className="cardRowValue">
                                            <span>
                                                {isPwdVisible ? user.password || '(not set)' : '••••••••'}
                                            </span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    className="copyBtn"
                                                    onClick={() => toggleCardPassword(user._id)}
                                                    title={isPwdVisible ? 'Hide' : 'Show'}
                                                >
                                                    {isPwdVisible ? '👁️' : '👁️‍🗨️'}
                                                </button>
                                                <button
                                                    className="copyBtn"
                                                    onClick={() => handleCopy(user.password || '', pwdKey)}
                                                    title="Copy Password"
                                                >
                                                    {copiedKey === pwdKey ? '✓' : '📋'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="cardFooter">
                                        <span className="dateText">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
                                        </span>
                                        <button
                                            className="deleteBtn"
                                            onClick={() => handleRemoveWhitelist(user)}
                                            title="Remove Whitelist Status"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
