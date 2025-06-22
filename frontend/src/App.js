import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Shopify Storefront API configuration
  const SHOPIFY_DOMAIN = 'j0dktb-z1.myshopify.com';
  const STOREFRONT_ACCESS_TOKEN = 'eeae7a5247421a8b8a14711145ecd93b';

  // Beautiful Indian fashion hero images
  const heroImages = [
    {
      url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb",
      alt: "Vibrant red saree with traditional jewelry"
    },
    {
      url: "https://images.unsplash.com/photo-1571908599407-cdb918ed83bf", 
      alt: "Elegant cream ethnic outfit in boutique setting"
    },
    {
      url: "https://images.unsplash.com/photo-1619715613791-89d35b51ff81",
      alt: "Green traditional outfit with modern styling"
    }
  ];

  // Fetch products from Shopify
  const fetchShopifyProducts = async () => {
    const query = `
      {
        products(first: 8) {
          edges {
            node {
              id
              title
              handle
              description
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
              vendor
              productType
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN,
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      
      if (data.data && data.data.products) {
        setProducts(data.data.products.edges.map(edge => edge.node));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch collections from Shopify
  const fetchShopifyCollections = async () => {
    const query = `
      {
        collections(first: 6) {
          edges {
            node {
              id
              title
              handle
              description
              image {
                url
                altText
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN,
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      
      if (data.data && data.data.collections) {
        setCollections(data.data.collections.edges.map(edge => edge.node));
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  useEffect(() => {
    fetchShopifyProducts();
    fetchShopifyCollections();
  }, []);

  // Auto-rotate hero images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % heroImages.length
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const formatPrice = (price) => {
    if (!price) return '';
    return `₹${parseFloat(price.amount).toLocaleString('en-IN')}`;
  };

  const handleProductClick = (product) => {
    window.open(`https://${SHOPIFY_DOMAIN}/products/${product.handle}`, '_blank');
  };

  const ProductCard = ({ product }) => {
    const image = product.images.edges[0]?.node;
    const variant = product.variants.edges[0]?.node;
    const hasDiscount = variant?.compareAtPrice;

    return (
      <div 
        className="product-card group cursor-pointer bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
        onClick={() => handleProductClick(product)}
      >
        {image && (
          <div className="relative aspect-w-3 aspect-h-4 bg-gray-200">
            <img
              src={image.url}
              alt={image.altText || product.title}
              className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {hasDiscount && (
              <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                SALE
              </div>
            )}
          </div>
        )}
        
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-sm">
            {product.title}
          </h3>
          
          {variant && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold text-orange-600">
                {formatPrice(variant.price)}
              </span>
              {variant.compareAtPrice && (
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(variant.compareAtPrice)}
                </span>
              )}
            </div>
          )}
          
          <p className="text-xs text-gray-600 uppercase font-medium">{product.vendor || 'Undhyu'}</p>
          <p className="text-xs text-gray-500 mt-1">{product.productType}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Enhanced Header */}
      <header className="bg-white shadow-lg border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Undhyu<span className="text-orange-600">.</span>
              </h1>
              <span className="ml-2 text-sm text-gray-600 italic">Authentic Indian Fashion</span>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <a href="#home" className="text-gray-700 hover:text-orange-600 font-medium">Home</a>
              <a href="#products" className="text-gray-700 hover:text-orange-600 font-medium">Products</a>
              <a href="#collections" className="text-gray-700 hover:text-orange-600 font-medium">Collections</a>
              <a href="#about" className="text-gray-700 hover:text-orange-600 font-medium">About</a>
              <a href="#contact" className="text-gray-700 hover:text-orange-600 font-medium">Contact</a>
            </nav>

            <div className="flex items-center space-x-4">
              <a 
                href={`https://${SHOPIFY_DOMAIN}/search`} 
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-700 hover:text-orange-600"
              >
                🔍
              </a>
              <a 
                href={`https://${SHOPIFY_DOMAIN}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-orange-600 text-white px-6 py-2 rounded-full hover:bg-orange-700 font-semibold"
              >
                Shop Now
              </a>
            </div>
          </div>
        </div>
      </header>
      
      {/* Beautiful Hero Section */}
      <section id="home" className="relative h-96 md:h-[600px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImages[currentImageIndex].url}
            alt={heroImages[currentImageIndex].alt}
            className="w-full h-full object-cover transition-all duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent"></div>
        </div>
        
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <div className="max-w-2xl text-white">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                Undhyu<span className="text-orange-400">.</span>
              </h1>
              <p className="text-xl md:text-2xl mb-4 opacity-90">
                Explore Wide Range of Indian Sarees
              </p>
              <p className="text-lg mb-8 opacity-80">
                Traditional and ready-made साड़ी, perfect for weddings, festivals, parties and special occasions
              </p>
              <div className="flex gap-4">
                <a
                  href="#products"
                  className="bg-white text-black px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Shop Sarees
                </a>
                <a
                  href="#collections"
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-black transition-all"
                >
                  View Collections
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Image indicators */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentImageIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Featured Products Section */}
      <section id="products" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover our handpicked selection of authentic Indian fashion pieces
            </p>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading beautiful collections...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="text-center mt-12">
                <a
                  href={`https://${SHOPIFY_DOMAIN}/collections/all`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors shadow-lg"
                >
                  View All Products
                </a>
              </div>
            </>
          )}

          {products.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">👗</div>
              <h3 className="text-xl font-semibold mb-2">Products Coming Soon</h3>
              <p className="text-gray-600">We're adding beautiful collections to our store</p>
              <a
                href={`https://${SHOPIFY_DOMAIN}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700"
              >
                Visit Our Store
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Collections Section */}
      <section id="collections" className="py-16 bg-gradient-to-br from-orange-50 to-red-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Collections</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Browse by category to find exactly what you're looking for
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.map((collection) => (
              <div key={collection.id} className="group cursor-pointer">
                <a 
                  href={`https://${SHOPIFY_DOMAIN}/collections/${collection.handle}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <div className="relative overflow-hidden rounded-2xl shadow-lg bg-white">
                    {collection.image ? (
                      <img
                        src={collection.image.url}
                        alt={collection.image.altText || collection.title}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-orange-200 to-pink-200 flex items-center justify-center">
                        <span className="text-4xl">👗</span>
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 text-gray-900">{collection.title}</h3>
                      <p className="text-gray-600 text-sm">{collection.description || 'Explore this beautiful collection'}</p>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Crafted Across India</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Undhyu brings you authentic Indian fashion from the most celebrated regions, 
              where tradition meets contemporary elegance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🕌</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Banaras Silk</h3>
              <p className="text-gray-600">Timeless silk sarees woven with golden threads, representing centuries of craftsmanship from the holy city of Varanasi</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👑</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Jaipur Royalty</h3>
              <p className="text-gray-600">Regal lehengas and suits inspired by Rajasthani royal heritage, featuring intricate mirror work and vibrant colors</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Gujarat Artistry</h3>
              <p className="text-gray-600">Intricate bandhani work and traditional block prints showcasing Gujarat's rich textile heritage</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-6">Get in Touch</h2>
              <p className="text-gray-300 mb-6">
                Have questions about our products or need styling advice? 
                Our team is here to help you find the perfect outfit for any occasion.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center mr-3">📧</span>
                  <span>contact@undhyu.com</span>
                </div>
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center mr-3">📱</span>
                  <span>+91 98765 43210</span>
                </div>
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center mr-3">🌐</span>
                  <span>www.undhyu.com</span>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-6">Sell With Us</h2>
              <p className="text-gray-300 mb-6">
                Are you a craftsperson or designer? Join our platform to showcase 
                your authentic Indian fashion creations to customers worldwide.
              </p>
              
              <a 
                href={`https://${SHOPIFY_DOMAIN}/pages/contact`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full transition-colors font-semibold"
              >
                Become a Partner
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 border-t-2 border-orange-100">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-600">
          <p className="mb-2">&copy; 2025 Undhyu.com - Authentic Indian Fashion. All rights reserved.</p>
          <p className="text-sm">Bringing you the finest collection from Jaipur, Banaras, Gujarat and beyond</p>
        </div>
      </footer>
    </div>
  );
}


const handleRazorpayPayment = async () => {
  const response = await fetch("/api/create-razorpay-order", { method: "POST" });
  const order = await response.json();

  const options = {
    key: process.env.REACT_APP_RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: "INR",
    name: "Your Store",
    description: "Order Payment",
    order_id: order.id,
    handler: function (response) {
      // Send payment_id to backend for verification
      console.log("Payment successful:", response);
    },
    prefill: {
      name: "Customer",
      email: "customer@example.com",
      contact: "9999999999"
    }
  };

  const razorpay = new window.Razorpay(options);
  razorpay.open();
}



export default App;
