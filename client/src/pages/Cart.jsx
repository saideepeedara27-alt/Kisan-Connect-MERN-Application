import {
  BadgeCheck,
  Clock3,
  CreditCard,
  Headphones,
  Heart,
  MapPinned,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBasket,
  Trash2,
  Truck
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, toAssetUrl } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Cart() {
  const { items, savedItems, subtotal, updateQuantity, removeItem, clearCart, addItem, toggleSaved } = useCart();
  const { user } = useAuth();
  const [config, setConfig] = useState({ currency: 'INR', customerPlatformFee: 0 });
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(user?.village || '');
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadConfig() {
      const response = await api.get('/config');
      setConfig(response.data);
    }

    loadConfig();
  }, []);

  useEffect(() => {
    if (!deliveryLocation && user?.village) {
      setDeliveryLocation(user.village);
    }
  }, [deliveryLocation, user?.village]);

  async function placeOrder(event) {
    event.preventDefault();
    setError('');
    setPlacing(true);

    try {
      await api.post('/orders', {
        deliveryAddress,
        deliveryLocation,
        paymentReference: `mock-client-${Date.now()}`,
        items: items.map((item) => ({
          productId: item._id,
          quantity: item.quantity
        }))
      });
      clearCart();
      navigate('/orders');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to place order.');
    } finally {
      setPlacing(false);
    }
  }

  function moveSavedToCart(product) {
    addItem(product);
    toggleSaved(product);
  }

  const total = subtotal + config.customerPlatformFee;
  const deliveryProvider = config.fastDeliveryProvider || 'Kisan Connect Delivery';
  const deliveryEta = config.fastDeliveryEtaMinutes || 45;
  const deliveryPromise = new Date(Date.now() + deliveryEta * 60 * 1000).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit'
  });

  return (
    <section className="page-pad cart-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1>Your cart</h1>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Cart is empty"
          message="Add products from the market to place an order."
          action={
            <Link className="primary-button compact" to="/market">
              <ShoppingBasket size={16} />
              Browse market
            </Link>
          }
        />
      ) : (
        <form className="checkout-grid" onSubmit={placeOrder}>
          <div className="cart-list">
            <div className="cart-list-section">
              {items.map((item) => (
                <article className="cart-item" key={item._id}>
                  {item.imageUrl ? (
                    <img src={toAssetUrl(item.imageUrl)} alt={item.name} />
                  ) : (
                    <div className="mini-product-fallback">
                      <Package size={24} />
                    </div>
                  )}
                  <div>
                    <h3>{item.name}</h3>
                    <p className="muted">
                      {config.currency} {item.price}/{item.unit}
                    </p>
                    <div className="quantity-control">
                      <button type="button" onClick={() => updateQuantity(item._id, item.quantity - 1)}>
                        <Minus size={15} />
                      </button>
                      <input
                        value={item.quantity}
                        onChange={(event) => updateQuantity(item._id, event.target.value)}
                      />
                      <button type="button" onClick={() => updateQuantity(item._id, item.quantity + 1)}>
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="line-actions">
                    <strong>
                      {config.currency} {item.price * item.quantity}
                    </strong>
                    <button className="icon-button danger" type="button" onClick={() => removeItem(item._id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {savedItems.length > 0 && (
              <div className="saved-products-panel">
                <div className="panel-title compact-title">
                  <Heart size={20} />
                  <h2>Saved for later</h2>
                </div>
                {savedItems.map((item) => (
                  <article className="saved-product-row" key={item._id}>
                    {item.imageUrl ? (
                      <img src={toAssetUrl(item.imageUrl)} alt={item.name} />
                    ) : (
                      <div className="mini-product-fallback">
                        <Package size={22} />
                      </div>
                    )}
                    <div>
                      <h3>{item.name}</h3>
                      <p className="muted">
                        {config.currency} {item.price}/{item.unit}
                      </p>
                    </div>
                    <div className="saved-product-actions">
                      <button className="secondary-button compact" type="button" onClick={() => moveSavedToCart(item)}>
                        <ShoppingBasket size={15} />
                        Move to cart
                      </button>
                      <button className="icon-button danger" type="button" onClick={() => toggleSaved(item)}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="checkout-summary">
            <div className="fast-delivery-card">
              <span className="delivery-icon">
                <Truck size={20} />
              </span>
	              <div>
	                <strong>{deliveryProvider}</strong>
	                <p>
	                  <Clock3 size={15} />
	                  Expected today by {deliveryPromise}, around {deliveryEta} minutes after assignment.
	                </p>
	              </div>
	            </div>
            <div className="checkout-trust-grid" aria-label="Checkout trust details">
              <span>
                <BadgeCheck size={16} />
                Verified farmers
              </span>
              <span>
                <MapPinned size={16} />
                Area-based delivery
              </span>
              <span>
                <ShieldCheck size={16} />
                Clear total before order
              </span>
              <span>
                <Headphones size={16} />
                Support available
              </span>
            </div>
            <label className="field">
              <span>Delivery city / area</span>
              <input
                value={deliveryLocation}
                onChange={(event) => setDeliveryLocation(event.target.value)}
                placeholder="Khammam, Wyra, Pune..."
              />
            </label>
            <label className="field">
              <span>Delivery address</span>
              <textarea
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                placeholder="House, street, village/city, contact notes"
              />
            </label>
            {error && <div className="alert error">{error}</div>}
            <dl className="totals">
              <div>
                <dt>Subtotal</dt>
                <dd>
                  {config.currency} {subtotal}
                </dd>
              </div>
              <div>
                <dt>Platform fee</dt>
                <dd>
                  {config.currency} {config.customerPlatformFee}
                </dd>
              </div>
              <div className="grand-total">
                <dt>Total</dt>
                <dd>
                  {config.currency} {total}
                </dd>
              </div>
            </dl>
            <button className="primary-button wide" disabled={placing}>
              <CreditCard size={18} />
              {placing ? 'Placing order...' : 'Pay and order'}
            </button>
          </aside>
        </form>
      )}
    </section>
  );
}
