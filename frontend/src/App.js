import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import './App.css';

// Context for cart management
const CartContext = createContext();
const useCart = () => useContext(CartContext);

// API functions
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const api = {
  getProducts: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await fetch(`${API_BASE}/api/products?${queryParams}`);
    return response.json();
  },
  
  getProduct: async (id) => {
    const response = await fetch(`${API_BASE}/api/products/${id}`);
    return response.json();
  },
  
  getCategories: async () => {
    const response = await fetch(`${API_BASE}/api/categories`);
    return response.json();
  },

  adminLogin: async (email, password) => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },

  createProduct: async (productData, token) => {
    const response = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });
    return response.json();
  },

  createGuestOrder: async (orderData) => {
    const response = await fetch(`${API_BASE}/api/guest/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    return response.json();
  }
};

// Header Component
const Header = () => {
  const { cartCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex-shrink-0 flex items-center">
            <h1 className="text-3xl font-bold text-pink-600">Undhyu</h1>
            <span className="ml-2 text-sm text-gray-500">Designer Collection</span>
          </Link>

          <nav className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-700 hover:text-pink-600 px-3 py-2 text-sm font-medium">Home</Link>
            <Link to="/products" className="text-gray-700 hover:text-pink-600 px-3 py-2 text-sm font-medium">All Products</Link>
            <Link to="/products?category=sarees" className="text-gray-700 hover:text-pink-600 px-3 py-2 text-sm font-medium">Sarees</Link>
            <Link to="/products?category=lehengas" className="text-gray-700 hover:text-pink-600 px-3 py-2 text-sm font-medium">Lehengas</Link>
            <Link to="/products?category=kurtis" className="text-gray-700 hover:text-pink-600 px-3 py-2 text-sm font-medium">Kurtis</Link>
            <Link to="/products?category=jewelry" className="text-gray-700 hover:text-pink-600 px-3 py-2 text-sm font-medium">Jewelry</Link>
          </nav>

          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="hidden md:block w-64 pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            />

            <Link to="/cart" className="p-2 text-gray-600 hover:text-pink-600 relative">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13l2.5 2.5m6 0L19 12M17 21a2 2 0 100-4 2 2 0 000 4zm-8 0a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link to="/admin" className="text-gray-700 hover:text-pink-600 text-sm">Admin</Link>
          </div>
        </div>
      </div>
    </header>
  );
};

// Home Page
const HomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const slides = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1571587289339-cb7da03fb5a6",
      title: "Exquisite Designer Sarees",
      subtitle: "Handcrafted elegance from across India",
      cta: "Shop Sarees"
    },
    {
      id: 2,
      image: "https://images.pexels.com/photos/1139450/pexels-photo-1139450.jpeg",
      title: "Royal Lehengas",
      subtitle: "Perfect for your special occasions",
      cta: "Shop Lehengas"
    }
  ];

  const collections = [
    { id: 1, name: "Designer Sarees", image: "https://images.unsplash.com/photo-1609748340041-f5d61e061ebc", count: "500+ Designs" },
    { id: 2, name: "Royal Lehengas", image: "https://images.unsplash.com/photo-1668371679302-a8ec781e876e", count: "300+ Designs" },
    { id: 3, name: "Designer Kurtis", image: "https://images.pexels.com/photos/1999895/pexels-photo-1999895.jpeg", count: "200+ Designs" },
    { id: 4, name: "Premium Jewelry", image: "https://images.unsplash.com/photo-1671642883395-0ab89c3ac890", count: "150+ Pieces" }
  ];

  const featuredProducts = [
    { id: '1', name: 'Silk Designer Saree', price: 2499, original_price: 2999, images: ['https://images.unsplash.com/photo-1609748340041-f5d61e061ebc'], category: 'Designer Sarees' },
    { id: '2', name: 'Royal Wedding Lehenga', price: 8999, original_price: 10999, images: ['https://images.unsplash.com/photo-1668371679302-a8ec781e876e'], category: 'Royal Lehengas' },
    { id: '3', name: 'Contemporary Kurti', price: 1299, original_price: 1599, images: ['https://images.pexels.com/photos/1999895/pexels-photo-1999895.jpeg'], category: 'Designer Kurtis' },
    { id: '4', name: 'Traditional Earrings', price: 899, original_price: 1199, images: ['https://images.unsplash.com/photo-1671642883395-0ab89c3ac890'], category: 'Premium Jewelry' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div>
      {/* Hero Carousel */}
      <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        {slides.map((slide, index) => (
          <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="text-center text-white px-4">
                <h1 className="text-4xl md:text-6xl font-bold mb-4">{slide.title}</h1>
                <p className="text-xl md:text-2xl mb-8">{slide.subtitle}</p>
                <button 
                  onClick={() => navigate('/products')}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-full text-lg font-semibold transition-colors"
                >
                  {slide.cta}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Collections */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Collections</h2>
            <p className="text-xl text-gray-600">Discover handcrafted elegance from artisans across India</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {collections.map((collection) => (
              <div key={collection.id} className="group cursor-pointer" onClick={() => navigate('/products')}>
                <div className="relative overflow-hidden rounded-lg bg-white shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <img src={collection.image} alt={collection.name} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white bg-gradient-to-t from-black to-transparent">
                    <h3 className="text-xl font-semibold mb-2">{collection.name}</h3>
                    <p className="text-pink-300 font-medium">{collection.count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-xl text-gray-600">Handpicked favorites from our latest collection</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.map((product) => (
              <div key={product.id} className="group">
                <div className="bg-white rounded-lg shadow-md overflow-hidden group-hover:shadow-lg transition-shadow duration-300">
                  <div className="relative cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                    <img src={product.images[0]} alt={product.name} className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-300" />
                    {product.original_price > product.price && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                        {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-sm text-gray-500 mb-1">{product.category}</div>
                    <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-gray-900">₹{product.price}</span>
                        {product.original_price > product.price && (
                          <span className="text-sm text-gray-500 line-through">₹{product.original_price}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          addToCart(product);
                          alert('Added to cart!');
                        }}
                        className="flex-1 bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 transition-colors text-sm"
                      >
                        Add to Cart
                      </button>
                      <button 
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// Products Page with Filters
const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    occasion: '',
    material: ''
  });
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const sampleProducts = [
    { id: '1', name: 'Silk Designer Saree', price: 2499, original_price: 2999, images: ['https://images.unsplash.com/photo-1609748340041-f5d61e061ebc'], category: 'sarees', occasion: 'wedding', material: 'silk' },
    { id: '2', name: 'Royal Wedding Lehenga', price: 8999, original_price: 10999, images: ['https://images.unsplash.com/photo-1668371679302-a8ec781e876e'], category: 'lehengas', occasion: 'wedding', material: 'silk' },
    { id: '3', name: 'Contemporary Kurti', price: 1299, original_price: 1599, images: ['https://images.pexels.com/photos/1999895/pexels-photo-1999895.jpeg'], category: 'kurtis', occasion: 'casual', material: 'cotton' },
    { id: '4', name: 'Traditional Earrings', price: 899, original_price: 1199, images: ['https://images.unsplash.com/photo-1671642883395-0ab89c3ac890'], category: 'jewelry', occasion: 'party', material: 'gold' },
    { id: '5', name: 'Casual Cotton Kurti', price: 799, original_price: 999, images: ['https://images.pexels.com/photos/1999895/pexels-photo-1999895.jpeg'], category: 'kurtis', occasion: 'casual', material: 'cotton' },
    { id: '6', name: 'Party Wear Lehenga', price: 6999, original_price: 8999, images: ['https://images.unsplash.com/photo-1668371679302-a8ec781e876e'], category: 'lehengas', occasion: 'party', material: 'georgette' }
  ];

  useEffect(() => {
    setProducts(sampleProducts);
  }, []);

  const filteredProducts = products.filter(product => {
    return (!filters.category || product.category === filters.category) &&
           (!filters.minPrice || product.price >= parseInt(filters.minPrice)) &&
           (!filters.maxPrice || product.price <= parseInt(filters.maxPrice)) &&
           (!filters.occasion || product.occasion === filters.occasion) &&
           (!filters.material || product.material === filters.material);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Filters</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select 
                    value={filters.category} 
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Categories</option>
                    <option value="sarees">Sarees</option>
                    <option value="lehengas">Lehengas</option>
                    <option value="kurtis">Kurtis</option>
                    <option value="jewelry">Jewelry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={filters.minPrice}
                      onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                      className="w-1/2 p-2 border border-gray-300 rounded-lg" 
                    />
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                      className="w-1/2 p-2 border border-gray-300 rounded-lg" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Occasion</label>
                  <select 
                    value={filters.occasion} 
                    onChange={(e) => setFilters({...filters, occasion: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Occasions</option>
                    <option value="wedding">Wedding</option>
                    <option value="party">Party</option>
                    <option value="casual">Casual</option>
                    <option value="festive">Festive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                  <select 
                    value={filters.material} 
                    onChange={(e) => setFilters({...filters, material: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Materials</option>
                    <option value="silk">Silk</option>
                    <option value="cotton">Cotton</option>
                    <option value="georgette">Georgette</option>
                    <option value="gold">Gold</option>
                  </select>
                </div>

                <button 
                  onClick={() => setFilters({category: '', minPrice: '', maxPrice: '', occasion: '', material: ''})}
                  className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:w-3/4">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">All Products</h1>
              <p className="text-gray-600">Showing {filteredProducts.length} products</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                    <img src={product.images[0]} alt={product.name} className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300" />
                    {product.original_price > product.price && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                        {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-gray-900">₹{product.price}</span>
                        {product.original_price > product.price && (
                          <span className="text-sm text-gray-500 line-through">₹{product.original_price}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          addToCart(product);
                          alert('Added to cart!');
                        }}
                        className="flex-1 bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 transition-colors text-sm"
                      >
                        Add to Cart
                      </button>
                      <button 
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Single Product Page
const ProductPage = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    // Sample product data
    const sampleProduct = {
      id: id,
      name: 'Silk Designer Saree',
      price: 2499,
      original_price: 2999,
      images: [
        'https://images.unsplash.com/photo-1609748340041-f5d61e061ebc',
        'https://images.pexels.com/photos/1999895/pexels-photo-1999895.jpeg'
      ],
      description: 'Exquisite handwoven silk saree with intricate zari work. Perfect for weddings and special occasions.',
      category: 'Designer Sarees',
      sizes: ['Free Size'],
      colors: ['Red', 'Blue', 'Green'],
      material: 'Pure Silk',
      origin: 'Banaras, India',
      care: 'Dry clean only',
      stock: 10
    };
    setProduct(sampleProduct);
    setSelectedSize(sampleProduct.sizes[0]);
    setSelectedColor(sampleProduct.colors[0]);
  }, [id]);

  if (!product) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div>
            <div className="aspect-w-1 aspect-h-1 mb-4">
              <img src={product.images[0]} alt={product.name} className="w-full h-96 object-cover rounded-lg" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <img key={index} src={image} alt={`${product.name} ${index + 1}`} className="w-full h-20 object-cover rounded cursor-pointer" />
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
            <div className="flex items-center space-x-4 mb-6">
              <span className="text-3xl font-bold text-pink-600">₹{product.price}</span>
              {product.original_price > product.price && (
                <span className="text-xl text-gray-500 line-through">₹{product.original_price}</span>
              )}
              {product.original_price > product.price && (
                <span className="bg-red-500 text-white px-2 py-1 rounded text-sm">
                  {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                </span>
              )}
            </div>

            <p className="text-gray-600 mb-6">{product.description}</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                <div className="flex gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 border rounded-md ${selectedSize === size ? 'border-pink-600 bg-pink-50' : 'border-gray-300'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 border rounded-md ${selectedColor === color ? 'border-pink-600 bg-pink-50' : 'border-gray-300'}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1 border border-gray-300 rounded-md"
                  >
                    -
                  </button>
                  <span className="px-4 py-1 border border-gray-300 rounded-md">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-1 border border-gray-300 rounded-md"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mb-8">
              <button 
                onClick={() => {
                  addToCart({...product, selectedSize, selectedColor, quantity});
                  alert('Added to cart!');
                }}
                className="flex-1 bg-pink-600 text-white py-3 px-6 rounded-lg hover:bg-pink-700 font-semibold"
              >
                Add to Cart
              </button>
              <button 
                onClick={() => {
                  addToCart({...product, selectedSize, selectedColor, quantity});
                  navigate('/cart');
                }}
                className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 font-semibold"
              >
                Buy Now
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Material:</strong> {product.material}</p>
              <p><strong>Origin:</strong> {product.origin}</p>
              <p><strong>Care:</strong> {product.care}</p>
              <p><strong>Stock:</strong> {product.stock} pieces available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Cart Page
const CartPage = () => {
  const { cartItems, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-8">Add some beautiful products to your cart</p>
          <button 
            onClick={() => navigate('/products')}
            className="bg-pink-600 text-white px-8 py-3 rounded-lg hover:bg-pink-700 font-semibold"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 border-b pb-4 mb-4 last:border-b-0 last:mb-0">
                  <img src={item.images?.[0] || item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-gray-600">₹{item.price}</p>
                    {item.selectedSize && <p className="text-sm text-gray-500">Size: {item.selectedSize}</p>}
                    {item.selectedColor && <p className="text-sm text-gray-500">Color: {item.selectedColor}</p>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="bg-gray-200 px-2 py-1 rounded"
                    >
                      -
                    </button>
                    <span className="px-3">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="bg-gray-200 px-2 py-1 rounded"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
              <button 
                onClick={() => navigate('/checkout')}
                className="w-full bg-pink-600 text-white py-3 rounded-lg hover:bg-pink-700 font-semibold"
              >
                Proceed to Checkout
              </button>
              <button 
                onClick={() => navigate('/products')}
                className="w-full mt-2 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Checkout Page
const CheckoutPage = () => {
  const { cartItems } = useCart();
  const navigate = useNavigate();
  const [customerDetails, setCustomerDetails] = useState({
    name: '', email: '', phone: '', address: '', city: '', state: '', pincode: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      const orderData = {
        customer_details: customerDetails,
        items: cartItems,
        total_amount: total,
        payment_method: 'razorpay'
      };
      
      await api.createGuestOrder(orderData);
      alert('Order placed successfully! You will receive a confirmation email.');
      navigate('/');
    } catch (error) {
      console.error('Order creation failed:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={customerDetails.name}
                  onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  required
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={customerDetails.email}
                  onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number *"
                  value={customerDetails.phone}
                  onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Pincode *"
                  value={customerDetails.pincode}
                  onChange={(e) => setCustomerDetails({...customerDetails, pincode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Address *"
                value={customerDetails.address}
                onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={customerDetails.city}
                  onChange={(e) => setCustomerDetails({...customerDetails, city: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={customerDetails.state}
                  onChange={(e) => setCustomerDetails({...customerDetails, state: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-pink-600 text-white py-3 rounded-lg hover:bg-pink-700 disabled:opacity-50 font-semibold"
              >
                {isProcessing ? 'Processing...' : 'Place Order'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-3">
                  <img src={item.images?.[0] || item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Login Component
const AdminLogin = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ email: 'admin@undhyu.com', password: 'admin123' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.adminLogin(credentials.email, credentials.password);
      if (result.token) {
        localStorage.setItem('adminToken', result.token);
        onLogin(result.token);
      } else {
        alert('Invalid credentials');
      }
    } catch (error) {
      alert('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={credentials.email}
            onChange={(e) => setCredentials({...credentials, email: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={credentials.password}
            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = ({ token }) => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '', description: '', price: '', original_price: '', category: '', 
    sizes: '', colors: '', material: '', origin: '', stock: ''
  });

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        original_price: parseFloat(newProduct.original_price),
        stock: parseInt(newProduct.stock),
        sizes: newProduct.sizes.split(',').map(s => s.trim()),
        colors: newProduct.colors.split(',').map(c => c.trim()),
        images: ['https://images.unsplash.com/photo-1609748340041-f5d61e061ebc'], // Placeholder
        is_featured: true
      };
      
      await api.createProduct(productData, token);
      alert('Product added successfully!');
      setNewProduct({
        name: '', description: '', price: '', original_price: '', category: '', 
        sizes: '', colors: '', material: '', origin: '', stock: ''
      });
    } catch (error) {
      alert('Failed to add product');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <button 
            onClick={() => {
              localStorage.removeItem('adminToken');
              window.location.reload();
            }}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        <div className="flex space-x-4 mb-8">
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'products' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Products
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'orders' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Orders
          </button>
        </div>

        {activeTab === 'products' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Product</h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Designer Sarees">Designer Sarees</option>
                  <option value="Royal Lehengas">Royal Lehengas</option>
                  <option value="Designer Kurtis">Designer Kurtis</option>
                  <option value="Premium Jewelry">Premium Jewelry</option>
                </select>
                <input
                  type="number"
                  placeholder="Price"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="number"
                  placeholder="Original Price"
                  value={newProduct.original_price}
                  onChange={(e) => setNewProduct({...newProduct, original_price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Sizes (comma separated)"
                  value={newProduct.sizes}
                  onChange={(e) => setNewProduct({...newProduct, sizes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Colors (comma separated)"
                  value={newProduct.colors}
                  onChange={(e) => setNewProduct({...newProduct, colors: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Material"
                  value={newProduct.material}
                  onChange={(e) => setNewProduct({...newProduct, material: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Origin"
                  value={newProduct.origin}
                  onChange={(e) => setNewProduct({...newProduct, origin: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Stock Quantity"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <textarea
                placeholder="Product Description"
                value={newProduct.description}
                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
                required
              />
              <button
                type="submit"
                className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700"
              >
                Add Product
              </button>
            </form>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
            <p className="text-gray-500">Order management functionality coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Admin Page Component
const AdminPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (newToken) => {
    setToken(newToken);
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <AdminDashboard token={token} />;
};

// Footer Component
const Footer = () => (
  <footer className="bg-gray-900 text-white py-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-2xl font-bold mb-4">Undhyu</h3>
          <p className="text-gray-400 mb-4">Bringing you authentic Indian fashion crafted by skilled artisans.</p>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4">Collections</h4>
          <ul className="space-y-2 text-gray-400">
            <li><Link to="/products?category=sarees" className="hover:text-white">Designer Sarees</Link></li>
            <li><Link to="/products?category=lehengas" className="hover:text-white">Royal Lehengas</Link></li>
            <li><Link to="/products?category=kurtis" className="hover:text-white">Designer Kurtis</Link></li>
            <li><Link to="/products?category=jewelry" className="hover:text-white">Premium Jewelry</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4">Customer Care</h4>
          <ul className="space-y-2 text-gray-400">
            <li><a href="#" className="hover:text-white">Size Guide</a></li>
            <li><a href="#" className="hover:text-white">Shipping Info</a></li>
            <li><a href="#" className="hover:text-white">Returns</a></li>
            <li><a href="#" className="hover:text-white">Track Order</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4">Need Help?</h4>
          <div className="space-y-3">
            <p className="text-white font-medium">+91 98765 43210</p>
            <p className="text-white font-medium">help@undhyu.com</p>
            <div className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-center cursor-pointer transition-colors">
              <p className="font-semibold">Write to Us</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

// Main App Component
const App = () => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setCartCount(cartItems.reduce((total, item) => total + item.quantity, 0));
  }, [cartItems]);

  const addToCart = (product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => 
        item.id === product.id && 
        item.selectedSize === product.selectedSize && 
        item.selectedColor === product.selectedColor
      );
      if (existingItem) {
        return prevItems.map(item =>
          (item.id === product.id && 
           item.selectedSize === product.selectedSize && 
           item.selectedColor === product.selectedColor)
            ? { ...item, quantity: item.quantity + (product.quantity || 1) }
            : item
        );
      } else {
        return [...prevItems, { ...product, quantity: product.quantity || 1 }];
      }
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  return (
    <CartContext.Provider value={{ cartItems, cartCount, addToCart, updateQuantity, removeFromCart }}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </CartContext.Provider>
  );
};

export default App;