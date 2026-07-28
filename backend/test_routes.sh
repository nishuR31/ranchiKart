#!/usr/bin/env bash
# ==============================================================================
# RanchiKart API — ALL Routes, ALL Methods & ALL Services Curl Test Suite
# Usage: ./test_routes.sh [BASE_URL]
# Default BASE_URL: http://localhost:3000
# ==============================================================================

# Do not exit on individual route failures
set +e

BASE_URL="${1:-"http://localhost:3000"}"
USER_COOKIE_JAR=$(mktemp /tmp/ranchikart_user_cookies.XXXXXX)
ADMIN_COOKIE_JAR=$(mktemp /tmp/ranchikart_admin_cookies.XXXXXX)

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
DIM='\033[2m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

cleanup() {
  rm -f "$USER_COOKIE_JAR" "$ADMIN_COOKIE_JAR"
  echo -e "\n${BLUE}====================================================================${NC}"
  echo -e "${BLUE}                         FINAL SUMMARY                              ${NC}"
  echo -e "${BLUE}====================================================================${NC}"
  echo -e "${GREEN}Passed Endpoints:${NC} $PASSED"
  echo -e "${RED}Failed Endpoints:${NC} $FAILED"
  if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}SUCCESS: 100% of all API routes, methods & services passed cleanly!${NC}"
  else
    echo -e "${YELLOW}COMPLETED: Tested all routes ($PASSED passed, $FAILED failed).${NC}"
  fi
}
trap cleanup EXIT

log_test() {
  local method="$1"
  local endpoint="$2"
  local status="$3"
  local expected="$4"
  local description="$5"
  local response_body="$6"

  # Determine success status code check
  # expected can be comma-separated or single int, e.g. "200,201" or "200"
  local is_match=0
  IFS=',' read -ra ADDR <<< "$expected"
  for code in "${ADDR[@]}"; do
    if [ "$status" -eq "$code" ]; then
      is_match=1
      break
    fi
  done

  if [ "$is_match" -eq 1 ]; then
    echo -e "[${GREEN}PASS${NC}] ${CYAN}$method${NC} $endpoint -> HTTP $status | $description"
    PASSED=$((PASSED + 1))
  else
    echo -e "[${RED}FAIL${NC}] ${CYAN}$method${NC} $endpoint -> HTTP $status (Expected $expected) | $description"
    FAILED=$((FAILED + 1))
  fi

  if [ -n "$response_body" ]; then
    echo -e "  ${DIM}Response:${NC} $(echo "$response_body" | jq -c '.' 2>/dev/null | cut -c1-150 || echo "$response_body" | cut -c1-150)..."
  fi
  echo ""
}

echo -e "${BLUE}====================================================================${NC}"
echo -e "${BLUE} RanchiKart API — Comprehensive ALL Routes & ALL Methods Test Suite ${NC}"
echo -e "${BLUE} Target URL:       ${CYAN}$BASE_URL${NC}"
echo -e "${BLUE} User Cookie Jar:  ${CYAN}$USER_COOKIE_JAR${NC}"
echo -e "${BLUE} Admin Cookie Jar: ${CYAN}$ADMIN_COOKIE_JAR${NC}"
echo -e "${BLUE}====================================================================${NC}\n"

# ------------------------------------------------------------------------------
# 1. SYSTEM ENDPOINTS
# ------------------------------------------------------------------------------
echo -e "${YELLOW}=== 1. SYSTEM ENDPOINTS ===${NC}"

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/ping")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/ping" "$STATUS" "200" "Ping endpoint" "$BODY"

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/health")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/health" "$STATUS" "200" "Health status check" "$BODY"

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/version")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/version" "$STATUS" "200" "API version check" "$BODY"

# ------------------------------------------------------------------------------
# 2. CATALOG & REVIEWS (PUBLIC)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}=== 2. CATALOG & REVIEWS ENDPOINTS ===${NC}"

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/categories")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/categories" "$STATUS" "200" "List categories" "$BODY"

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/products")
STATUS=$(echo "$RAW" | tail -n1)
PRODUCTS_BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/products" "$STATUS" "200" "List catalog products" "$PRODUCTS_BODY"

