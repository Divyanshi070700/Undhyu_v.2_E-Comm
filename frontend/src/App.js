import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  const SHOPIFY_DOMAIN = 'j0dktb-z1.myshopify.com';
  const STOREFRONT_ACCESS_TOKEN = 'eeae7a5247421a8b8a14711145ecd93b';
  const RAZORPAY_KEY_ID = 'rzp_live_NIogFPd28THyOF';
  const API_BASE_URL = 'https://undhyu-v-2.vercel.app/api';

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

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

  const fetchShopifyProducts = async () => {
    const query = `{
      products(first: 12) {
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
                  id
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
                  availableForSale
                }
              }
            }
            vendor
            productType
          }
        }
      }
    }`;

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

  useEffect(() => {
    fetchShopifyProducts();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    alert('Product added to cart!');
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => {
      const price = parseFloat(item.variants.edges[0]?.node.price.amount || 0);
      return total + (price * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const processPayment = async () => {
    const totalAmount = getTotalAmount();

    if (totalAmount === 0) {
      alert('Please add items to cart');
      return;
    }

    try {
      const orderResponse = await fetch(`${API_BASE_URL}/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(totalAmount * 100),
          currency: 'INR',
          cart: cart.map(item => ({
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            price: parseFloat(item.variants.edges[0]?.node.price.amount || 0),
            handle: item.handle
          }))
        }),
      });

      const responseText = await orderResponse.text();
      const orderData = JSON.parse(responseText);

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Undhyu.com',
        description: 'Authentic Indian Fashion',
        order_id: orderData.id,
        handler: async function(response) {
          setShowCart(false);
          alert('Processing payment... Please wait.');

          try {
            const verifyResponse = await fetch(`${API_BASE_URL}/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                cart: cart.map(item => ({
                  id: item.id,
                  title: item.title,
                  quantity: item.quantity,
                  price: parseFloat(item.variants.edges[0]?.node.price.amount || 0),
                  handle: item.handle
                }))
              }),
            });

            const result = await verifyResponse.json();
            if (result.success) {
              setCart([]);
              alert('🎉 Payment successful! Your order has been placed successfully. You will receive confirmation shortly.');
            } else {
              alert('❌ Payment verification failed. Please contact our support team with payment ID: ' + response.razorpay_payment_id);
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('❌ Payment verification failed. Please contact our support team with payment ID: ' + response.razorpay_payment_id);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#ea580c'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment cancelled');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to process payment. Please try again.');
    }
  };

  return <div>/* UI Components should be rendered here */</div>;
}

export default App;
