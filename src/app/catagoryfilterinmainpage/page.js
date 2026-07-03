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
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const router = useRouter();

  // Fetch existing filters
  const fetchFilters = async () => {
    try {
      setLoadingItems(true);
      const res = await fetch("/api/catagoryfilterinmainpage");
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(data.data || []);
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

  const handleUpload = async () => {
    try {
      setMsg("");
      setIsSuccess(false);

      if (!name.trim()) {
        setMsg("Category name is required");
        return;
      }
      if (!imageFile) {
        setMsg("Please choose a category picture to upload");
        return;
      }

      setUploading(true);

      // Step 1: Compress the image in-browser to target ~65KB
      setMsg("Compressing picture to ~65KB...");
      const compressedFile = await compressImage(imageFile, 65);

      // Step 2: Upload image to S3 (under catagoryfilterinmainpage/ folder)
      setMsg("Uploading compressed image to S3...");
      const formData = new FormData();
      formData.append("file", compressedFile);
      
      const s3Id = slugify(name);
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
      const s3Url = uploadData.url;

      // Step 3: Save category filter record in MongoDB
      setMsg("Saving category filter configuration...");
      const dbRes = await fetch("/api/catagoryfilterinmainpage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          imageUrl: s3Url,
        }),
      });

      const dbData = await dbRes.json();
      if (!dbRes.ok || !dbData.success) {
        throw new Error(dbData.error || "Failed to save category filter in database");
      }

      setMsg("Category filter added successfully!");
      setIsSuccess(true);
      setName("");
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
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push("/dashboard")}>
          ← Dashboard
        </button>
        <h2 style={styles.title}>Manage Main Page Category Filters</h2>
      </div>

      <div style={styles.layoutGrid}>
        {/* Form Card */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Add New Category Filter</h3>
          
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
            <label style={styles.label}>Upload Category Picture</label>
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
            {uploading ? "Processing..." : "Add Category Filter"}
          </button>

          {msg && (
            <div
              style={{
                ...styles.messageBanner,
                backgroundColor: isSuccess ? "#F0FFF4" : "#FFF5F5",
                color: isSuccess ? "#38A169" : "#C53030",
                borderColor: isSuccess ? "#C6F6D5" : "#FEB2B2",
              }}
            >
              {msg}
            </div>
          )}
        </div>

        {/* List Card */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Active Category Filters</h3>
          
          {loadingItems ? (
            <div style={styles.loadingText}>Loading category filters...</div>
          ) : items.length === 0 ? (
            <div style={styles.emptyState}>No category filters added yet.</div>
          ) : (
            <div style={styles.grid}>
              {items.map((item) => (
                <div key={item._id} style={styles.gridItem}>
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={styles.itemImage}
                  />
                  <div style={styles.itemDetails}>
                    <div style={styles.itemName}>{item.name}</div>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDelete(item._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "40px",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "system-ui, -apple-system, sans-serif",
    backgroundColor: "#F7FAFC",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "30px",
  },
  backBtn: {
    padding: "8px 16px",
    backgroundColor: "#EDF2F7",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    color: "#4A5568",
    transition: "background-color 0.2s, color 0.2s",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    color: "#2D3748",
  },
  layoutGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "30px",
    alignItems: "start",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "30px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
    border: "1px solid #E2E8F0",
    flex: "1 1 450px",
    boxSizing: "border-box",
  },
  cardTitle: {
    margin: "0 0 20px 0",
    fontSize: "18px",
    color: "#2D3748",
    borderBottom: "2px solid #EDF2F7",
    paddingBottom: "10px",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    color: "#4A5568",
    fontSize: "15px",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #CBD5E0",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "14px",
    borderRadius: "6px",
    border: "none",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    transition: "background-color 0.2s",
    marginTop: "10px",
  },
  messageBanner: {
    marginTop: "20px",
    padding: "12px 16px",
    borderRadius: "6px",
    border: "1px solid",
    fontSize: "15px",
    textAlign: "center",
    fontWeight: "500",
  },
  loadingText: {
    textAlign: "center",
    color: "#718096",
    padding: "20px 0",
  },
  emptyState: {
    textAlign: "center",
    color: "#718096",
    padding: "40px 0",
    fontSize: "16px",
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  gridItem: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "15px",
    borderRadius: "8px",
    border: "1px solid #E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  itemImage: {
    width: "60px",
    height: "60px",
    borderRadius: "8px",
    objectFit: "cover",
    border: "1px solid #CBD5E0",
  },
  itemDetails: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  itemName: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#2D3748",
  },
  deleteBtn: {
    padding: "6px 12px",
    backgroundColor: "#FED7D7",
    color: "#C53030",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "background-color 0.2s",
  },
};
