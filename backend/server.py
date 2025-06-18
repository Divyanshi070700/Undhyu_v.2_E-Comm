from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pymongo import MongoClient
import os
import uuid
import jwt
import bcrypt
from bson import ObjectId
import json
import razorpay
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'undhyu_ecommerce')
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production')
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET')
SHIPROCKET_API_TOKEN = os.environ.get('SHIPROCKET_API_TOKEN')
SHIPROCKET_CHANNEL_ID = os.environ.get('SHIPROCKET_CHANNEL_ID')
SHIPROCKET_BASE_URL = os.environ.get('SHIPROCKET_BASE_URL', 'https://apiv2.shiprocket.in/v1/external')

# Initialize Razorpay client
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
else:
    razorpay_client = None

# MongoDB setup
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_collection = db.users
products_collection = db.products
orders_collection = db.orders
categories_collection = db.categories
cart_collection = db.cart

app = FastAPI(title="Undhyu E-commerce API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password: str
    name: str
    phone: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.now)

class UserLogin(BaseModel):
    email: str
    password: str

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    category: str
    subcategory: Optional[str] = None
    sizes: List[str] = []
    colors: List[str] = []
    images: List[str] = []  # Base64 encoded images
    stock: int = 0
    is_featured: bool = False
    is_bestseller: bool = False
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class CartItem(BaseModel):
    user_id: str
    product_id: str
    quantity: int
    size: Optional[str] = None
    color: Optional[str] = None

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[Dict[str, Any]]
    total_amount: float
    shipping_address: Dict[str, Any]
    payment_status: str = "pending"  # pending, paid, failed
    order_status: str = "placed"  # placed, confirmed, shipped, delivered, cancelled
    payment_method: str = "razorpay"
    razorpay_order_id: Optional[str] = None
    shiprocket_order_id: Optional[str] = None
    tracking_number: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    parent_category: Optional[str] = None
    is_active: bool = True

class PaymentOrder(BaseModel):
    amount: int  # Amount in paise (1 INR = 100 paise)
    currency: str = "INR"
    receipt: Optional[str] = None

class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class ShippingAddress(BaseModel):
    name: str
    phone: str
    address: str
    city: str
    state: str
    pincode: str
    country: str = "India"

class ShiprocketOrder(BaseModel):
    order_id: str
    order_date: str
    pickup_location: str = "Primary"
    billing_customer_name: str
    billing_last_name: str = ""
    billing_address: str
    billing_city: str
    billing_pincode: str
    billing_state: str
    billing_country: str = "India"
    billing_email: str
    billing_phone: str
    shipping_is_billing: bool = True
    order_items: List[Dict[str, Any]]
    payment_method: str = "Prepaid"
    sub_total: float
    length: int = 10
    breadth: int = 10
    height: int = 10
    weight: float = 0.5

