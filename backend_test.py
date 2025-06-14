import requests
import json
import time
import random
import string
from datetime import datetime

# Configuration
BASE_URL = "https://54a1d159-397c-45f6-b43d-7c17eb879b5c.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@undhyu.com"
ADMIN_PASSWORD = "admin123"

# Test user credentials
TEST_USER_EMAIL = f"test_user_{int(time.time())}@example.com"
TEST_USER_PASSWORD = "Test@123"
TEST_USER_NAME = "Test User"

# Global variables to store tokens and IDs
admin_token = None
user_token = None
test_product_id = None
test_category_id = None

def generate_random_string(length=10):
    """Generate a random string of fixed length"""
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def print_test_result(test_name, success, response=None, error=None):
    """Print test result in a formatted way"""
    if success:
        print(f"✅ {test_name}: PASSED")
        if response:
            print(f"   Response: {response}")
    else:
        print(f"❌ {test_name}: FAILED")
        if error:
            print(f"   Error: {error}")
        if response:
            print(f"   Response: {response}")
    print("-" * 80)

def test_auth_endpoints():
    """Test authentication endpoints"""
    global admin_token, user_token
    
    print("\n🔐 TESTING AUTHENTICATION ENDPOINTS\n")
    
    # Test admin login
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        response.raise_for_status()
        admin_token = response.json().get("token")
        print_test_result("Admin Login", True, response.json())
    except Exception as e:
        print_test_result("Admin Login", False, error=str(e))
        return False
    
    # Test user registration
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        })
        response.raise_for_status()
        user_token = response.json().get("token")
        print_test_result("User Registration", True, response.json())
    except Exception as e:
        print_test_result("User Registration", False, error=str(e))
        return False
    
    # Test user login
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        response.raise_for_status()
        user_token = response.json().get("token")
        print_test_result("User Login", True, response.json())
    except Exception as e:
        print_test_result("User Login", False, error=str(e))
        return False
    
    return True

