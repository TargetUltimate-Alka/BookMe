import { useState } from "react";

export default function VendorPackages() {
  const [basePackage] = useState({
    title: "Signature 5-Course Royal Wedding Buffet",
    desc: "3 Starters, 5 Main Course, Dal Makhani, Assorted Breads & 2 Warm Desserts",
    price: 45000,
  });

  const [addons, setAddons] = useState([
    {
      id: "chaat",
      title: "Live Delhi Chaat & Street Food Counter",
      desc: "Pani Puri, Dahi Bhalla, Sev Puri & Aloo Tikki with 2 Dedicated Chefs",
      price: 15000,
      selected: false,
    },
    {
      id: "mocktail",
      title: "Artisanal Mocktail & Smoked Drink Bar",
      desc: "Smoked Rosemary Mojito, Kiwi Crush, Fresh Fruit Juices & Flair Bartender",
      price: 20000,
      selected: false,
    },
    {
      id: "chef",
      title: "VIP Executive Master Chef Plating Service",
      desc: "Exclusive presentation, gold leaf garnishing & dedicated VIP guest service",
      price: 25000,
      selected: false,
    },
  ]);

  const [notification, setNotification] = useState("");

  const toggleAddon = (id) => {
    setAddons((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const totalPrice =
    basePackage.price +
    addons.reduce((sum, item) => sum + (item.selected ? item.price : 0), 0);

  const savePackage = () => {
    setNotification("Package saved and published to BookMe marketplace!");
    setTimeout(() => setNotification(""), 3000);
  };

  return (
    <div className="vendor-section-card">
      <div className="vendor-section-header">
        <div>
          <h3>🍱 Custom Offerings & Bundled Packages</h3>
          <p>Create modular service bundles that customers can directly customize and book.</p>
        </div>
        <div className="price-badge-box">
          <span className="price-label">Live Bundle Price</span>
          <span className="price-amount">₹{totalPrice.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {notification && (
        <div className="notification-toast">✓ {notification}</div>
      )}

      <div className="packages-grid">
        <div className="package-item base-item">
          <input type="checkbox" checked disabled />
          <div>
            <h4>{basePackage.title}</h4>
            <p>{basePackage.desc}</p>
            <span className="item-price">₹{basePackage.price.toLocaleString("en-IN")} (Base Price)</span>
          </div>
        </div>

        {addons.map((addon) => (
          <div
            key={addon.id}
            className={`package-item ${addon.selected ? "selected" : ""}`}
            onClick={() => toggleAddon(addon.id)}
          >
            <input
              type="checkbox"
              checked={addon.selected}
              onChange={() => {}}
            />
            <div>
              <h4>{addon.title}</h4>
              <p>{addon.desc}</p>
              <span className="item-price">+ ₹{addon.price.toLocaleString("en-IN")}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="actions-row-end">
        <button type="button" onClick={savePackage} className="primary-button">
          💾 Save & Publish Package
        </button>
      </div>
    </div>
  );
}
