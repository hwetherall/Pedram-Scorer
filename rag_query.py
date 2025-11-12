import chromadb
from sentence_transformers import SentenceTransformer
import pandas as pd

# Initialize embedding model (same as used for indexing)
model = SentenceTransformer('all-MiniLM-L6-v2')

# Connect to ChromaDB
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_collection("thrivemap_rubric")

def search_rubric(query_text, n_results=5):
    """
    Search the rubric using semantic similarity
    
    Args:
        query_text: The search query/question
        n_results: Number of results to return
    
    Returns:
        List of relevant rubric items
    """
    # Generate embedding for query
    query_embedding = model.encode([query_text])[0]
    
    # Search in ChromaDB
    results = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=n_results
    )
    
    return results

def format_results(results):
    """Format search results for display"""
    formatted = []
    for i in range(len(results['ids'][0])):
        item = {
            'id': results['ids'][0][i],
            'text': results['documents'][0][i],
            'metadata': results['metadatas'][0][i],
            'distance': results['distances'][0][i] if 'distances' in results else None
        }
        formatted.append(item)
    return formatted

def rag_query(query_text, n_results=5):
    """
    Perform a RAG query and return formatted results
    
    Example:
        results = rag_query("What questions are about passions and goals?")
    """
    results = search_rubric(query_text, n_results)
    return format_results(results)

if __name__ == "__main__":
    print("=" * 70)
    print("ThriveMap Rubric RAG System")
    print("=" * 70)
    
    # Example queries
    example_queries = [
        "What questions are about passions and goals?",
        "What are the grading criteria?",
        "What questions relate to career opportunities?",
        "What is the scoring scheme?",
        "What questions ask about values and role models?"
    ]
    
    for query in example_queries:
        print(f"\n{'='*70}")
        print(f"Query: {query}")
        print(f"{'='*70}")
        
        results = rag_query(query, n_results=3)
        
        for i, result in enumerate(results, 1):
            print(f"\nResult {i} (similarity: {1 - result['distance']:.3f}):")
            print(f"  Text: {result['text']}")
            if result['metadata'].get('section_code'):
                print(f"  Section: {result['metadata']['section_code']}")
            if result['metadata'].get('points'):
                print(f"  Points: {result['metadata']['points']}")

