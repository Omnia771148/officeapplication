'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './restaurant-cart-offers.css';

export default function RestaurantCartOffers() {
  const router = useRouter();

  // Data states
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestId, setSelectedRestId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

  // Offers configuration state
  const [itemDiscountEnabled, setItemDiscountEnabled] = useState(false);
  const [itemTiers, setItemTiers] = useState([
    { itemCount: 1, discountPercentage: 10, enabled: true, couponCode: 'REST1' },
    { itemCount: 2, discountPercentage: 20, enabled: true, couponCode: 'REST2' }
  ]);

  const [deliveryDiscountEnabled, setDeliveryDiscountEnabled] = useState(false);
  const [deliveryDiscountType, setDeliveryDiscountType] = useState('flat'); // 'flat' | 'percentage'
  const [deliveryDiscountValue, setDeliveryDiscountValue] = useState(20);
  const [deliveryCouponCode, setDeliveryCouponCode] = useState('DELIV20');

  const showAlert = (text, type = 'success') => {
    setAlertMsg({ text, type });
    setTimeout(() => {
      setAlertMsg({ text: '', type: '' });
    }, 5000);
  };

  // Fetch list of restaurants on initial load
  useEffect(() => {
    async function loadRestaurants() {
      try {
        setLoading(true);
        const res = await fetch('/api/restaurant-cart-offers');
        const data = await res.json();
        if (data.success && Array.isArray(data.restaurants)) {
          setRestaurants(data.restaurants);
          if (data.restaurants.length > 0) {
            setSelectedRestId(data.restaurants[0].restId);
          }
        } else {
          showAlert('Failed to load restaurants', 'error');
        }
      } catch (err) {
        console.error('Error fetching restaurants:', err);
        showAlert('Network error fetching restaurants', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadRestaurants();
  }, []);

  // Fetch configuration whenever selected restaurant changes
  useEffect(() => {
    if (!selectedRestId) return;

    async function loadRestaurantOffers() {
      try {
        const res = await fetch(`/api/restaurant-cart-offers?restId=${encodeURIComponent(selectedRestId)}`);
        const data = await res.json();
        if (data.success && data.cartOffers) {
          const { itemDiscount, deliveryDiscount } = data.cartOffers;
          
          setItemDiscountEnabled(Boolean(itemDiscount?.enabled));
          if (Array.isArray(itemDiscount?.tiers) && itemDiscount.tiers.length > 0) {
            setItemTiers(itemDiscount.tiers);
          } else {
            setItemTiers([
              { itemCount: 1, discountPercentage: 10, enabled: true, couponCode: 'REST1' },
              { itemCount: 2, discountPercentage: 20, enabled: true, couponCode: 'REST2' }
            ]);
          }

          setDeliveryDiscountEnabled(Boolean(deliveryDiscount?.enabled));
          setDeliveryDiscountType(deliveryDiscount?.discountType === 'percentage' ? 'percentage' : 'flat');
          setDeliveryDiscountValue(deliveryDiscount?.discountValue !== undefined ? deliveryDiscount.discountValue : 20);
          setDeliveryCouponCode(deliveryDiscount?.couponCode || 'DELIV20');
        }
      } catch (err) {
        console.error('Error fetching restaurant cart offers:', err);
      }
    }

    loadRestaurantOffers();
  }, [selectedRestId]);

  // Tier operations
  const handleTierChange = (index, field, value) => {
    setItemTiers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddTier = () => {
    const nextCount = itemTiers.length + 1;
    setItemTiers((prev) => [
      ...prev,
      {
        itemCount: nextCount,
        discountPercentage: 10 * nextCount,
        enabled: true,
        couponCode: `REST${nextCount}`
      }
    ]);
  };

  const handleDeleteTier = (index) => {
    if (itemTiers.length <= 1) {
      showAlert('At least one item count rule must remain', 'error');
      return;
    }
    setItemTiers((prev) => prev.filter((_, i) => i !== index));
  };

  // Save handler
  const handleSave = async () => {
    if (!selectedRestId) {
      showAlert('Please select a restaurant first', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        restId: selectedRestId,
        cartOffers: {
          itemDiscount: {
            enabled: itemDiscountEnabled,
            tiers: itemTiers
          },
          deliveryDiscount: {
            enabled: deliveryDiscountEnabled,
            discountType: deliveryDiscountType,
            discountValue: Number(deliveryDiscountValue) || 0,
            couponCode: deliveryCouponCode
          }
        }
      };

      const res = await fetch('/api/restaurant-cart-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showAlert('Restaurant offers saved successfully!', 'success');
      } else {
        showAlert(data.error || 'Failed to save offers', 'error');
      }
    } catch (err) {
      console.error('Error saving restaurant offers:', err);
      showAlert('Error connecting to server', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rcoContainer">
      {/* Header */}
      <div className="rcoHeader">
        <button className="rcoBackBtn" onClick={() => router.push('/dashboard')}>
          ← Back to Dashboard
        </button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 className="rcoTitle">Restaurant Item & Delivery Offers</h1>
          <p className="rcoSubtitle">
            Configure dynamic item % discounts (based on items count) and delivery fee discounts per restaurant
          </p>
        </div>
        <div style={{ width: '130px' }} />
      </div>

      {/* Alert */}
      {alertMsg.text && (
        <div className={`rcoAlert ${alertMsg.type === 'error' ? 'rcoAlertError' : 'rcoAlertSuccess'}`}>
          <span>{alertMsg.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Restaurant Selector Card */}
      <div className="rcoCard">
        <div className="rcoCardHeader">
          <div className="rcoCardTitle">
            <span>🏪</span>
            <span>Select Particular Restaurant</span>
          </div>
        </div>
        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading restaurants...</p>
        ) : (
          <select
            className="rcoRestaurantSelect"
            value={selectedRestId}
            onChange={(e) => setSelectedRestId(e.target.value)}
          >
            {restaurants.map((r) => (
              <option key={r.restId} value={r.restId}>
                {r.name} (ID: {r.restId}) {r.hasCartOffers ? '★ [Active Offers]' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* SECTION 1: Item Discount Configuration */}
      <div className="rcoCard">
        <div className="rcoCardHeader">
          <div className="rcoCardTitle">
            <span>🏷️</span>
            <span>Item Price Discount (% by Item Quantity)</span>
          </div>
        </div>

        {/* Master Switch for Item Discount */}
        <div className="rcoSwitchRow">
          <div>
            <div className="rcoSwitchLabel">Enable Item Discount for this Restaurant</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
              When turned ON, customers will see item percentage discount coupons in their cart.
            </div>
          </div>
          <label className="rcoSwitch">
            <input
              type="checkbox"
              checked={itemDiscountEnabled}
              onChange={(e) => setItemDiscountEnabled(e.target.checked)}
            />
            <span className="rcoSlider"></span>
          </label>
        </div>

        {/* Dynamic Item Count Rules / Tiers */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
            Item Quantity Discount Rules:
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '14px' }}>
            Specify discount percentage and coupon activation based on how many items are added in the cart.
          </div>

          <div className="rcoTierList">
            {itemTiers.map((tier, idx) => (
              <div key={idx} className="rcoTierRow">
                <div className="rcoTierLeft">
                  <label className="rcoSwitch" style={{ transform: 'scale(0.85)' }}>
                    <input
                      type="checkbox"
                      checked={tier.enabled}
                      onChange={(e) => handleTierChange(idx, 'enabled', e.target.checked)}
                    />
                    <span className="rcoSlider"></span>
                  </label>
                  <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '1rem' }}>
                    When {tier.itemCount} Item{tier.itemCount > 1 ? 's' : ''} Added
                  </span>
                </div>

                <div className="rcoTierInputs">
                  <div className="rcoInputGroup">
                    <span className="rcoInputLabel">Items Required</span>
                    <input
                      type="number"
                      min="1"
                      className="rcoInput"
                      style={{ width: '80px' }}
                      value={tier.itemCount}
                      onChange={(e) => handleTierChange(idx, 'itemCount', Number(e.target.value))}
                    />
                  </div>

                  <div className="rcoInputGroup">
                    <span className="rcoInputLabel">Discount %</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="rcoInput"
                      style={{ width: '90px' }}
                      value={tier.discountPercentage}
                      onChange={(e) => handleTierChange(idx, 'discountPercentage', Number(e.target.value))}
                    />
                  </div>

                  <div className="rcoInputGroup">
                    <span className="rcoInputLabel">Coupon Code</span>
                    <input
                      type="text"
                      className="rcoInput"
                      style={{ width: '120px', textTransform: 'uppercase' }}
                      value={tier.couponCode}
                      onChange={(e) => handleTierChange(idx, 'couponCode', e.target.value.toUpperCase())}
                    />
                  </div>

                  <button
                    type="button"
                    className="rcoDeleteTierBtn"
                    onClick={() => handleDeleteTier(idx)}
                    title="Delete this rule"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="rcoAddBtn" onClick={handleAddTier}>
            ➕ Add More Item Quantity Rule
          </button>
        </div>
      </div>

      {/* SECTION 2: Delivery Fee Discount Configuration */}
      <div className="rcoCard">
        <div className="rcoCardHeader">
          <div className="rcoCardTitle">
            <span>🚚</span>
            <span>Delivery Fee Discount</span>
          </div>
        </div>

        {/* Master Switch for Delivery Discount */}
        <div className="rcoSwitchRow">
          <div>
            <div className="rcoSwitchLabel">Enable Delivery Fee Discount for this Restaurant</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
              When turned ON, the delivery fee in the customer cart will decrease by your configured discount.
            </div>
          </div>
          <label className="rcoSwitch">
            <input
              type="checkbox"
              checked={deliveryDiscountEnabled}
              onChange={(e) => setDeliveryDiscountEnabled(e.target.checked)}
            />
            <span className="rcoSlider"></span>
          </label>
        </div>

        {/* Discount Type Selector: Flat ₹ vs Percentage % */}
        <div style={{ marginTop: '15px' }}>
          <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
            Delivery Fee Discount Type:
          </div>
          <div className="rcoRadioGroup">
            <div
              className={`rcoRadioBtn ${deliveryDiscountType === 'flat' ? 'active' : ''}`}
              onClick={() => setDeliveryDiscountType('flat')}
            >
              💵 Flat Amount Reduction (₹ Off Delivery Fee)
            </div>
            <div
              className={`rcoRadioBtn ${deliveryDiscountType === 'percentage' ? 'active' : ''}`}
              onClick={() => setDeliveryDiscountType('percentage')}
            >
              📊 Percentage Reduction (% Off Delivery Fee)
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '15px' }}>
            <div className="rcoInputGroup">
              <span className="rcoInputLabel">
                {deliveryDiscountType === 'flat' ? 'Discount Amount (₹)' : 'Discount Percentage (%)'}
              </span>
              <input
                type="number"
                min="0"
                max={deliveryDiscountType === 'percentage' ? 100 : 9999}
                className="rcoInput"
                style={{ width: '160px' }}
                value={deliveryDiscountValue}
                onChange={(e) => setDeliveryDiscountValue(Number(e.target.value))}
              />
            </div>

            <div className="rcoInputGroup">
              <span className="rcoInputLabel">Delivery Coupon Code</span>
              <input
                type="text"
                className="rcoInput"
                style={{ width: '160px', textTransform: 'uppercase' }}
                value={deliveryCouponCode}
                onChange={(e) => setDeliveryCouponCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        className="rcoSaveBtn"
        onClick={handleSave}
        disabled={saving || !selectedRestId}
      >
        {saving ? 'Saving Settings...' : '💾 Save Restaurant Offers Configuration'}
      </button>
    </div>
  );
}

