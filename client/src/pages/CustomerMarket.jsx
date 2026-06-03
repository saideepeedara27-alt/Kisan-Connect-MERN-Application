import {
  Apple,
  Carrot,
  ChevronLeft,
  ChevronRight,
  Filter,
  Leaf,
  Milk,
  Package,
  RefreshCcw,
  Search,
  ShoppingBasket,
  Sprout,
  Tags,
  Wheat,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, toAssetUrl } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const fallbackMarketCategories = ['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Spices', 'Pulses'];

const marketFooterSections = [
  {
    title: 'Customers',
    links: [
      { label: 'Browse market', to: '/market' },
      { label: 'Cart', to: '/cart' },
      { label: 'My orders', to: '/orders' }
    ]
  },
  {
    title: 'Partners',
    links: [
      { label: 'Farmer registration', to: '/register?role=farmer' },
      { label: 'Delivery partner', to: '/register?role=delivery' },
      { label: 'Login desk', to: '/login' }
    ]
  }
];

function getCategoryIcon(category = '') {
  const normalized = category.toLowerCase();

  if (normalized.includes('fruit')) return Apple;
  if (normalized.includes('vegetable')) return Carrot;
  if (normalized.includes('dairy')) return Milk;
  if (normalized.includes('grain')) return Wheat;
  if (normalized.includes('leaf')) return Leaf;

  return Sprout;
}

