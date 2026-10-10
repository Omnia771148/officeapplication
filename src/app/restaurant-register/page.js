"use client";
import { useState, useEffect, useRef } from "react";
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
  const [latestRestId, setLatestRestId] = useState("");
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
  const [rating, setRating] = useState("4.2");

  // Sub-restaurants multi-select dropdown states
  const [availableRestaurants, setAvailableRestaurants] = useState([]);
  const [selectedSubRestaurants, setSelectedSubRestaurants] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const dropdownRef = useRef(null);

  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchInitialData = async () => {
    try {
      const res = await fetch("/api/restaurant-register");
      const data = await res.json();
      if (data.success) {
        if (data.latestRestId) {
          setLatestRestId(data.latestRestId);
        }
        if (Array.isArray(data.restaurants)) {
          setAvailableRestaurants(data.restaurants);
        }
      }
    } catch (err) {
      console.error("Error fetching initial restaurant data:", err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const toggleRestaurantSelection = (id) => {
    setSelectedSubRestaurants((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedSubRestaurants(availableRestaurants.map((r) => r.restId));
  };

  const handleClearAll = () => {
    setSelectedSubRestaurants([]);
  };

  const filteredRestaurants = availableRestaurants.filter((r) => {
    const term = dropdownSearch.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.restId && String(r.restId).toLowerCase().includes(term))
    );
  });

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
    setRating("4.2");
    setSelectedSubRestaurants([]);
    setDropdownOpen(false);
    setDropdownSearch("");
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
          rating,
          subrestaurentsId: selectedSubRestaurants,
          subrestaurents_id: selectedSubRestaurants,
        }),
      });
      const data = await res.json();
      setMsg(data.message);
      if (res.status === 201) {
        setIsSuccess(true);
        fetchInitialData();
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
            <label className="form-label">Restaurant Rating (1.0 - 5.0)</label>
            <input 
              className="input-field" 
              type="number"
              step="0.1"
              min="1.0"
              max="5.0"
              placeholder="e.g., 4.2" 
              value={rating}
              onChange={(e) => setRating(e.target.value)} 
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Restaurant ID</label>
              {latestRestId && (
                <span style={{ fontSize: '0.85rem', color: '#009688', fontWeight: '700', backgroundColor: '#e6f4f2', padding: '2px 8px', borderRadius: '4px' }}>
                  Latest ID: {latestRestId}
                </span>
              )}
            </div>
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

          {/* Sub-Restaurants Multi-Select Dropdown */}
          <div className="form-group full-width" ref={dropdownRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Sub-Restaurants (Link Branches / Outlets)
              </label>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Optional • Single, Multiple, or None ({selectedSubRestaurants.length} selected)
              </span>
            </div>

            <div className="multiselect-wrapper">
              <div 
                className={`multiselect-trigger ${dropdownOpen ? 'active' : ''}`}
                onClick={() => setDropdownOpen((prev) => !prev)}
              >
                {selectedSubRestaurants.length === 0 ? (
                  <span className="placeholder-text">Select sub-restaurants (Optional • Single, Multiple, or None)...</span>
                ) : (
                  <div className="selected-chips-container">
                    {selectedSubRestaurants.map((id) => {
                      const found = availableRestaurants.find((r) => r.restId === id);
                      return (
                        <span key={id} className="selected-chip">
                          {found ? found.name : `Restaurant ${id}`} (ID: {id})
                          <button
                            type="button"
                            className="chip-remove-btn"
                            title="Remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRestaurantSelection(id);
                            }}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <span className={`multiselect-arrow ${dropdownOpen ? 'rotated' : ''}`}>
                  ▼
                </span>
              </div>

              {dropdownOpen && (
                <div className="multiselect-dropdown-menu">
                  <div className="dropdown-search-wrapper">
                    <input 
                      type="text"
                      className="dropdown-search-input"
                      placeholder="🔍 Search restaurant name or restId..."
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>

                  <div className="dropdown-toolbar">
                    <span>
                      {selectedSubRestaurants.length} of {availableRestaurants.length} selected
                    </span>
                    <div className="toolbar-actions">
                      <button 
                        type="button" 
                        className="toolbar-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAll();
                        }}
                      >
                        Select All
                      </button>
                      <button 
                        type="button" 
                        className="toolbar-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearAll();
                        }}
                      >
                        Clear All
                      </button>
                      <button 
                        type="button" 
                        className="toolbar-btn"
                        style={{ background: '#6366f1', color: '#ffffff', borderColor: '#6366f1' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownOpen(false);
                        }}
                      >
                        Done
                      </button>
                    </div>
                  </div>

                  <div className="dropdown-items-list">
                    {filteredRestaurants.length === 0 ? (
                      <div className="dropdown-empty-msg">
                        {availableRestaurants.length === 0 
                          ? "No restaurants found in database." 
                          : "No matching restaurants found."}
                      </div>
                    ) : (
                      filteredRestaurants.map((restaurant) => {
                        const isSelected = selectedSubRestaurants.includes(restaurant.restId);
                        return (
                          <div 
                            key={restaurant.restId}
                            className={`dropdown-item-row ${isSelected ? 'selected' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRestaurantSelection(restaurant.restId);
                            }}
                          >
                            <input 
                              type="checkbox"
                              className="dropdown-checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="dropdown-item-name">
                              {restaurant.name}
                            </span>
                            <span className="dropdown-item-id-badge">
                              restId: "{restaurant.restId}"
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
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
