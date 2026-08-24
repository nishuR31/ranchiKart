#!/bin/bash
# test_vendor_workflow.sh
# Make sure your server is running on http://localhost:3000

BASE_URL="http://localhost:3000/api/v1"
COOKIE_JAR="cookies.txt"

echo "======================================"
echo " Testing Multi-Vendor Workflow"
echo "======================================"

# Clean old cookies
rm -f $COOKIE_JAR

# 1. Register a new user
RANDOM_EMAIL="vendor_$RANDOM@test.com"
echo "1. Registering user $RANDOM_EMAIL..."
curl -s -c $COOKIE_JAR -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$RANDOM_EMAIL'",
    "name": "Test Vendor",
    "password": "Password@123"
  }'
echo -e "\n"

# 2. Login the user (this will save the accessToken cookie into cookies.txt)
echo "2. Logging in..."
curl -s -c $COOKIE_JAR -b $COOKIE_JAR -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "'$RANDOM_EMAIL'",
    "password": "Password@123"
  }'
echo -e "\n"

# 3. Register a Store (upgrades user to SELLER)
echo "3. Registering a new Store..."
curl -s -c $COOKIE_JAR -b $COOKIE_JAR -X POST "$BASE_URL/vendor/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Vendor Store '$RANDOM'",
    "description": "Best electronics in town",
    "logoUrl": "https://example.com/logo.png"
  }'
echo -e "\n"

# 4. Fetch My Store Details
echo "4. Fetching My Store Details..."
curl -s -c $COOKIE_JAR -b $COOKIE_JAR -X GET "$BASE_URL/vendor/store"
echo -e "\n"

# 5. Create a Product
echo "5. Creating a Product..."
PRODUCT_RESPONSE=$(curl -s -c $COOKIE_JAR -b $COOKIE_JAR -X POST "$BASE_URL/vendor/products" \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "default-cat",
    "slug": "test-product-'$RANDOM'",
    "name": "Test Product",
    "description": "A great test product.",
    "kind": "PHYSICAL",
    "basePrice": 299900,
    "stock": 50,
    "imageUrl": "https://example.com/watch.png"
  }')
echo $PRODUCT_RESPONSE
echo -e "\n"

# Extract product ID using grep (if jq is not available)
PRODUCT_ID=$(echo $PRODUCT_RESPONSE | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)

if [ -n "$PRODUCT_ID" ]; then
  # 6. Update Product
  echo "6. Updating Product ($PRODUCT_ID)..."
  curl -s -c $COOKIE_JAR -b $COOKIE_JAR -X PUT "$BASE_URL/vendor/products/$PRODUCT_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "basePrice": 350000
    }'
  echo -e "\n"

  # 7. Delete Product
  echo "7. Deleting Product ($PRODUCT_ID)..."
  curl -s -c $COOKIE_JAR -b $COOKIE_JAR -X DELETE "$BASE_URL/vendor/products/$PRODUCT_ID"
  echo -e "\n"
fi

# 8. Fetch Vendor Orders
echo "8. Fetching Vendor Orders..."
curl -s -c $COOKIE_JAR -b $COOKIE_JAR -X GET "$BASE_URL/vendor/orders"
echo -e "\n"

# 9. Update an Order Status (Assuming you had an order ID, which you won't in this blank test, but here is the route)
echo "9. Simulating Order Status Update (will fail without real order ID)..."
curl -s -c $COOKIE_JAR -b $COOKIE_JAR -X PUT "$BASE_URL/vendor/orders/fake-order-123/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SHIPPED",
    "trackingId": "TRACK123456"
  }'
echo -e "\n"

echo "======================================"
echo " Test Complete!"
echo "======================================"