PRODUCT_ID=$(echo "$PRODUCTS_BODY" | jq -r '.data.products[0].id // empty')
PRODUCT_SLUG=$(echo "$PRODUCTS_BODY" | jq -r '.data.products[0].slug // empty')

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/products/featured")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/products/featured" "$STATUS" "200" "Get featured products" "$BODY"

if [ -n "$PRODUCT_SLUG" ]; then
  RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/products/$PRODUCT_SLUG")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "GET" "/api/v1/products/$PRODUCT_SLUG" "$STATUS" "200" "Get product details by slug" "$BODY"

  RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/products/$PRODUCT_SLUG/reviews")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "GET" "/api/v1/products/$PRODUCT_SLUG/reviews" "$STATUS" "200" "Get product reviews" "$BODY"
fi

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/search?q=a")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/search?q=a" "$STATUS" "200" "Search products query" "$BODY"

# ------------------------------------------------------------------------------
# 3. AUTHENTICATION FLOW (REGISTER -> DB PERSIST -> LOGIN -> COOKIE & BEARER)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}=== 3. USER AUTHENTICATION ENDPOINTS ===${NC}"

RANDOM_NUM=$((RANDOM % 900000 + 100000))
TEST_NAME="Nishu Dev $RANDOM_NUM"
TEST_USERNAME="nishu_$RANDOM_NUM"
TEST_EMAIL="dreamgf691+${RANDOM_NUM}@gmail.com"
TEST_PASSWORD="Password123!"

echo -e "${MAGENTA}➜ Generating Dynamic User Credentials:${NC}"
echo -e "  Email:    ${CYAN}$TEST_EMAIL${NC}"
echo -e "  Password: ${CYAN}$TEST_PASSWORD${NC}\n"

