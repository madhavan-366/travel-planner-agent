Markdown
# Agentic Travel Planner Monorepo

An advanced multi-agent travel orchestration application. It uses a LangGraph State Machine to automatically balance live external flight/hotel API pricing data with a localized vector store data layer via an automated correction lookback loop.

## Architecture Dataflow Blueprint

[React App client/] ----(POST /api/plan)----> [Express Gateway server/]
|
[React UI Component] <---(SSE Pipe Output)----------+--- (Proxy Request)
^                                                   v
(Renders Stream) <----------------------------- [FastAPI App agent/]
|
[LangGraph Engine graph.py]
├── 1. planner.py
├── 2. tool_executor.py (ChromaDB + APIs)
└── 3. budget_validator.py


## System Requirements
- Node.js v20 or higher
- Python 3.11 or higher
- MongoDB Community Server running locally on port 27017

## Installation Operations

### 1. Ingest Data via Python Vector Pipeline
Open your primary terminal workspace to create and load the persisted database layer:
```bash
cd agent
python3 -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
pip install -r requirements.txt
cd ..
python3 rag/ingest.py
2. Install Microservice Node Dependencies
Open a secondary terminal workspace to prepare the Express API gateway:

Bash
cd server
npm install
Open a tertiary terminal workspace to initialize the Vite frontend environment:

Bash
cd client
npm install
Running the Complete System in Development
To execute all three services concurrently, launch these commands in their respective context environments:

Terminal Workspace 1 (FastAPI AI Engine):

Bash
cd agent
source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
Terminal Workspace 2 (Express Gateway Hub):

Bash
cd server
npm run dev
Terminal Workspace 3 (Vite UX App Host):

Bash
cd client
npm run dev
Open your browser to http://localhost:5173, sign up for an account, and experience real-time agentic streaming.


---

### Verification and Sanity Check

You now have all files generated explicitly from scratch with zero functional gaps or structural assumptions. 

1. **Verify your credentials:** Fill out your `.env` workspace variables based on `.env.example`.
2. **Execute Ingestion:** Run the `rag/ingest.py` script once to build the localized `./chro