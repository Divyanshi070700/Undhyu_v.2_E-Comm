from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import httpx
from pydantic_settings import BaseSettings
import razorpay
import hmac
import hashlib
import json


# Add these imports at the top if not already there
import razorpay
import hmac
import hashlib

# Add this after your existing settings
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

# Add these models after your existing models
class CartItem(BaseModel):
    id: str
    title: str
    quantity: int
    price: float
    handle: str

class CreateOrderRequest(BaseModel):
    amount: int  # Amount in paise
    currency: str = "INR"
    cart: List[CartItem]

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    cart: List[CartItem]

# Add these endpoints after your existing endpoints
@api_router.post("/create-razorpay-order")
async def create_razorpay_order(request: CreateOrderRequest):
    """Create Razorpay order for payment"""
    try:
        # Create order in Razorpay
        order_data = {
            "amount": request.amount,
            "currency": request.currency,
            "receipt": f"order_{uuid.uuid4()}",
            "payment_capture": 1
        }
        
        razorpay_order = razorpay_client.order.create(data=order_data)
        
        # Store order in database
        if db:
            order_record = {
                "razorpay_order_id": razorpay_order["id"],
                "amount": request.amount,
                "currency": request.currency,
                "cart": [item.dict() for item in request.cart],
                "status": "created",
                "created_at": datetime.utcnow()
            }
            await db.orders.insert_one(order_record)
        
        return {
            "id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "status": razorpay_order["status"]
        }
        
    except Exception as e:
        print(f"Razorpay order creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

@api_router.post("/verify-payment")
async def verify_payment(request: VerifyPaymentRequest):
    """Verify Razorpay payment and process order"""
    try:
        # Verify payment signature
        signature = request.razorpay_signature
        order_id = request.razorpay_order_id
        payment_id = request.razorpay_payment_id
        
        # Create signature for verification
        message = f"{order_id}|{payment_id}"
        generated_signature = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, generated_signature):
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Get payment details from Razorpay
        payment = razorpay_client.payment.fetch(payment_id)
        
        if payment["status"] != "captured":
            raise HTTPException(status_code=400, detail="Payment not captured")
        
        # Update order status in database
        if db:
            await db.orders.update_one(
                {"razorpay_order_id": order_id},
                {
                    "$set": {
                        "razorpay_payment_id": payment_id,
                        "status": "paid",
                        "paid_at": datetime.utcnow(),
                        "payment_details": payment
                    }
                }
            )
        
        return {
            "success": True,
            "payment_id": payment_id,
            "order_id": order_id,
            "amount": payment["amount"],
            "status": payment["status"],
            "message": "Payment verified successfully"
        }
        
    except Exception as e:
        print(f"Payment verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")

@api_router.get("/orders")
async def get_orders():
    """Get all orders"""
    if not db:
        return {"orders": []}
    
    try:
        orders = await db.orders.find().sort("created_at", -1).to_list(100)
        return {"orders": orders}
    except Exception as e:
        print(f"Error fetching orders: {str(e)}")
        return {"orders": []}





ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration Settings
class Settings(BaseSettings):
    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "undhyu_db")
    SHOPIFY_STORE_DOMAIN: str = os.getenv("SHOPIFY_STORE_DOMAIN", "j0dktb-z1.myshopify.com")
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: str = os.getenv("SHOPIFY_STOREFRONT_ACCESS_TOKEN", "")
    SHOPIFY_API_VERSION: str = os.getenv("SHOPIFY_API_VERSION", "2024-01")
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    PORT: int = int(os.getenv("PORT", 8001))
    
    class Config:
        env_file = ".env"

settings = Settings()

# MongoDB connection with fallback
try:
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]
except Exception as e:
    print(f"MongoDB connection failed: {e}")
    client = None
    db = None

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

