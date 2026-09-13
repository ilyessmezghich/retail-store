import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://retail:retail_dev_password@localhost:5432/retail"
)
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_replace_me")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_replace_me")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("BACKEND_URL", "http://localhost:8000")