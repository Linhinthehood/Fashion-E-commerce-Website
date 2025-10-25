# 🚀 Fashion Service - Get Started

## **📁 Clean Structure**

Your Fashion Service now has a clean, organized structure:

```
backend/fashion-service/
├── main.py              # Full AI mode (requires PyTorch)
├── main_simple.py       # Simple mode (no PyTorch needed)
├── main_with_env.py     # Environment mode (uses .env)
├── run.py               # Easy startup script
├── test.py              # Simple test script
├── test_minimal.py      # Minimal test suite
├── requirements.txt     # Dependencies
├── Dockerfile          # Docker configuration
├── README.md           # Documentation
├── INTEGRATION.md      # Integration guide
├── env.example         # Environment template
└── data/               # AI models and data
```

## **🎯 Quick Start (3 Steps)**

### **Step 1: Start the Service**
```bash
cd backend/fashion-service
python main.py
```

### **Step 2: Test It**
```bash
# In another terminal
python test.py
```

### **Step 3: View API Docs**
Visit: http://localhost:8000/docs

## **🔧 Integration Options**

### **Option 1: Simple Mode (Recommended)**
- ✅ No PyTorch required
- ✅ Uses mock data
- ✅ Fast startup
- ✅ Perfect for testing

### **Option 2: Environment Mode**
- ✅ Uses real database
- ✅ Configurable settings
- ✅ Production ready
- ✅ Requires .env file

### **Option 3: Full AI Mode**
- ✅ Complete AI functionality
- ✅ Machine learning models
- ✅ Advanced recommendations
- ✅ Requires PyTorch

## **📱 API Endpoints**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/products/{id}` | GET | Get product details |
| `/api/v1/recommendations/user/{id}` | POST | Get user recommendations |
| `/api/v1/recommendations/product/{id}` | POST | Get similar products |
| `/api/v1/track/interaction` | POST | Track user interactions |

## **🎉 Ready to Use!**

Your Fashion Service is now clean, organized, and ready for integration with your e-commerce platform. Choose the mode that works best for you and start building AI-powered recommendations! 🚀