def test_category_endpoints():
    """Test category endpoints"""
    global test_category_id
    
    print("\n📂 TESTING CATEGORY ENDPOINTS\n")
    
    # Test get categories
    try:
        response = requests.get(f"{BASE_URL}/categories")
        response.raise_for_status()
        categories = response.json()
        print_test_result("Get Categories", True, f"Retrieved {len(categories)} categories")
    except Exception as e:
        print_test_result("Get Categories", False, error=str(e))
        return False
    
    # Test create category (admin only)
    if admin_token:
        try:
            category_name = f"Test Category {generate_random_string()}"
            response = requests.post(
                f"{BASE_URL}/categories", 
                json={
                    "name": category_name,
                    "description": "Test category description",
                    "is_active": True
                },
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            response.raise_for_status()
            test_category_id = response.json().get("category_id")
            print_test_result("Create Category", True, response.json())
        except Exception as e:
            print_test_result("Create Category", False, error=str(e))
            return False
    
    return True

def test_product_endpoints():
    """Test product endpoints"""
    global test_product_id
    
    print("\n🛍️ TESTING PRODUCT ENDPOINTS\n")
    
    # Test get all products
    try:
        response = requests.get(f"{BASE_URL}/products")
        response.raise_for_status()
        products = response.json()
        print_test_result("Get All Products", True, f"Retrieved {len(products)} products")
    except Exception as e:
        print_test_result("Get All Products", False, error=str(e))
        return False
    
    # Test create product (admin only)
    if admin_token and test_category_id:
        try:
            product_name = f"Test Product {generate_random_string()}"
            response = requests.post(
                f"{BASE_URL}/products", 
                json={
                    "name": product_name,
                    "description": "Test product description",
                    "price": 999.99,
                    "original_price": 1299.99,
                    "category": test_category_id,
                    "sizes": ["S", "M", "L"],
                    "colors": ["Red", "Blue"],
                    "images": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="],
                    "stock": 100,
                    "is_featured": True,
                    "is_bestseller": False,
                    "tags": ["test", "new"]
                },
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            response.raise_for_status()
            test_product_id = response.json().get("product_id")
            print_test_result("Create Product", True, response.json())
        except Exception as e:
            print_test_result("Create Product", False, error=str(e))
            return False
    
    # Test get product by ID
    if test_product_id:
        try:
            response = requests.get(f"{BASE_URL}/products/{test_product_id}")
            response.raise_for_status()
            print_test_result("Get Product by ID", True, response.json())
        except Exception as e:
            print_test_result("Get Product by ID", False, error=str(e))
            return False
    
    # Test update product (admin only)
    if admin_token and test_product_id:
        try:
            updated_name = f"Updated Product {generate_random_string()}"
            response = requests.put(
                f"{BASE_URL}/products/{test_product_id}", 
                json={
                    "id": test_product_id,
                    "name": updated_name,
                    "description": "Updated product description",
                    "price": 899.99,
                    "original_price": 1199.99,
                    "category": test_category_id,
                    "sizes": ["S", "M", "L", "XL"],
                    "colors": ["Red", "Blue", "Green"],
                    "images": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="],
                    "stock": 150,
                    "is_featured": True,
                    "is_bestseller": True,
                    "tags": ["test", "updated"]
                },
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            response.raise_for_status()
            print_test_result("Update Product", True, response.json())
        except Exception as e:
            print_test_result("Update Product", False, error=str(e))
            return False
    
    # Test get products with filters
    try:
        response = requests.get(f"{BASE_URL}/products?featured=true")
        response.raise_for_status()
        featured_products = response.json()
        print_test_result("Get Featured Products", True, f"Retrieved {len(featured_products)} featured products")
    except Exception as e:
        print_test_result("Get Featured Products", False, error=str(e))
        return False
    
    return True

def test_cart_endpoints():
    """Test cart endpoints"""
    
    print("\n🛒 TESTING CART ENDPOINTS\n")
    
    if not user_token or not test_product_id:
        print_test_result("Cart Tests", False, error="Missing user token or test product ID")
        return False
    
    # Test add to cart
    try:
        response = requests.post(
            f"{BASE_URL}/cart", 
            json={
                "product_id": test_product_id,
                "quantity": 2,
                "size": "M",
                "color": "Blue"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        response.raise_for_status()
        print_test_result("Add to Cart", True, response.json())
    except Exception as e:
        print_test_result("Add to Cart", False, error=str(e))
        return False
    
    # Test get cart
    try:
        response = requests.get(
            f"{BASE_URL}/cart",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        response.raise_for_status()
        cart_items = response.json()
        print_test_result("Get Cart", True, f"Retrieved {len(cart_items)} cart items")
    except Exception as e:
        print_test_result("Get Cart", False, error=str(e))
        return False
    
    return True

def test_order_endpoints():
    """Test order endpoints"""
    
    print("\n📦 TESTING ORDER ENDPOINTS\n")
    
    if not user_token:
        print_test_result("Order Tests", False, error="Missing user token")
        return False
    
    # Test create order
    try:
        response = requests.post(
            f"{BASE_URL}/orders", 
            json={
                "shipping_address": {
                    "street": "123 Test Street",
                    "city": "Test City",
                    "state": "Test State",
                    "zip": "12345",
                    "country": "Test Country"
                },
                "payment_method": "razorpay"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        response.raise_for_status()
        order_id = response.json().get("order_id")
        print_test_result("Create Order", True, response.json())
    except Exception as e:
        print_test_result("Create Order", False, error=str(e))
        return False
    
    # Test get user orders
    try:
        response = requests.get(
            f"{BASE_URL}/orders",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        response.raise_for_status()
        orders = response.json()
        print_test_result("Get User Orders", True, f"Retrieved {len(orders)} orders")
    except Exception as e:
        print_test_result("Get User Orders", False, error=str(e))
        return False
    
    # Test get all orders (admin only)
    if admin_token:
        try:
            response = requests.get(
                f"{BASE_URL}/admin/orders",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            response.raise_for_status()
            all_orders = response.json()
            print_test_result("Get All Orders (Admin)", True, f"Retrieved {len(all_orders)} orders")
        except Exception as e:
            print_test_result("Get All Orders (Admin)", False, error=str(e))
            return False
    
    # Test update order status (admin only)
    if admin_token and order_id:
        try:
            response = requests.put(
                f"{BASE_URL}/admin/orders/{order_id}/status",
                json={"order_status": "confirmed"},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            response.raise_for_status()
            print_test_result("Update Order Status", True, response.json())
        except Exception as e:
            print_test_result("Update Order Status", False, error=str(e))
            return False
    
    return True

def test_search_endpoint():
    """Test search endpoint"""
    
    print("\n🔍 TESTING SEARCH ENDPOINT\n")
    
    # Test search products
    try:
        search_term = "test"
        response = requests.get(f"{BASE_URL}/search?q={search_term}")
        response.raise_for_status()
        search_results = response.json()
        print_test_result("Search Products", True, f"Found {len(search_results)} products matching '{search_term}'")
    except Exception as e:
        print_test_result("Search Products", False, error=str(e))
        return False
    
    return True

def test_admin_dashboard():
    """Test admin dashboard endpoint"""
    
    print("\n📊 TESTING ADMIN DASHBOARD\n")
    
    if not admin_token:
        print_test_result("Admin Dashboard", False, error="Missing admin token")
        return False
    
    # Test get dashboard stats
    try:
        response = requests.get(
            f"{BASE_URL}/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        response.raise_for_status()
        dashboard_stats = response.json()
        print_test_result("Get Dashboard Stats", True, dashboard_stats)
    except Exception as e:
        print_test_result("Get Dashboard Stats", False, error=str(e))
        return False
    
    return True

def test_product_deletion():
    """Test product deletion (cleanup)"""
    
    print("\n🧹 TESTING PRODUCT DELETION (CLEANUP)\n")
    
    if not admin_token or not test_product_id:
        print_test_result("Delete Product", False, error="Missing admin token or test product ID")
        return False
    
    # Test delete product
    try:
        response = requests.delete(
            f"{BASE_URL}/products/{test_product_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        response.raise_for_status()
        print_test_result("Delete Product", True, response.json())
    except Exception as e:
        print_test_result("Delete Product", False, error=str(e))
        return False
    
    return True

def run_all_tests():
    """Run all tests in sequence"""
    print("\n" + "=" * 80)
    print("🧪 STARTING UNDHYU E-COMMERCE API TESTS")
    print("=" * 80)
    
    test_results = {
        "Authentication": test_auth_endpoints(),
        "Categories": test_category_endpoints(),
        "Products": test_product_endpoints(),
        "Cart": test_cart_endpoints(),
        "Orders": test_order_endpoints(),
        "Search": test_search_endpoint(),
        "Admin Dashboard": test_admin_dashboard(),
        "Product Deletion": test_product_deletion()
    }
    
    print("\n" + "=" * 80)
    print("📋 TEST SUMMARY")
    print("=" * 80)
    
    all_passed = True
    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        if not result:
            all_passed = False
        print(f"{test_name}: {status}")
    
    print("\n" + "=" * 80)
    if all_passed:
        print("🎉 ALL TESTS PASSED SUCCESSFULLY!")
    else:
        print("❌ SOME TESTS FAILED. CHECK LOGS FOR DETAILS.")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    run_all_tests()