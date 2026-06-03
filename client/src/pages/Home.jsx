import { ArrowRight, BadgeCheck, ShoppingBag, Tractor, Truck } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const { user } = useAuth();

  if (user?.role === 'farmer') {
    return <Navigate to="/farmer" replace />;
  }

  if (user?.role === 'customer') {
    return <Navigate to="/market" replace />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (user?.role === 'delivery') {
    return <Navigate to="/delivery" replace />;
  }

  return (
    <section className="home-grid">
      <div className="home-panel hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Kisan Connect marketplace</p>
          <h1>Kisan Connect farm marketplace</h1>
          <p>
            Farmers activate a simple subscription, upload available stock, and receive customer
            orders. Customers browse by category, order, and get support when they need help.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/register?role=farmer">
              <Tractor size={18} />
              Farmer
            </Link>
            <Link className="secondary-button" to="/market">
              <ShoppingBag size={18} />
              Customer
            </Link>
            <Link className="secondary-button" to="/register?role=delivery">
              <Truck size={18} />
              Delivery
            </Link>
          </div>
        </div>
      </div>

      <div className="home-panel role-panel">
        <div className="role-card">
          <BadgeCheck size={26} />
          <h2>Farmer desk</h2>
          <p>Activate subscription, upload products, track stock, and manage customer orders.</p>
          <Link to="/register?role=farmer">
            Start listing
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="role-card accent">
          <ShoppingBag size={26} />
          <h2>Customer market</h2>
          <p>Search farm products, add to cart, and place paid orders with a small platform charge.</p>
          <Link to="/register?role=customer">
            Start buying
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="role-card">
          <Truck size={26} />
          <h2>Delivery partner</h2>
          <p>Connect with orders, update delivery status, and call customers from your delivery desk.</p>
          <Link to="/register?role=delivery">
            Start delivering
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
