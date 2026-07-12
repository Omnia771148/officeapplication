"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import "./register.css";

// Utility to compress and resize image to target size in KB using HTML5 Canvas
const compressImage = (file, targetSizeKb = 65) => {
  if (!file || !file.type.startsWith("image/")) {
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Resize down if image is high-resolution (max 800px width/height)
        const MAX_DIM = 800;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        const checkQualityAndResolve = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const blobSizeKb = blob.size / 1024;
              if (blobSizeKb > targetSizeKb && quality > 0.15) {
                quality -= 0.1;
                checkQualityAndResolve();
              } else {
                // Ensure output is named with a .jpg extension matching the jpeg blob
                const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                const compressedFile = new File([blob], `${baseName}.jpg`, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            "image/jpeg",
            quality
          );
        };

        checkQualityAndResolve();
      };
    };
    reader.onerror = () => resolve(file);
  });
};

export default function RestaurantRegisterPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [offerTitle, setOfferTitle] = useState("");
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
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [vegOrNonVeg, setVegOrNonVeg] = useState("Both");
  const [commission, setCommission] = useState("");
  const router = useRouter();

  const handleResetForm = () => {
    setEmail("");
    setPhone("");
    setName("");
    setOfferTitle("");
    setPassword("");
    setRestId("");
    setRestLocation("");
    setAddress("");
    setFssai("");
    setOpenTime("");
    setCloseTime("");
    setLatitude("");
    setLongitude("");
    setLogoFile(null);
    setVegOrNonVeg("Both");
    setCommission("");
    setMsg("");
    setIsSuccess(false);
  };

  const handleRegister = async () => {
    try {
      setMsg("");
      if (!restId) {
        setMsg("Restaurant ID is required before uploading a logo");
        return;
      }

      let uploadedLogoUrl = "";

      if (logoFile) {
        setUploading(true);
        setMsg("Compressing logo to ~65KB...");
        const compressedFile = await compressImage(logoFile, 65);
        setMsg("Uploading compressed logo to S3...");
        const formData = new FormData();
        formData.append("file", compressedFile);
        formData.append("restId", restId);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || "Failed to upload logo to S3");
        }
        uploadedLogoUrl = uploadData.url;
      }

      setMsg("Registering restaurant...");
      setUploading(false);

      const res = await fetch("/api/restaurant-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone,
          name,
          offerTitle,
          password,
          restId,
          restLocation,
          address,
          fssai,
          openTime,
          closeTime,
          latitude,
          longitude,
          logoUrl: uploadedLogoUrl,
          vegOrNonVeg,
          commission,
        }),
      });
      const data = await res.json();
      setMsg(data.message);
      if (res.status === 201) {
        setIsSuccess(true);
      }
    } catch (error) {
      setMsg("Registration failed: " + error.message);
      setUploading(false);
    }
  };

  return (
    <div className="register-page-wrapper">
      <button onClick={() => router.push('/dashboard')} className="back-btn">
        ← Back to Dashboard
      </button>

      <div className="register-card">
        <h2 className="register-title">Register Restaurant</h2>
        <p className="register-subtitle">Configure a new branch profile and register it to the office panel</p>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              className="input-field" 
              type="email"
              placeholder="e.g., contact@restaurant.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Username / Phone</label>
            <input 
              className="input-field" 
              placeholder="e.g., owner_username or phone" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Restaurant Name</label>
            <input 
              className="input-field" 
              placeholder="e.g., Viva Findine" 
              value={name}
              onChange={(e) => setName(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Offer Title</label>
            <input 
              className="input-field" 
              placeholder="e.g., 20% OFF on all items" 
              value={offerTitle}
              onChange={(e) => setOfferTitle(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              className="input-field" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Restaurant ID</label>
            <input 
              className="input-field" 
              placeholder="e.g., 16" 
              value={restId}
              onChange={(e) => setRestId(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location (City/Area)</label>
            <input 
              className="input-field" 
              placeholder="e.g., Bengaluru" 
              value={restLocation}
              onChange={(e) => setRestLocation(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">FSSAI License Number</label>
            <input 
              className="input-field" 
              placeholder="14-digit FSSAI number" 
              value={fssai}
              onChange={(e) => setFssai(e.target.value)} 
            />
          </div>

          <div className="form-group full-width">
            <label className="form-label">Full Address</label>
            <input 
              className="input-field" 
              placeholder="e.g., Ground Floor, Sector 3, HSR Layout" 
              value={address}
              onChange={(e) => setAddress(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Opening Time</label>
            <input 
              className="input-field" 
              type="time" 
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Closing Time</label>
            <input 
              className="input-field" 
              type="time" 
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input 
              className="input-field" 
              placeholder="e.g., 12.9716" 
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input 
              className="input-field" 
              placeholder="e.g., 77.5946" 
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Commission from Restaurant (%)</label>
            <input 
              className="input-field" 
              type="number"
              step="0.01"
              placeholder="e.g., 12.5" 
              value={commission}
              onChange={(e) => setCommission(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Restaurant Type</label>
            <select 
              className="input-field" 
              value={vegOrNonVeg} 
              onChange={(e) => setVegOrNonVeg(e.target.value)}
            >
              <option value="Both">Both (Veg & Non-Veg)</option>
              <option value="Veg">Veg Only</option>
              <option value="Non-Veg">Non-Veg Only</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label className="form-label">Restaurant Logo</label>
            <div className="file-upload-wrapper">
              <div className="file-upload-trigger">
                {logoFile ? `Selected: ${logoFile.name}` : "📁 Choose restaurant logo image..."}
              </div>
              <input 
                key={logoFile ? 'logo-selected' : 'logo-empty'}
                className="file-upload-input" 
                type="file" 
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files[0])} 
              />
            </div>
          </div>

          <button
            className="submit-btn"
            onClick={handleRegister}
            disabled={uploading}
          >
            {uploading ? (
              <>⏳ Uploading logo & registering...</>
            ) : (
              <>🚀 Register Restaurant Branch</>
            )}
          </button>
        </div>

        {msg && (
          <div className={`message-box ${isSuccess ? 'success' : 'error'}`}>
            <span>{isSuccess ? '✅' : '❌'}</span>
            <span>{msg}</span>
          </div>
        )}

        {isSuccess && (
          <div className="success-container">
            <p>Restaurant has been successfully registered and added to the database.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => window.location.href = `http://localhost:3000/?autoLogin=true&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`}
                className="secondary-btn"
              >
                🔑 Login Directly to Restaurant App
              </button>
              <button 
                onClick={handleResetForm}
                className="secondary-btn"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderColor: 'transparent' }}
              >
                🆕 Register Another Restaurant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
