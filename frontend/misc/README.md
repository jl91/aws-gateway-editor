# Test Gateways

This folder contains sample OpenAPI specifications for testing the AWS API Gateway Editor.

## Files

### test-gateway.yaml
A comprehensive sample API Gateway specification that includes:

- **Multiple endpoints**: Users, Products, Orders, Authentication, Health Check
- **Various HTTP methods**: GET, POST, PUT, DELETE
- **AWS API Gateway extensions**:
  - x-amazon-apigateway-integration (HTTP proxy, AWS proxy, Mock, AWS service)
  - x-amazon-apigateway-request-validator
  - x-amazon-apigateway-gateway-responses
- **Security schemes**: API Key, Bearer Token, OAuth2
- **Request/Response examples**: Including different content types
- **Parameters**: Query, Path, Header parameters
- **Schemas**: Complex data models with references
- **Error responses**: Standardized error handling

## Usage

1. Open the AWS API Gateway Editor
2. Click "Open Repository" or "Open Folder"
3. Navigate to this `misc` folder
4. Select `test-gateway.yaml`
5. The editor will load the specification and allow you to:
   - View and edit endpoints
   - Manage parameters and request bodies
   - Configure AWS integrations
   - Test endpoints with generated curl commands
   - Export the modified specification

## Testing Features

This test gateway helps verify:
- ✅ Loading and parsing OpenAPI 3.0 specifications
- ✅ Displaying endpoint lists with filtering
- ✅ Editing endpoint details in modal
- ✅ AWS API Gateway specific configurations
- ✅ Multiple security schemes
- ✅ Request/Response validation
- ✅ Schema references ($ref)
- ✅ Multiple content types
- ✅ Error handling

## ENDPOINTS

### GET /users

- **ID:** listUsers
- **Summary:** List all users
- **Modified:** 2025-08-29T20:34:18.987Z

```bash
curl -X GET 'https://api.example.com/users' \
  -H 'Accept: application/json'
```

---

### POST /users

- **ID:** createUser
- **Summary:** Create a new user
- **Modified:** 2025-08-29T20:34:18.987Z

```bash
curl -X POST 'https://api.example.com/users' \
  -H 'Accept: application/json'
```

---

### GET /resource/{id}/testeds

- **ID:** hkjhkjhj
- **Summary:** No summary provided
- **Modified:** 2025-08-29T20:34:18.987Z

```bash
curl -X GET 'https://api.example.com/resource/{id}/testeds' \
  -H 'Accept: application/json'
```

---
