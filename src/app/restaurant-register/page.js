"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RestaurantRegisterPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [restId, setRestId] = useState("");
  const [restLocation, setRestLocation] = useState("");
  const [address, setAddress] = useState("");
  const [fssai, setFssai] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [msg, setMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    try {
      const res = await fetch("/api/restaurant-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone,
          password,
          restId,
          restLocation,
          address,
          fssai,
          openTime,
          closeTime,
          latitude,
          longitude,
        }),
      });
      const data = await res.json();
      setMsg(data.message);
      if (res.status === 201) {
        setIsSuccess(true);
      }
    } catch (error) {
      setMsg("Registration failed: " + error.message);
    }
  };

  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '600px', 
      margin: '0 auto', 
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>Office Panel - Register Restaurant</h2>

      <div style={{ display: 'grid', gap: '15px' }}>
        <input 
          style={inputStyle} 
          placeholder="Email" 
          onChange={(e) => setEmail(e.target.value)} 
        />
        
        <input 
          style={inputStyle} 
          placeholder="Phone" 
          onChange={(e) => setPhone(e.target.value)} 
        />

        <input 
          style={inputStyle} 
          type="password" 
          placeholder="Password" 
          onChange={(e) => setPassword(e.target.value)} 
        />

        <input 
          style={inputStyle} 
          placeholder="Restaurant ID" 
          onChange={(e) => setRestId(e.target.value)} 
        />

        <input 
          style={inputStyle} 
          placeholder="Restaurant Location (City/Area)" 
          onChange={(e) => setRestLocation(e.target.value)} 
        />

        <input 
          style={inputStyle} 
          placeholder="Full Restaurant Address" 
          onChange={(e) => setAddress(e.target.value)} 
        />

        <input 
          style={inputStyle} 
          placeholder="Restaurant FSSAI Number" 
          onChange={(e) => setFssai(e.target.value)} 
        />

        <div>
          <label style={labelStyle}>Opening Time</label>
          <input 
            style={inputStyle} 
            type="time" 
            onChange={(e) => setOpenTime(e.target.value)} 
          />
        </div>

        <div>
          <label style={labelStyle}>Closing Time</label>
          <input 
            style={inputStyle} 
            type="time" 
            onChange={(e) => setCloseTime(e.target.value)} 
          />
        </div>

        <input 
          style={inputStyle} 
          placeholder="Latitude (e.g. 15.8223)" 
          onChange={(e) => setLatitude(e.target.value)} 
        />

        <input 
          style={inputStyle} 
          placeholder="Longitude (e.g. 78.0352)" 
          onChange={(e) => setLongitude(e.target.value)} 
        />

        <button
          style={buttonStyle}
          onClick={handleRegister}
        >
          Register Restaurant
        </button>
      </div>

      {msg && (
        <p style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: isSuccess ? '#e6fffa' : '#fff5f5',
          color: isSuccess ? '#2c7a7b' : '#c53030',
          borderRadius: '4px',
          border: `1px solid ${isSuccess ? '#b2f5ea' : '#feb2b2'}`
        }}>
          {msg}
        </p>
      )}

      {isSuccess && (
        <div style={{ marginTop: '20px' }}>
             <p>Restaurant has been successfully registered and added to the database.</p>
             <button 
                onClick={() => window.location.href = `http://localhost:3000/?autoLogin=true&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`}
                style={{...buttonStyle, backgroundColor: '#4a5568', marginTop: '10px'}}
             >
                Login Directly to Restaurant App
             </button>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #ddd',
  fontSize: '16px'
};

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontWeight: '600',
  color: '#555'
};

const buttonStyle = {
  width: '100%',
  padding: '14px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: '#3182ce',
  color: 'white',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s'
};
