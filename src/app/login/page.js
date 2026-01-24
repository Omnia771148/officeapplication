'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import './login.css';

export default function LoginPage() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');

  const router = useRouter();

  const handleLogin = () => {
    if (id === 'parthu' && password === '123') {
      router.push('/dashboard');
    } else {
      alert('Invalid Credentials');
    }
  };

  return (
    <div className="loginContainer">
      <div className="loginCard">
        <h1 className="headerTitle">Hello</h1>

        <div className="inputGroup">
          <div className="icon">
            {/* User/Person Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#999' }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Mobile number"
            className="inputField"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
        </div>

        <div className="inputGroup">
          <div className="icon">
            {/* Lock/Password Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#e57373' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <input
            type="password"
            placeholder="Password"
            className="inputField"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="loginButton" onClick={handleLogin}>
          Login
        </button>
      </div>
    </div>
  );
}