# Create the main app
app = FastAPI(title="Undhyu.com API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class CartItem(BaseModel):
    id: str
    title: str
    quantity: int
    price: float
    handle: str

class CreateOrderRequest(BaseModel):
    amount: int  # Amount in paise
    currency: str = "INR"
    cart: List[CartItem]

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    cart: List[CartItem]

# Original status endpoints
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    if db:
        _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if not db:
        return []
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Razorpay Payment Endpoints
@api_router.post("/create-razorpay-order")
async def create_razorpay_order(request: CreateOrderRequest):
    """Create Razorpay order for payment"""
    try:
        # Create order in Razorpay
        order_data = {
            "amount": request.amount,
            "currency": request.currency,
            "receipt": f"order_{uuid.uuid4()}",
            "payment_capture": 1
        }
        
        razorpay_order = razorpay_client.order.create(data=order_data)
        
        # Store order in database
        if db:
            order_record = {
                "razorpay_order_id": razorpay_order["id"],
                "amount": request.amount,
                "currency": request.currency,
                "cart": [item.dict() for item in request.cart],
                "status": "created",
                "created_at": datetime.utcnow()
            }
            await db.orders.insert_one(order_record)
        
        return {
            "id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "status": razorpay_order["status"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

@api_router.post("/verify-payment")
async def verify_payment(request: VerifyPaymentRequest):
    """Verify Razorpay payment and create Shopify order"""
    try:
        # Verify payment signature
        signature = request.razorpay_signature
        order_id = request.razorpay_order_id
        payment_id = request.razorpay_payment_id
        
        # Create signature for verification
        message = f"{order_id}|{payment_id}"
        generated_signature = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, generated_signature):
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Get payment details from Razorpay
        payment = razorpay_client.payment.fetch(payment_id)
        
        if payment["status"] != "captured":
            raise HTTPException(status_code=400, detail="Payment not captured")
        
        # Update order status in database
        if db:
            await db.orders.update_one(
                {"razorpay_order_id": order_id},
                {
                    "$set": {
                        "razorpay_payment_id": payment_id,
                        "status": "paid",
                        "paid_at": datetime.utcnow(),
                        "payment_details": payment
                    }
                }
            )
        
        # Here you can create Shopify order or send order details
        # For now, we'll just return success
        
        return {
            "success": True,
            "payment_id": payment_id,
            "order_id": order_id,
            "amount": payment["amount"],
            "status": payment["status"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")

@api_router.get("/orders")
async def get_orders():
    """Get all orders"""
    if not db:
        return {"orders": []}
    
    orders = await db.orders.find().sort("created_at", -1).to_list(100)
    return {"orders": orders}

# Shopify Products Endpoints (existing code...)
@api_router.get("/products")
async def get_products(
    first: int = Query(20, le=250),
    after: Optional[str] = None,
    collection_handle: Optional[str] = None,
    search_query: Optional[str] = None,
    sort_key: str = Query("CREATED_AT", regex="^(CREATED_AT|UPDATED_AT|TITLE|PRICE|BEST_SELLING|RELEVANCE)$"),
    reverse: bool = False,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None
):
    """Fetch products with filtering and search capabilities"""
    
    # Build GraphQL query
    query_filters = []
    
    if collection_handle:
        query_filters.append(f'collection:"{collection_handle}"')
    
    if search_query:
        query_filters.append(f'title:*{search_query}* OR tag:*{search_query}*')
        
    if min_price is not None:
        query_filters.append(f'variants.price:>={min_price}')
        
    if max_price is not None:
        query_filters.append(f'variants.price:<={max_price}')
    
    query_string = " AND ".join(query_filters) if query_filters else None
    
    graphql_query = """
    query getProducts($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys!, $reverse: Boolean!) {
        products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
            edges {
                node {
                    id
                    title
                    handle
                    description
                    vendor
                    productType
                    tags
                    createdAt
                    updatedAt
                    images(first: 5) {
                        edges {
                            node {
                                id
                                url
                                altText
                                width
                                height
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
                cursor
            }
            pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
            }
        }
    }
    """
    
    variables = {
        "first": first,
        "after": after,
        "query": query_string,
        "sortKey": sort_key,
        "reverse": reverse
    }
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                f"https://{settings.SHOPIFY_STORE_DOMAIN}/api/{settings.SHOPIFY_API_VERSION}/graphql.json",
                headers={
                    "Content-Type": "application/json",
                    "X-Shopify-Storefront-Access-Token": settings.SHOPIFY_STOREFRONT_ACCESS_TOKEN
                },
                json={"query": graphql_query, "variables": variables},
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Shopify API error: {response.text}"
                )
                
            result = response.json()
            
            if "errors" in result:
                raise HTTPException(status_code=400, detail=result["errors"])
                
            return {
                "products": [edge["node"] for edge in result["data"]["products"]["edges"]],
                "pageInfo": result["data"]["products"]["pageInfo"],
                "totalCount": len(result["data"]["products"]["edges"])
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Welcome to Undhyu.com API - Authentic Indian Fashion with Razorpay Integration"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "https://undhyu.com",
        "https://www.undhyu.com", 
        "https://*.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