# POST /auth/register
REGISTER_PAYLOAD=$(cat <<EOF
{
  "name": "$TEST_NAME",
  "username": "$TEST_USERNAME",
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)
RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_PAYLOAD")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/auth/register" "$STATUS" "201" "Register new user" "$BODY"

USER_ID=$(echo "$BODY" | jq -r '.data.user.id // empty')

# POST /auth/login (stores cookies in $USER_COOKIE_JAR)
LOGIN_PAYLOAD=$(cat <<EOF
{
  "emailOrUsername": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)
RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
  -c "$USER_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_PAYLOAD")
STATUS=$(echo "$RAW" | tail -n1)
LOGIN_BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/auth/login" "$STATUS" "200" "Login and save HTTP Cookies (-c cookie_jar)" "$LOGIN_BODY"

ACCESS_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.data.tokens.accessToken // empty')
REFRESH_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.data.tokens.refreshToken // empty')

# GET /auth/me via Cookie
RAW=$(curl -s -w "\n%{http_code}" -b "$USER_COOKIE_JAR" "$BASE_URL/api/v1/auth/me")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/auth/me" "$STATUS" "200" "Check profile using HTTP Cookie (-b cookie_jar)" "$BODY"

# GET /auth/me via Bearer Header
RAW=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/api/v1/auth/me")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/auth/me" "$STATUS" "200" "Check profile using Bearer Token Header" "$BODY"

# POST /auth/refresh
REFRESH_PAYLOAD="{\"refreshToken\": \"$REFRESH_TOKEN\"}"
RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/refresh" \
  -H "Content-Type: application/json" -d "$REFRESH_PAYLOAD")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/auth/refresh" "$STATUS" "200" "Refresh access token" "$BODY"

# PUT /auth/change-password
CHANGE_PWD_PAYLOAD="{\"currentPassword\": \"$TEST_PASSWORD\", \"newPassword\": \"NewPassword123!\"}"
RAW=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/auth/change-password" \
  -b "$USER_COOKIE_JAR" \
  -H "Content-Type: application/json" -d "$CHANGE_PWD_PAYLOAD")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "PUT" "/api/v1/auth/change-password" "$STATUS" "200" "Change user password" "$BODY"
TEST_PASSWORD="NewPassword123!"

# Re-login with new password to refresh cookie
LOGIN_PAYLOAD="{\"emailOrUsername\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}"
curl -s -X POST "$BASE_URL/api/v1/auth/login" -c "$USER_COOKIE_JAR" -H "Content-Type: application/json" -d "$LOGIN_PAYLOAD" >/dev/null

# Magic Link & OAuth endpoints
RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/magic-link" \
  -H "Content-Type: application/json" -d "{\"email\": \"$TEST_EMAIL\"}")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/auth/magic-link" "$STATUS" "200" "Request magic link" "$BODY"

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/auth/magic-link/verify?token=invalid_token")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/auth/magic-link/verify" "$STATUS" "400,401" "Verify invalid magic link" "$BODY"

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/auth/google/login")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/auth/google/login" "$STATUS" "200,302" "Google OAuth redirect URL" "$BODY"

# Email Verification endpoints
RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/email/send-verification" -b "$USER_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/auth/email/send-verification" "$STATUS" "200" "Send verification email OTP" "$BODY"

# TOTP & Passkey Endpoints
RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/totp/enable" -b "$USER_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/auth/totp/enable" "$STATUS" "200" "Enable TOTP 2FA secret" "$BODY"

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/auth/passkey/register" -b "$USER_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/auth/passkey/register" "$STATUS" "200" "Generate WebAuthn Passkey registration options" "$BODY"

# ------------------------------------------------------------------------------
# 4. USER PROFILE & ADDRESS ENDPOINTS
# ------------------------------------------------------------------------------
echo -e "${YELLOW}=== 4. USER PROFILE & ADDRESS ENDPOINTS ===${NC}"

RAW=$(curl -s -w "\n%{http_code}" -b "$USER_COOKIE_JAR" "$BASE_URL/api/v1/users/me")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/users/me" "$STATUS" "200" "Get user profile" "$BODY"

PROFILE_UPDATE="{\"name\": \"Updated $TEST_NAME\", \"phone\": \"9876543210\"}"
RAW=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/users/me/profile" \
  -b "$USER_COOKIE_JAR" -H "Content-Type: application/json" -d "$PROFILE_UPDATE")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "PUT" "/api/v1/users/me/profile" "$STATUS" "200" "Update user profile" "$BODY"

ADD_ADDRESS="{\"fullName\": \"$TEST_NAME\", \"phone\": \"9876543210\", \"line1\": \"123 Main St\", \"city\": \"Ranchi\", \"state\": \"Jharkhand\", \"pincode\": \"834001\", \"isDefault\": true}"
RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/users/me/addresses" \
  -b "$USER_COOKIE_JAR" -H "Content-Type: application/json" -d "$ADD_ADDRESS")
STATUS=$(echo "$RAW" | tail -n1)
ADDR_BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/users/me/addresses" "$STATUS" "201" "Add user address" "$ADDR_BODY"

ADDRESS_ID=$(echo "$ADDR_BODY" | jq -r '.data.address.id // empty')

RAW=$(curl -s -w "\n%{http_code}" -b "$USER_COOKIE_JAR" "$BASE_URL/api/v1/users/me/addresses")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/users/me/addresses" "$STATUS" "200" "List user addresses" "$BODY"

if [ -n "$ADDRESS_ID" ]; then
  RAW=$(curl -s -w "\n%{http_code}" -X DELETE -b "$USER_COOKIE_JAR" "$BASE_URL/api/v1/users/me/addresses/$ADDRESS_ID")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "DELETE" "/api/v1/users/me/addresses/$ADDRESS_ID" "$STATUS" "200" "Delete user address" "$BODY"
fi

# ------------------------------------------------------------------------------
# 5. REVIEWS & WISHLIST ENDPOINTS
# ------------------------------------------------------------------------------
echo -e "${YELLOW}=== 5. REVIEWS & WISHLIST ENDPOINTS ===${NC}"

if [ -n "$PRODUCT_SLUG" ]; then
  CREATE_REVIEW="{\"rating\": 5, \"title\": \"Great Product\", \"body\": \"High quality product for testing!\"}"
  RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/products/$PRODUCT_SLUG/reviews" \
    -b "$USER_COOKIE_JAR" -H "Content-Type: application/json" -d "$CREATE_REVIEW")
  STATUS=$(echo "$RAW" | tail -n1)
  REVIEW_BODY=$(echo "$RAW" | sed '$d')
  log_test "POST" "/api/v1/products/$PRODUCT_SLUG/reviews" "$STATUS" "201,400" "Create product review" "$REVIEW_BODY"

  REVIEW_ID=$(echo "$REVIEW_BODY" | jq -r '.data.review.id // empty')
  if [ -n "$REVIEW_ID" ]; then
    RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/reviews/$REVIEW_ID/helpful" -b "$USER_COOKIE_JAR")
    STATUS=$(echo "$RAW" | tail -n1)
    BODY=$(echo "$RAW" | sed '$d')
    log_test "POST" "/api/v1/reviews/$REVIEW_ID/helpful" "$STATUS" "200" "Mark review helpful" "$BODY"
  fi
fi

if [ -n "$PRODUCT_ID" ]; then
  RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/wishlist" \
    -b "$USER_COOKIE_JAR" -H "Content-Type: application/json" -d "{\"productId\": \"$PRODUCT_ID\"}")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "POST" "/api/v1/wishlist" "$STATUS" "201" "Add product to wishlist" "$BODY"

  RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/wishlist/check/$PRODUCT_ID" -b "$USER_COOKIE_JAR")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "GET" "/api/v1/wishlist/check/$PRODUCT_ID" "$STATUS" "200" "Check product in wishlist" "$BODY"

  RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/wishlist" -b "$USER_COOKIE_JAR")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "GET" "/api/v1/wishlist" "$STATUS" "200" "List wishlist items" "$BODY"

  RAW=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/v1/wishlist/$PRODUCT_ID" -b "$USER_COOKIE_JAR")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "DELETE" "/api/v1/wishlist/$PRODUCT_ID" "$STATUS" "200" "Delete item from wishlist" "$BODY"
fi

# ------------------------------------------------------------------------------
# 6. ORDERS, PAYMENTS & COUPONS ENDPOINTS
# ------------------------------------------------------------------------------
echo -e "${YELLOW}=== 6. ORDERS, PAYMENTS & COUPONS ENDPOINTS ===${NC}"

if [ -n "$PRODUCT_ID" ]; then
  ORDER_PAYLOAD=$(cat <<EOF
{
  "paymentMethod": "UPI",
  "address": {
    "fullName": "$TEST_NAME",
    "phone": "9876543210",
    "line1": "123 Main Street",
    "city": "Ranchi",
    "state": "Jharkhand",
    "pincode": "834001"
  },
  "items": [{ "productId": "$PRODUCT_ID", "quantity": 1 }]
}
EOF
  )

  RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/orders" \
    -b "$USER_COOKIE_JAR" -H "Content-Type: application/json" -d "$ORDER_PAYLOAD")
  STATUS=$(echo "$RAW" | tail -n1)
  ORDER_BODY=$(echo "$RAW" | sed '$d')
  log_test "POST" "/api/v1/orders" "$STATUS" "201" "Create new order" "$ORDER_BODY"

  ORDER_ID=$(echo "$ORDER_BODY" | jq -r '.data.order.id // empty')

  RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/orders" -b "$USER_COOKIE_JAR")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "GET" "/api/v1/orders" "$STATUS" "200" "List user orders" "$BODY"

  if [ -n "$ORDER_ID" ]; then
    RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/orders/$ORDER_ID" -b "$USER_COOKIE_JAR")
    STATUS=$(echo "$RAW" | tail -n1)
    BODY=$(echo "$RAW" | sed '$d')
    log_test "GET" "/api/v1/orders/$ORDER_ID" "$STATUS" "200" "Get order by ID" "$BODY"

    # Razorpay Payment Order Creation
    RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/payments/razorpay/orders" \
      -b "$USER_COOKIE_JAR" -H "Content-Type: application/json" -d "{\"orderId\": \"$ORDER_ID\"}")
    STATUS=$(echo "$RAW" | tail -n1)
    BODY=$(echo "$RAW" | sed '$d')
    log_test "POST" "/api/v1/payments/razorpay/orders" "$STATUS" "201" "Create Razorpay payment order" "$BODY"
  fi
fi

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/coupons" -b "$ADMIN_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/coupons" "$STATUS" "200" "List active coupons as admin" "$BODY"

RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/coupons/apply" \
  -b "$USER_COOKIE_JAR" -H "Content-Type: application/json" -d "{\"code\": \"WELCOME10\", \"orderAmount\": 2000}")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/coupons/apply" "$STATUS" "200,400" "Apply coupon code" "$BODY"

# ------------------------------------------------------------------------------
# 7. ADMIN ENDPOINTS (LOGGED IN AS ADMIN ROLE)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}=== 7. ADMIN MANAGEMENT ENDPOINTS ===${NC}"

ADMIN_EMAIL="dreamgf691+admin@gmail.com"
ADMIN_PASSWORD="AdminPassword123!"

ADMIN_LOGIN_PAYLOAD="{\"emailOrUsername\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}"
RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
  -c "$ADMIN_COOKIE_JAR" \
  -H "Content-Type: application/json" -d "$ADMIN_LOGIN_PAYLOAD")
