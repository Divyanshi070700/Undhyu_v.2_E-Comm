import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import './App.css';

// Context for cart management
const CartContext = createContext();
const useCart = () => useContext(CartContext);

// API functions with Shopify integration
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const SHOPIFY_DOMAIN = 'j0dktb-z1.myshopify.com';
const SHOPIFY_STOREFRONT_TOKEN = 'dd4eafd22db73312b891b84875b87244';

// Shopify Storefront API
const shopifyAPI = {
  // GraphQL query to get products
  getProducts: async (first = 20, query = '') => {
    const graphqlQuery = `
      query getProducts($first: Int!, $query: String) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              handle
              title
              description
              vendor
              productType
              tags
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                    availableForSale
                    quantityAvailable
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { first, query }
        }),
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Shopify API errors:', data.errors);
        return [];
      }

      // Transform Shopify data to match our existing format
      return data.data.products.edges.map(({ node }) => ({
        id: node.id,
        handle: node.handle,
        name: node.title,
        description: node.description,
        vendor: node.vendor,
        category: node.productType || 'General',
        tags: node.tags,
        price: parseFloat(node.priceRange.minVariantPrice.amount),
        original_price: node.compareAtPriceRange.minVariantPrice ? 
          parseFloat(node.compareAtPriceRange.minVariantPrice.amount) : null,
        images: node.images.edges.map(img => img.node.url),
        variants: node.variants.edges.map(({ node: variant }) => ({
          id: variant.id,
          title: variant.title,
          price: parseFloat(variant.price.amount),
          compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice.amount) : null,
          availableForSale: variant.availableForSale,
          quantityAvailable: variant.quantityAvailable,
          selectedOptions: variant.selectedOptions
        })),
        // Additional fields for filtering
        occasion: node.tags.find(tag => ['wedding', 'party', 'casual', 'festive'].includes(tag.toLowerCase())) || '',
        material: node.tags.find(tag => ['silk', 'cotton', 'georgette', 'gold', 'silver'].includes(tag.toLowerCase())) || ''
      }));
    } catch (error) {
      console.error('Error fetching products from Shopify:', error);
      return [];
    }
  },

  // Get single product
  getProduct: async (handle) => {
    const graphqlQuery = `
      query getProduct($handle: String!) {
        productByHandle(handle: $handle) {
          id
          handle
          title
          description
          vendor
          productType
          tags
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 10) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 20) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                availableForSale
                quantityAvailable
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            name
            values
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { handle }
        }),
      });

      const data = await response.json();
      
      if (data.errors || !data.data.productByHandle) {
        console.error('Product not found or API error');
        return null;
      }

      const product = data.data.productByHandle;
      return {
        id: product.id,
        handle: product.handle,
        name: product.title,
        description: product.description,
        vendor: product.vendor,
        category: product.productType || 'General',
        tags: product.tags,
        price: parseFloat(product.priceRange.minVariantPrice.amount),
        original_price: product.compareAtPriceRange.minVariantPrice ? 
          parseFloat(product.compareAtPriceRange.minVariantPrice.amount) : null,
        images: product.images.edges.map(img => img.node.url),
        variants: product.variants.edges.map(({ node: variant }) => ({
          id: variant.id,
          title: variant.title,
          price: parseFloat(variant.price.amount),
          compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice.amount) : null,
          availableForSale: variant.availableForSale,
          quantityAvailable: variant.quantityAvailable,
          selectedOptions: variant.selectedOptions
        })),
        options: product.options,
        // Additional fields
        occasion: product.tags.find(tag => ['wedding', 'party', 'casual', 'festive'].includes(tag.toLowerCase())) || '',
        material: product.tags.find(tag => ['silk', 'cotton', 'georgette', 'gold', 'silver'].includes(tag.toLowerCase())) || ''
      };
    } catch (error) {
      console.error('Error fetching product from Shopify:', error);
      return null;
    }
  },

  // Create checkout
  createCheckout: async (lineItems) => {
    const graphqlQuery = `
      mutation checkoutCreate($input: CheckoutCreateInput!) {
        checkoutCreate(input: $input) {
          checkout {
            id
            webUrl
            lineItems(first: 50) {
              edges {
                node {
                  title
                  quantity
                }
              }
            }
            totalPrice {
              amount
              currencyCode
            }
          }
          checkoutUserErrors {
            field
            message
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: {
            input: {
              lineItems: lineItems
            }
          }
        }),
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Checkout creation errors:', data.errors);
        throw new Error('Failed to create checkout');
      }

      if (data.data.checkoutCreate.checkoutUserErrors.length > 0) {
        console.error('Checkout user errors:', data.data.checkoutCreate.checkoutUserErrors);
        throw new Error(data.data.checkoutCreate.checkoutUserErrors[0].message);
      }

      return data.data.checkoutCreate.checkout;
    } catch (error) {
      console.error('Error creating checkout:', error);
      throw error;
    }
  }
};

const api = {
  // Use Shopify for products
  getProducts: async (filters = {}) => {
    let query = '';
    
    // Build Shopify query based on filters
    if (filters.category && filters.category !== '') {
      query += `product_type:${filters.category} `;
    }
    
    if (filters.tag) {
      query += `tag:${filters.tag} `;
    }

    return await shopifyAPI.getProducts(50, query.trim());
  },
  
  getProduct: async (handle) => {
    return await shopifyAPI.getProduct(handle);
  },
  
  getCategories: async () => {
    // Return predefined categories for now
    return [
      { id: '1', name: 'Designer Sarees', handle: 'sarees' },
      { id: '2', name: 'Royal Lehengas', handle: 'lehengas' },
      { id: '3', name: 'Designer Kurtis', handle: 'kurtis' },
      { id: '4', name: 'Premium Jewelry', handle: 'jewelry' }
    ];
  },

  // Shopify checkout
  createCheckout: async (cartItems) => {
    const lineItems = cartItems.map(item => ({
      variantId: item.selectedVariant?.id || item.variants?.[0]?.id,
      quantity: item.quantity || 1
    }));

    return await shopifyAPI.createCheckout(lineItems);
  }
};

// Header Component (Koskii-inspired)
const Header = () => {
  const { cartCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Top banner */}
      <div className="bg-black text-white text-center py-2 text-sm">
        Free shipping on orders above ₹999 | COD Available
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-gray-900 tracking-wide">UNDHYU</h1>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Designer Collection</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-8">
            <Link to="/" className={`text-sm font-medium tracking-wide uppercase transition-colors ${location.pathname === '/' ? 'text-black border-b-2 border-black pb-1' : 'text-gray-600 hover:text-black'}`}>
              Home
            </Link>
            <Link to="/products" className={`text-sm font-medium tracking-wide uppercase transition-colors ${location.pathname === '/products' ? 'text-black border-b-2 border-black pb-1' : 'text-gray-600 hover:text-black'}`}>
              All Products
            </Link>
            <Link to="/products?category=sarees" className="text-sm font-medium text-gray-600 hover:text-black tracking-wide uppercase transition-colors">
              Sarees
            </Link>
            <Link to="/products?category=lehengas" className="text-sm font-medium text-gray-600 hover:text-black tracking-wide uppercase transition-colors">
              Lehengas
            </Link>
            <Link to="/products?category=kurtis" className="text-sm font-medium text-gray-600 hover:text-black tracking-wide uppercase transition-colors">
              Kurtis
            </Link>
            <Link to="/products?category=jewelry" className="text-sm font-medium text-gray-600 hover:text-black tracking-wide uppercase transition-colors">
              Jewelry
            </Link>
          </nav>

          {/* Search and Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="hidden md:flex items-center">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {/* Wishlist */}
            <button className="p-2 text-gray-600 hover:text-black transition-colors">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>

            {/* Cart */}
            <Link to="/cart" className="p-2 text-gray-600 hover:text-black transition-colors relative">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-black"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200">
            <div className="space-y-2">
              <Link to="/" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-black uppercase tracking-wide">Home</Link>
              <Link to="/products" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-black uppercase tracking-wide">All Products</Link>
              <Link to="/products?category=sarees" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-black uppercase tracking-wide">Sarees</Link>
              <Link to="/products?category=lehengas" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-black uppercase tracking-wide">Lehengas</Link>
              <Link to="/products?category=kurtis" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-black uppercase tracking-wide">Kurtis</Link>
              <Link to="/products?category=jewelry" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-black uppercase tracking-wide">Jewelry</Link>
            </div>
          </div>
        )}
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
      {/* Hero Section */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        {slides.map((slide, index) => (
          <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <div className="text-center text-white px-4 max-w-2xl">
                <h1 className="text-3xl md:text-5xl font-light mb-4 tracking-wide">{slide.title}</h1>
                <p className="text-lg md:text-xl mb-8 font-light">{slide.subtitle}</p>
                <button 
                  onClick={() => navigate('/products')}
                  className="bg-white text-black px-8 py-3 text-sm font-medium tracking-wider uppercase hover:bg-gray-100 transition-colors"
                >
                  {slide.cta}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Collections Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-4 tracking-wide">Our Collections</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Discover handcrafted elegance from artisans across India</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {collections.map((collection) => (
              <div key={collection.id} className="group cursor-pointer" onClick={() => navigate('/products')}>
                <div className="relative overflow-hidden bg-white">
                  <img src={collection.image} alt={collection.name} className="w-full h-48 md:h-64 object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent text-white">
                    <h3 className="text-sm md:text-lg font-medium mb-1">{collection.name}</h3>
                    <p className="text-xs md:text-sm text-gray-200">{collection.count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-4 tracking-wide">Featured Products</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Handpicked favorites from our latest collection</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {featuredProducts.map((product) => (
              <div key={product.id} className="group bg-white">
                <div className="relative overflow-hidden">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-48 md:h-80 object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    onClick={() => navigate(`/product/${product.id}`)}
                  />
                  {product.original_price > product.price && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 text-xs font-medium">
                      {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                    </div>
                  )}
                  <button className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="text-sm md:text-base font-medium text-gray-900 mb-2 line-clamp-1">{product.name}</h3>
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-sm md:text-base font-semibold text-gray-900">₹{product.price}</span>
                    {product.original_price > product.price && (
                      <span className="text-xs md:text-sm text-gray-500 line-through">₹{product.original_price}</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      addToCart(product);
                      alert('Added to cart!');
                    }}
                    className="w-full bg-black text-white py-2 text-xs md:text-sm font-medium tracking-wider uppercase hover:bg-gray-800 transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link 
              to="/products"
              className="inline-block bg-black text-white px-8 py-3 text-sm font-medium tracking-wider uppercase hover:bg-gray-800 transition-colors"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-6 tracking-wide">Crafted with Love, Delivered with Care</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                At Undhyu, we believe in preserving the rich heritage of Indian craftsmanship. Each piece in our collection 
                is carefully curated from skilled artisans across the country, bringing you authentic designs that tell a story 
                of tradition and elegance.
              </p>
              <p className="text-gray-600 mb-8 leading-relaxed">
                From the silk weavers of Banaras to the embroidery artists of Lucknow, we work directly with craftspeople 
                to ensure fair trade and premium quality.
              </p>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl md:text-3xl font-light text-gray-900 mb-2">500+</div>
                  <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Artisan Partners</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-light text-gray-900 mb-2">50,000+</div>
                  <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">Happy Customers</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-light text-gray-900 mb-2">25+</div>
                  <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">States Covered</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/flagged/photo-1570055349452-29232699cc63" 
                alt="Traditional craftsmanship"
                className="w-full h-96 object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Products Page with Modern UI
const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: 0,
    maxPrice: 10000,
    occasion: '',
    material: ''
  });
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const sampleProducts = [
    { id: '1', name: 'Elegant Silk Saree', price: 2499, original_price: 2999, images: ['https://images.unsplash.com/photo-1609748340041-f5d61e061ebc'], category: 'sarees', occasion: 'wedding', material: 'silk' },
    { id: '2', name: 'Royal Bridal Lehenga', price: 8999, original_price: 10999, images: ['https://images.unsplash.com/photo-1668371679302-a8ec781e876e'], category: 'lehengas', occasion: 'wedding', material: 'silk' },
    { id: '3', name: 'Designer Cotton Kurti', price: 1299, original_price: 1599, images: ['https://images.pexels.com/photos/1999895/pexels-photo-1999895.jpeg'], category: 'kurtis', occasion: 'casual', material: 'cotton' },
    { id: '4', name: 'Gold Traditional Earrings', price: 899, original_price: 1199, images: ['https://images.unsplash.com/photo-1671642883395-0ab89c3ac890'], category: 'jewelry', occasion: 'party', material: 'gold' },
    { id: '5', name: 'Casual Everyday Kurti', price: 799, original_price: 999, images: ['https://images.pexels.com/photos/1999895/pexels-photo-1999895.jpeg'], category: 'kurtis', occasion: 'casual', material: 'cotton' },
    { id: '6', name: 'Party Wear Georgette Lehenga', price: 6999, original_price: 8999, images: ['https://images.unsplash.com/photo-1668371679302-a8ec781e876e'], category: 'lehengas', occasion: 'party', material: 'georgette' },
    { id: '7', name: 'Festive Banarasi Saree', price: 3499, original_price: 4299, images: ['https://images.unsplash.com/photo-1609748340041-f5d61e061ebc'], category: 'sarees', occasion: 'festive', material: 'silk' },
    { id: '8', name: 'Silver Statement Necklace', price: 1599, original_price: 1999, images: ['https://images.unsplash.com/photo-1671642883395-0ab89c3ac890'], category: 'jewelry', occasion: 'party', material: 'silver' }
  ];

  useEffect(() => {
    setProducts(sampleProducts);
    // Get category from URL params
    const urlParams = new URLSearchParams(location.search);
    const category = urlParams.get('category');
    if (category) {
      setFilters(prev => ({ ...prev, category }));
    }
  }, [location.search]);

  const filteredProducts = products.filter(product => {
    return (!filters.category || product.category === filters.category) &&
           (product.price >= priceRange[0] && product.price <= priceRange[1]) &&
           (!filters.occasion || product.occasion === filters.occasion) &&
           (!filters.material || product.material === filters.material);
  });

  const handlePriceChange = (event) => {
    const value = parseInt(event.target.value);
    setPriceRange([value, priceRange[1]]);
  };

  const handleMaxPriceChange = (event) => {
    const value = parseInt(event.target.value);
    setPriceRange([priceRange[0], value]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light text-gray-900 tracking-wide">All Products</h1>
              <p className="text-gray-600 mt-1">{filteredProducts.length} products found</p>
            </div>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="lg:hidden flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 2v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
              <span>Filter</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Modern Filter Sidebar */}
          <div className={`lg:w-80 ${isFilterOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-2xl shadow-sm border p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                <button 
                  onClick={() => {
                    setFilters({ category: '', minPrice: 0, maxPrice: 10000, occasion: '', material: '' });
                    setPriceRange([0, 10000]);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Clear all
                </button>
              </div>
              
              {/* Categories - Radio Buttons */}
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wider">Category</h4>
                <div className="space-y-3">
                  {[
                    { value: '', label: 'All Categories' },
                    { value: 'sarees', label: 'Designer Sarees' },
                    { value: 'lehengas', label: 'Royal Lehengas' },
                    { value: 'kurtis', label: 'Designer Kurtis' },
                    { value: 'jewelry', label: 'Premium Jewelry' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="category"
                        value={option.value}
                        checked={filters.category === option.value}
                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                        className="h-4 w-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                      />
                      <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Slider */}
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wider">Price Range</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>₹{priceRange[0]}</span>
                    <span>₹{priceRange[1]}</span>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={priceRange[0]}
                      onChange={handlePriceChange}
                      className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                    />
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={priceRange[1]}
                      onChange={handleMaxPriceChange}
                      className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-4">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                      className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Min"
                    />
                    <span className="text-gray-500">—</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 10000])}
                      className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Max"
                    />
                  </div>
                </div>
              </div>

              {/* Occasion Filter */}
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wider">Occasion</h4>
                <div className="space-y-3">
                  {[
                    { value: '', label: 'All Occasions' },
                    { value: 'wedding', label: 'Wedding' },
                    { value: 'party', label: 'Party' },
                    { value: 'casual', label: 'Casual' },
                    { value: 'festive', label: 'Festive' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="occasion"
                        value={option.value}
                        checked={filters.occasion === option.value}
                        onChange={(e) => setFilters({...filters, occasion: e.target.value})}
                        className="h-4 w-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                      />
                      <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Material Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wider">Material</h4>
                <div className="space-y-3">
                  {[
                    { value: '', label: 'All Materials' },
                    { value: 'silk', label: 'Silk' },
                    { value: 'cotton', label: 'Cotton' },
                    { value: 'georgette', label: 'Georgette' },
                    { value: 'gold', label: 'Gold' },
                    { value: 'silver', label: 'Silver' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="material"
                        value={option.value}
                        checked={filters.material === option.value}
                        onChange={(e) => setFilters({...filters, material: e.target.value})}
                        className="h-4 w-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                      />
                      <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-5.5a2.5 2.5 0 00-2.5 2.5v0a2.5 2.5 0 00-2.5-2.5H4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="group bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="relative overflow-hidden">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                        onClick={() => navigate(`/product/${product.id}`)}
                      />
                      {product.original_price > product.price && (
                        <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 text-xs font-medium rounded-lg">
                          {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                        </div>
                      )}
                      <button className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                        {product.name}
                      </h3>
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-lg font-semibold text-gray-900">₹{product.price}</span>
                        {product.original_price > product.price && (
                          <span className="text-sm text-gray-500 line-through">₹{product.original_price}</span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          addToCart(product);
                          alert('Added to cart!');
                        }}
                        className="w-full bg-gray-900 text-white py-2.5 text-sm font-medium tracking-wide uppercase hover:bg-gray-800 transition-colors duration-200 rounded-lg"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
