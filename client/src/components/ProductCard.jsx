import {
  Apple,
  BadgeCheck,
  Boxes,
  Carrot,
  Clock3,
  Eye,
  Heart,
  Leaf,
  MapPin,
  Milk,
  Phone,
  Plus,
  Sprout,
  Star,
  UserRound,
  Wheat
} from 'lucide-react';
import { toAssetUrl } from '../api/client.js';

function getCategoryIcon(category = '') {
  const normalized = category.toLowerCase();

  if (normalized.includes('fruit')) return Apple;
  if (normalized.includes('vegetable')) return Carrot;
  if (normalized.includes('dairy')) return Milk;
  if (normalized.includes('grain')) return Wheat;
  if (normalized.includes('leaf')) return Leaf;

  return Sprout;
}

function getCategoryTone(category = '') {
  const normalized = category.toLowerCase();

  if (normalized.includes('fruit')) return 'fruit';
  if (normalized.includes('vegetable')) return 'vegetable';
  if (normalized.includes('dairy')) return 'dairy';
  if (normalized.includes('grain')) return 'grain';
  if (normalized.includes('spice')) return 'spice';
  if (normalized.includes('pulse')) return 'pulse';
  if (normalized.includes('leaf')) return 'leafy';

  return 'default';
}

export default function ProductCard({ product, currency, onAdd, onQuickView, onToggleSave, saved = false }) {
  const Icon = getCategoryIcon(product.category);
  const tone = getCategoryTone(product.category);
  const verificationStatus = product.farmer?.farmerProfile?.verificationStatus;
  const isVerified = verificationStatus === 'approved';
  const farmName = product.farmer?.farmerProfile?.farmName || product.farmer?.name;
  const ratingAverage = product.farmer?.farmerProfile?.ratingAverage || 0;
  const ratingCount = product.farmer?.farmerProfile?.ratingCount || 0;

  return (
    <article className="product-card">
      <div className="product-media">
        {product.imageUrl ? (
          <img src={toAssetUrl(product.imageUrl)} alt={product.name} />
        ) : (
          <div className={`product-fallback ${tone}`}>
            <Icon size={44} />
            <span>{product.category}</span>
          </div>
        )}
        <span className="product-category-pill">
          <Icon size={14} />
          {product.category}
        </span>
        <div className="product-media-actions">
          <button type="button" onClick={() => onQuickView(product)} aria-label={`Quick view ${product.name}`}>
            <Eye size={16} />
          </button>
          <button
            className={saved ? 'saved' : ''}
            type="button"
            onClick={() => onToggleSave(product)}
            aria-label={saved ? `Remove ${product.name} from saved products` : `Save ${product.name}`}
          >
            <Heart size={16} />
          </button>
        </div>
      </div>
      <div className="product-body">
        <div>
          <h3>{product.name}</h3>
          <p className="muted">{product.description}</p>
        </div>
        <div className="product-price-row">
          <strong>
            {currency} {product.price}
            <span>/{product.unit}</span>
          </strong>
          <span className={product.stock <= 10 ? 'stock-chip low' : 'stock-chip'}>
            <Boxes size={14} />
            {product.stock} left
          </span>
        </div>
        <div className="product-footer">
          <span className="location">
            <MapPin size={15} />
            {product.location}
          </span>
          <button className="primary-button compact product-add-button" onClick={() => onAdd(product)}>
            <Plus size={17} />
            Add
          </button>
        </div>
        {product.farmer && (
          <div className="seller-row">
            <span>
              <UserRound size={15} />
              {farmName}
            </span>
            <span className={`seller-badge ${isVerified ? 'verified' : 'pending'}`}>
              {isVerified ? <BadgeCheck size={14} /> : <Clock3 size={14} />}
              {isVerified ? 'Verified' : 'Reviewing'}
            </span>
            <span className="rating-chip">
              <Star size={14} />
              {ratingCount > 0 ? `${ratingAverage.toFixed(1)} (${ratingCount})` : 'New farm'}
            </span>
            {product.farmer.phone && (
              <a className="icon-button mini" href={`tel:${product.farmer.phone}`} aria-label={`Call ${product.farmer.name}`}>
                <Phone size={15} />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
