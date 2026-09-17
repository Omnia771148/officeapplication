"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Utility to compress and resize image using HTML5 Canvas (keeps file size ~65KB)
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

        // Resize down if image is high-resolution
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

export default function AddCarouselPage() {
  const router = useRouter();

  // Form states
  const [carouselId, setCarouselId] = useState("");
  const [carouselTitle, setCarouselTitle] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [restaurantsList, setRestaurantsList] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // DB Carousels list states
  const [carousels, setCarousels] = useState([]);
  const [loadingCarousels, setLoadingCarousels] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [previewModalImg, setPreviewModalImg] = useState(null);

  // Position control states (keyed by stable Mongo _id)
  const [inputPositions, setInputPositions] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [positionMsg, setPositionMsg] = useState({ text: "", isError: false });

  // Load restaurants for dropdown
  useEffect(() => {
    async function loadRestaurants() {
      try {
        const res = await fetch("/api/restaurant-timings");
        const data = await res.json();
        if (data.success && data.restaurants) {
          const list = data.restaurants.map((r) => ({
            id: r.restId || r._id,
            name: r.name || r.phone || r.restId,
          }));
          setRestaurantsList(list);
        }
      } catch (err) {
        console.error("Failed to load restaurants for carousel dropdown:", err);
      }
    }
    loadRestaurants();
  }, []);

  // Fetch carousels from DB
  const fetchCarousels = async () => {
    setLoadingCarousels(true);
    try {
      const res = await fetch("/api/carousel");
      const data = await res.json();
      if (data.success && Array.isArray(data.carousels)) {
        setCarousels(data.carousels);
        // Initialize position inputs to match current positions using stable _id
        const initialInputs = {};
        data.carousels.forEach((item) => {
          initialInputs[item._id] = item.position ? item.position.toString() : (item.carouselId ? item.carouselId.toString() : "");
        });
        setInputPositions(initialInputs);
      } else {
        console.error("Failed to fetch carousels:", data.error);
      }
    } catch (err) {
      console.error("Error fetching carousels:", err);
    } finally {
      setLoadingCarousels(false);
    }
  };

  useEffect(() => {
    fetchCarousels();
  }, []);

  const handlePositionInputChange = (key, val) => {
    setInputPositions((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  // Reorder position & ID handler
  const handleSavePosition = async (item, targetPosOverride) => {
    const key = item._id;
    const rawVal =
      targetPosOverride !== undefined
        ? targetPosOverride
        : inputPositions[key];
    const newPosNum = parseInt(rawVal, 10);

    if (isNaN(newPosNum) || newPosNum < 1) {
      setPositionMsg({
        text: "Please enter a valid position number (1 or greater).",
        isError: true,
      });
      return;
    }

    try {
      setSavingId(key);
      setPositionMsg({ text: "", isError: false });

      const res = await fetch("/api/carousel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: item._id,
          carouselId: item.carouselId,
          newPosition: newPosNum,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const updatedList = data.carousels || [];
        setCarousels(updatedList);
        const updatedInputs = {};
        updatedList.forEach((it) => {
          updatedInputs[it._id] = it.position ? it.position.toString() : (it.carouselId ? it.carouselId.toString() : "");
        });
        setInputPositions(updatedInputs);
        setPositionMsg({
          text: data.message || `Position & Slide ID updated successfully for ${item.title || item.carouselId}!`,
          isError: false,
        });
      } else {
        setPositionMsg({
          text: data.error || "Failed to update position.",
          isError: true,
        });
      }
    } catch (err) {
      console.error("Position update error:", err);
      setPositionMsg({
        text: "An error occurred while updating position.",
        isError: true,
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleStepPosition = (item, currentPos, delta) => {
    const targetPos = currentPos + delta;
    if (targetPos < 1 || targetPos > carousels.length) return;
    setInputPositions((prev) => ({ ...prev, [item._id]: targetPos.toString() }));
    handleSavePosition(item, targetPos);
  };

  const handleMoveToTop = (item) => {
    setInputPositions((prev) => ({ ...prev, [item._id]: "1" }));
    handleSavePosition(item, 1);
  };

  // Handle local file selection preview
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setLogoFile(file || null);
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
    } else {
      setFilePreview(null);
    }
  };

  // Upload handler
  const handleUpload = async () => {
    try {
      setMsg("");
      setIsSuccess(false);

      if (!logoFile) {
        setMsg("Please choose a carousel photo to upload");
        return;
      }

      setUploading(true);

      const targetId = carouselId.trim() || (carousels.length + 1).toString();

      // Step 1: Compress the image in-browser to target ~65KB
      setMsg("Compressing photo to ~65KB...");
      const compressedFile = await compressImage(logoFile, 65);

      // Step 2: Upload image to S3 (under carousel/ folder)
      setMsg("Uploading compressed image to S3...");
      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("id", targetId);
      formData.append("folder", "carousel");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Failed to upload photo to S3");
      }
      const s3Url = uploadData.url;

      // Step 3: Save carousel record in MongoDB
      setMsg("Saving carousel slide configuration...");
      const dbRes = await fetch("/api/carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carouselId: targetId,
          imageUrl: s3Url,
          title: carouselTitle.trim(),
          restaurantId: restaurantId.trim(),
        }),
      });

      const dbData = await dbRes.json();
      if (!dbRes.ok || !dbData.success) {
        throw new Error(dbData.error || "Failed to save configuration in database");
      }

      setMsg("Carousel slide added successfully!");
      setIsSuccess(true);
      setCarouselId("");
      setCarouselTitle("");
      setRestaurantId("");
      setLogoFile(null);
      setFilePreview(null);

      const fileInput = document.getElementById("carousel-file-input");
      if (fileInput) fileInput.value = "";

      // Refresh the carousels list from DB
      fetchCarousels();
    } catch (error) {
      setMsg("Error: " + error.message);
      setIsSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  // Delete handler
  const handleDeleteCarousel = async (item) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete carousel slide "${item.carouselId}"?`
    );
    if (!confirmDelete) return;

    setDeletingId(item._id || item.carouselId);
    try {
      const res = await fetch(`/api/carousel?id=${encodeURIComponent(item._id || "")}&carouselId=${encodeURIComponent(item.carouselId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.carousels)) {
          setCarousels(data.carousels);
          const updatedInputs = {};
          data.carousels.forEach((it) => {
            updatedInputs[it._id] = it.position ? it.position.toString() : (it.carouselId ? it.carouselId.toString() : "");
          });
          setInputPositions(updatedInputs);
        } else {
          setCarousels((prev) => prev.filter((c) => (c._id ? c._id !== item._id : c.carouselId !== item.carouselId)));
        }
      } else {
        alert("Failed to delete carousel: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting carousel: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };


  // Resolve restaurant name for display
  const getRestaurantLabel = (restId) => {
    if (!restId) return "🌐 All Restaurants (Global)";
    const found = restaurantsList.find((r) => String(r.id) === String(restId));
    return found ? `🏪 ${found.name} (${found.id})` : `🏪 ID: ${restId}`;
  };

  // Filter carousels by search term
  const filteredCarousels = carousels.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const idMatch = item.carouselId?.toLowerCase().includes(term);
    const titleMatch = item.title?.toLowerCase().includes(term);
    const restMatch = item.restaurantId?.toLowerCase().includes(term);
    return idMatch || titleMatch || restMatch;
  });

  return (
    <div style={styles.container}>
      <style>{`
        .carouselInput {
          color: #1a202c !important;
          background-color: #ffffff !important;
        }
        .carouselInput::placeholder {
          color: #4a5568 !important;
          opacity: 1;
        }
        .carouselCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push("/dashboard")}>
          ← Dashboard
        </button>
        <div>
          <h1 style={styles.title}>Carousel Management</h1>
          <p style={styles.subtitle}>Upload and manage home carousel slides stored in database</p>
        </div>
      </div>

      {/* Info Banner for Reordering */}
      <div style={styles.infoBanner}>
        ℹ️ <strong>Re-order Positions & Slide IDs:</strong> Enter a target position number under any slide or click <strong>🔝 To Top</strong>, <strong>▲ Up</strong>, or <strong>▼ Down</strong>.
        When moved, both the <strong>display position</strong> and the <strong>Slide ID</strong> automatically update to match (e.g. position 1 has Slide ID: 1, position 2 has Slide ID: 2).
      </div>

      {/* Position Status Message Banner */}
      {positionMsg.text && (
        <div
          style={{
            ...styles.messageBanner,
            backgroundColor: positionMsg.isError ? "#FFF5F5" : "#F0FFF4",
            color: positionMsg.isError ? "#E53E3E" : "#2F855A",
            borderColor: positionMsg.isError ? "#FEB2B2" : "#C6F6D5",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          {positionMsg.text}
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      <div style={styles.mainLayout}>
        {/* Left Column: Add Carousel Form */}
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>➕</span>
              <h2 style={styles.cardTitle}>Add Carousel Slide</h2>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Carousel Slide ID <span style={{ color: "#718096", fontSize: "12px", fontWeight: "normal" }}>(Optional - defaults to #{carousels.length + 1})</span>
              </label>
              <input
                className="carouselInput"
                style={styles.input}
                type="text"
                placeholder={carousels.length > 0 ? `e.g. ${carousels.length + 1}` : "e.g. 1"}
                value={carouselId}
                onChange={(e) => setCarouselId(e.target.value)}
                disabled={uploading}
              />
            </div>


            <div style={styles.formGroup}>
              <label style={styles.label}>Carousel Title (Optional)</label>
              <input
                className="carouselInput"
                style={styles.input}
                type="text"
                placeholder="e.g. Weekend Special 50% Off"
                value={carouselTitle}
                onChange={(e) => setCarouselTitle(e.target.value)}
                disabled={uploading}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Target Restaurant (Optional)</label>
              <select
                className="carouselInput"
                style={{ ...styles.input, cursor: "pointer" }}
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                disabled={uploading}
              >
                <option value="">-- All Restaurants (Global Slide) --</option>
                {restaurantsList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (ID: {r.id})
                  </option>
                ))}
              </select>
              <div style={{ marginTop: "6px", fontSize: "12px", color: "#718096" }}>
                Or type custom restaurant ID:
              </div>
              <input
                className="carouselInput"
                style={{ ...styles.input, marginTop: "4px" }}
                type="text"
                placeholder="Type custom restaurant ID"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                disabled={uploading}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Upload Slide Photo <span style={{ color: "#E53E3E" }}>*</span>
              </label>
              <input
                id="carousel-file-input"
                className="carouselInput"
                style={styles.input}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {filePreview && (
                <div style={styles.localPreviewContainer}>
                  <p style={styles.previewLabel}>Selected Image Preview:</p>
                  <img src={filePreview} alt="Preview" style={styles.localPreviewImg} />
                </div>
              )}
            </div>

            <button
              style={{
                ...styles.button,
                backgroundColor: uploading ? "#A0AEC0" : "#3182CE",
                cursor: uploading ? "not-allowed" : "pointer",
              }}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? "Uploading & Saving..." : "Add Carousel Slide"}
            </button>

            {msg && (
              <div
                style={{
                  ...styles.messageBanner,
                  backgroundColor: isSuccess ? "#F0FFF4" : "#FFF5F5",
                  color: isSuccess ? "#276749" : "#9B2C2C",
                  borderColor: isSuccess ? "#9AE6B4" : "#FEB2B2",
                }}
              >
                {msg}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: DB Carousels Display */}
        <div style={styles.rightCol}>
          <div style={styles.card}>
            <div style={styles.dbHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={styles.cardIcon}>🖼️</span>
                <div>
                  <h2 style={styles.cardTitle}>Uploaded Carousels</h2>
                  <span style={styles.countBadge}>
                    {carousels.length} {carousels.length === 1 ? "Slide" : "Slides"} in DB
                  </span>
                </div>
              </div>
              <button
                style={styles.refreshBtn}
                onClick={fetchCarousels}
                disabled={loadingCarousels}
                title="Reload from DB"
              >
                🔄 {loadingCarousels ? "Loading..." : "Refresh"}
              </button>
            </div>

            {/* Search filter */}
            {carousels.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <input
                  className="carouselInput"
                  style={{ ...styles.input, fontSize: "14px", padding: "8px 12px" }}
                  type="text"
                  placeholder="🔍 Search slides by ID, Title, or Restaurant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            {/* Content states */}
            {loadingCarousels ? (
              <div style={styles.emptyState}>
                <div style={styles.spinner}></div>
                <p style={{ marginTop: "12px", color: "#4A5568" }}>Loading carousel slides from DB...</p>
              </div>
            ) : carousels.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: "40px", marginBottom: "8px" }}>📭</div>
                <h3 style={{ margin: "0 0 6px 0", color: "#2D3748" }}>No Carousel Slides Yet</h3>
                <p style={{ margin: 0, color: "#718096", fontSize: "14px" }}>
                  Uploaded slides in MongoDB will be displayed here automatically. Fill out the form on the left to add your first slide.
                </p>
              </div>
            ) : filteredCarousels.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ margin: 0, color: "#718096" }}>No slides match &ldquo;{searchTerm}&rdquo;</p>
              </div>
            ) : (
              <div style={styles.slidesGrid}>
                {filteredCarousels.map((item, index) => {
                  const key = item._id;
                  const isSaving = savingId === key;
                  const currentPos = item.position || (item.carouselId && !isNaN(parseInt(item.carouselId, 10)) ? parseInt(item.carouselId, 10) : index + 1);
                  const isFirst = currentPos === 1;
                  const isLast = currentPos === carousels.length;

                  return (
                    <div
                      key={item._id || item.carouselId}
                      className="carouselCard"
                      style={styles.slideCard}
                    >
                      {/* Rank Badge */}
                      <div
                        style={styles.rankBadge}
                        title={`Position & Slide ID: #${currentPos}`}
                      >
                        #{currentPos}
                      </div>

                      {/* Slide Image Preview */}
                      <div
                        style={styles.imgWrapper}
                        onClick={() => setPreviewModalImg(item.imageUrl)}
                        title="Click to view full image"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.title || item.carouselId}
                          style={styles.slideImg}
                          onError={(e) => {
                            e.target.src =
                              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='150' viewBox='0 0 300 150'><rect fill='%23E2E8F0' width='300' height='150'/><text fill='%23718096' font-size='14' font-family='sans-serif' x='50%' y='50%' text-anchor='middle' dy='.3em'>Image unavailable</text></svg>";
                          }}
                        />
                        <div style={styles.imgOverlay}>🔍 Click to Enlarge</div>
                      </div>

                      {/* Slide Details */}
                      <div style={styles.slideContent}>
                        <div style={styles.slideTopRow}>
                          <span style={styles.slideIdBadge}>
                            Slide ID: <strong>{item.carouselId}</strong>
                          </span>
                          {item.createdAt && (
                            <span style={styles.slideDate}>
                              {new Date(item.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>

                        <h4 style={styles.slideTitle}>
                          {item.title ? item.title : <span style={{ color: "#A0AEC0", fontStyle: "italic" }}>No Title</span>}
                        </h4>

                        <div style={styles.restTag}>
                          {getRestaurantLabel(item.restaurantId)}
                        </div>

                        {/* Position & Reorder Controls */}
                        <div style={styles.positionControlGroup}>
                          <div style={styles.positionControlHeader}>
                            <span style={styles.positionControlLabel}>Position & ID:</span>
                            <span style={styles.currentRankText}>Rank #{currentPos}</span>
                          </div>
                          <div style={styles.positionActionsRow}>
                            <input
                              type="number"
                              min="1"
                              max={carousels.length}
                              style={styles.positionInput}
                              value={inputPositions[key] ?? ""}
                              onChange={(e) =>
                                handlePositionInputChange(key, e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSavePosition(item);
                                }
                              }}
                              disabled={isSaving}
                              placeholder="Pos #"
                            />

                            <button
                              style={{
                                ...styles.saveBtn,
                                opacity: isSaving ? 0.7 : 1,
                                cursor: isSaving ? "not-allowed" : "pointer",
                              }}
                              onClick={() => handleSavePosition(item)}
                              disabled={isSaving}
                              title="Set target position"
                            >
                              {isSaving ? "..." : "Set"}
                            </button>

                            {/* Quick To Top Button */}
                            <button
                              style={{
                                ...styles.topBtn,
                                opacity: isFirst || isSaving ? 0.45 : 1,
                                cursor:
                                  isFirst || isSaving ? "not-allowed" : "pointer",
                              }}
                              onClick={() => handleMoveToTop(item)}
                              disabled={isFirst || isSaving}
                              title="Move directly to top (#1 position & Slide ID 1)"
                            >
                              🔝 Top
                            </button>

                            {/* Quick Up Arrow Button */}
                            <button
                              style={{
                                ...styles.stepBtn,
                                opacity: isFirst || isSaving ? 0.45 : 1,
                                cursor:
                                  isFirst || isSaving ? "not-allowed" : "pointer",
                              }}
                              onClick={() =>
                                handleStepPosition(item, currentPos, -1)
                              }
                              disabled={isFirst || isSaving}
                              title="Move up 1 rank"
                            >
                              ▲ Up
                            </button>

                            {/* Quick Down Arrow Button */}
                            <button
                              style={{
                                ...styles.stepBtn,
                                opacity: isLast || isSaving ? 0.45 : 1,
                                cursor:
                                  isLast || isSaving ? "not-allowed" : "pointer",
                              }}
                              onClick={() =>
                                handleStepPosition(item, currentPos, 1)
                              }
                              disabled={isLast || isSaving}
                              title="Move down 1 rank"
                            >
                              ▼ Down
                            </button>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={styles.slideActions}>
                          <a
                            href={item.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.viewLinkBtn}
                          >
                            🔗 Open Image
                          </a>

                          <button
                            style={{
                              ...styles.deleteBtn,
                              opacity: deletingId === (item._id || item.carouselId) ? 0.6 : 1,
                              cursor: deletingId === (item._id || item.carouselId) ? "not-allowed" : "pointer",
                            }}
                            onClick={() => handleDeleteCarousel(item)}
                            disabled={deletingId === (item._id || item.carouselId)}
                            title="Delete slide from DB"
                          >
                            {deletingId === (item._id || item.carouselId) ? "Deleting..." : "🗑️ Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {previewModalImg && (
        <div style={styles.modalBackdrop} onClick={() => setPreviewModalImg(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={{ fontWeight: "600", color: "#2D3748" }}>Slide Image Preview</span>
              <button style={styles.modalCloseBtn} onClick={() => setPreviewModalImg(null)}>
                ✕
              </button>
            </div>
            <img src={previewModalImg} alt="Enlarged preview" style={styles.modalImg} />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "30px 24px",
    maxWidth: "1350px",
    margin: "0 auto",
    fontFamily: "system-ui, -apple-system, sans-serif",
    backgroundColor: "#F7FAFC",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "24px",
  },
  backBtn: {
    padding: "9px 18px",
    backgroundColor: "#EDF2F7",
    border: "1px solid #CBD5E0",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    color: "#4A5568",
    transition: "background-color 0.2s",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "700",
    color: "#2D3748",
  },
  subtitle: {
    margin: "4px 0 0 0",
    fontSize: "14px",
    color: "#718096",
  },
  mainLayout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "24px",
    alignItems: "start",
  },
  leftCol: {
    minWidth: 0,
  },
  rightCol: {
    minWidth: 0,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)",
    border: "1px solid #E2E8F0",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "1px solid #EDF2F7",
  },
  cardIcon: {
    fontSize: "22px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#2D3748",
  },
  dbHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "1px solid #EDF2F7",
  },
  countBadge: {
    display: "inline-block",
    fontSize: "12px",
    backgroundColor: "#EBF8FF",
    color: "#2B6CB0",
    padding: "2px 8px",
    borderRadius: "12px",
    fontWeight: "600",
    marginTop: "2px",
  },
  refreshBtn: {
    padding: "7px 14px",
    backgroundColor: "#EDF2F7",
    border: "1px solid #CBD5E0",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    color: "#4A5568",
  },
  formGroup: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: "600",
    color: "#4A5568",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #CBD5E0",
    fontSize: "15px",
    boxSizing: "border-box",
    backgroundColor: "#FFFFFF",
    color: "#1A202C",
    outline: "none",
  },
  localPreviewContainer: {
    marginTop: "10px",
    padding: "8px",
    border: "1px dashed #CBD5E0",
    borderRadius: "8px",
    backgroundColor: "#F7FAFC",
  },
  previewLabel: {
    margin: "0 0 6px 0",
    fontSize: "12px",
    color: "#718096",
    fontWeight: "600",
  },
  localPreviewImg: {
    width: "100%",
    maxHeight: "150px",
    objectFit: "cover",
    borderRadius: "6px",
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "6px",
    border: "none",
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: "600",
    transition: "background-color 0.2s",
    marginTop: "6px",
  },
  infoBanner: {
    backgroundColor: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: "8px",
    padding: "12px 18px",
    fontSize: "14px",
    color: "#1E40AF",
    marginBottom: "20px",
    lineHeight: "1.5",
  },
  messageBanner: {
    marginTop: "16px",
    padding: "12px 16px",
    borderRadius: "6px",
    border: "1px solid",
    fontSize: "14px",
    textAlign: "center",
    fontWeight: "500",
  },
  slidesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "18px",
  },
  slideCard: {
    position: "relative",
    border: "1px solid #E2E8F0",
    borderRadius: "10px",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    display: "flex",
    flexDirection: "column",
  },
  rankBadge: {
    position: "absolute",
    top: "10px",
    left: "10px",
    zIndex: 2,
    backgroundColor: "#3182CE",
    color: "#ffffff",
    fontWeight: "800",
    fontSize: "13px",
    padding: "4px 10px",
    borderRadius: "20px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
    letterSpacing: "0.5px",
  },
  positionControlGroup: {
    backgroundColor: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    padding: "10px",
    marginBottom: "12px",
  },
  positionControlHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  positionControlLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  inputLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  currentRankText: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#2B6CB0",
  },
  positionActionsRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },
  positionInput: {
    width: "55px",
    padding: "5px 6px",
    borderRadius: "6px",
    border: "1.5px solid #CBD5E1",
    fontSize: "13px",
    fontWeight: "700",
    textAlign: "center",
    color: "#1A202C",
    backgroundColor: "#FFFFFF",
    outline: "none",
  },
  saveBtn: {
    padding: "5px 10px",
    backgroundColor: "#3182CE",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  topBtn: {
    padding: "5px 8px",
    backgroundColor: "#059669",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  stepBtn: {
    padding: "5px 8px",
    backgroundColor: "#EDF2F7",
    color: "#2D3748",
    border: "1px solid #CBD5E0",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  imgWrapper: {
    position: "relative",
    width: "100%",
    height: "140px",
    backgroundColor: "#EDF2F7",
    cursor: "pointer",
    overflow: "hidden",
  },
  slideImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  imgOverlay: {
    position: "absolute",
    bottom: "6px",
    right: "6px",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "#FFFFFF",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "4px",
    pointerEvents: "none",
  },
  slideContent: {
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  slideTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  slideIdBadge: {
    backgroundColor: "#E2E8F0",
    color: "#2D3748",
    fontSize: "12px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "4px",
    fontFamily: "monospace",
  },
  slideDate: {
    fontSize: "11px",
    color: "#A0AEC0",
  },
  slideTitle: {
    margin: "4px 0 8px 0",
    fontSize: "15px",
    fontWeight: "600",
    color: "#2D3748",
    lineHeight: "1.3",
  },
  restTag: {
    fontSize: "12px",
    color: "#4A5568",
    backgroundColor: "#F7FAFC",
    padding: "4px 8px",
    borderRadius: "4px",
    border: "1px solid #EDF2F7",
    marginBottom: "12px",
  },
  slideActions: {
    display: "flex",
    gap: "8px",
    marginTop: "auto",
    paddingTop: "8px",
    borderTop: "1px solid #EDF2F7",
  },
  viewLinkBtn: {
    flex: 1,
    textAlign: "center",
    padding: "6px 8px",
    backgroundColor: "#EDF2F7",
    color: "#3182CE",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    textDecoration: "none",
    display: "inline-block",
  },
  deleteBtn: {
    padding: "6px 12px",
    backgroundColor: "#FFF5F5",
    color: "#E53E3E",
    border: "1px solid #FED7D7",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    transition: "background-color 0.2s",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    backgroundColor: "#F7FAFC",
    borderRadius: "8px",
    border: "1px dashed #CBD5E0",
  },
  spinner: {
    width: "28px",
    height: "28px",
    border: "3px solid #E2E8F0",
    borderTop: "3px solid #3182CE",
    borderRadius: "50%",
    margin: "0 auto",
    animation: "spin 1s linear infinite",
  },
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    maxWidth: "800px",
    width: "100%",
    overflow: "hidden",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 18px",
    borderBottom: "1px solid #E2E8F0",
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    color: "#718096",
  },
  modalImg: {
    width: "100%",
    maxHeight: "70vh",
    objectFit: "contain",
    backgroundColor: "#000000",
    display: "block",
  },
};
