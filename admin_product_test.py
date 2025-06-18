import requests
import json
import time
import uuid

# Configuration
BASE_URL = "https://54a1d159-397c-45f6-b43d-7c17eb879b5c.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@undhyu.com"
ADMIN_PASSWORD = "admin123"

# Global variables
admin_token = None
test_product_id = None

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

def test_admin_login():
    """Test admin login functionality"""
    global admin_token
    
    print("\n🔐 TESTING ADMIN LOGIN\n")
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        response.raise_for_status()
        admin_token = response.json().get("token")
        print_test_result("Admin Login", True, response.json())
        return True
    except Exception as e:
        print_test_result("Admin Login", False, error=str(e))
        return False

def test_product_creation():
    """Test product creation functionality"""
    global test_product_id
    
    print("\n🛍️ TESTING PRODUCT CREATION\n")
    
    if not admin_token:
        print_test_result("Product Creation", False, error="Missing admin token")
        return False
    
    # Test create product
    try:
        product_data = {
            "name": "Test Saree",
            "description": "Beautiful test saree",
            "price": 1500,
            "original_price": 2000,
            "category": "Designer Sarees",
            "sizes": ["S", "M", "L"],
            "colors": ["Red", "Blue"],
            "material": "Silk",
            "origin": "Banaras",
            "stock": 10,
            "images": ["placeholder_image"],
            "is_featured": True
        }
        
        response = requests.post(
            f"{BASE_URL}/products", 
            json=product_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        response.raise_for_status()
        result = response.json()
        test_product_id = result.get("product_id")
        
        print_test_result("Product Creation", True, result)
        return True
    except Exception as e:
        print_test_result("Product Creation", False, error=str(e))
        return False

def test_product_retrieval():
    """Test product retrieval functionality"""
    
    print("\n🔍 TESTING PRODUCT RETRIEVAL\n")
    
    if not test_product_id:
        print_test_result("Product Retrieval", False, error="No product ID available")
        return False
    
    # Test get product by ID
    try:
        response = requests.get(f"{BASE_URL}/products/{test_product_id}")
        response.raise_for_status()
        product = response.json()
        
        # Verify product data
        if product["name"] == "Test Saree" and product["price"] == 1500:
            print_test_result("Product Retrieval", True, product)
            return True
        else:
            print_test_result("Product Retrieval", False, 
                             error="Product data doesn't match expected values",
                             response=product)
            return False
    except Exception as e:
        print_test_result("Product Retrieval", False, error=str(e))
        return False

def test_product_cleanup():
    """Clean up by deleting the test product"""
    
    print("\n🧹 CLEANING UP TEST PRODUCT\n")
    
    if not admin_token or not test_product_id:
        print_test_result("Product Cleanup", False, error="Missing admin token or product ID")
        return False
    
    # Delete the test product
    try:
        response = requests.delete(
            f"{BASE_URL}/products/{test_product_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        response.raise_for_status()
        print_test_result("Product Cleanup", True, response.json())
        return True
    except Exception as e:
        print_test_result("Product Cleanup", False, error=str(e))
        return False

def run_tests():
    """Run all tests in sequence"""
    print("\n" + "=" * 80)
    print("🧪 TESTING ADMIN PRODUCT CREATION FUNCTIONALITY")
    print("=" * 80)
    
    # Run tests
    admin_login_success = test_admin_login()
    
    if not admin_login_success:
        print("\n❌ ADMIN LOGIN FAILED - CANNOT PROCEED WITH FURTHER TESTS")
        return
    
    product_creation_success = test_product_creation()
    
    if not product_creation_success:
        print("\n❌ PRODUCT CREATION FAILED - CANNOT PROCEED WITH PRODUCT RETRIEVAL")
    else:
        product_retrieval_success = test_product_retrieval()
        
        if product_retrieval_success:
            print("\n✅ PRODUCT SUCCESSFULLY CREATED AND RETRIEVED")
        else:
            print("\n❌ PRODUCT RETRIEVAL FAILED")
    
    # Always attempt cleanup if we have a product ID
    if test_product_id:
        test_product_cleanup()
    
    print("\n" + "=" * 80)
    if admin_login_success and product_creation_success and (not test_product_id or product_retrieval_success):
        print("🎉 ALL TESTS PASSED SUCCESSFULLY!")
    else:
        print("❌ SOME TESTS FAILED. CHECK LOGS FOR DETAILS.")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    run_tests()