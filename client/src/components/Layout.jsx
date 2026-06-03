import {
  BadgeCheck,
  ClipboardList,
  LogOut,
  Menu,
  Package,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Tractor,
  Truck,
  UserRound,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toAssetUrl } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import SupportWidget from './SupportWidget.jsx';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getRoleLabel(user) {
  if (!user) return '';
  if (user.role === 'admin') return 'Admin';
  if (user.role === 'farmer') return 'Farmer';
  if (user.role === 'delivery') return 'Delivery Partner';
  return 'Customer';
}

function getVerificationLabel(user) {
  if (user?.role !== 'farmer') return null;
  const status = user.farmerProfile?.verificationStatus || 'pending';

  if (status === 'approved') return 'Verified farmer';
  if (status === 'rejected') return 'Verification rejected';
  return 'Verification pending';
}

function KisanConnectLogo() {
  return (
    <img className="brand-logo" src="/kisan-connect-favicon.svg" alt="" />
  );
}

export default function Layout() {
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { items, subtotal, totalItems, removeItem } = useCart();
  const navigate = useNavigate();
  const verificationLabel = getVerificationLabel(user);

  function handleLogout() {
    logout();
    setQuickMenuOpen(false);
    setAccountOpen(false);
    setCartOpen(false);
    navigate('/');
  }

  function closeMenus() {
    setQuickMenuOpen(false);
    setAccountOpen(false);
    setCartOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" onClick={closeMenus}>
          <span className="brand-mark" aria-hidden="true">
            <KisanConnectLogo />
          </span>
          <span>Kisan Connect</span>
        </Link>

        <div className="quick-menu-wrap">
          <button
            className={`icon-button menu-trigger ${quickMenuOpen ? 'active' : ''}`}
            onClick={() => {
              setQuickMenuOpen((open) => !open);
              setAccountOpen(false);
            }}
            aria-expanded={quickMenuOpen}
            aria-label="Open quick menu"
          >
            {quickMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {quickMenuOpen && (
            <div className="quick-menu-panel">
              <div className="quick-menu-head">
                <span className="account-avatar small">{getInitials(user?.name) || 'KC'}</span>
                <div>
                  <strong>{isAuthenticated ? user?.name : 'Kisan Connect'}</strong>
                  <small>{isAuthenticated ? getRoleLabel(user) : 'Farm marketplace'}</small>
                </div>
              </div>

              <div className="quick-menu-grid">
                <Link to="/market" onClick={closeMenus}>
                  <Store size={18} />
                  Market
                </Link>

                {user?.role === 'customer' && (
                  <>
                    <Link to="/cart" onClick={closeMenus}>
                      <ShoppingBasket size={18} />
                      Cart
                    </Link>
                    <Link to="/orders" onClick={closeMenus}>
                      <ClipboardList size={18} />
                      Orders
                    </Link>
                  </>
                )}

                {user?.role === 'farmer' && (
                  <Link to="/farmer" onClick={closeMenus}>
                    <Tractor size={18} />
                    Farmer Desk
                  </Link>
                )}

                {user?.role === 'admin' && (
                  <Link to="/admin" onClick={closeMenus}>
                    <ShieldCheck size={18} />
                    Verify Farmers
                  </Link>
                )}

                {user?.role === 'delivery' && (
                  <Link to="/delivery" onClick={closeMenus}>
                    <Truck size={18} />
                    Delivery Desk
                  </Link>
                )}

                {!isAuthenticated && (
                  <>
                    <Link to="/login" onClick={closeMenus}>
                      <UserRound size={18} />
                      Login
                    </Link>
                    <Link to="/register" onClick={closeMenus}>
                      <BadgeCheck size={18} />
                      Join
                    </Link>
                  </>
                )}

                {isAuthenticated && (
                  <button className="quick-menu-action" onClick={handleLogout}>
                    <LogOut size={18} />
                    Logout
                  </button>
                )}
              </div>

              {isAuthenticated && (
                <div className="quick-menu-user">
                  <span>
                    <strong>Email</strong>
                    {user?.email}
                  </span>
                  {user?.phone && (
                    <span>
                      <strong>Phone</strong>
                      {user.phone}
                    </span>
                  )}
                  {user?.village && (
                    <span>
                      <strong>Location</strong>
                      {user.village}
                    </span>
                  )}
                  {verificationLabel && (
                    <span>
                      <strong>Status</strong>
                      {verificationLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="nav-links">
          <NavLink to="/market" onClick={closeMenus}>
            <Store size={18} />
            Market
          </NavLink>

          {user?.role === 'customer' && (
            <>
	              <NavLink to="/cart" onClick={closeMenus}>
	                <ShoppingBasket size={18} />
	                Cart
	                {totalItems > 0 && <span className="pill">{totalItems}</span>}
	              </NavLink>
              <div className="cart-preview-wrap">
                <button
                  className={`icon-button cart-preview-trigger ${cartOpen ? 'active' : ''}`}
                  type="button"
                  onClick={() => {
                    setCartOpen((open) => !open);
                    setAccountOpen(false);
                    setQuickMenuOpen(false);
                  }}
                  aria-label="Preview cart"
                  aria-expanded={cartOpen}
                >
                  <ShoppingBasket size={18} />
                  {totalItems > 0 && <span className="pill">{totalItems}</span>}
                </button>
                {cartOpen && (
                  <div className="cart-preview-panel">
                    <div className="cart-preview-head">
                      <strong>Cart preview</strong>
                      <span>{totalItems} items</span>
                    </div>
                    {items.length === 0 ? (
                      <div className="cart-preview-empty">Your cart is empty.</div>
                    ) : (
                      <div className="cart-preview-list">
                        {items.slice(0, 3).map((item) => (
                          <div className="cart-preview-item" key={item._id}>
                            {item.imageUrl ? (
                              <img src={toAssetUrl(item.imageUrl)} alt={item.name} />
                            ) : (
                              <span className="cart-preview-fallback">
                                <Package size={16} />
                              </span>
                            )}
                            <div>
                              <strong>{item.name}</strong>
                              <span>
                                {item.quantity} x {item.price}
                              </span>
                            </div>
                            <button type="button" onClick={() => removeItem(item._id)} aria-label={`Remove ${item.name}`}>
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="cart-preview-total">
                      <span>Subtotal</span>
                      <strong>INR {subtotal}</strong>
                    </div>
                    <Link className="primary-button wide compact" to="/cart" onClick={closeMenus}>
                      Checkout
                    </Link>
                  </div>
                )}
              </div>
	              <NavLink to="/orders" onClick={closeMenus}>
	                Orders
	              </NavLink>
            </>
          )}

          {user?.role === 'farmer' && (
            <NavLink to="/farmer" onClick={closeMenus}>
              Farmer Desk
            </NavLink>
          )}

          {user?.role === 'admin' && (
            <NavLink to="/admin" onClick={closeMenus}>
              <ShieldCheck size={18} />
              Verify
            </NavLink>
          )}

          {user?.role === 'delivery' && (
            <NavLink to="/delivery" onClick={closeMenus}>
              <Truck size={18} />
              Delivery
            </NavLink>
          )}

          {isAuthenticated ? (
            <>
              <button
                className={`account-chip ${accountOpen ? 'active' : ''}`}
                onClick={() => {
                  setAccountOpen((open) => !open);
                  setQuickMenuOpen(false);
                }}
                aria-expanded={accountOpen}
                aria-label="Show logged in user details"
              >
                <span className="account-avatar">{getInitials(user?.name) || 'U'}</span>
                <span className="account-copy">
                  <strong>{user?.name}</strong>
                  <small>{getRoleLabel(user)}</small>
                </span>
              </button>

              {accountOpen && (
                <div className="account-popover">
                  <div className="account-popover-head">
                    <span className="account-avatar">{getInitials(user?.name) || 'U'}</span>
                    <div>
                      <strong>{user?.name}</strong>
                      <small>{getRoleLabel(user)}</small>
                    </div>
                  </div>
                  <span>
                    <strong>Email</strong>
                    {user?.email}
                  </span>
                  {user?.phone && (
                    <span>
                      <strong>Phone</strong>
                      {user.phone}
                    </span>
                  )}
                  {user?.village && (
                    <span>
                      <strong>Location</strong>
                      {user.village}
                    </span>
                  )}
                  {verificationLabel && (
                    <span>
                      <strong>Status</strong>
                      {verificationLabel}
                    </span>
                  )}
                </div>
              )}

              <button className="ghost-button" onClick={handleLogout}>
                <LogOut size={18} />
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={closeMenus}>
                <UserRound size={18} />
                Login
              </NavLink>
              <Link className="primary-button nav-cta" to="/register" onClick={closeMenus}>
                Join
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
      <SupportWidget />
    </div>
  );
}
