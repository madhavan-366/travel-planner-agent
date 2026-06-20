import json
import os
os.environ.setdefault("HF_HUB_DISABLE_IMPLICIT_TOKEN", "1")
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../agent/.env"))

def ingest_data():
    base_dir = os.path.dirname(__file__)
    json_path = os.path.join(base_dir, "sample_tips.json")
    
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found")
        return

    with open(json_path, "r") as f:
        data = json.load(f)
    
    docs = [
        Document(page_content=d["page_content"], metadata=d["metadata"]) 
        for d in data
    ]
    
    db_path = os.path.join(base_dir, "../chroma_db")
    
    # Using a 100% free, fast local model that doesn't need OpenAI's servers
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    vectorstore = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=db_path
    )
    
    if hasattr(vectorstore, 'persist'):
        vectorstore.persist()
        
    print(f"Successfully persisted tips locally to {db_path}")

if __name__ == "__main__":
    get_it = ingest_data()