STATUS=$(echo "$RAW" | tail -n1)
ADMIN_LOGIN_BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/auth/login (Admin)" "$STATUS" "200" "Admin login and save admin cookies" "$ADMIN_LOGIN_BODY"

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/admin/dashboard" -b "$ADMIN_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/admin/dashboard" "$STATUS" "200" "Get admin dashboard stats" "$BODY"

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/admin/stats/revenue-chart" -b "$ADMIN_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/admin/stats/revenue-chart" "$STATUS" "200" "Get revenue chart statistics" "$BODY"

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/admin/orders" -b "$ADMIN_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/admin/orders" "$STATUS" "200" "List all orders as admin" "$BODY"

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/admin/products" -b "$ADMIN_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/admin/products" "$STATUS" "200" "List all products as admin" "$BODY"

if [ -n "$PRODUCT_ID" ]; then
  RAW=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/v1/admin/products/$PRODUCT_ID/toggle" -b "$ADMIN_COOKIE_JAR")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "PATCH" "/api/v1/admin/products/$PRODUCT_ID/toggle" "$STATUS" "200" "Toggle product active state" "$BODY"

  RAW=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/v1/admin/products/$PRODUCT_ID/toggle" -b "$ADMIN_COOKIE_JAR")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "PATCH" "/api/v1/admin/products/$PRODUCT_ID/toggle" "$STATUS" "200" "Restore product active state" "$BODY"
