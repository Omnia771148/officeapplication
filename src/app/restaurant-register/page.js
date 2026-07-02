"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

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
          placeholder="Name" 
          onChange={(e) => setPhone(e.target.value)} 
        />

        <input 
          style={inputStyle} 
          placeholder="Name of the Restaurant" 
          onChange={(e) => setName(e.target.value)} 
        />

        <input 
          style={inputStyle} 
          placeholder="Offer Title" 
          onChange={(e) => setOfferTitle(e.target.value)} 
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

        <div>
          <label style={labelStyle}>Restaurant Type</label>
          <select 
            style={inputStyle} 
            value={vegOrNonVeg} 
            onChange={(e) => setVegOrNonVeg(e.target.value)}
          >
            <option value="Both">Both (Veg & Non-Veg)</option>
            <option value="Veg">Veg</option>
            <option value="Non-Veg">Non-Veg</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Restaurant Logo</label>
          <input 
            style={inputStyle} 
            type="file" 
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files[0])} 
          />
        </div>

        <button
          style={buttonStyle}
          onClick={handleRegister}
          disabled={uploading}
        >
          {uploading ? "Uploading logo..." : "Register Restaurant"}
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
