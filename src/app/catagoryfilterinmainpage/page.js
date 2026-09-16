"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Helper to slugify category filter name for S3 filename
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")           // Replace spaces with _
    .replace(/[^\w\-]+/g, "")       // Remove all non-word chars
    .replace(/\-\-+/g, "_")         // Replace multiple - or _ with single _
    .replace(/^-+/, "")             // Trim - from start of text
    .replace(/-+$/, "");            // Trim - from end of text
};

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

export default function CatagoryFilterPage() {
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [editingItem, setEditingItem] = useState(null);

  // Position control states (keyed by stable Mongo _id)
  const [inputPositions, setInputPositions] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [positionMsg, setPositionMsg] = useState({ text: "", isError: false });

  const router = useRouter();

  // Fetch existing filters
  const fetchFilters = async () => {
    try {
      setLoadingItems(true);
      const res = await fetch("/api/catagoryfilterinmainpage");
      const data = await res.json();
      if (res.ok && data.success) {
        const fetchedItems = data.data || [];
        setItems(fetchedItems);
        // Initialize position inputs to match current positions using stable _id
        const initialInputs = {};
        fetchedItems.forEach((item) => {
          initialInputs[item._id] = item.position ? item.position.toString() : (item.id ? item.id.toString() : "");
        });
        setInputPositions(initialInputs);
      } else {
        console.error("Failed to fetch filters:", data.error);
      }
    } catch (error) {
      console.error("Error fetching filters:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchFilters();
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

      const res = await fetch("/api/catagoryfilterinmainpage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: item._id,
          id: item.id,
          newPosition: newPosNum,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const updatedList = data.data || [];
        setItems(updatedList);
        const updatedInputs = {};
        updatedList.forEach((it) => {
          updatedInputs[it._id] = it.position ? it.position.toString() : (it.id ? it.id.toString() : "");
        });
        setInputPositions(updatedInputs);
        setPositionMsg({
          text: data.message || `Position & DB ID updated successfully for ${item.name}!`,
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
    if (targetPos < 1 || targetPos > items.length) return;
    setInputPositions((prev) => ({ ...prev, [item._id]: targetPos.toString() }));
    handleSavePosition(item, targetPos);
  };

  const handleMoveToTop = (item) => {
    setInputPositions((prev) => ({ ...prev, [item._id]: "1" }));
    handleSavePosition(item, 1);
  };

  const handleSelectEdit = (item) => {
    setEditingItem(item);
    setName(item.name || "");
    setCatId(item.id ? item.id.toString() : "");
    setMsg(`Selected "${item.name}" (ID: ${item.id}) for editing. Update details or choose a new photo to replace.`);
    setIsSuccess(true);
  };

  const handleUpload = async () => {
    try {
      setMsg("");
      setIsSuccess(false);

      if (!name.trim()) {
        setMsg("Category name is required");
        return;
      }
      if (!catId.trim()) {
        setMsg("Category ID is required");
        return;
      }

      // Check if this ID already exists in the system
      const existingFilter = items.find(
        (item) => item.id && item.id.toString().trim().toLowerCase() === catId.trim().toLowerCase()
      );

      // If new category, an image is required
      if (!existingFilter && !imageFile) {
        setMsg("Please choose a category picture to upload");
        return;
      }

      setUploading(true);

      let s3Url = existingFilter ? existingFilter.imageUrl : "";

      // Step 1: Compress and upload picture to S3 only if a new image is provided
      if (imageFile) {
        setMsg("Compressing picture to ~65KB...");
        const compressedFile = await compressImage(imageFile, 65);

        setMsg("Uploading compressed image to S3...");
        const formData = new FormData();
        formData.append("file", compressedFile);
        
        const s3Id = slugify(catId);
        formData.append("id", s3Id);
        formData.append("folder", "catagoryfilterinmainpage"); // upload directory

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || "Failed to upload picture to S3");
        }
        s3Url = uploadData.url;
      }

      // Step 2: Save category filter record in MongoDB (updates if ID exists)
      setMsg(existingFilter ? "Updating category filter configuration..." : "Saving category filter configuration...");
      const dbRes = await fetch("/api/catagoryfilterinmainpage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: editingItem ? editingItem._id : undefined,
          name: name.trim(),
          id: catId.trim(),
          imageUrl: s3Url,
        }),
      });

      const dbData = await dbRes.json();
      if (!dbRes.ok || !dbData.success) {
        throw new Error(dbData.error || "Failed to save category filter in database");
      }

      setMsg(existingFilter ? "Category filter updated successfully!" : "Category filter added successfully!");
      setIsSuccess(true);
      setName("");
      setCatId("");
      setEditingItem(null);
      setImageFile(null);
      
      // Reset the file input field
      const fileInput = document.getElementById("category-file-input");
      if (fileInput) fileInput.value = "";

      // Refresh list
      fetchFilters();

    } catch (error) {
      setMsg("Error: " + error.message);
      setIsSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this category filter?")) {
      return;
    }

    try {
      setMsg("");
      setIsSuccess(false);
      
      const res = await fetch(`/api/catagoryfilterinmainpage?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setMsg("Category filter deleted successfully");
        setIsSuccess(true);
        fetchFilters();
      } else {
        throw new Error(data.error || "Failed to delete category filter");
      }
    } catch (error) {
      setMsg("Error: " + error.message);
      setIsSuccess(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push("/dashboard")}>
          ← Back to Dashboard
        </button>
        <h1 style={styles.title}>📍 Manage Main Page Category Filters & Positions</h1>
      </div>

      {/* Info Banner for Reordering */}
      <div style={styles.infoBanner}>
        ℹ️ <strong>Re-order Positions & DB IDs:</strong> Enter a target position number under any category or click <strong>🔝 To Top</strong>, <strong>▲ Up</strong>, or <strong>▼ Down</strong>.
        When moved, both the <strong>display position</strong> and the <strong>DB ID</strong> automatically update to match (e.g. position 1 has DB ID: 1, position 2 has DB ID: 2).
      </div>

      {/* Position Status Message Banner */}
      {positionMsg.text && (
        <div
          style={{
            ...styles.messageBanner,
            backgroundColor: positionMsg.isError ? "#FFF5F5" : "#F0FFF4",
            color: positionMsg.isError ? "#E53E3E" : "#2F855A",
            borderColor: positionMsg.isError ? "#FEB2B2" : "#C6F6D5",
          }}
        >
          {positionMsg.text}
        </div>
      )}

      <div style={styles.layoutGrid}>
        {/* Left Column: Form Card */}
        <div style={styles.formCard}>
          <h2 style={styles.cardTitle}>
            {editingItem ? "✏️ Update Category Filter" : "➕ Add New Category Filter"}
          </h2>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Category ID (e.g. 123)</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. 123"
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Category Name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. Fast Food, Desserts"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              {editingItem ? "Upload New Picture (Optional)" : "Upload Category Picture"}
            </label>
            <input
              id="category-file-input"
              style={styles.input}
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              disabled={uploading}
            />
          </div>

          <button
            style={{
              ...styles.button,
              backgroundColor: uploading ? "#a0aec0" : "#e67e22",
              cursor: uploading ? "not-allowed" : "pointer",
            }}
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? "Processing..." : editingItem ? "Update Category Filter" : "Add Category Filter"}
          </button>

          {editingItem && (
            <button
              style={{
                ...styles.button,
                backgroundColor: "#EDF2F7",
                color: "#4A5568",
                cursor: uploading ? "not-allowed" : "pointer",
                marginTop: "10px",
              }}
              onClick={() => {
                setEditingItem(null);
                setName("");
                setCatId("");
                setImageFile(null);
                setMsg("");
                const fileInput = document.getElementById("category-file-input");
                if (fileInput) fileInput.value = "";
              }}
              disabled={uploading}
            >
              Cancel Edit
            </button>
          )}

          {msg && (
            <div
              style={{
                ...styles.messageBanner,
                marginTop: "20px",
                backgroundColor: isSuccess ? "#F0FFF4" : "#FFF5F5",
                color: isSuccess ? "#38A169" : "#C53030",
                borderColor: isSuccess ? "#C6F6D5" : "#FEB2B2",
              }}
            >
              {msg}
            </div>
          )}
        </div>

        {/* Right Column: List Card with Position Controls */}
        <div style={styles.listCard}>
          <div style={styles.listCardHeader}>
            <h2 style={styles.cardTitle}>
              Active Category Filters ({items.length})
            </h2>
            <button
              style={styles.refreshBtn}
              onClick={fetchFilters}
              disabled={loadingItems}
              title="Refresh list"
            >
              🔄 Refresh
            </button>
          </div>
          
          {loadingItems ? (
            <div style={styles.loadingText}>Loading category filters...</div>
          ) : items.length === 0 ? (
            <div style={styles.emptyState}>No category filters added yet.</div>
          ) : (
            <div style={styles.grid}>
              {items.map((item, index) => {
                const key = item._id;
                const isSaving = savingId === key;
                const currentPos = item.position || (item.id && !isNaN(parseInt(item.id, 10)) ? parseInt(item.id, 10) : index + 1);
                const isFirst = currentPos === 1;
                const isLast = currentPos === items.length;

                return (
                  <div key={item._id} style={styles.itemCard}>
                    {/* Rank Badge */}
                    <div style={styles.rankBadge} title={`Position & DB ID: #${currentPos}`}>
                      #{currentPos}
                    </div>

                    {/* Main Item Content */}
                    <div style={styles.itemContent}>
                      {/* Top Row: Image, Name, ID, Edit/Delete */}
                      <div style={styles.itemTopRow}>
                        <div style={styles.itemInfoGroup}>
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              style={styles.itemImage}
                            />
                          ) : (
                            <div style={styles.imagePlaceholder}>🍽️</div>
                          )}
                          <div>
                            <h3 style={styles.itemName}>{item.name}</h3>
                            <div style={styles.itemIdText}>
                              DB ID: <strong>{item.id || "N/A"}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div style={styles.actionButtonsGroup}>
                          <button
                            style={styles.editBtn}
                            onClick={() => handleSelectEdit(item)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            style={styles.deleteBtn}
                            onClick={() => handleDelete(item._id)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Position Controls */}
                      <div style={styles.positionControlGroup}>
                        <span style={styles.inputLabel}>Position & ID:</span>
                        <div style={styles.positionActionsRow}>
                          <input
                            type="number"
                            min="1"
                            max={items.length}
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
                          >
                            {isSaving ? "Saving..." : "Set"}
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
                            title="Move directly to top (#1 position & DB ID 1)"
                          >
                            🔝 To Top
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "30px 24px",
    maxWidth: "1280px",
    margin: "0 auto",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: "#F8FAFC",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  backBtn: {
    padding: "10px 18px",
    backgroundColor: "#ffffff",
    border: "1px solid #CBD5E1",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "700",
    color: "#334155",
    boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
    transition: "all 0.2s",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "800",
    color: "#1E293B",
  },
  infoBanner: {
    backgroundColor: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: "10px",
    padding: "14px 18px",
    fontSize: "14px",
    color: "#1E40AF",
    lineHeight: "1.5",
    marginBottom: "20px",
    boxShadow: "0 2px 4px rgba(59, 130, 246, 0.05)",
  },
  messageBanner: {
    padding: "12px 18px",
    borderRadius: "8px",
    border: "1px solid",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "20px",
    textAlign: "center",
  },
  layoutGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "28px",
    alignItems: "start",
  },
  formCard: {
    backgroundColor: "white",
    borderRadius: "14px",
    padding: "26px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    border: "1px solid #E2E8F0",
    flex: "1 1 380px",
    maxWidth: "440px",
    boxSizing: "border-box",
  },
  listCard: {
    backgroundColor: "white",
    borderRadius: "14px",
    padding: "26px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    border: "1px solid #E2E8F0",
    flex: "2 1 600px",
    boxSizing: "border-box",
  },
  listCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "2px solid #EDF2F7",
    paddingBottom: "12px",
    marginBottom: "20px",
  },
  refreshBtn: {
    padding: "6px 14px",
    backgroundColor: "#F1F5F9",
    border: "1px solid #CBD5E1",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "700",
    color: "#475569",
    cursor: "pointer",
  },
  cardTitle: {
    margin: "0 0 16px 0",
    fontSize: "18px",
    fontWeight: "700",
    color: "#1E293B",
  },
  formGroup: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    marginBottom: "7px",
    fontWeight: "600",
    color: "#475569",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "11px 13px",
    borderRadius: "8px",
    border: "1.5px solid #CBD5E1",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
  },
  button: {
    width: "100%",
    padding: "13px",
    borderRadius: "8px",
    border: "none",
    color: "white",
    fontSize: "15px",
    fontWeight: "700",
    transition: "background-color 0.2s",
    marginTop: "6px",
  },
  loadingText: {
    textAlign: "center",
    color: "#64748B",
    padding: "30px 0",
    fontSize: "15px",
  },
  emptyState: {
    textAlign: "center",
    color: "#64748B",
    padding: "40px 0",
    fontSize: "15px",
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  itemCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "16px 18px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    border: "1.5px solid #E2E8F0",
    transition: "transform 0.15s ease",
  },
  rankBadge: {
    minWidth: "46px",
    height: "46px",
    borderRadius: "50%",
    backgroundColor: "#e67e22",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "15px",
    boxShadow: "0 4px 10px rgba(230, 126, 34, 0.28)",
    flexShrink: 0,
  },
  itemContent: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    flex: 1,
  },
  itemTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  itemInfoGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  itemImage: {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    objectFit: "cover",
    border: "2px solid #E2E8F0",
    flexShrink: 0,
  },
  imagePlaceholder: {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    backgroundColor: "#F1F5F9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },
  itemName: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "700",
    color: "#0F172A",
  },
  itemIdText: {
    fontSize: "12px",
    color: "#64748B",
    marginTop: "2px",
  },
  actionButtonsGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  editBtn: {
    padding: "6px 12px",
    backgroundColor: "#EDF2F7",
    color: "#334155",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
    transition: "background-color 0.2s",
  },
  deleteBtn: {
    padding: "6px 12px",
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
    transition: "background-color 0.2s",
  },
  positionControlGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#F8FAFC",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #E2E8F0",
    flexWrap: "wrap",
  },
  inputLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  positionActionsRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  positionInput: {
    width: "70px",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1.5px solid #CBD5E1",
    fontSize: "14px",
    fontWeight: "700",
    textAlign: "center",
    color: "#0F172A",
    outline: "none",
  },
  saveBtn: {
    padding: "6px 14px",
    backgroundColor: "#e67e22",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  topBtn: {
    padding: "6px 12px",
    backgroundColor: "#059669",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  stepBtn: {
    padding: "6px 10px",
    backgroundColor: "#E2E8F0",
    color: "#334155",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
};
