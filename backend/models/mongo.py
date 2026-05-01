import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME     = os.getenv("DB_NAME", "datalens")

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    if not MONGODB_URL:
        raise RuntimeError("MONGODB_URL environment variable is not set! Add it in Render → Environment.")
    client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=15000)
    await client.admin.command("ping")    # verify connection
    db = client[DB_NAME]
    print(f"[OK] Connected to MongoDB: {DB_NAME}")


async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")


def get_db():
    return db