export default function CustomerMarket() {
  const [products, setProducts] = useState([]);
  const [config, setConfig] = useState({ currency: 'INR', customerPlatformFee: 0 });
  const [meta, setMeta] = useState({
    categories: [],
    categoryCounts: {},
    locations: [],
    priceRange: { minPrice: 0, maxPrice: 0, productCount: 0, totalStock: 0 }
  });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest'
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const { addItem, toggleSaved, isSaved } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    async function loadSetup() {
      const [configResponse, metaResponse] = await Promise.all([api.get('/config'), api.get('/products/meta')]);
      setConfig(configResponse.data);
      setMeta(metaResponse.data);
    }

    loadSetup().catch(() => setError('Unable to load market settings right now.'));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);

      try {
        const response = await api.get('/products', {
          params: { ...filters, page: pagination.page, limit: pagination.limit },
          signal: controller.signal
        });
        setProducts(response.data.products);
        setPagination(response.data.pagination);
        setError('');
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setError('Unable to load products right now.');
        }
      } finally {
        setLoading(false);
      }
    }

    const timer = window.setTimeout(loadProducts, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filters, pagination.page, pagination.limit]);

  function updateFilter(event) {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function selectCategory(category) {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters((current) => ({ ...current, category }));
  }

  function clearFilters() {
    setFilters({
      search: '',
      category: '',
      location: '',
      minPrice: '',
      maxPrice: '',
      sort: 'newest'
    });
    setPagination((current) => ({ ...current, page: 1 }));
  }

  function clearFilter(name) {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters((current) => ({
      ...current,
      [name]: name === 'sort' ? 'newest' : ''
    }));
  }

  function handleAdd(product) {
    addItem(product);
    setMessage(`${product.name} added to cart.`);
  }

  function handleSaved(product) {
    toggleSaved(product);
    setMessage(isSaved(product._id) ? `${product.name} removed from saved products.` : `${product.name} saved for later.`);
  }

  const activeFilterChips = [
    filters.search && { label: `Search: ${filters.search}`, name: 'search' },
    filters.category && { label: filters.category, name: 'category' },
    filters.location && { label: filters.location, name: 'location' },
    filters.minPrice && { label: `Min ${config.currency} ${filters.minPrice}`, name: 'minPrice' },
    filters.maxPrice && { label: `Max ${config.currency} ${filters.maxPrice}`, name: 'maxPrice' },
    filters.sort !== 'newest' && { label: filters.sort.replace(/([A-Z])/g, ' $1'), name: 'sort' }
  ].filter(Boolean);
  const marketFooterCategories = meta.categories.length ? meta.categories.slice(0, 8) : fallbackMarketCategories;

  return (
    <section className="page-pad market-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Customer market</p>
          <h1>Fresh products from listed farmers</h1>
        </div>
        <div className="heading-actions">
          <div className="fee-chip">
            <Tags size={17} />
            {meta.priceRange.productCount || 0} products
          </div>
          <div className="fee-chip">
            <ShoppingBasket size={17} />
            Fee: {config.currency} {config.customerPlatformFee}
          </div>
        </div>
      </div>

      <div className="category-strip" aria-label="Product categories">
        <button
          className={!filters.category ? 'active' : ''}
          type="button"
          onClick={() => selectCategory('')}
        >
          All <span>{meta.priceRange.productCount || 0}</span>
        </button>
        {meta.categories.map((category) => (
          (() => {
            const Icon = getCategoryIcon(category);
            return (
              <button
                className={filters.category === category ? 'active' : ''}
                key={category}
                type="button"
                onClick={() => selectCategory(category)}
              >
                <Icon size={15} />
                {category} <span>{meta.categoryCounts?.[category] || 0}</span>
              </button>
            );
          })()
        ))}
      </div>

      <div className="toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            name="search"
            placeholder="Search tomato, rice, spinach..."
            value={filters.search}
            onChange={updateFilter}
          />
        </label>
        <label className="select-box">
          <Filter size={18} />
          <select name="category" value={filters.category} onChange={updateFilter}>
            <option value="">All categories</option>
            {meta.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="select-box">
          <select name="location" value={filters.location} onChange={updateFilter}>
            <option value="">All locations</option>
            {meta.locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
        <input
          className="plain-input"
          name="minPrice"
          placeholder={`Min ${config.currency}`}
          type="number"
          value={filters.minPrice}
          onChange={updateFilter}
        />
        <input
          className="plain-input"
          name="maxPrice"
          placeholder={`Max ${config.currency}`}
          type="number"
          value={filters.maxPrice}
          onChange={updateFilter}
        />
        <label className="select-box">
          <select name="sort" value={filters.sort} onChange={updateFilter}>
            <option value="newest">Newest</option>
            <option value="priceLow">Price: low to high</option>
            <option value="priceHigh">Price: high to low</option>
            <option value="stockHigh">Highest stock</option>
          </select>
        </label>
        <button className="secondary-button compact toolbar-button" type="button" onClick={clearFilters}>
          <RefreshCcw size={16} />
          Reset
        </button>
      </div>

      <div className="market-summary">
        <span>
          Showing {products.length} of {pagination.total} matching products
        </span>
        <span>
          Total visible stock: {meta.priceRange.totalStock || 0} units
        </span>
      </div>

      {activeFilterChips.length > 0 && (
        <div className="filter-chip-row" aria-label="Active filters">
          {activeFilterChips.map((chip) => (
            <button key={chip.name} type="button" onClick={() => clearFilter(chip.name)}>
              {chip.label}
              <X size={14} />
            </button>
          ))}
          <button className="clear-all-chip" type="button" onClick={clearFilters}>
            Clear all
          </button>
        </div>
      )}

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}
      {!user && <div className="alert subtle">Login as a customer to checkout after adding products.</div>}

      {loading ? (
        <div className="loading-grid">
          <span />
          <span />
          <span />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          message="Try another search or check again after farmers list stock."
          action={
            <button className="secondary-button compact" type="button" onClick={clearFilters}>
              <RefreshCcw size={16} />
              Reset filters
            </button>
          }
        />
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              currency={config.currency}
              onAdd={handleAdd}
              onQuickView={setQuickViewProduct}
              onToggleSave={handleSaved}
              saved={isSaved(product._id)}
            />
          ))}
        </div>
      )}

      {quickViewProduct && (
        <div className="modal-backdrop" role="presentation" onClick={() => setQuickViewProduct(null)}>
          <article className="quick-view-modal" role="dialog" aria-modal="true" aria-label={quickViewProduct.name} onClick={(event) => event.stopPropagation()}>
            <button className="icon-button quick-view-close" type="button" onClick={() => setQuickViewProduct(null)} aria-label="Close quick view">
              <X size={18} />
            </button>
            <div className="quick-view-media">
              {quickViewProduct.imageUrl ? (
                <img src={toAssetUrl(quickViewProduct.imageUrl)} alt={quickViewProduct.name} />
              ) : (
                <div className="mini-product-fallback">
                  <Package size={30} />
                </div>
              )}
            </div>
            <div className="quick-view-copy">
              <p className="eyebrow">{quickViewProduct.category}</p>
              <h2>{quickViewProduct.name}</h2>
              <p>{quickViewProduct.description}</p>
              <div className="quick-view-stats">
                <span>
                  {config.currency} {quickViewProduct.price}/{quickViewProduct.unit}
                </span>
                <span>{quickViewProduct.stock} available</span>
                <span>{quickViewProduct.location}</span>
              </div>
              {quickViewProduct.farmer && (
                <div className="quick-view-farmer">
                  <strong>{quickViewProduct.farmer.farmerProfile?.farmName || quickViewProduct.farmer.name}</strong>
                  <span>{quickViewProduct.farmer.village || 'Farm location not listed'}</span>
                  {quickViewProduct.farmer.phone && <a href={`tel:${quickViewProduct.farmer.phone}`}>Call farmer</a>}
                </div>
              )}
              <div className="quick-view-actions">
                <button className="primary-button" type="button" onClick={() => handleAdd(quickViewProduct)}>
                  <ShoppingBasket size={17} />
                  Add to cart
                </button>
                <button className="secondary-button" type="button" onClick={() => handleSaved(quickViewProduct)}>
                  {isSaved(quickViewProduct._id) ? 'Saved' : 'Save for later'}
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      {!loading && pagination.pages > 1 && (
        <div className="pagination-bar">
          <button
            className="secondary-button compact"
            disabled={pagination.page <= 1}
            type="button"
            onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="secondary-button compact"
            disabled={pagination.page >= pagination.pages}
            type="button"
            onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <footer className="market-info-footer">
        <div className="market-footer-main">
          <div className="market-footer-brand">
            <strong>Kisan Connect Market</strong>
            <p>
              Fresh farm products, verified farmer listings, area-based delivery assignment, and customer support in one place.
            </p>
            <div className="market-footer-contact" aria-label="Market contact information">
              <span>Support: +91 88800 12345</span>
              <span>Email: support@kisanconnect.local</span>
            </div>
          </div>

          <nav className="market-footer-links" aria-label="Market footer navigation">
            {marketFooterSections.map((section) => (
              <div className="market-footer-column" key={section.title}>
                <h2>{section.title}</h2>
                {section.links.map((link) => (
                  <Link key={link.label} to={link.to}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="market-footer-column">
              <h2>Support</h2>
              <span>Order help</span>
              <span>Farmer verification</span>
              <span>Delivery updates</span>
            </div>
          </nav>
        </div>

        <div className="market-footer-categories" aria-label="Marketplace categories">
          <strong>Categories</strong>
          {marketFooterCategories.map((category) => (
            <button key={category} type="button" onClick={() => selectCategory(category)}>
              {category}
            </button>
          ))}
        </div>

        <div className="market-footer-bottom">
          <span>(c) 2026 Kisan Connect. All rights reserved.</span>
          <span>Terms and conditions | Privacy policy | Support policy</span>
        </div>
      </footer>
    </section>
  );
}
