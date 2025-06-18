import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';

// Context for cart management
const CartContext = createContext();

// Custom hooks
const useCart = () => useContext(CartContext);

// API functions
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const api = {
  // Product endpoints
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
  
  searchProducts: async (query) => {
    const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    return response.json();
  },

  // Guest checkout endpoint
  createGuestOrder: async (orderData) => {
    const response = await fetch(`${API_BASE}/api/guest/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    return response.json();
  }
};

// Components
const Header = () => {
  const { cartCount, toggleCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSearch = async (query) => {
    if (query.length > 2) {
      try {
        const results = await api.searchProducts(query);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
      }
    } else {
      setShowSearchResults(false);
    }
  };

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <h1 className="text-3xl font-bold text-pink-600">Undhyu</h1>
            <span className="ml-2 text-sm text-gray-500">Designer Collection</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#home" className="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md text-sm font-medium">Home</a>
            <a href="#collections" className="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md text-sm font-medium">Collections</a>
            <a href="#sarees" className="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md text-sm font-medium">Sarees</a>
            <a href="#lehengas" className="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md text-sm font-medium">Lehengas</a>
            <a href="#kurtis" className="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md text-sm font-medium">Kurtis</a>
            <a href="#jewelry" className="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md text-sm font-medium">Jewelry</a>
          </nav>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8 relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for sarees, lehengas, jewelry..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                {searchResults.map((product) => (
                  <div key={product.id} className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      {product.images && product.images[0] && (
                        <img src={product.images[0]} alt={product.name} className="w-12 h-12 object-cover rounded" />
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-500">₹{product.price}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart and Menu */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <button onClick={toggleCart} className="p-2 text-gray-600 hover:text-pink-600 relative">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13l2.5 2.5m6 0L19 12M17 21a2 2 0 100-4 2 2 0 000 4zm-8 0a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile menu button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-pink-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <a href="#home" className="block px-3 py-2 text-gray-700 hover:text-pink-600">Home</a>
            <a href="#collections" className="block px-3 py-2 text-gray-700 hover:text-pink-600">Collections</a>
            <a href="#sarees" className="block px-3 py-2 text-gray-700 hover:text-pink-600">Sarees</a>
            <a href="#lehengas" className="block px-3 py-2 text-gray-700 hover:text-pink-600">Lehengas</a>
            <a href="#kurtis" className="block px-3 py-2 text-gray-700 hover:text-pink-600">Kurtis</a>
            <a href="#jewelry" className="block px-3 py-2 text-gray-700 hover:text-pink-600">Jewelry</a>
          </div>
        )}
      </div>
    </header>
  );
};

const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
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
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1642956369651-ccc858c72de7",
      title: "Contemporary Kurtis",
      subtitle: "Modern comfort meets traditional style",
      cta: "Shop Kurtis"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img 
            src={slide.image} 
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">{slide.title}</h1>
              <p className="text-xl md:text-2xl mb-8">{slide.subtitle}</p>
              <button className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-full text-lg font-semibold transition-colors">
                {slide.cta}
              </button>
            </div>
          </div>
        </div>
      ))}
      
      {/* Carousel indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentSlide ? 'bg-white' : 'bg-white bg-opacity-50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const Collections = () => {
  const collections = [
    {
      id: 1,
      name: "Designer Sarees",
      description: "Handwoven silk and cotton sarees",
      image: "https://images.unsplash.com/photo-1609748340041-f5d61e061ebc",
      count: "500+ Designs"
    },
    {
      id: 2,
      name: "Royal Lehengas",
      description: "Bridal and party wear lehengas",
      image: "https://images.unsplash.com/photo-1668371679302-a8ec781e876e",
      count: "300+ Designs"
    },
    {
      id: 3,
      name: "Designer Kurtis",
      description: "Contemporary and traditional kurtis",
      image: "https://images.pexels.com/photos/1999895/pexels-photo-1999895.jpeg",
      count: "200+ Designs"
    },
    {
      id: 4,
      name: "Premium Jewelry",
      description: "Traditional and modern jewelry pieces",
      image: "https://images.unsplash.com/photo-1671642883395-0ab89c3ac890",
      count: "150+ Pieces"
    }
  ];

  return (
    <section id="collections" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Collections</h2>
          <p className="text-xl text-gray-600">Discover handcrafted elegance from artisans across India</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {collections.map((collection) => (
            <div key={collection.id} className="group cursor-pointer">
              <div className="relative overflow-hidden rounded-lg bg-white shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <img
                  src={collection.image}
                  alt={collection.name}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-xl font-semibold mb-2">{collection.name}</h3>
                  <p className="text-gray-200 text-sm mb-2">{collection.description}</p>
                  <p className="text-pink-300 font-medium">{collection.count}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FeaturedProducts = () => {
  const [products, setProducts] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await api.getProducts({ featured: true });
        setProducts(data.slice(0, 8));
      } catch (error) {
        console.error('Failed to fetch products:', error);
        // Set sample products for demo
        setProducts([
          {
            id: '1',
            name: 'Silk Designer Saree',
            price: 2499,
            original_price: 2999,
            images: ['https://images.unsplash.com/photo-1609748340041-f5d61e061ebc'],
            category: 'Designer Sarees'
          },
          {
            id: '2',
            name: 'Royal Wedding Lehenga',
            price: 8999,
            original_price: 10999,
            images: ['https://images.unsplash.com/photo-1668371679302-a8ec781e876e'],
            category: 'Royal Lehengas'
          },
          {
            id: '3',
            name: 'Contemporary Kurti',
            price: 1299,
            original_price: 1599,
            images: ['https://images.pexels.com/photos/1999895/pexels-photo-1999895.jpeg'],
            category: 'Designer Kurtis'
          },
          {
            id: '4',
            name: 'Traditional Earrings',
            price: 899,
            original_price: 1199,
            images: ['https://images.unsplash.com/photo-1671642883395-0ab89c3ac890'],
            category: 'Premium Jewelry'
          }
        ]);
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = (product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      quantity: 1
    });
    alert('Product added to cart!');
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Products</h2>
          <p className="text-xl text-gray-600">Handpicked favorites from our latest collection</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <div key={product.id} className="group">
              <div className="bg-white rounded-lg shadow-md overflow-hidden group-hover:shadow-lg transition-shadow duration-300">
                <div className="relative">
                  <img
                    src={product.images && product.images[0] ? product.images[0] : '/api/placeholder/300/400'}
                    alt={product.name}
                    className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.original_price && product.original_price > product.price && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                      {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-1">{product.category}</div>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">₹{product.price}</span>
                      {product.original_price && product.original_price > product.price && (
                        <span className="text-sm text-gray-500 line-through">₹{product.original_price}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="flex-1 bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 transition-colors duration-200 font-medium text-sm"
                    >
                      Add to Cart
                    </button>
                    <button className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors duration-200 font-medium text-sm">
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <button className="bg-pink-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-pink-700 transition-colors">
            View All Products
          </button>
        </div>
      </div>
    </section>
  );
};

const AboutSection = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-pink-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Crafted with Love, Delivered with Care</h2>
            <p className="text-lg text-gray-600 mb-6">
              At Undhyu, we believe in preserving the rich heritage of Indian craftsmanship. Each piece in our collection 
              is carefully curated from skilled artisans across the country, bringing you authentic designs that tell a story 
              of tradition and elegance.
            </p>
            <p className="text-lg text-gray-600 mb-8">
              From the silk weavers of Banaras to the embroidery artists of Lucknow, we work directly with craftspeople 
              to ensure fair trade and premium quality. Every saree, lehenga, kurti, and jewelry piece is a testament 
              to their artistry and our commitment to excellence.
            </p>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-pink-600 mb-2">500+</div>
                <div className="text-sm text-gray-600">Artisan Partners</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-pink-600 mb-2">50,000+</div>
                <div className="text-sm text-gray-600">Happy Customers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-pink-600 mb-2">25+</div>
                <div className="text-sm text-gray-600">States Covered</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <img 
              src="https://images.unsplash.com/flagged/photo-1570055349452-29232699cc63" 
              alt="Traditional craftsmanship"
              className="rounded-lg shadow-lg"
            />
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-lg shadow-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">100%</div>
                <div className="text-sm text-gray-600">Authentic Products</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SellWithUs = () => {
  return (
    <section className="py-16 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold mb-4">Partner With Us</h2>
        <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
          Are you an artisan or designer creating beautiful Indian fashion? Join our platform and reach customers worldwide. 
          We provide the platform, you bring the artistry.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="bg-pink-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Competitive Commissions</h3>
            <p className="text-gray-300">Earn attractive margins on every sale with our fair pricing structure.</p>
          </div>
          <div className="text-center">
            <div className="bg-pink-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Pan-India Reach</h3>
            <p className="text-gray-300">Access customers across India with our established logistics network.</p>
          </div>
          <div className="text-center">
            <div className="bg-pink-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Marketing Support</h3>
            <p className="text-gray-300">Benefit from our marketing campaigns and brand presence.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-full font-semibold transition-colors">
            Apply to Sell
          </button>
          <button className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-8 py-3 rounded-full font-semibold transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">Undhyu</h3>
            <p className="text-gray-400 mb-4">
              Bringing you authentic Indian fashion crafted by skilled artisans from across the country.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Collections</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">Designer Sarees</a></li>
              <li><a href="#" className="hover:text-white">Royal Lehengas</a></li>
              <li><a href="#" className="hover:text-white">Designer Kurtis</a></li>
              <li><a href="#" className="hover:text-white">Premium Jewelry</a></li>
              <li><a href="#" className="hover:text-white">New Arrivals</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Customer Care</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">Size Guide</a></li>
              <li><a href="#" className="hover:text-white">Shipping Info</a></li>
              <li><a href="#" className="hover:text-white">Returns & Exchange</a></li>
              <li><a href="#" className="hover:text-white">Track Your Order</a></li>
              <li><a href="#" className="hover:text-white">Care Instructions</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Need Help?</h4>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm mb-2">Call us</p>
                <p className="text-white font-medium">+91 98765 43210</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Email us</p>
                <p className="text-white font-medium">help@undhyu.com</p>
              </div>
              <div className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-center cursor-pointer transition-colors">
                <p className="font-semibold">Write to Us</p>
                <p className="text-sm">We're here to help!</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Undhyu. All rights reserved. | Privacy Policy | Terms of Service</p>
        </div>
      </div>
    </footer>
  );
};

const CartModal = ({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem }) => {
  const { cartCount } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (!isOpen) return null;

  if (showCheckout) {
    return <CheckoutModal cartItems={cartItems} total={total} onClose={() => { onClose(); setShowCheckout(false); }} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Shopping Cart ({cartCount})</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {cartItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Your cart is empty</p>
              <button 
                onClick={onClose}
                className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 border-b pb-4">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-gray-600">₹{item.price}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="bg-gray-200 px-2 py-1 rounded"
                      >
                        -
                      </button>
                      <span className="px-3">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="bg-gray-200 px-2 py-1 rounded"
                      >
                        +
                      </button>
                    </div>
                    <button 
                      onClick={() => onRemoveItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-bold">Total: ₹{total.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-pink-600 text-white py-3 rounded-lg hover:bg-pink-700 font-semibold"
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const CheckoutModal = ({ cartItems, total, onClose }) => {
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      // Create guest order
      const orderData = {
        customer_details: customerDetails,
        items: cartItems,
        total_amount: total,
        payment_method: 'razorpay'
      };
      
      const result = await api.createGuestOrder(orderData);
      alert('Order placed successfully! You will receive a confirmation email.');
      onClose();
    } catch (error) {
      console.error('Order creation failed:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Checkout</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-semibold mb-4">Customer Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
            <input
              type="text"
              placeholder="Address *"
              value={customerDetails.address}
              onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 md:col-span-2"
              required
            />
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

          <div className="border-t pt-4 mb-6">
            <h3 className="text-lg font-semibold mb-2">Order Summary</h3>
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name} x {item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 font-bold flex justify-between">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
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
    </div>
  );
};

// Main App Component
const App = () => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    setCartCount(cartItems.reduce((total, item) => total + item.quantity, 0));
  }, [cartItems]);

  const addToCart = (product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevItems, { ...product, quantity: 1 }];
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

  const toggleCart = () => {
    setShowCart(!showCart);
  };

  return (
    <CartContext.Provider value={{ cartItems, cartCount, addToCart, updateQuantity, removeFromCart, toggleCart }}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>
          <HeroCarousel />
          <Collections />
          <FeaturedProducts />
          <AboutSection />
          <SellWithUs />
        </main>
        <Footer />
        <CartModal 
          isOpen={showCart} 
          onClose={() => setShowCart(false)} 
          cartItems={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
        />
      </div>
    </CartContext.Provider>
  );
};

export default App;