fi

# Create Category as Admin
NEW_CAT_SLUG="cat-test-$RANDOM_NUM"
NEW_CAT_PAYLOAD="{\"name\": \"Test Category $RANDOM_NUM\", \"slug\": \"$NEW_CAT_SLUG\", \"description\": \"Test category description for ranchikart\", \"kind\": \"STATIONERY\", \"imageUrl\": \"https://example.com/category.jpg\"}"
RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/admin/categories" \
  -b "$ADMIN_COOKIE_JAR" -H "Content-Type: application/json" -d "$NEW_CAT_PAYLOAD")
STATUS=$(echo "$RAW" | tail -n1)
CAT_BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/admin/categories" "$STATUS" "201" "Create new category as admin" "$CAT_BODY"

CREATED_CAT_ID=$(echo "$CAT_BODY" | jq -r '.data.category.id // empty')

if [ -n "$CREATED_CAT_ID" ]; then
  UPDATE_CAT_PAYLOAD="{\"name\": \"Updated Test Category $RANDOM_NUM\"}"
  RAW=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/admin/categories/$CREATED_CAT_ID" \
    -b "$ADMIN_COOKIE_JAR" -H "Content-Type: application/json" -d "$UPDATE_CAT_PAYLOAD")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "PUT" "/api/v1/admin/categories/$CREATED_CAT_ID" "$STATUS" "200" "Update category as admin" "$BODY"

  RAW=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/v1/admin/categories/$CREATED_CAT_ID" -b "$ADMIN_COOKIE_JAR")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "DELETE" "/api/v1/admin/categories/$CREATED_CAT_ID" "$STATUS" "200" "Delete category as admin" "$BODY"
