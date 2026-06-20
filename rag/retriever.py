import os
os.environ.setdefault("HF_HUB_DISABLE_IMPLICIT_TOKEN", "1")
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

async def retrieve_tips(destination: str, budget_tier: str, k=5):
    base_dir = os.path.dirname(__file__)
    db_path = os.path.join(base_dir, "../chroma_db")
    
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    vectorstore = Chroma(
        persist_directory=db_path,
        embedding_function=embeddings
    )
    
    results = vectorstore.similarity_search(
        destination,
        k=k,
        filter={
            "$and": [
                {"destination": {"$eq": destination}},
                {"budget_tier": {"$in": [budget_tier, "free"]}}
            ]
        }
    )
    
    return [doc.page_content for doc in results]