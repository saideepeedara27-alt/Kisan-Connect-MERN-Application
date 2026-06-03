import { CalendarClock, CheckCircle2, Clock3, MapPin, PackageCheck, Phone, Power, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';

const deliveryActions = [
  { status: 'accepted', label: 'Accept' },
  { status: 'picked_up', label: 'Picked up' },
  { status: 'out_for_delivery', label: 'Out for delivery' },
  { status: 'delivered', label: 'Delivered' }
];

const nextDeliveryAction = {
  assigned: ['accepted'],
  accepted: ['picked_up'],
  picked_up: ['out_for_delivery'],
  out_for_delivery: ['delivered']
};

function formatStatus(status = '') {
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

function isActiveDelivery(status) {
  return ['assigned', 'accepted', 'picked_up', 'out_for_delivery'].includes(status);
}

function getVisibleActions(status) {
  const allowedStatuses = nextDeliveryAction[status] || [];
  return deliveryActions.filter((action) => allowedStatuses.includes(action.status));
}

export default function DeliveryDashboard() {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadDeliveryDesk();
  }, []);

  async function loadDeliveryDesk() {
    try {
      const response = await api.get('/delivery/me');
      setProfile(response.data.profile);
      setOrders(response.data.orders);
      setError('');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to load delivery dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function updateAvailability() {
    setUpdating('availability');
    setMessage('');
    setError('');

    try {
      const response = await api.patch('/delivery/me/availability', {
        isAvailable: !profile.isAvailable
      });
      setProfile(response.data.profile);
      setMessage(response.data.profile.isAvailable ? 'You are online for new orders.' : 'You are offline for new orders.');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to update availability.');
    } finally {
      setUpdating('');
    }
  }

  async function updateDeliveryStatus(orderId, status) {
    setUpdating(`${orderId}-${status}`);
    setMessage('');
    setError('');

    try {
      const response = await api.patch(`/delivery/orders/${orderId}/status`, { status });
      setOrders((current) =>
        current.map((order) => (order._id === response.data.order._id ? response.data.order : order))
      );
      setProfile(response.data.profile);
      setMessage(`Delivery marked ${formatStatus(status)}.`);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to update delivery.');
    } finally {
      setUpdating('');
    }
  }

  const stats = useMemo(
    () => ({
      assigned: orders.filter((order) => isActiveDelivery(order.deliveryPartner?.status)).length,
      completed: profile?.completedDeliveries || 0,
      total: orders.length
    }),
    [orders, profile]
  );

  if (loading) {
    return <section className="page-pad">Loading...</section>;
  }

  return (
    <section className="page-pad delivery-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Kisan Connect Delivery</p>
          <h1>Delivery partner desk</h1>
        </div>
        <button className="secondary-button" type="button" onClick={updateAvailability} disabled={updating === 'availability'}>
          <Power size={17} />
          {profile?.isAvailable ? 'Go offline' : 'Go online'}
        </button>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      {profile && (
        <div className="delivery-profile-card">
          <span className="delivery-icon">
            <Truck size={22} />
          </span>
          <div>
            <strong>{profile.user?.name}</strong>
            <p>
              {profile.vehicleType} - {profile.vehicleNumber}
            </p>
            <p>{profile.serviceAreas?.join(', ') || profile.user?.village}</p>
          </div>
          <span className={`status ${profile.isAvailable ? 'active' : 'packed'}`}>
            {profile.isAvailable ? 'online' : 'offline'}
          </span>
        </div>
      )}

      <div className="dashboard-grid">
        <StatCard label="Active deliveries" value={stats.assigned} />
        <StatCard label="Completed" value={stats.completed} tone="green" />
        <StatCard label="Total assigned" value={stats.total} tone="blue" />
      </div>

      {orders.length === 0 ? (
        <EmptyState title="No deliveries assigned" message="New customer orders from your service areas will appear here." />
      ) : (
        <div className="delivery-order-grid">
          {orders.map((order) => {
            const status = order.deliveryPartner?.status || 'pending_assignment';
            const isClosed = ['delivered', 'cancelled'].includes(status);
            const visibleActions = getVisibleActions(status);

            return (
              <article className="delivery-order-card" key={order._id}>
                <div className="delivery-order-head">
                  <span>
                    <PackageCheck size={18} />
                    Track {order.deliveryPartner?.trackingCode}
                  </span>
                  <span className={`status ${status}`}>{formatStatus(status)}</span>
                </div>

                <div className="delivery-customer-row">
                  <div>
                    <strong>{order.customer?.name || 'Customer'}</strong>
                    <p>{order.customer?.phone || 'Phone not provided'}</p>
                  </div>
                  {order.customer?.phone && (
                    <a className="icon-button mini" href={`tel:${order.customer.phone}`} aria-label="Call customer">
                      <Phone size={15} />
                    </a>
                  )}
                </div>

                <p className="delivery-address">
                  <MapPin size={16} />
                  {order.deliveryLocation || 'Delivery area not specified'} - {order.deliveryAddress}
                </p>

                <div className="delivery-items">
                  {order.items.map((item) => (
                    <div key={item._id}>
                      <span>{item.name}</span>
                      <strong>
                        {item.quantity} {item.unit}
                      </strong>
                    </div>
                  ))}
                </div>

	                <div className="delivery-meta">
	                  <span>
	                    <CalendarClock size={15} />
	                    Ordered {formatOrderDateTime(order.createdAt)}
	                  </span>
	                  <span>
	                    <Clock3 size={15} />
                    ETA {order.deliveryPartner?.etaMinutes || 45} min
                  </span>
                  <span>
                    {order.currency} {order.total}
                  </span>
                </div>

                {!isClosed && visibleActions.length > 0 && (
                  <div className="delivery-actions">
                    {visibleActions.map((action) => (
                      <button
                        className="secondary-button compact"
                        disabled={updating === `${order._id}-${action.status}`}
                        key={action.status}
                        type="button"
                        onClick={() => updateDeliveryStatus(order._id, action.status)}
                      >
                        {action.status === 'delivered' && <CheckCircle2 size={15} />}
                        {updating === `${order._id}-${action.status}` ? 'Saving...' : action.label}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
