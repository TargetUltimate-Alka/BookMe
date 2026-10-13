import React, { useState, useEffect } from 'react';
import { Modal } from './Modal.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { useEvents } from '../hooks/useEvents.js';
import { bookingsApi } from '../api/bookingsApi.js';

const CATEGORY_ITEMS_CATALOG = {
  'Venue & Catering': [
    { id: 'vc-1', name: 'Grand AC Banquet Hall Rental', defaultQty: 1, unitPrice: 120000, unit: 'hall' },
    { id: 'vc-2', name: 'Deluxe Multi-Cuisine Dinner Buffet', defaultQty: 100, unitPrice: 750, unit: 'plate' },
    { id: 'vc-3', name: 'Welcome Mocktails & Appetizers', defaultQty: 100, unitPrice: 120, unit: 'pax' },
    { id: 'vc-4', name: 'VIP / Bridal Green Room Suite', defaultQty: 2, unitPrice: 4000, unit: 'room' },
    { id: 'vc-5', name: 'Valet Parking & Attendant Service', defaultQty: 3, unitPrice: 1500, unit: 'staff' },
  ],
  'Catering': [
    { id: 'cat-1', name: 'Royal Dinner Buffet (Starters + Main + Dessert)', defaultQty: 100, unitPrice: 650, unit: 'plate' },
    { id: 'cat-2', name: 'Live Chaat & Street Food Counter', defaultQty: 1, unitPrice: 15000, unit: 'stall' },
    { id: 'cat-3', name: 'Artisan Dessert Bar & Ice Cream Counter', defaultQty: 100, unitPrice: 140, unit: 'pax' },
    { id: 'cat-4', name: 'Beverage & Mocktail Counter', defaultQty: 100, unitPrice: 100, unit: 'pax' },
    { id: 'cat-5', name: 'Custom Fondant Tier Celebration Cake', defaultQty: 1, unitPrice: 4500, unit: 'cake' },
  ],
  'Photography & Video': [
    { id: 'pv-1', name: 'Lead Candid Photographer (Full Event)', defaultQty: 1, unitPrice: 25000, unit: 'crew' },
    { id: 'pv-2', name: 'Cinematic 4K Videographer', defaultQty: 1, unitPrice: 22000, unit: 'crew' },
    { id: 'pv-3', name: '4K Drone Aerial Coverage Operator', defaultQty: 1, unitPrice: 14000, unit: 'session' },
    { id: 'pv-4', name: 'Premium Hardcover Photo Album (40 Pages)', defaultQty: 2, unitPrice: 5500, unit: 'album' },
    { id: 'pv-5', name: 'Same-Day Social Media Highlights Teaser', defaultQty: 1, unitPrice: 8000, unit: 'video' },
  ],
  'Decoration & Floral': [
    { id: 'dec-1', name: 'Themed Stage Backdrop & Floral Installation', defaultQty: 1, unitPrice: 35000, unit: 'stage' },
    { id: 'dec-2', name: 'Grand Entrance Floral Arch & Walkway', defaultQty: 1, unitPrice: 16000, unit: 'arch' },
    { id: 'dec-3', name: 'Guest Table Centerpieces & Runners', defaultQty: 15, unitPrice: 800, unit: 'table' },
    { id: 'dec-4', name: 'Ambient LED Wash & Mood Lighting Set', defaultQty: 2, unitPrice: 7000, unit: 'set' },
    { id: 'dec-5', name: 'Photo Booth Selfie Backdrop with Props', defaultQty: 1, unitPrice: 10000, unit: 'booth' },
  ],
  'Music & Entertainment': [
    { id: 'me-1', name: 'Professional DJ & Sound Console System', defaultQty: 1, unitPrice: 26000, unit: 'night' },
    { id: 'me-2', name: 'LED Interactive Dance Floor (16x16 ft)', defaultQty: 1, unitPrice: 18000, unit: 'floor' },
    { id: 'me-3', name: 'Live Acoustic Band / Singers (2 Hours)', defaultQty: 1, unitPrice: 22000, unit: 'session' },
    { id: 'me-4', name: 'Stage Cold Spark Pyro Machines', defaultQty: 4, unitPrice: 2500, unit: 'unit' },
    { id: 'me-5', name: 'Professional Emcee / Host for Games', defaultQty: 1, unitPrice: 12000, unit: 'event' },
  ],
  'Makeup & Styling': [
    { id: 'ms-1', name: 'Bridal / Celebrant HD Airbrush Makeup & Hair', defaultQty: 1, unitPrice: 18000, unit: 'person' },
    { id: 'ms-2', name: 'Family & Bridesmaid Party Makeup', defaultQty: 3, unitPrice: 3500, unit: 'person' },
    { id: 'ms-3', name: 'Pre-Event Trial Session', defaultQty: 1, unitPrice: 5000, unit: 'session' },
    { id: 'ms-4', name: 'Groom Grooming & Styling Package', defaultQty: 1, unitPrice: 6000, unit: 'person' },
  ],
  'General Service': [
    { id: 'gen-1', name: 'Day-of Event Coordinator & Manager', defaultQty: 1, unitPrice: 15000, unit: 'coordinator' },
    { id: 'gen-2', name: 'Trained Uniformed Event Hospitality Staff', defaultQty: 4, unitPrice: 2500, unit: 'staff' },
    { id: 'gen-3', name: 'Security & Crowd Management Personnel', defaultQty: 2, unitPrice: 3000, unit: 'guard' },
  ],
};

