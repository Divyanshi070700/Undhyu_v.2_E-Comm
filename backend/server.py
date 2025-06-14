from fastapi import FastAPI, HTTPException, Depends, status
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

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'undhyu_ecommerce')
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production')

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
    
    # TODO: Create Razorpay order here
    # order.razorpay_order_id = create_razorpay_order(total_amount)
    
    order_dict = order.dict()
    orders_collection.insert_one(order_dict)
    
    # Clear cart after order
    cart_collection.delete_many({"user_id": user["id"]})
    
    return {"message": "Order created successfully", "order_id": order.id, "total_amount": total_amount}

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