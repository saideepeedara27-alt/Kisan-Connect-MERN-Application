import {
  AlertTriangle,
  BadgeCheck,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  ImagePlus,
  Package,
  Save,
  Truck,
  Trash2,
  XCircle
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, toAssetUrl } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import FormInput from '../components/FormInput.jsx';
import StatCard from '../components/StatCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyProduct = {
  name: '',
  category: '',
  description: '',
  price: '',
  unit: 'kg',
  stock: '',
  location: '',
  imageUrl: ''
};

const farmerStatusTransitions = {
  placed: ['confirmed', 'packed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['cancelled']
};
const categoryOptions = ['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Spices', 'Pulses', 'Leafy Greens'];

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

function getFarmerStatusOptions(status) {
  const nextStatuses = farmerStatusTransitions[status] || [];
  return [status, ...nextStatuses.filter((nextStatus) => nextStatus !== status)];
}

function canFarmerUpdateStatus(status) {
  return Object.hasOwn(farmerStatusTransitions, status);
}

export default function FarmerDashboard() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [subscriptionConfig, setSubscriptionConfig] = useState({ amount: 0, currency: 'INR' });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [imageFile, setImageFile] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isSubscribed = Boolean(subscription?.isActive);
  const verificationStatus = user?.farmerProfile?.verificationStatus || 'pending';
  const isVerified = verificationStatus === 'approved';

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const [subResponse, productResponse, orderResponse] = await Promise.all([
      api.get('/subscription'),
      api.get('/products/mine'),
      api.get('/orders/farmer')
    ]);

    setSubscription({
      ...subResponse.data.subscription,
      isActive: subResponse.data.isActive
    });
    setSubscriptionConfig(subResponse.data.config);
    setProducts(productResponse.data.products);
    setOrders(orderResponse.data.orders);
  }

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function activateSubscription() {
    setError('');

    if (!isVerified) {
      setError('Admin verification is required before activating subscription.');
      return;
    }

    const response = await api.post('/subscription/activate', {
      paymentReference: `mock-farmer-${Date.now()}`
    });
    setSubscription({
      ...response.data.subscription,
      isActive: response.data.isActive
    });
    setMessage('Subscription activated. You can list products now.');
  }

  function startEdit(product) {
    setEditingProductId(product._id);
    setImageFile(null);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price,
      unit: product.unit,
      stock: product.stock,
      location: product.location,
      imageUrl: product.imageUrl || ''
    });
    setMessage('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingProductId(null);
    setImageFile(null);
    setForm(emptyProduct);
  }

  async function saveProduct(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!isVerified) {
      setError('Admin verification is required before listing products.');
      return;
    }

    setSaving(true);

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));

      if (imageFile) {
        payload.append('image', imageFile);
      }

      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage('Product updated successfully.');
      } else {
        await api.post('/products', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage('Product listed successfully.');
      }

      cancelEdit();
      await loadDashboard();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(productId) {
    const confirmed = window.confirm('Delete this product? This cannot be undone.');

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/products/${productId}`);
      setProducts((current) => current.filter((product) => product._id !== productId));
      if (editingProductId === productId) {
        cancelEdit();
      }
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to delete product.');
    }
  }

  async function toggleProduct(product) {
    try {
      const response = await api.put(`/products/${product._id}`, {
        isActive: !product.isActive
      });
      setProducts((current) =>
        current.map((item) => (item._id === product._id ? response.data.product : item))
      );
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to update product visibility.');
    }
  }

  async function updateOrderStatus(orderId, itemId, status) {
    try {
      await api.patch(`/orders/${orderId}/items/${itemId}/status`, { status });
      await loadDashboard();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to update order status.');
    }
  }

  const stats = useMemo(() => {
    const stock = products.reduce((sum, product) => sum + product.stock, 0);
    const revenue = orders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.lineTotal, 0),
      0
    );

    return {
      products: products.length,
      stock,
      orders: orders.length,
      revenue
    };
  }, [products, orders]);
  const lowStockProducts = products.filter((product) => product.stock > 0 && product.stock <= 10);
  const outOfStockProducts = products.filter((product) => product.stock === 0);

  return (
    <section className="page-pad farmer-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Farmer desk</p>
          <h1>Products, subscription, and orders</h1>
        </div>
        <button className="secondary-button" disabled={!isVerified} onClick={activateSubscription}>
          <BadgeCheck size={18} />
          {isSubscribed ? 'Renew subscription' : 'Activate subscription'}
        </button>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className={`verification-banner ${isVerified ? 'approved' : 'pending'}`}>
        <div>
          <span className={isVerified ? 'status active' : 'status packed'}>
            {isVerified ? 'verified farmer' : 'verification under review'}
          </span>
          <h2>{user?.farmerProfile?.farmName || user?.name}</h2>
          <p>
            {isVerified
              ? 'Your verified badge is visible to customers on listed products.'
              : 'Your registration details were submitted. The badge will switch to verified after review.'}
          </p>
        </div>
        <BadgeCheck size={36} />
      </div>

      <div className="dashboard-grid">
        <StatCard label="Listed products" value={stats.products} />
        <StatCard label="Stock units" value={stats.stock} tone="green" />
        <StatCard label="Orders" value={stats.orders} tone="amber" />
        <StatCard
          label="Sales value"
          value={`${subscriptionConfig.currency} ${stats.revenue}`}
          tone="blue"
        />
      </div>

      <div className="subscription-strip">
        <div>
          <span className={isSubscribed ? 'status active' : 'status cancelled'}>
            {isSubscribed ? 'active' : 'inactive'}
          </span>
          <h2>
            Farmer subscription: {subscriptionConfig.currency} {subscriptionConfig.amount}/month
          </h2>
          {subscription?.currentPeriodEnd && (
            <p>Valid until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
          )}
        </div>
        <CircleDollarSign size={34} />
      </div>

      <div className="farmer-layout">
        <form className="product-form" onSubmit={saveProduct}>
          <div className="form-head">
            {editingProductId ? <Edit3 size={22} /> : <ImagePlus size={22} />}
            <h2>{editingProductId ? 'Edit product' : 'List product'}</h2>
          </div>
          <FormInput label="Product name" name="name" value={form.name} onChange={updateField} />
          <div className="two-column">
            <FormInput
              label="Category"
              name="category"
              value={form.category}
              onChange={updateField}
              list="product-categories"
            />
            <FormInput label="Unit" name="unit" value={form.unit} onChange={updateField} />
          </div>
          <datalist id="product-categories">
            {categoryOptions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <div className="two-column">
            <FormInput label="Price" name="price" type="number" value={form.price} onChange={updateField} />
            <FormInput label="Stock" name="stock" type="number" value={form.stock} onChange={updateField} />
          </div>
          <FormInput label="Location" name="location" value={form.location} onChange={updateField} />
          <label className="field">
            <span>Description</span>
            <textarea name="description" value={form.description} onChange={updateField} />
          </label>
          <label className="field">
            <span>Product image</span>
            <input
              key={editingProductId || 'new-product-image'}
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files[0])}
            />
          </label>
          <FormInput
            label="Image URL"
            name="imageUrl"
            value={form.imageUrl}
            onChange={updateField}
            placeholder="Optional if no file upload"
          />
          {!isVerified && (
            <div className="alert subtle">Admin verification is required before subscription and product listing.</div>
          )}
          <button className="primary-button wide" disabled={!isVerified || !isSubscribed || saving}>
            <Save size={18} />
            {saving ? 'Saving...' : editingProductId ? 'Update product' : 'Save product'}
          </button>
          {editingProductId && (
            <button className="secondary-button wide" type="button" onClick={cancelEdit}>
              <XCircle size={18} />
              Cancel edit
            </button>
          )}
        </form>

        <div className="panel-list">
          <div className="panel-title">
            <Boxes size={22} />
            <h2>Your products</h2>
          </div>
          {products.length === 0 ? (
            <EmptyState title="No products yet" message="Activate subscription and add your first product." />
          ) : (
            <div className="farmer-products">
              {products.map((product) => (
                <article className="farmer-product" key={product._id}>
                  {product.imageUrl ? (
                    <img src={toAssetUrl(product.imageUrl)} alt={product.name} />
                  ) : (
                    <div className="mini-product-fallback">
                      <Package size={24} />
                    </div>
                  )}
                  <div>
                    <h3>{product.name}</h3>
                    <p className="muted">
                      {subscriptionConfig.currency} {product.price}/{product.unit} - {product.stock} left
                    </p>
                    {product.stock <= 10 && product.stock > 0 && (
                      <span className="status low-stock">low stock</span>
                    )}
                    {product.stock === 0 && <span className="status cancelled">out of stock</span>}
                    <span className={product.isActive ? 'status active' : 'status cancelled'}>
                      {product.isActive ? 'active' : 'hidden'}
                    </span>
                  </div>
                  <div className="product-actions">
                    <button className="ghost-button" type="button" onClick={() => startEdit(product)}>
                      <Edit3 size={17} />
                      Edit
                    </button>
                    <button className="ghost-button" type="button" onClick={() => toggleProduct(product)}>
                      <CheckCircle2 size={17} />
                      {product.isActive ? 'Hide' : 'Show'}
                    </button>
                    <button className="icon-button danger" type="button" onClick={() => deleteProduct(product._id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="inventory-alerts">
          <div className="panel-title">
            <AlertTriangle size={22} />
            <h2>Inventory alerts</h2>
          </div>
          <div className="alert-grid">
            {lowStockProducts.map((product) => (
              <button className="inventory-alert" key={product._id} type="button" onClick={() => startEdit(product)}>
                <strong>{product.name}</strong>
                <span>
                  {product.stock} {product.unit} left
                </span>
              </button>
            ))}
            {outOfStockProducts.map((product) => (
              <button className="inventory-alert danger" key={product._id} type="button" onClick={() => startEdit(product)}>
                <strong>{product.name}</strong>
                <span>Out of stock</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="table-shell">
        <div className="panel-title">
          <CheckCircle2 size={22} />
          <h2>Customer orders</h2>
        </div>
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" message="Customer purchases will appear here." />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
	                <tr>
	                  <th>Customer</th>
	                  <th>Ordered</th>
	                  <th>Product</th>
	                  <th>Qty</th>
                  <th>Total</th>
                  <th>Delivery</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.flatMap((order) =>
                  order.items.map((item) => (
	                    <tr key={item._id}>
	                      <td>{order.customer?.name || 'Customer'}</td>
	                      <td>
	                        <span className="table-date">
	                          <CalendarClock size={15} />
	                          {formatOrderDateTime(order.createdAt)}
	                        </span>
	                      </td>
	                      <td>{item.name}</td>
                      <td>
                        {item.quantity} {item.unit}
                      </td>
                      <td>
                        {order.currency} {item.lineTotal}
                      </td>
                      <td>
                        {order.deliveryPartner?.name ? (
                          <div className="table-delivery">
                            <span>
                              <Truck size={15} />
                              {order.deliveryPartner.name}
                            </span>
                            <small>
                              {order.deliveryPartner.trackingCode} - {formatDeliveryStatus(order.deliveryPartner.status)}
                            </small>
                            <small>Area: {order.deliveryLocation || 'Not specified'}</small>
                          </div>
                        ) : (
                          <span className="muted">Assigning</span>
                        )}
                      </td>
                      <td>
                        {canFarmerUpdateStatus(item.status) ? (
                          <select
                            className="status-select"
                            value={item.status}
                            onChange={(event) => updateOrderStatus(order._id, item._id, event.target.value)}
                          >
                            {getFarmerStatusOptions(item.status).map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`status ${item.status}`}>{item.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
