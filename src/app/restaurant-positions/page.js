"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RestaurantPositionsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputPositions, setInputPositions] = useState({}); // { [restId]: string }
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState({ text: "", isError: false });

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/restaurant-positions");
      const data = await res.json();
      if (res.ok && data.success) {
        setRestaurants(data.restaurants || []);
        // Initialize input values to match current position
        const initialInputs = {};
        (data.restaurants || []).forEach((r) => {
          initialInputs[r.restId] = r.position ? r.position.toString() : "";
        });
        setInputPositions(initialInputs);
      } else {
        setMessage({
          text: data.error || "Failed to load restaurant positions",
          isError: true,
        });
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage({
        text: "Error connecting to server. Please try again.",
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const handleInputChange = (restId, val) => {
    setInputPositions((prev) => ({
      ...prev,
      [restId]: val,
    }));
  };

  const handleSavePosition = async (restId, targetPosOverride) => {
    const rawVal =
      targetPosOverride !== undefined
        ? targetPosOverride
        : inputPositions[restId];
    const newPosNum = parseInt(rawVal, 10);

    if (isNaN(newPosNum) || newPosNum < 1) {
      setMessage({
        text: "Please enter a valid position number (1 or greater).",
        isError: true,
      });
      return;
    }

    try {
      setSavingId(restId);
      setMessage({ text: "", isError: false });

      const res = await fetch("/api/restaurant-positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restId, newPosition: newPosNum }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRestaurants(data.restaurants || []);
        const updatedInputs = {};
        (data.restaurants || []).forEach((r) => {
          updatedInputs[r.restId] = r.position ? r.position.toString() : "";
        });
        setInputPositions(updatedInputs);
        setMessage({
          text: data.message || "Position updated successfully!",
          isError: false,
        });
      } else {
        setMessage({
          text: data.error || "Failed to update position.",
          isError: true,
        });
      }
    } catch (err) {
      console.error("Update error:", err);
      setMessage({
        text: "An error occurred while updating position.",
        isError: true,
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleStepPosition = (restId, currentPos, delta) => {
    const targetPos = currentPos + delta;
    if (targetPos < 1 || targetPos > restaurants.length) return;
    setInputPositions((prev) => ({ ...prev, [restId]: targetPos.toString() }));
    handleSavePosition(restId, targetPos);
  };

  return (
    <div style={styles.container}>
      {/* Top Header Bar */}
      <div style={styles.header}>
        <button
          style={styles.backBtn}
          onClick={() => router.push("/dashboard")}
        >
          ← Back to Dashboard
        </button>
        <h1 style={styles.title}>📍 Manage Restaurant Display Positions</h1>
      </div>

      {/* Info Banner */}
      <div style={styles.infoBanner}>
        ℹ️ Enter a target position number under any restaurant to re-order it.
        For example, if you change <strong>#4</strong> to <strong>1</strong>,
        position 1 will become 2, 2 becomes 3, 3 becomes 4, and 4 takes
        position 1.
      </div>

      {/* Status Message Banner */}
      {message.text && (
        <div
          style={{
            ...styles.messageBanner,
            backgroundColor: message.isError ? "#FFF5F5" : "#F0FFF4",
            color: message.isError ? "#E53E3E" : "#2F855A",
            borderColor: message.isError ? "#FEB2B2" : "#C6F6D5",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Restaurant List */}
      <div style={styles.cardContainer}>
        {loading ? (
          <div style={styles.loadingState}>Loading restaurants...</div>
        ) : restaurants.length === 0 ? (
          <div style={styles.emptyState}>No restaurants found in database.</div>
        ) : (
          restaurants.map((rest, index) => {
            const isSaving = savingId === rest.restId;
            const currentPos = rest.position || index + 1;
            const isFirst = currentPos === 1;
            const isLast = currentPos === restaurants.length;

            return (
              <div key={rest._id || rest.restId} style={styles.card}>
                {/* Position Badge */}
                <div style={styles.rankBadge}>#{rest.position}</div>

                {/* Restaurant Info & Position Input Group */}
                <div style={styles.cardContent}>
                  {/* Restaurant Header Info */}
                  <div style={styles.restHeader}>
                    {rest.logoUrl ? (
                      <img
                        src={rest.logoUrl}
                        alt={rest.name}
                        style={styles.logo}
                      />
                    ) : (
                      <div style={styles.logoPlaceholder}>🍽️</div>
                    )}
                    <div>
                      <h3 style={styles.restName}>{rest.name}</h3>
                      <div style={styles.restSubText}>
                        ID: <strong>{rest.restId}</strong>
                        {rest.restLocation ? ` • ${rest.restLocation}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Input Box directly under Restaurant Name */}
                  <div style={styles.positionControlGroup}>
                    <label style={styles.inputLabel}>
                      Position Rank (Under Name):
                    </label>
                    <div style={styles.inputRow}>
                      <input
                        type="number"
                        min="1"
                        max={restaurants.length}
                        style={styles.positionInput}
                        value={inputPositions[rest.restId] ?? ""}
                        onChange={(e) =>
                          handleInputChange(rest.restId, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSavePosition(rest.restId);
                          }
                        }}
                        disabled={isSaving}
                        placeholder="Enter pos #"
                      />

                      <button
                        style={{
                          ...styles.saveBtn,
                          opacity: isSaving ? 0.7 : 1,
                          cursor: isSaving ? "not-allowed" : "pointer",
                        }}
                        onClick={() => handleSavePosition(rest.restId)}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Set Position"}
                      </button>

                      {/* Quick Up / Down Arrow buttons */}
                      <button
                        style={{
                          ...styles.stepBtn,
                          opacity: isFirst || isSaving ? 0.4 : 1,
                          cursor:
                            isFirst || isSaving ? "not-allowed" : "pointer",
                        }}
                        onClick={() =>
                          handleStepPosition(rest.restId, currentPos, -1)
                        }
                        disabled={isFirst || isSaving}
                        title="Move up 1 rank"
                      >
                        ▲ Up
                      </button>
                      <button
                        style={{
                          ...styles.stepBtn,
                          opacity: isLast || isSaving ? 0.4 : 1,
                          cursor:
                            isLast || isSaving ? "not-allowed" : "pointer",
                        }}
                        onClick={() =>
                          handleStepPosition(rest.restId, currentPos, 1)
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
          })
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "30px 20px",
    maxWidth: "900px",
    margin: "0 auto",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: "#F4F6F8",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
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
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
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
  cardContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  loadingState: {
    textAlign: "center",
    padding: "40px 0",
    color: "#64748B",
    fontSize: "16px",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 0",
    color: "#64748B",
    fontSize: "16px",
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
    border: "1px solid #E2E8F0",
    transition: "transform 0.15s ease",
  },
  rankBadge: {
    minWidth: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#FF6B6B",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "16px",
    boxShadow: "0 4px 10px rgba(255, 107, 107, 0.3)",
    flexShrink: 0,
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flex: 1,
  },
  restHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logo: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid #E2E8F0",
  },
  logoPlaceholder: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    backgroundColor: "#F1F5F9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },
  restName: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#0F172A",
  },
  restSubText: {
    fontSize: "13px",
    color: "#64748B",
    marginTop: "2px",
  },
  positionControlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    backgroundColor: "#F8FAFC",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #E2E8F0",
  },
  inputLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  positionInput: {
    width: "90px",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1.5px solid #CBD5E1",
    fontSize: "15px",
    fontWeight: "700",
    textAlign: "center",
    color: "#0F172A",
    outline: "none",
  },
  saveBtn: {
    padding: "8px 16px",
    backgroundColor: "#2563EB",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  stepBtn: {
    padding: "8px 12px",
    backgroundColor: "#E2E8F0",
    color: "#334155",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "700",
    transition: "background-color 0.2s",
  },
};