export function BookVendorModal({
  isOpen,
  onClose,
  vendorInfo = {},
  initialEventId,
  onSuccess,
  onCreateNewEvent,
}) {
  const { events, loading: eventsLoading } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Items Selection and Quantities state
  const [selectedItems, setSelectedItems] = useState({});
  const [customItems, setCustomItems] = useState([]);
  const [newCustomItemName, setNewCustomItemName] = useState('');
  const [newCustomItemPrice, setNewCustomItemPrice] = useState('');
  const [newCustomItemQty, setNewCustomItemQty] = useState('1');
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Initialize selected items based on vendor category
  useEffect(() => {
    if (!isOpen) return;
    const cat = vendorInfo.category || 'General Service';
    const catalog =
      CATEGORY_ITEMS_CATALOG[cat] ||
      CATEGORY_ITEMS_CATALOG['Venue & Catering'] ||
      CATEGORY_ITEMS_CATALOG['General Service'];

    const initial = {};
    // Start with NO items preselected unless explicitly chosen by the customer
    catalog.forEach((it) => {
      initial[it.id] = {
        selected: false,
        name: it.name,
        quantity: it.defaultQty || 1,
        unitPrice: it.unitPrice,
        unit: it.unit || 'unit',
      };
    });
    setSelectedItems(initial);
  }, [isOpen, vendorInfo.category]);

  useEffect(() => {
    if (initialEventId) {
      setSelectedEventId(initialEventId);
    } else if (events && events.length > 0 && !selectedEventId) {
      const active = events.find((e) => e.status !== 'CANCELLED');
      if (active) setSelectedEventId(active.id);
    }
  }, [initialEventId, events, selectedEventId]);

  if (!isOpen) return null;

  const activeEvents = (events || []).filter((e) => e.status !== 'CANCELLED');
  const selectedEvent = activeEvents.find((e) => e.id === selectedEventId);

  const cat = vendorInfo.category || 'General Service';
  const catalog =
    CATEGORY_ITEMS_CATALOG[cat] ||
    CATEGORY_ITEMS_CATALOG['Venue & Catering'] ||
    CATEGORY_ITEMS_CATALOG['General Service'];

  // Calculate Subtotals and Total
  const activeItemsList = [];
  catalog.forEach((it) => {
    const itemState = selectedItems[it.id];
    if (itemState && itemState.selected) {
      activeItemsList.push({
        id: it.id,
        name: itemState.name,
        quantity: Number(itemState.quantity) || 1,
        unitPrice: Number(itemState.unitPrice) || 0,
        unit: itemState.unit || 'unit',
        subtotal: (Number(itemState.quantity) || 1) * (Number(itemState.unitPrice) || 0),
      });
    }
  });

  customItems.forEach((it) => {
    if (it.selected) {
      activeItemsList.push({
        id: it.id,
        name: it.name,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        unit: it.unit || 'custom',
        subtotal: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
      });
    }
  });

  const basePackagePrice = Number(vendorInfo.price) || 0;
  const addOnsTotal = activeItemsList.reduce((sum, it) => sum + it.subtotal, 0);
  const totalCalculatedPrice = basePackagePrice > 0 ? basePackagePrice + addOnsTotal : addOnsTotal;

  const toggleItemSelection = (itemId) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId]?.selected,
      },
    }));
  };

  const updateItemQty = (itemId, deltaOrValue) => {
    setSelectedItems((prev) => {
      const cur = prev[itemId] || { quantity: 1 };
      let newQty;
      if (typeof deltaOrValue === 'number') {
        newQty = Math.max(1, (cur.quantity || 1) + deltaOrValue);
      } else {
        newQty = Math.max(1, parseInt(deltaOrValue, 10) || 1);
      }
      return {
        ...prev,
        [itemId]: {
          ...cur,
          quantity: newQty,
          selected: true,
        },
      };
    });
  };

  const handleApplyGuestCount = () => {
    if (!selectedEvent?.guest_count) return;
    const count = selectedEvent.guest_count;
    setSelectedItems((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        if (
          updated[k].unit === 'plate' ||
          updated[k].unit === 'pax' ||
          updated[k].name.toLowerCase().includes('buffet') ||
          updated[k].name.toLowerCase().includes('dinner')
        ) {
          updated[k] = { ...updated[k], quantity: count, selected: true };
        }
      });
      return updated;
    });
  };

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!newCustomItemName.trim()) return;
    const price = Math.max(0, Number(newCustomItemPrice) || 1000);
    const qty = Math.max(1, Number(newCustomItemQty) || 1);
    const id = `custom-${Date.now()}`;
    setCustomItems((prev) => [
      ...prev,
      {
        id,
        name: newCustomItemName.trim(),
        unitPrice: price,
        quantity: qty,
        unit: 'item',
        selected: true,
      },
    ]);
    setNewCustomItemName('');
    setNewCustomItemPrice('');
    setNewCustomItemQty('1');
    setShowAddCustom(false);
  };

  const handleConfirm = async () => {
    if (!selectedEventId) {
      setErrorMsg('Please select an event for this booking.');
      return;
    }

    if (totalCalculatedPrice <= 0 && activeItemsList.length === 0) {
      setErrorMsg('Please select at least one service item or package.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const vendorId = vendorInfo.vendorId || (vendorInfo.category?.includes('Photo') ? 'vnd_202' : vendorInfo.category?.includes('Banquet') ? 'vnd_101' : 'vnd_456');
      const serviceId = vendorInfo.serviceId || (vendorId === 'vnd_202' ? 'svc_202' : vendorId === 'vnd_101' ? 'svc_101' : 'svc_789');
      const packageId = vendorInfo.packageId || (vendorId === 'vnd_202' ? 'pkg_301' : vendorId === 'vnd_101' ? 'pkg_201' : 'pkg_111');

      const itemsPayload = activeItemsList.length > 0
        ? activeItemsList
        : [
            {
              id: packageId,
              name: vendorInfo.packageName || 'Base Service Package',
              quantity: 1,
              unitPrice: basePackagePrice,
              unit: 'package',
              subtotal: basePackagePrice,
            },
          ];

      const packageNamePayload = activeItemsList.length > 0
        ? `${vendorInfo.packageName || 'Service Package'} + ${activeItemsList.length} item${activeItemsList.length > 1 ? 's' : ''}`
        : (vendorInfo.packageName || 'Standard Service Package');

      const payload = {
        event_id: selectedEventId,
        vendor_id: vendorId,
        service_id: serviceId,
        package_id: packageId,
        category: vendorInfo.category || selectedEvent?.event_type || 'General Service',
        custom_price: totalCalculatedPrice,
        custom_package_name: packageNamePayload,
        items: itemsPayload,
      };

      const result = await bookingsApi.createBooking(payload);
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request booking with vendor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize & Request Vendor Booking"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block' }}>Estimated Total</span>
            <strong style={{ fontSize: '1.25rem', color: '#4f46e5' }}>
              {formatCurrency(totalCalculatedPrice)}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="eb-btn eb-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="eb-btn eb-btn-primary"
              onClick={handleConfirm}
              disabled={submitting || !selectedEventId || totalCalculatedPrice <= 0}
            >
              {submitting ? 'Sending Request...' : 'Send Booking Request'}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '72vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
        {/* Vendor Header Overview */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span className="eb-badge" style={{ background: '#e0e7ff', color: '#3730a3', marginBottom: '0.25rem' }}>
              {vendorInfo.category || 'Vendor Service'}
            </span>
            <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
              {vendorInfo.vendorName || 'Specialist Vendor'}
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Select items, add-ons, and quantities to tailor your contract quote.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Items Selected</span>
            <strong style={{ fontSize: '1.1rem', color: '#111827' }}>
              {activeItemsList.length} items
            </strong>
          </div>
        </div>

        {/* Base Package Snapshot if present */}
        {basePackagePrice > 0 && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ✓ Selected Base Offering
              </span>
              <h5 style={{ margin: '0.15rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#14532d' }}>
                {vendorInfo.packageName || 'Standard Service Package'}
              </h5>
              <span style={{ fontSize: '0.78rem', color: '#15803d' }}>
                Direct booking for {vendorInfo.vendorName}. Tick extra items below to add to your quote.
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#166534', display: 'block' }}>Package Price</span>
              <strong style={{ fontSize: '1.15rem', color: '#14532d' }}>
                {formatCurrency(basePackagePrice)}
              </strong>
            </div>
          </div>
        )}

        {/* Target Event Selection */}
        <div className="eb-form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label className="eb-label" style={{ margin: 0 }}>Choose Target Event *</label>
            {selectedEvent?.guest_count && (
              <button
                type="button"
                className="eb-btn eb-btn-ghost eb-btn-sm"
                onClick={handleApplyGuestCount}
                style={{ fontSize: '0.75rem', color: '#4f46e5', padding: '0.1rem 0.4rem' }}
                title="Automatically set plates/buffet to event guest count"
              >
                ⚡ Match Guest Count ({selectedEvent.guest_count})
              </button>
            )}
          </div>

          {eventsLoading ? (
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading your events...</p>
          ) : activeEvents.length === 0 ? (
            <div style={{ padding: '0.75rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#92400e' }}>
                You don't have any active events planned yet.
              </p>
              {onCreateNewEvent && (
                <button
                  type="button"
                  className="eb-btn eb-btn-primary eb-btn-sm"
                  onClick={() => {
                    onClose();
                    onCreateNewEvent();
                  }}
                >
                  + Create New Event
                </button>
              )}
            </div>
          ) : (
            <select
              className="eb-select"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">Select an event...</option>
              {activeEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({formatDate(ev.event_date)} - {ev.city || 'No city'}) [{ev.guest_count} guests]
                </option>
              ))}
            </select>
          )}

          {selectedEvent && (
            <p style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '0.35rem' }}>
              Booking Date: <strong>{formatDate(selectedEvent.event_date)}</strong> &bull; Location: {selectedEvent.city || 'Designated City'}
            </p>
          )}
        </div>

        {/* Items & Quantities Selection Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
              Select Items & Adjust Quantities
            </h4>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              Tick items to include in quote
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {catalog.map((item) => {
              const state = selectedItems[item.id] || { selected: false, quantity: item.defaultQty };
              const isSelected = Boolean(state.selected);
              const lineTotal = (Number(state.quantity) || 1) * item.unitPrice;

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: isSelected ? '#ffffff' : '#f9fafb',
                    border: isSelected ? '1.5px solid #4f46e5' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItemSelection(item.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                      aria-label={`Select ${item.name}`}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: isSelected ? 600 : 500, color: isSelected ? '#111827' : '#4b5563' }}>
                        {item.name}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {formatCurrency(item.unitPrice)} / {item.unit}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper & Subtotal */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f3f4f6', borderRadius: '6px', padding: '0.15rem' }}>
                      <button
                        type="button"
                        onClick={() => updateItemQty(item.id, -1)}
                        disabled={!isSelected || state.quantity <= 1}
                        style={{
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          background: 'transparent',
                          cursor: isSelected && state.quantity > 1 ? 'pointer' : 'not-allowed',
                          fontWeight: 700,
                          color: '#374151',
                          borderRadius: '4px',
                        }}
                      >
                        –
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={state.quantity}
                        onChange={(e) => updateItemQty(item.id, e.target.value)}
                        disabled={!isSelected}
                        style={{
                          width: '45px',
                          textAlign: 'center',
                          border: 'none',
                          background: '#ffffff',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          padding: '0.2rem',
                          margin: '0 0.15rem',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => updateItemQty(item.id, 1)}
                        disabled={!isSelected}
                        style={{
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          background: 'transparent',
                          cursor: isSelected ? 'pointer' : 'not-allowed',
                          fontWeight: 700,
                          color: '#374151',
                          borderRadius: '4px',
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ width: '80px', textAlign: 'right' }}>
                      <strong style={{ fontSize: '0.9rem', color: isSelected ? '#4f46e5' : '#9ca3af' }}>
                        {formatCurrency(lineTotal)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Custom Added Items */}
            {customItems.map((cItem) => {
              const lineTotal = cItem.quantity * cItem.unitPrice;
              return (
                <div
                  key={cItem.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: '#f0fdf4',
                    border: '1.5px solid #22c55e',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <span style={{ fontSize: '1rem' }}>✨</span>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                        {cItem.name} <span style={{ fontSize: '0.7rem', color: '#15803d', background: '#dcfce7', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>Custom</span>
                      </p>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {formatCurrency(cItem.unitPrice)} &times; {cItem.quantity}
                      </span>
                    </div>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: '#15803d' }}>
                    {formatCurrency(lineTotal)}
                  </strong>
                </div>
              );
            })}
          </div>

          {/* Add Custom Item Toggle */}
          <div style={{ marginTop: '0.75rem' }}>
            {!showAddCustom ? (
              <button
                type="button"
                className="eb-btn eb-btn-ghost eb-btn-sm"
                onClick={() => setShowAddCustom(true)}
                style={{ color: '#4f46e5', fontWeight: 600 }}
              >
                + Add Custom Item / Service
              </button>
            ) : (
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                  Add Custom Service or Add-on
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="eb-input"
                    placeholder="e.g. Dessert Trolley"
                    value={newCustomItemName}
                    onChange={(e) => setNewCustomItemName(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                  />
                  <input
                    type="number"
                    className="eb-input"
                    placeholder="Unit Price (₹)"
                    value={newCustomItemPrice}
                    onChange={(e) => setNewCustomItemPrice(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                  />
                  <input
                    type="number"
                    min="1"
                    className="eb-input"
                    placeholder="Qty"
                    value={newCustomItemQty}
                    onChange={(e) => setNewCustomItemQty(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      type="button"
                      className="eb-btn eb-btn-primary eb-btn-sm"
                      onClick={handleAddCustomItem}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="eb-btn eb-btn-ghost eb-btn-sm"
                      onClick={() => setShowAddCustom(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="eb-alert-banner eb-alert-danger" style={{ margin: 0 }}>
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