# Utility functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, is_admin: bool = False) -> str:
    payload = {
        "user_id": user_id,
        "is_admin": is_admin,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_jwt_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    user = users_collection.find_one({"id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_admin_user(user = Depends(get_current_user)):
    if not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# Shiprocket utility functions
def create_shiprocket_order(order_data: dict, shipping_address: dict, order_items: list, total_amount: float):
    """Create an order in Shiprocket"""
    if not SHIPROCKET_API_TOKEN:
        return None
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SHIPROCKET_API_TOKEN}"
    }
    
    # Prepare order items for Shiprocket
    shiprocket_items = []
    for item in order_items:
        shiprocket_items.append({
            "name": item["product_name"],
            "sku": item["product_id"],
            "units": item["quantity"],
            "selling_price": item["price"]
        })
    
    # Prepare Shiprocket order payload
    shiprocket_payload = {
        "order_id": order_data["id"],
        "order_date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "pickup_location": "Primary",
        "channel_id": SHIPROCKET_CHANNEL_ID,
        "comment": "Order from Undhyu Fashion",
        "billing_customer_name": shipping_address.get("name", "Customer"),
        "billing_last_name": "",
        "billing_address": shipping_address.get("address", ""),
        "billing_city": shipping_address.get("city", ""),
        "billing_pincode": shipping_address.get("pincode", ""),
        "billing_state": shipping_address.get("state", ""),
        "billing_country": "India",
        "billing_email": shipping_address.get("email", "customer@undhyu.com"),
        "billing_phone": shipping_address.get("phone", ""),
        "shipping_is_billing": True,
        "order_items": shiprocket_items,
        "payment_method": "Prepaid",
        "shipping_charges": 0,
        "giftwrap_charges": 0,
        "transaction_charges": 0,
        "total_discount": 0,
        "sub_total": total_amount,
        "length": 15,
        "breadth": 10,
        "height": 5,
        "weight": 0.5
    }
    
    try:
        response = requests.post(
            f"{SHIPROCKET_BASE_URL}/orders/create/adhoc",
            json=shiprocket_payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return {
                "order_id": result.get("order_id"),
                "shipment_id": result.get("shipment_id"),
                "status": "success"
            }
        else:
            print(f"Shiprocket order creation failed: {response.status_code} - {response.text}")
            return {"status": "failed", "error": response.text}
            
    except Exception as e:
        print(f"Shiprocket API error: {e}")
        return {"status": "error", "error": str(e)}

def get_shiprocket_tracking(awb_code: str):
    """Get tracking information from Shiprocket"""
    if not SHIPROCKET_API_TOKEN or not awb_code:
        return None
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SHIPROCKET_API_TOKEN}"
    }
    
    try:
        response = requests.get(
            f"{SHIPROCKET_BASE_URL}/courier/track/awb/{awb_code}",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            return None
            
    except Exception as e:
        print(f"Shiprocket tracking error: {e}")
        return None

# Initialize default categories and products
@app.on_event("startup")
async def startup_event():
    # Create default categories
    default_categories = [
        {"id": str(uuid.uuid4()), "name": "Ethnic Wear", "description": "Traditional Indian clothing", "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Western Wear", "description": "Modern western clothing", "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Festive Wear", "description": "Special occasion outfits", "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Casual Wear", "description": "Everyday comfort clothing", "is_active": True}
    ]
    
    for category in default_categories:
        if not categories_collection.find_one({"name": category["name"]}):
            categories_collection.insert_one(category)
    
    # Create default admin user
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": "admin@undhyu.com",
        "password": hash_password("admin123"),
        "name": "Admin User",
        "is_admin": True,
        "created_at": datetime.now()
    }
    if not users_collection.find_one({"email": "admin@undhyu.com"}):
        users_collection.insert_one(admin_user)

# Auth endpoints
@app.post("/api/auth/register")
async def register(user: User):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user.password = hash_password(user.password)
    user_dict = user.dict()
    users_collection.insert_one(user_dict)
    
    token = create_jwt_token(user.id, user.is_admin)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "is_admin": user.is_admin}}

@app.post("/api/auth/login")
async def login(user_login: UserLogin):
    user = users_collection.find_one({"email": user_login.email})
    if not user or not verify_password(user_login.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["id"], user.get("is_admin", False))
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "is_admin": user.get("is_admin", False)}}

# Product endpoints
@app.get("/api/products")
async def get_products(category: Optional[str] = None, featured: Optional[bool] = None, bestseller: Optional[bool] = None):
    query = {}
    if category:
        query["category"] = category
    if featured is not None:
        query["is_featured"] = featured
    if bestseller is not None:
        query["is_bestseller"] = bestseller
    
    products = list(products_collection.find(query))
    for product in products:
        product.pop("_id", None)
    return products

@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    product = products_collection.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.pop("_id", None)
    return product

@app.post("/api/products")
async def create_product(product: Product, admin_user = Depends(get_admin_user)):
    product.updated_at = datetime.now()
    product_dict = product.dict()
    products_collection.insert_one(product_dict)
    return {"message": "Product created successfully", "product_id": product.id}

