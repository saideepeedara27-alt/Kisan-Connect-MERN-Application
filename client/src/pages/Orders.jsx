import { CalendarClock, Clock3, PackageCheck, Phone, RotateCcw, ShoppingBasket, Star, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import { useCart } from '../context/CartContext.jsx';

function formatDeliveryStatus(status = 'assigned') {
  return status.replaceAll('_', ' ');
}

function formatOrderDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Order time unavailable';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getRatingKey(orderId, itemId) {
  return `${orderId}-${itemId}`;
}

export default function Orders() {
  const { addItem } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingForms, setRatingForms] = useState({});
  const [savingRating, setSavingRating] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await api.get('/orders/my');
        setOrders(response.data.orders);
      } catch (apiError) {
        setError(apiError.response?.data?.message || 'Unable to load orders.');
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  function getRatingForm(orderId, item) {
    const key = getRatingKey(orderId, item._id);

    return (
      ratingForms[key] || {
        score: item.rating?.score || 5,
        comment: item.rating?.comment || ''
      }
    );
  }

  function updateRatingForm(orderId, itemId, field, value) {
    const key = getRatingKey(orderId, itemId);
    setRatingForms((current) => ({
      ...current,
      [key]: {
        score: current[key]?.score || 5,
        comment: current[key]?.comment || '',
        [field]: value
      }
    }));
  }

  async function submitRating(event, order, item) {
    event.preventDefault();
    const key = getRatingKey(order._id, item._id);
    const form = getRatingForm(order._id, item);
    setSavingRating(key);
    setError('');
    setMessage('');

    try {
      const response = await api.patch(`/orders/${order._id}/items/${item._id}/rating`, {
        score: Number(form.score),
        comment: form.comment
      });

      setOrders((current) =>
        current.map((currentOrder) =>
          currentOrder._id === response.data.order._id ? response.data.order : currentOrder
        )
      );
      setMessage(`Thanks. Your rating for ${item.farmer?.farmerProfile?.farmName || item.farmer?.name || 'this farm'} is saved.`);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to save rating.');
    } finally {
      setSavingRating('');
    }
  }

  function orderAgain(order) {
    order.items.forEach((item) => {
      const cartProduct = {
        _id: item.product,
        name: item.name,
        imageUrl: item.imageUrl,
        price: item.price,
        unit: item.unit,
        stock: Math.max(item.quantity, 1),
        farmer: item.farmer
      };

      for (let count = 0; count < item.quantity; count += 1) {
        addItem(cartProduct);
      }
    });
    setMessage('Order items added to cart.');
  }

  return (
    <section className="page-pad orders-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Customer orders</p>
          <h1>Order history</h1>
        </div>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="table-shell">Loading...</div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          message="Your placed orders will appear here."
          action={
            <Link className="primary-button compact" to="/market">
              <ShoppingBasket size={16} />
              Browse market
            </Link>
          }
        />
      ) : (
        <div className="order-stack">
          {orders.map((order) => {
            const deliveryPartner = order.deliveryPartner;
            const deliveryStatus = deliveryPartner?.status || 'pending_assignment';

            return (
              <article className="order-card" key={order._id}>
	                <div className="order-head">
	                  <span>
	                    <CalendarClock size={18} />
	                    Ordered {formatOrderDateTime(order.createdAt)}
	                  </span>
	                  <strong>
                    {order.currency} {order.total}
                  </strong>
                </div>

                {deliveryPartner?.name && (
                  <div className="delivery-panel">
                    <span className="delivery-icon">
                      <Truck size={19} />
                    </span>
                    <div>
                      <strong>{deliveryPartner.name}</strong>
                      {deliveryStatus === 'pending_assignment' ? (
                        <p>Finding an available delivery partner in {order.deliveryLocation || 'your delivery area'}.</p>
                      ) : (
                        <p>
                          {deliveryPartner.riderName} - {deliveryPartner.vehicle} - Track {deliveryPartner.trackingCode}
                        </p>
                      )}
                      <p>
                        <Clock3 size={15} />
                        {deliveryPartner.etaMinutes} min ETA - {formatDeliveryStatus(deliveryStatus)}
                      </p>
                    </div>
                    {deliveryStatus !== 'pending_assignment' && deliveryPartner.phone && (
                      <a className="icon-button mini" href={`tel:${deliveryPartner.phone}`} aria-label="Call delivery partner">
                        <Phone size={15} />
                      </a>
                    )}
                  </div>
                )}

                <div className="order-lines">
                  {order.items.map((item) => {
                    const ratingForm = getRatingForm(order._id, item);
                    const farmerName = item.farmer?.farmerProfile?.farmName || item.farmer?.name || 'Farm';
                    const ratingKey = getRatingKey(order._id, item._id);

                    return (
                      <div className="order-item-block" key={item._id}>
                        <div className="order-line">
                          <span>{item.name}</span>
                          <span>
                            {item.quantity} {item.unit}
                          </span>
                          <span className={`status ${item.status}`}>{item.status}</span>
                        </div>
                        <div className="order-farm-row">
                          <span>Farm: {farmerName}</span>
                          {item.rating?.score && (
                            <span className="rating-chip">
                              <Star size={14} />
                              Your rating: {item.rating.score}
                            </span>
                          )}
                        </div>

                        {item.status === 'delivered' && (
                          <form className="rating-form" onSubmit={(event) => submitRating(event, order, item)}>
                            <label>
                              <span>Farm rating</span>
                              <select
                                value={ratingForm.score}
                                onChange={(event) => updateRatingForm(order._id, item._id, 'score', event.target.value)}
                              >
                                {[5, 4, 3, 2, 1].map((score) => (
                                  <option key={score} value={score}>
                                    {score} stars
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span>Review note</span>
                              <textarea
                                value={ratingForm.comment}
                                maxLength={240}
                                onChange={(event) => updateRatingForm(order._id, item._id, 'comment', event.target.value)}
                                placeholder="Freshness, packing, and farm experience"
                              />
                            </label>
                            <button className="secondary-button compact" type="submit" disabled={savingRating === ratingKey}>
                              <Star size={15} />
                              {savingRating === ratingKey ? 'Saving...' : item.rating?.score ? 'Update rating' : 'Save rating'}
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="muted">
                  Delivery area: {order.deliveryLocation || 'Not specified'} - {order.deliveryAddress}
                </p>
                <div className="order-actions">
                  <button className="secondary-button compact" type="button" onClick={() => orderAgain(order)}>
                    <RotateCcw size={15} />
                    Order again
                  </button>
                  <Link className="secondary-button compact" to="/cart">
                    <ShoppingBasket size={15} />
                    Cart
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