fi

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/admin/users" -b "$ADMIN_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/admin/users" "$STATUS" "200" "List registered users as admin" "$BODY"

if [ -n "$USER_ID" ]; then
  RAW=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/v1/admin/users/$USER_ID/role" \
    -b "$ADMIN_COOKIE_JAR" -H "Content-Type: application/json" -d "{\"role\": \"MANAGER\"}")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "PATCH" "/api/v1/admin/users/$USER_ID/role" "$STATUS" "200" "Update user role to MANAGER" "$BODY"

  RAW=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/v1/admin/users/$USER_ID/ban" \
    -b "$ADMIN_COOKIE_JAR" -H "Content-Type: application/json" -d "{\"isBanned\": true, \"banReason\": \"Test audit ban\"}")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "PATCH" "/api/v1/admin/users/$USER_ID/ban" "$STATUS" "200" "Ban user as admin" "$BODY"
fi

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/admin/coupons" -b "$ADMIN_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/admin/coupons" "$STATUS" "200" "List all coupons as admin" "$BODY"

# Create Coupon as Admin
NEW_COUPON_CODE="SALE$RANDOM_NUM"
COUPON_PAYLOAD="{\"code\": \"$NEW_COUPON_CODE\", \"type\": \"PERCENT\", \"value\": 15, \"minOrderAmount\": 500, \"expiresAt\": \"2030-12-31T23:59:59.000Z\"}"
RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/admin/coupons" \
  -b "$ADMIN_COOKIE_JAR" -H "Content-Type: application/json" -d "$COUPON_PAYLOAD")
STATUS=$(echo "$RAW" | tail -n1)
COUPON_BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/admin/coupons" "$STATUS" "201" "Create new coupon as admin" "$COUPON_BODY"

COUPON_ID=$(echo "$COUPON_BODY" | jq -r '.data.coupon.id // empty')

if [ -n "$COUPON_ID" ]; then
  RAW=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/v1/coupons/$COUPON_ID/toggle" -b "$ADMIN_COOKIE_JAR")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "PATCH" "/api/v1/coupons/$COUPON_ID/toggle" "$STATUS" "200" "Toggle coupon status as admin" "$BODY"

  RAW=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/v1/admin/coupons/$COUPON_ID" -b "$ADMIN_COOKIE_JAR")
  STATUS=$(echo "$RAW" | tail -n1)
  BODY=$(echo "$RAW" | sed '$d')
  log_test "DELETE" "/api/v1/admin/coupons/$COUPON_ID" "$STATUS" "200" "Delete coupon as admin" "$BODY"
fi

RAW=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/admin/logs" -b "$ADMIN_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "GET" "/api/v1/admin/logs" "$STATUS" "200" "List system audit logs as admin" "$BODY"

# ------------------------------------------------------------------------------
# 8. ACCOUNT DELETION & LOGOUT
# ------------------------------------------------------------------------------
echo -e "${YELLOW}=== 8. ACCOUNT DELETION & LOGOUT ENDPOINTS ===${NC}"

# User Logout
RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/logout" \
  -b "$USER_COOKIE_JAR" -c "$USER_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/auth/logout" "$STATUS" "200" "User logout and clear session cookies" "$BODY"

# Admin Logout
RAW=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/logout" \
  -b "$ADMIN_COOKIE_JAR" -c "$ADMIN_COOKIE_JAR")
STATUS=$(echo "$RAW" | tail -n1)
BODY=$(echo "$RAW" | sed '$d')
log_test "POST" "/api/v1/auth/logout (Admin)" "$STATUS" "200" "Admin logout and clear session cookies" "$BODY"

echo -e "\n${GREEN}Completed exhaustive API test suite!${NC}"
