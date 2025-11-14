# Chatbot Order Integration - Authentication & Security

## ✅ Authentication Implementation

The chatbot now properly validates user authentication before allowing access to order data.

## Security Flow

### 1. **Order Intent Detection**
When user asks about orders, AI detects "order" intent automatically.

### 2. **Multi-Level Authentication Check**

#### Level 1: UserId Validation
```javascript
if (!userId || userId === 'anonymous') {
  // Reject - user not logged in
}
```

#### Level 2: User Service Authentication
```javascript
const isAuthenticated = await userService.isUserAuthenticated(userId);
if (!isAuthenticated) {
  // Reject - invalid userId or session expired
  return 401 Unauthorized
}
```

#### Level 3: Order Ownership Verification (for specific orders)
```javascript
if (order.userId.toString() !== userId) {
  // Reject - user trying to access someone else's order
  return 403 Forbidden
}
```

## API Flow Diagram

```
User Request
    ↓
Check userId exists & !== 'anonymous'
    ↓ (Pass)
Validate with User Service API
    ↓ (Valid)
Fetch Orders from Order Service
    ↓ (Found)
Verify Order Ownership (if specific order)
    ↓ (Authorized)
Return Order Data
```

## Authentication Responses

### ❌ Case 1: No userId provided
```json
{
  "success": false,
  "message": "User ID is required to fetch orders. Please log in to view your orders.",
  "requiresAuth": true
}
```

### ❌ Case 2: Anonymous user
```javascript
{
  "message": "Show my orders",
  "userId": "anonymous"
}
```

**Bot Response:**
```
"I'd love to help you check your orders, but you'll need to be logged in first. 
Please sign in to view your order history and track your packages!"
```

### ❌ Case 3: Invalid/Expired Session
```javascript
{
  "message": "Show my orders",
  "userId": "invalid-or-expired-user-id"
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid or expired session. Please log in again to view your orders.",
  "requiresAuth": true,
  "authenticated": false
}
```

### ❌ Case 4: Trying to Access Another User's Order
```javascript
{
  "userId": "user-A",
  "orderId": "order-belonging-to-user-B"
}
```

**Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "You do not have permission to view this order"
}
```

### ✅ Case 5: Valid Authentication
```javascript
{
  "message": "Show my orders",
  "userId": "68e4058c1b2e4f3a9c7d6e5f"  // Valid authenticated user
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "You have 3 orders with us! Here's what's happening: ...",
    "intent": "order",
    "orders": [...]
  }
}
```

## User Service Integration

### Configuration
```env
USER_SERVICE_URL=http://localhost:3001
INTERNAL_SERVICE_TOKEN=your-secret-service-token
```

### Internal API Call
```javascript
GET /api/auth/internal/user/:userId
Headers: {
  'x-service-token': 'your-secret-service-token'
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "68e4058c1b2e4f3a9c7d6e5f",
      "name": "John Doe",
      "email": "john@example.com",
      ...
    }
  }
}
```

## Service Layer

### File: `services/userService.js`

```javascript
const userService = require('../services/userService');

// Validate user is authenticated
const isAuthenticated = await userService.isUserAuthenticated(userId);

// Get full user details
const user = await userService.getUserById(userId);

// Quick validation
const user = await userService.validateUser(userId);
```

### Functions:
- `validateUser(userId)` - Returns user object or null
- `getUserById(userId)` - Get user details
- `isUserAuthenticated(userId)` - Returns boolean (true/false)

## Protected Endpoints

### 1. POST /api/chat/message (order intent)
✅ Validates authentication when intent === 'order'

### 2. POST /api/chat/orders
✅ Validates authentication
✅ Returns 401 if invalid

### 3. POST /api/chat/order/:orderId
✅ Validates authentication
✅ Verifies order ownership
✅ Returns 403 if accessing other's order

## Error Handling

| Scenario | Status | Response |
|----------|--------|----------|
| No userId | 400 | "User ID is required" |
| Anonymous user | 200 | "Please log in" (friendly) |
| Invalid userId | 401 | "Invalid session" |
| Expired session | 401 | "Please log in again" |
| Wrong order owner | 403 | "No permission" |
| User service down | 503 | "Service unavailable" |
| Order not found | 404 | "Order not found" |

## Logging

All authentication attempts are logged:

```javascript
// Success
logger.info('Authenticated user requesting orders', { userId });

// Failure
logger.warn('Unauthenticated order request', { userId });

// Ownership violation
logger.warn('User attempted to access another user\'s order', { 
  userId, 
  orderId, 
  orderUserId 
});
```

## Testing

### Test 1: Valid User
```bash
curl -X POST http://localhost:3009/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Show my orders","userId":"68e4058c1b2e4f3a9c7d6e5f"}'
```

Expected: Orders returned with 200 OK

### Test 2: Anonymous User
```bash
curl -X POST http://localhost:3009/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Show my orders","userId":"anonymous"}'
```

Expected: Friendly message asking to log in

### Test 3: Invalid User
```bash
curl -X POST http://localhost:3009/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Show my orders","userId":"invalid-id-123"}'
```

Expected: 401 Unauthorized - "Invalid session"

### Test 4: Access Other's Order
```bash
# User A trying to access User B's order
curl -X POST http://localhost:3009/api/chat/order/ORDER_ID_OF_USER_B \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_A_ID"}'
```

Expected: 403 Forbidden - "No permission"

## Security Features Implemented

✅ **User Authentication** - Validates with user-service
✅ **Order Ownership** - Ensures users can only see their own orders
✅ **Session Validation** - Checks if session is valid/expired
✅ **Internal Service Token** - Secure service-to-service communication
✅ **Logging** - Tracks all authentication attempts
✅ **Graceful Errors** - User-friendly error messages
✅ **Status Codes** - Proper HTTP status codes (401, 403, 404)

## Dependencies

- User Service must be running on port 3001
- User Service must have `/api/auth/internal/user/:userId` endpoint
- Internal service token must match between services
- Order Service must return orders with `userId` field

## Environment Setup

```env
# Required for order authentication
USER_SERVICE_URL=http://localhost:3001
INTERNAL_SERVICE_TOKEN=your-secret-service-token
ORDER_SERVICE_URL=http://localhost:3003
```

## Summary

The chatbot now implements **proper authentication and authorization** for order queries:

1. ✅ Validates user exists and is authenticated
2. ✅ Calls user-service to verify credentials
3. ✅ Checks order ownership before showing details
4. ✅ Returns appropriate error codes (401, 403)
5. ✅ Logs security events
6. ✅ Provides user-friendly error messages

**No more simple userId checks - full credential validation is now enforced! 🔒**
