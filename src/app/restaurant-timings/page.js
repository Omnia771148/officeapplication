"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RestaurantTimingsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const router = useRouter();

  // Local state to keep track of edited timings for each restaurant
  const [editedTimings, setEditedTimings] = useState({});

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/restaurant-timings");
      const data = await res.json();
      if (data.success) {
        setRestaurants(data.restaurants);
        // Initialize edited timings state
        const initialTimings = {};
        data.restaurants.forEach(rest => {
          initialTimings[rest.restId] = {
            openTime: rest.openTime,
            closeTime: rest.closeTime
          };
        });
        setEditedTimings(initialTimings);
      } else {
        setError(data.error || "Failed to fetch restaurants");
      }
    } catch (err) {
      setError("Failed to fetch restaurants: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleTimingChange = (restId, field, value) => {
    setEditedTimings(prev => ({
      ...prev,
      [restId]: {
        ...prev[restId],
        [field]: value
      }
    }));
  };

  const handleSaveTimings = async (restId) => {
    const { openTime, closeTime } = editedTimings[restId];
    if (!openTime || !closeTime) {
      alert("Both Open and Close times must be set. Otherwise, click Clear.");
      return;
    }
    try {
      const res = await fetch("/api/restaurant-timings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restId, openTime, closeTime })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Timings updated successfully!");
        fetchRestaurants();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        alert(data.error || "Failed to update timings");
      }
    } catch (err) {
      alert("Error saving timings: " + err.message);
    }
  };

  const handleClearTimings = async (restId) => {
    try {
      const res = await fetch("/api/restaurant-timings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restId, openTime: "", closeTime: "" })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Timings cleared (manual mode enabled)!");
        fetchRestaurants();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        alert(data.error || "Failed to clear timings");
      }
    } catch (err) {
      alert("Error clearing timings: " + err.message);
    }
  };

  const handleToggleStatus = async (restId, currentActive) => {
    try {
      const res = await fetch("/api/restaurant-timings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restId, isActive: !currentActive })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Manual override status toggled!");
        fetchRestaurants();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        alert(data.error || "Failed to toggle status");
      }
    } catch (err) {
      alert("Error toggling status: " + err.message);
    }
  };

  const formatTimeStr = (timeStr) => {
    if (!timeStr) return "Manual Only";
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.push("/dashboard")}>
          ← Dashboard
        </button>
        <h2 style={styles.title}>Office Panel - Restaurant Timings & Status</h2>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {successMsg && <div style={styles.successBanner}>{successMsg}</div>}

      {loading ? (
        <div style={styles.loading}>Loading restaurant data...</div>
      ) : (
        <div style={styles.grid}>
          {restaurants.map((rest) => {
            const timing = editedTimings[rest.restId] || { openTime: "", closeTime: "" };
            return (
              <div key={rest.restId} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.restName}>{rest.name}</h3>
                    <p style={styles.restMeta}>ID: {rest.restId} | {rest.phone}</p>
                  </div>
                  <div style={styles.statusSection}>
                    <div style={{
                      ...styles.statusDot,
                      backgroundColor: rest.isActive ? "#48BB78" : "#E53E3E"
                    }} />
                    <span style={styles.statusText}>{rest.isActive ? "OPEN" : "CLOSED"}</span>
                  </div>
                </div>

                <hr style={styles.divider} />

                {/* Status Toggle Switch */}
                <div style={styles.formRow}>
                  <span style={styles.rowLabel}>Manual Override:</span>
                  <button
                    onClick={() => handleToggleStatus(rest.restId, rest.isActive)}
                    style={{
                      ...styles.toggleBtn,
                      backgroundColor: rest.isActive ? "#E53E3E" : "#48BB78"
                    }}
                  >
                    {rest.isActive ? "FORCE CLOSE" : "FORCE OPEN"}
                  </button>
                </div>

                {/* Timings Configuration */}
                <div style={styles.formRow}>
                  <span style={styles.rowLabel}>Open Time:</span>
                  <input
                    type="time"
                    style={styles.timeInput}
                    value={timing.openTime}
                    onChange={(e) => handleTimingChange(rest.restId, "openTime", e.target.value)}
                  />
                </div>

                <div style={styles.formRow}>
                  <span style={styles.rowLabel}>Close Time:</span>
                  <input
                    type="time"
                    style={styles.timeInput}
                    value={timing.closeTime}
                    onChange={(e) => handleTimingChange(rest.restId, "closeTime", e.target.value)}
                  />
                </div>

                <div style={styles.timingDisplay}>
                  Current: <strong style={{ color: "#2B6CB0" }}>
                    {rest.openTime && rest.closeTime ? 
                      `${formatTimeStr(rest.openTime)} - ${formatTimeStr(rest.closeTime)}` : 
                      "Manual Toggle Only"
                    }
                  </strong>
                </div>

                <div style={styles.cardActions}>
                  <button
                    style={styles.clearBtn}
                    onClick={() => handleClearTimings(rest.restId)}
                  >
                    Clear / Manual Mode
                  </button>
                  <button
                    style={styles.saveBtn}
                    onClick={() => handleSaveTimings(rest.restId)}
                  >
                    Save Timings
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "system-ui, -apple-system, sans-serif",
    backgroundColor: "#F7FAFC",
    minHeight: "100vh"
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "30px"
  },
  backBtn: {
    padding: "8px 16px",
    backgroundColor: "#EDF2F7",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    color: "#4A5568"
  },
  title: {
    margin: 0,
    fontSize: "24px",
    color: "#2D3748"
  },
  errorBanner: {
    padding: "12px 20px",
    backgroundColor: "#FFF5F5",
    color: "#C53030",
    borderRadius: "6px",
    marginBottom: "20px",
    border: "1px solid #FEB2B2"
  },
  successBanner: {
    padding: "12px 20px",
    backgroundColor: "#F0FFF4",
    color: "#38A169",
    borderRadius: "6px",
    marginBottom: "20px",
    border: "1px solid #C6F6D5",
    fontWeight: "600"
  },
  loading: {
    textAlign: "center",
    padding: "40px",
    fontSize: "18px",
    color: "#718096"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: "24px"
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
    border: "1px solid #E2E8F0"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  restName: {
    margin: "0 0 4px 0",
    fontSize: "18px",
    color: "#1A202C",
    fontWeight: "700"
  },
  restMeta: {
    margin: 0,
    fontSize: "14px",
    color: "#718096"
  },
  statusSection: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    backgroundColor: "#EDF2F7",
    borderRadius: "20px"
  },
  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%"
  },
  statusText: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#4A5568"
  },
  divider: {
    margin: "16px 0",
    border: "0",
    borderTop: "1px solid #E2E8F0"
  },
  formRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px"
  },
  rowLabel: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#4A5568"
  },
  toggleBtn: {
    padding: "6px 14px",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700"
  },
  timeInput: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #CBD5E0",
    fontSize: "14px",
    width: "130px"
  },
  timingDisplay: {
    backgroundColor: "#EBF8FF",
    padding: "10px 14px",
    borderRadius: "6px",
    fontSize: "14px",
    color: "#2B6CB0",
    margin: "16px 0",
    textAlign: "center"
  },
  cardActions: {
    display: "flex",
    gap: "12px"
  },
  clearBtn: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#FFF5F5",
    color: "#C53030",
    border: "1px solid #FEB2B2",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600"
  },
  saveBtn: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#3182CE",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600"
  }
};
