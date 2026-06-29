"use client";

import { useState } from "react";
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
  const [carouselId, setCarouselId] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleUpload = async () => {
    try {
      setMsg("");
      setIsSuccess(false);

      if (!carouselId.trim()) {
        setMsg("Carousel ID is required");
        return;
      }
      if (!logoFile) {
        setMsg("Please choose a carousel photo to upload");
        return;
      }

      setUploading(true);

      // Step 1: Compress the image in-browser to target ~65KB
      setMsg("Compressing photo to ~65KB...");
      const compressedFile = await compressImage(logoFile, 65);

      // Step 2: Upload image to S3 (under carousel/ folder)
      setMsg("Uploading compressed image to S3...");
      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("id", carouselId.trim());
      formData.append("folder", "carousel"); // upload to the 'carousel' S3 directory

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
          carouselId: carouselId.trim(),
          imageUrl: s3Url,
        }),
      });

      const dbData = await dbRes.json();
      if (!dbRes.ok || !dbData.success) {
        throw new Error(dbData.error || "Failed to save configuration in database");
      }

      setMsg("Carousel slide added successfully!");
      setIsSuccess(true);
      setCarouselId("");
      setLogoFile(null);
      // Reset the file input field
      const fileInput = document.getElementById("carousel-file-input");
      if (fileInput) fileInput.value = "";

    } catch (error) {
      setMsg("Error: " + error.message);
      setIsSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push("/dashboard")}>
          ← Dashboard
        </button>
        <h2 style={styles.title}>Management - Add Carousel Slide</h2>
      </div>

      <div style={styles.card}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Carousel Slide ID</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. slide_1, main_banner"
            value={carouselId}
            onChange={(e) => setCarouselId(e.target.value)}
            disabled={uploading}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Upload Photo</label>
          <input
            id="carousel-file-input"
            style={styles.input}
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files[0])}
            disabled={uploading}
          />
        </div>

        <button
          style={{
            ...styles.button,
            backgroundColor: uploading ? "#a0aec0" : "#3182ce",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? "Processing..." : "Add Carousel Slide"}
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
    </div>
  );
}

const styles = {
  container: {
    padding: "40px",
    maxWidth: "600px",
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
  },
  title: {
    margin: 0,
    fontSize: "22px",
    color: "#2D3748",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "30px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
    border: "1px solid #E2E8F0",
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
};
