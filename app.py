from flask import Flask, request, jsonify, render_template
from pymongo import MongoClient
from datetime import datetime
import os

app = Flask(__name__)

# --- DATABASE SETUP ---
# Securely get the connection string from environment variables
MONGO_URI = os.environ.get("MONGO_STRING", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["github"]
collection = db["event"]

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/webhook", methods=["POST"])
def webhook():
    payload = request.json
    event_type = request.headers.get("X-GitHub-Event")

    if not payload:
        return jsonify({"error": "No payload received"}), 400

    # Base data structure
    data = {
        "timestamp": datetime.utcnow(),
        "from_branch": None
    }

    # Logic for PUSH events
    if event_type == "push":
        data.update({
            "request_id": payload.get("after"),
            "author": payload.get("pusher", {}).get("name"),
            "action": "PUSH",
            "to_branch": payload.get("ref", "").split("/")[-1]
        })

    # Logic for PULL REQUEST and MERGE events
    elif event_type == "pull_request":
        pr = payload.get("pull_request", {})
        data.update({
            "request_id": str(pr.get("id")),
            "author": pr.get("user", {}).get("login"),
            "action": "PULL_REQUEST",
            "from_branch": pr.get("head", {}).get("ref"),
            "to_branch": pr.get("base", {}).get("ref")
        })

        # Override action if the PR was closed and merged
        if payload.get("action") == "closed" and pr.get("merged"):
            data["action"] = "MERGE"

    else:
        # Silently ignore other event types (e.g., ping, issues)
        return jsonify({"msg": f"Event type {event_type} ignored"}), 200

    # Store in MongoDB
    collection.insert_one(data)
    return jsonify({"msg": "stored"}), 200

@app.route("/events", methods=["GET"])
def get_events():
    try:
        # Pagination Parameters
        page = int(request.args.get("page", 1))
        limit = 6  
        skip = (page - 1) * limit

        # 1. Get the real total count from MongoDB
        total_records = collection.count_documents({})
        
        # 2. Fetch the records for the current page
        results = list(
            collection.find()
            .sort("timestamp", -1)
            .skip(skip)
            .limit(limit)
        )

        # Format the data for JSON response
        for r in results:
            r["_id"] = str(r["_id"])
            # Professional date format: "22 Feb 2026 • 12:45 AM"
            r["timestamp"] = r["timestamp"].strftime("%d %b %Y • %I:%M %p")

        # 3. Return structured response with metadata
        return jsonify({
            "events": results,
            "total_count": total_records,
            "current_page": page,
            "has_next": (skip + limit) < total_records
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Entry point for Render/Local
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)