@app.put("/api/products/{product_id}")
async def update_product(product_id: str, product: Product, admin_user = Depends(get_admin_user)):
    product.updated_at = datetime.now()
    product_dict = product.dict()
    result = products_collection.update_one({"id": product_id}, {"$set": product_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product updated successfully"}

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, admin_user = Depends(get_admin_user)):
    result = products_collection.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

# Category endpoints
@app.get("/api/categories")
async def get_categories():
    categories = list(categories_collection.find({"is_active": True}))
    for category in categories:
        category.pop("_id", None)
    return categories

@app.post("/api/categories")
async def create_category(category: Category, admin_user = Depends(get_admin_user)):
    category_dict = category.dict()
    categories_collection.insert_one(category_dict)
    return {"message": "Category created successfully", "category_id": category.id}

# Cart endpoints
@app.get("/api/cart")
async def get_cart(user = Depends(get_current_user)):
    cart_items = list(cart_collection.find({"user_id": user["id"]}))
    cart_with_products = []
    
    for item in cart_items:
        product = products_collection.find_one({"id": item["product_id"]})
        if product:
            product.pop("_id", None)
            cart_with_products.append({
                "product": product,
                "quantity": item["quantity"],
                "size": item.get("size"),
                "color": item.get("color")
            })
    
    return cart_with_products

@app.post("/api/cart")
async def add_to_cart(cart_item: CartItem, user = Depends(get_current_user)):
    cart_item.user_id = user["id"]
    
    # Check if item already exists in cart
    existing_item = cart_collection.find_one({
        "user_id": cart_item.user_id,
        "product_id": cart_item.product_id,
        "size": cart_item.size,
        "color": cart_item.color
    })
    
    if existing_item:
        # Update quantity
        cart_collection.update_one(
            {"_id": existing_item["_id"]},
            {"$inc": {"quantity": cart_item.quantity}}
        )
    else:
        # Add new item
        cart_collection.insert_one(cart_item.dict())
    
    return {"message": "Item added to cart"}

@app.delete("/api/cart/{product_id}")
async def remove_from_cart(product_id: str, user = Depends(get_current_user)):
    result = cart_collection.delete_one({"user_id": user["id"], "product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    return {"message": "Item removed from cart"}

# Order endpoints
@app.get("/api/orders")
async def get_orders(user = Depends(get_current_user)):
    orders = list(orders_collection.find({"user_id": user["id"]}))
    for order in orders:
        order.pop("_id", None)
    return orders

@app.post("/api/orders")
async def create_order(order: Order, user = Depends(get_current_user)):
    order.user_id = user["id"]
    order.updated_at = datetime.now()
    
    # Calculate total from cart items
    cart_items = list(cart_collection.find({"user_id": user["id"]}))
    total_amount = 0
    order_items = []
    
    for cart_item in cart_items:
        product = products_collection.find_one({"id": cart_item["product_id"]})
        if product:
            item_total = product["price"] * cart_item["quantity"]
            total_amount += item_total
            order_items.append({
                "product_id": cart_item["product_id"],
                "product_name": product["name"],
                "price": product["price"],
                "quantity": cart_item["quantity"],
                "size": cart_item.get("size"),
                "color": cart_item.get("color")
            })
    
    order.items = order_items
    order.total_amount = total_amount
    
    # Create Razorpay order
    if razorpay_client:
        try:
            razorpay_order = razorpay_client.order.create({
                "amount": int(total_amount * 100),  # Convert to paise
                "currency": "INR",
                "receipt": f"order_{order.id}",
                "payment_capture": 1
            })
            order.razorpay_order_id = razorpay_order["id"]
        except Exception as e:
            print(f"Razorpay order creation failed: {e}")
            # Continue without Razorpay integration if it fails
    
    # Create Shiprocket order (after payment verification in real scenario)
    # For now, we'll create it immediately for demo purposes
    if order.shipping_address and SHIPROCKET_API_TOKEN:
        shiprocket_result = create_shiprocket_order(
            order.dict(),
            order.shipping_address,
            order_items,
            total_amount
        )
        if shiprocket_result and shiprocket_result.get("status") == "success":
            order.shiprocket_order_id = shiprocket_result.get("order_id")
            # In real scenario, AWB generation would happen after pickup
    
    order_dict = order.dict()
    orders_collection.insert_one(order_dict)
    
    # Clear cart after order
    cart_collection.delete_many({"user_id": user["id"]})
    
    return {
        "message": "Order created successfully", 
        "order_id": order.id, 
        "total_amount": total_amount,
        "razorpay_order_id": order.razorpay_order_id,
        "shiprocket_order_id": order.shiprocket_order_id
    }

# Razorpay payment endpoints
@app.post("/api/payment/create-order")
async def create_payment_order(payment_order: PaymentOrder, user = Depends(get_current_user)):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": payment_order.amount,
            "currency": payment_order.currency,
            "receipt": payment_order.receipt or f"order_{uuid.uuid4()}",
            "payment_capture": 1
        })
        
        return {
            "order_id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create payment order: {str(e)}")

@app.post("/api/payment/verify")
async def verify_payment(payment_verification: PaymentVerification, user = Depends(get_current_user)):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    try:
        # Verify payment signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': payment_verification.razorpay_order_id,
            'razorpay_payment_id': payment_verification.razorpay_payment_id,
            'razorpay_signature': payment_verification.razorpay_signature
        })
        
        # Update order status
        result = orders_collection.update_one(
            {"razorpay_order_id": payment_verification.razorpay_order_id},
            {"$set": {
                "payment_status": "paid",
                "razorpay_payment_id": payment_verification.razorpay_payment_id,
                "updated_at": datetime.now()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return {"message": "Payment verified successfully", "status": "success"}
        
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")

@app.post("/api/payment/webhook")
async def handle_payment_webhook(request: Request):
    try:
        # Get the raw body
        body = await request.body()
        signature = request.headers.get("X-Razorpay-Signature", "")
        
        # Verify webhook signature (if webhook secret is configured)
        # Note: You need to set RAZORPAY_WEBHOOK_SECRET in your environment
        webhook_secret = os.environ.get('RAZORPAY_WEBHOOK_SECRET')
        if webhook_secret:
            razorpay_client.utility.verify_webhook_signature(
                body.decode(),
                signature,
                webhook_secret
            )
        
        # Parse the webhook data
        event = json.loads(body.decode())
        
        # Handle different event types
        if event["event"] == "payment.captured":
            payment = event["payload"]["payment"]["entity"]
            order_id = payment["order_id"]
            
            # Update order status
            orders_collection.update_one(
                {"razorpay_order_id": order_id},
                {"$set": {
                    "payment_status": "paid",
                    "razorpay_payment_id": payment["id"],
                    "updated_at": datetime.now()
                }}
            )
            
        elif event["event"] == "payment.failed":
            payment = event["payload"]["payment"]["entity"]
            order_id = payment["order_id"]
            
            # Update order status
            orders_collection.update_one(
                {"razorpay_order_id": order_id},
                {"$set": {
                    "payment_status": "failed",
                    "updated_at": datetime.now()
                }}
            )
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"Webhook processing error: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

# Shiprocket shipping endpoints
@app.get("/api/shipping/track/{awb_code}")
async def track_shipment(awb_code: str):
    """Track shipment using AWB code"""
    tracking_data = get_shiprocket_tracking(awb_code)
    
    if tracking_data:
        return tracking_data
    else:
        raise HTTPException(status_code=404, detail="Tracking information not found")

@app.post("/api/shipping/create-order")
async def create_shipping_order(order_data: dict, user = Depends(get_current_user)):
    """Create a shipping order in Shiprocket"""
    if not SHIPROCKET_API_TOKEN:
        raise HTTPException(status_code=500, detail="Shiprocket not configured")
    
    # Get order details from database
    order = orders_collection.find_one({"id": order_data.get("order_id"), "user_id": user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create Shiprocket order
    shiprocket_result = create_shiprocket_order(
        order,
        order.get("shipping_address", {}),
        order.get("items", []),
        order.get("total_amount", 0)
    )
    
    if shiprocket_result and shiprocket_result.get("status") == "success":
        # Update order with Shiprocket details
        orders_collection.update_one(
            {"id": order_data.get("order_id")},
            {"$set": {
                "shiprocket_order_id": shiprocket_result.get("order_id"),
                "shipment_id": shiprocket_result.get("shipment_id"),
                "order_status": "confirmed",
                "updated_at": datetime.now()
            }}
        )
        
        return {
            "message": "Shipping order created successfully",
            "shiprocket_order_id": shiprocket_result.get("order_id"),
            "shipment_id": shiprocket_result.get("shipment_id")
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to create shipping order")

@app.get("/api/admin/shipping/orders")
async def get_shipping_orders(admin_user = Depends(get_admin_user)):
    """Get all orders with shipping information"""
    orders = list(orders_collection.find({"shiprocket_order_id": {"$exists": True}}))
    
    for order in orders:
        order.pop("_id", None)
        # Add tracking information if AWB exists
        if order.get("tracking_number"):
            tracking_data = get_shiprocket_tracking(order["tracking_number"])
            if tracking_data:
                order["tracking_status"] = tracking_data.get("tracking_data", {}).get("shipment_status")
    
    return orders

@app.put("/api/admin/shipping/orders/{order_id}/ship")
async def ship_order(order_id: str, admin_user = Depends(get_admin_user)):
    """Mark order as shipped and update tracking"""
    order = orders_collection.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update order status
    result = orders_collection.update_one(
        {"id": order_id},
        {"$set": {
            "order_status": "shipped",
            "updated_at": datetime.now()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order marked as shipped"}

@app.get("/api/orders/{order_id}/track")
async def get_order_tracking(order_id: str, user = Depends(get_current_user)):
    """Get tracking information for a specific order"""
    order = orders_collection.find_one({"id": order_id, "user_id": user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    tracking_info = {
        "order_id": order_id,
        "order_status": order.get("order_status", "placed"),
        "payment_status": order.get("payment_status", "pending"),
        "shiprocket_order_id": order.get("shiprocket_order_id"),
        "tracking_number": order.get("tracking_number"),
        "tracking_url": f"https://shiprocket.in/tracking/{order.get('tracking_number')}" if order.get("tracking_number") else None
    }
    
    # Get detailed tracking if AWB exists
    if order.get("tracking_number"):
        tracking_data = get_shiprocket_tracking(order["tracking_number"])
        if tracking_data:
            tracking_info["tracking_details"] = tracking_data.get("tracking_data", {})
    
    return tracking_info

# Guest checkout endpoints (no authentication required)
@app.post("/api/guest/orders")
async def create_guest_order(order_data: dict):
    """Create order for guest users without authentication"""
    try:
        order_id = str(uuid.uuid4())
        current_time = datetime.now()
        
        # Create order document
        guest_order = {
            "id": order_id,
            "customer_details": order_data.get("customer_details", {}),
            "items": order_data.get("items", []),
            "total_amount": order_data.get("total_amount", 0),
            "payment_method": order_data.get("payment_method", "razorpay"),
            "payment_status": "pending",
            "order_status": "placed",
            "is_guest": True,
            "created_at": current_time,
            "updated_at": current_time
        }
        
        # Create Razorpay order if configured
        if razorpay_client and guest_order["total_amount"] > 0:
            try:
                razorpay_order = razorpay_client.order.create({
                    "amount": int(guest_order["total_amount"] * 100),  # Convert to paise
                    "currency": "INR",
                    "receipt": f"guest_order_{order_id}",
                    "payment_capture": 1
                })
                guest_order["razorpay_order_id"] = razorpay_order["id"]
            except Exception as e:
                print(f"Razorpay order creation failed for guest: {e}")
        
        # Create Shiprocket order if configured
        if SHIPROCKET_API_TOKEN and guest_order["customer_details"]:
            shiprocket_result = create_shiprocket_order(
                guest_order,
                guest_order["customer_details"],
                guest_order["items"],
                guest_order["total_amount"]
            )
            if shiprocket_result and shiprocket_result.get("status") == "success":
                guest_order["shiprocket_order_id"] = shiprocket_result.get("order_id")
        
        # Save to database
        orders_collection.insert_one(guest_order)
        
        return {
            "message": "Guest order created successfully",
            "order_id": order_id,
            "total_amount": guest_order["total_amount"],
            "razorpay_order_id": guest_order.get("razorpay_order_id"),
            "shiprocket_order_id": guest_order.get("shiprocket_order_id")
        }
        
    except Exception as e:
        print(f"Guest order creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create guest order")

@app.get("/api/guest/track/{order_id}")
async def track_guest_order(order_id: str):
    """Track guest order using order ID"""
    order = orders_collection.find_one({"id": order_id, "is_guest": True})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.pop("_id", None)
    return {
        "order_id": order_id,
        "order_status": order.get("order_status", "placed"),
        "payment_status": order.get("payment_status", "pending"),
        "total_amount": order.get("total_amount", 0),
        "items": order.get("items", []),
        "tracking_number": order.get("tracking_number"),
        "estimated_delivery": "3-5 business days"
    }

@app.get("/api/admin/orders")
async def get_all_orders(admin_user = Depends(get_admin_user)):
    orders = list(orders_collection.find({}))
    for order in orders:
        order.pop("_id", None)
    return orders

@app.put("/api/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status_data: Dict[str, str], admin_user = Depends(get_admin_user)):
    new_status = status_data.get("order_status")
    if new_status not in ["placed", "confirmed", "shipped", "delivered", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid order status")
    
    result = orders_collection.update_one(
        {"id": order_id},
        {"$set": {"order_status": new_status, "updated_at": datetime.now()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated successfully"}

# Dashboard endpoints
@app.get("/api/admin/dashboard")
async def get_dashboard_stats(admin_user = Depends(get_admin_user)):
    total_products = products_collection.count_documents({})
    total_orders = orders_collection.count_documents({})
    total_users = users_collection.count_documents({"is_admin": False})
    
    # Recent orders
    recent_orders = list(orders_collection.find({}).sort("created_at", -1).limit(5))
    for order in recent_orders:
        order.pop("_id", None)
    
    return {
        "total_products": total_products,
        "total_orders": total_orders,
        "total_users": total_users,
        "recent_orders": recent_orders
    }

@app.get("/api/search")
async def search_products(q: str):
    products = list(products_collection.find({
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}}
        ]
    }))
    
    for product in products:
        product.pop("_id", None)
    
    return products

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)