'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const incrementItemId = (id) => {
    if (!id) return 'ITEM001';
    if (/^\d+$/.test(id)) {
        return (Number(id) + 1).toString();
    }
    const match = id.match(/^(.*?)(\d+)$/);
    if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const nextNum = Number(numStr) + 1;
        const paddedNextNum = nextNum.toString().padStart(numStr.length, '0');
        return prefix + paddedNextNum;
    }
    return id + '1';
};

// Utility to compress and resize image to target size in KB using HTML5 Canvas
const compressImage = (file, targetSizeKb = 70) => {
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
              if (blobSizeKb > targetSizeKb && quality > 0.2) {
                quality -= 0.15; // Larger step size for faster compression
                checkQualityAndResolve();
              } else {
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

export default function AddItemCustomerPage() {
    const router = useRouter();
    const [restaurants, setRestaurants] = useState([]);
    const [restaurantId, setRestaurantId] = useState('');
    const [itemName, setItemName] = useState('');
    const [price, setPrice] = useState('');
    const [rating, setRating] = useState('4.5');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [itemId, setItemId] = useState('');
    const [vegOrNonVeg, setVegOrNonVeg] = useState('Veg');
    const [offerPercentage, setOfferPercentage] = useState('');
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [fetchingRestaurants, setFetchingRestaurants] = useState(true);
    const [isFixedRestaurant, setIsFixedRestaurant] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Fetch registered restaurants on load
    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const res = await fetch('/api/restaurant-timings');
                const data = await res.json();
                if (data.success && data.restaurants) {
                    setRestaurants(data.restaurants);
                    
                    // Check if restaurantId query param is provided
                    const searchParams = new URLSearchParams(window.location.search);
                    const queryRestaurantId = searchParams.get('restaurantId');
                    
                    if (queryRestaurantId) {
                        setRestaurantId(queryRestaurantId);
                        setIsFixedRestaurant(true);
                        autoFillNextItemId(queryRestaurantId);
                    } else if (data.restaurants.length > 0) {
                        const firstRestId = data.restaurants[0].restId;
                        setRestaurantId(firstRestId);
                        autoFillNextItemId(firstRestId);
                    }
                } else {
                    setError('Failed to fetch restaurant collections.');
                }
            } catch (err) {
                setError('Failed to connect to the server for restaurant list.');
            } finally {
                setFetchingRestaurants(false);
            }
        };

        fetchRestaurants();
    }, []);

    // Autofill Next Item ID
    const autoFillNextItemId = async (rId) => {
        if (!rId) return;
        try {
            const res = await fetch(`/api/item-status?restaurantId=${encodeURIComponent(rId.trim())}`);
            const result = await res.json();
            if (result.success && result.data && result.data.length > 0) {
                const latestItemId = result.data[0].itemId;
                setItemId(incrementItemId(latestItemId));
            } else {
                setItemId('ITEM001');
            }
        } catch (err) {
            console.error('Failed to auto-fetch next item ID', err);
            setItemId('ITEM001');
        }
    };

    // Trigger ID fetch when restaurant selection changes
    const handleRestaurantChange = (e) => {
        const selectedId = e.target.value;
        setRestaurantId(selectedId);
        autoFillNextItemId(selectedId);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        // Validation
        if (!restaurantId) {
            setError('Please select a restaurant collection.');
            return;
        }
        const finalItemId = itemId.trim() || 'ITEM_' + Date.now();
        if (!itemName.trim() || !price.trim() || !rating.trim()) {
            setError('All fields including Name, Price, and Rating are required.');
            return;
        }
        if (!photoFile) {
            setError('Please select an item photo to upload.');
            return;
        }

        const parsedPrice = Number(price);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            setError('Please enter a valid positive price.');
            return;
        }

        const parsedRating = Number(rating);
        if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
            setError('Rating must be a number between 0 and 5.');
            return;
        }

        const parsedOffer = offerPercentage.trim() ? Number(offerPercentage) : 0;
        if (isNaN(parsedOffer) || parsedOffer < 0 || parsedOffer > 100) {
            setError('Offer percentage must be a number between 0 and 100.');
            return;
        }

        setLoading(true);

        try {
            // Step 1: Compress and upload photo to S3 under folder "customeritemscollection"
            setMessage('Optimizing image for fast upload...');
            const compressedFile = await compressImage(photoFile);
            
            setMessage('Uploading image to S3...');
            const uploadFormData = new FormData();
            uploadFormData.append('file', compressedFile);
            uploadFormData.append('id', finalItemId);
            uploadFormData.append('folder', 'customeritemscollection'); // Store inside customeritemscollection folder

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: uploadFormData
            });

            const uploadResult = await uploadRes.json();
            if (!uploadRes.ok || !uploadResult.success) {
                throw new Error(uploadResult.error || 'Failed to upload photo to S3.');
            }

            const photoUrl = uploadResult.url;

            // Step 2: Add item to the restaurant collection
            const addRes = await fetch('/api/add-item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    itemName: itemName.trim(),
                    itemId: finalItemId,
                    price: parsedPrice,
                    restaurantId: restaurantId,
                    rating: parsedRating,
                    photoUrl: photoUrl,
                    itemStatus: true,
                    itemtodisplayintherestuarentapp: true,
                    vegOrNonVeg: vegOrNonVeg,
                    offerpercentage: parsedOffer
                })
            });

            const addResult = await addRes.json();
            if (addRes.ok) {
                setMessage('Success! Item uploaded and added to MongoDB collection.');
                setItemName('');
                setPrice('');
                setVegOrNonVeg('Veg');
                setOfferPercentage('');
                setPhotoFile(null);
                setPhotoPreview(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                // Pre-increment Item ID for next addition
                setItemId(prev => incrementItemId(prev));
            } else {
                throw new Error(addResult.message || 'Failed to add item to collection.');
            }

        } catch (err) {
            setError(err.message || 'An error occurred during submission.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="addItemCustomerContainer">
            <style>{`
                .addItemCustomerContainer {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    font-family: 'Outfit', 'Inter', sans-serif;
                    padding: 40px 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    color: #f1f5f9;
                }
                .backHeader {
                    width: 100%;
                    max-width: 650px;
                    margin-bottom: 25px;
                    display: flex;
                    justify-content: flex-start;
                }
                .btnBack {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 10px 20px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 600;
                    color: #cbd5e1;
                    transition: all 0.3s;
                    backdrop-filter: blur(10px);
                }
                .btnBack:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #ffffff;
                    transform: translateX(-4px);
                }
                .formCard {
                    background: rgba(30, 41, 59, 0.7);
                    backdrop-filter: blur(16px);
                    border-radius: 20px;
                    padding: 40px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    width: 100%;
                    max-width: 650px;
                    animation: slideUp 0.5s ease-out;
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .pageTitle {
                    font-size: 2.2rem;
                    font-weight: 800;
                    background: linear-gradient(90deg, #38bdf8 0%, #818cf8 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 8px;
                    text-align: center;
                }
                .pageSubtitle {
                    color: #94a3b8;
                    text-align: center;
                    margin-bottom: 35px;
                    font-size: 1rem;
                }
                .formGroup {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 22px;
                }
                .formLabel {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #cbd5e1;
                    letter-spacing: 0.5px;
                }
                .formInput, .formSelect {
                    padding: 14px 18px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    background: rgba(15, 23, 42, 0.6);
                    color: #ffffff;
                    font-size: 1rem;
                    outline: none;
                    transition: all 0.3s;
                }
                .formInput:focus, .formSelect:focus {
                    border-color: #38bdf8;
                    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25);
                    background: rgba(15, 23, 42, 0.8);
                }
                .formSelect:disabled {
                    background: rgba(15, 23, 42, 0.35);
                    color: #94a3b8;
                    cursor: not-allowed;
                    border-color: rgba(255, 255, 255, 0.08);
                    opacity: 0.85;
                }
                .formInput::placeholder {
                    color: #64748b;
                }
                .formSelect option {
                    background: #1e293b;
                    color: #ffffff;
                }
                .rowGroup {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                .uploadDropZone {
                    border: 2px dashed rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    padding: 30px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    background: rgba(15, 23, 42, 0.3);
                    transition: all 0.3s;
                    position: relative;
                }
                .uploadDropZone:hover {
                    border-color: #38bdf8;
                    background: rgba(15, 23, 42, 0.5);
                }
                .uploadIcon {
                    font-size: 2rem;
                    margin-bottom: 10px;
                    color: #38bdf8;
                }
                .uploadText {
                    color: #94a3b8;
                    font-size: 0.9rem;
                    text-align: center;
                }
                .fileInputHidden {
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    cursor: pointer;
                }
                .previewContainer {
                    margin-top: 15px;
                    display: flex;
                    justify-content: center;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    max-height: 200px;
                }
                .imagePreview {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .btnSubmit {
                    width: 100%;
                    padding: 16px;
                    border: none;
                    border-radius: 12px;
                    background: linear-gradient(90deg, #0ea5e9 0%, #4f46e5 100%);
                    color: white;
                    font-weight: 700;
                    font-size: 1.1rem;
                    cursor: pointer;
                    box-shadow: 0 10px 20px rgba(79, 70, 229, 0.25);
                    transition: all 0.3s;
                    margin-top: 10px;
                }
                .btnSubmit:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 30px rgba(79, 70, 229, 0.4);
                }
                .btnSubmit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .alertMessage {
                    padding: 14px 18px;
                    border-radius: 10px;
                    font-weight: 500;
                    margin-bottom: 25px;
                    font-size: 0.95rem;
                    animation: fadeIn 0.3s ease-in-out;
                }
                .alertMessage.success {
                    background: rgba(16, 185, 129, 0.15);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    color: #34d399;
                }
                .alertMessage.error {
                    background: rgba(239, 68, 68, 0.15);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #f87171;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>


            <div className="formCard">
                <h1 className="pageTitle">✨ Add Customer App Item</h1>
                <p className="pageSubtitle">Publish menu items directly with S3 photo uploading and dynamic collection routing</p>

                {message && (
                    <div className="alertMessage success">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="alertMessage error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="formGroup">
                        <label className="formLabel">Select Restaurant Collection</label>
                        {fetchingRestaurants ? (
                            <select className="formSelect" disabled>
                                <option>Loading registered collections...</option>
                            </select>
                        ) : (
                            <select 
                                className="formSelect" 
                                value={restaurantId} 
                                onChange={handleRestaurantChange}
                                disabled={isFixedRestaurant}
                                required
                            >
                                {restaurants.map((r) => {
                                    const collectionName = r.phone ? r.phone.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') : r.restId;
                                    return (
                                        <option key={r.restId} value={r.restId}>
                                            {collectionName}
                                        </option>
                                    );
                                })}
                            </select>
                        )}
                    </div>

                    <div className="formGroup">
                        <label className="formLabel">Item Name</label>
                        <input
                            type="text"
                            className="formInput"
                            placeholder="e.g. Spicy Chicken Burger"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="rowGroup">
                        <div className="formGroup">
                            <label className="formLabel">Price (₹)</label>
                            <input
                                type="number"
                                className="formInput"
                                placeholder="e.g. 299"
                                value={price}
                                min="0.01"
                                step="0.01"
                                onChange={(e) => setPrice(e.target.value)}
                                required
                            />
                        </div>

                        <div className="formGroup">
                            <label className="formLabel">Offer Percentage (%)</label>
                            <input
                                type="number"
                                className="formInput"
                                placeholder="e.g. 10"
                                value={offerPercentage}
                                min="0"
                                max="100"
                                step="1"
                                onChange={(e) => setOfferPercentage(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="rowGroup">
                        <div className="formGroup">
                            <label className="formLabel">Rating (0 - 5)</label>
                            <input
                                type="number"
                                className="formInput"
                                placeholder="e.g. 4.5"
                                value={rating}
                                min="0"
                                max="5"
                                step="0.1"
                                onChange={(e) => setRating(e.target.value)}
                                required
                            />
                        </div>

                        <div className="formGroup">
                            <label className="formLabel">Item Type</label>
                            <select
                                className="formSelect"
                                value={vegOrNonVeg}
                                onChange={(e) => setVegOrNonVeg(e.target.value)}
                                required
                            >
                                <option value="Veg">Veg</option>
                                <option value="Non-Veg">Non-Veg</option>
                            </select>
                        </div>
                    </div>

                    <div className="formGroup">
                        <label className="formLabel">Item Photo</label>
                        <div className="uploadDropZone">
                            <span className="uploadIcon">📷</span>
                            <span className="uploadText">
                                {photoFile ? `Selected: ${photoFile.name}` : 'Click here or drag to select item photo'}
                            </span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="fileInputHidden"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                            />
                        </div>
                        {photoPreview && (
                            <div className="previewContainer">
                                <img src={photoPreview} alt="Item Preview" className="imagePreview" />
                            </div>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        className="btnSubmit" 
                        disabled={loading}
                    >
                        {loading ? 'Uploading & Creating...' : '🚀 Publish Item'}
                    </button>
                </form>
            </div>
        </div>
    );
}
