import pandas as pd
import sqlite3
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import json
import os

# Initialize embedding model
print("Loading embedding model...")
model = SentenceTransformer('all-MiniLM-L6-v2')  # Lightweight, fast model

# Initialize ChromaDB
print("Initializing vector database...")
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="thrivemap_rubric",
    metadata={"description": "ThriveMap Grading Rubric for RAG"}
)

# Read the rubric data
db_file = "thrivemap_grading.db"
conn = sqlite3.connect(db_file)

# Process Line By Line sheet - this contains the actual rubric questions
print("Processing rubric questions...")
df = pd.read_sql_query("SELECT * FROM Line_By_Line", conn)

# Extract meaningful rubric content
rubric_items = []

for idx, row in df.iterrows():
    # Get the question/prompt text
    question_text = str(row.get('GEM_2025_Thrive_Map_GRADING_FORM', ''))
    section_code = str(row.get('Column_1', ''))
    points = row.get('Column_3', '')
    grade = str(row.get('Grade', ''))
    
    # Skip empty or header rows
    if pd.isna(question_text) or question_text.strip() == '' or question_text.startswith('Please save'):
        continue
    
    # Build a comprehensive text chunk for embedding
    chunk_text = ""
    if section_code and section_code.strip() and not pd.isna(section_code):
        chunk_text += f"Section {section_code}: "
    
    chunk_text += question_text
    
    if points and not pd.isna(points):
        chunk_text += f" (Points: {points})"
    
    # Create metadata
    metadata = {
        "section_code": section_code if section_code and not pd.isna(section_code) else "",
        "question": question_text,
        "points": str(points) if points and not pd.isna(points) else "",
        "row_index": str(idx)
    }
    
    rubric_items.append({
        "id": f"rubric_item_{idx}",
        "text": chunk_text,
        "metadata": metadata
    })

# Process Grading Map
print("Processing grading map...")
df_grading = pd.read_sql_query("SELECT * FROM Grading_Map WHERE Grade IS NOT NULL AND Grade != ''", conn)

for idx, row in df_grading.iterrows():
    grade = str(row.get('Grade', ''))
    to_val = row.get('To', '')
    from_val = row.get('From', '')
    
    if grade and grade.strip() and grade not in ['Grade Map', '']:
        chunk_text = f"Grade {grade}: Score range from {from_val} to {to_val}"
        
        rubric_items.append({
            "id": f"grading_map_{idx}",
            "text": chunk_text,
            "metadata": {
                "type": "grading_map",
                "grade": grade,
                "to": str(to_val) if not pd.isna(to_val) else "",
                "from": str(from_val) if not pd.isna(from_val) else ""
            }
        })

conn.close()

print(f"Found {len(rubric_items)} rubric items to embed")

# Generate embeddings and store in ChromaDB
print("Generating embeddings...")
texts = [item["text"] for item in rubric_items]
embeddings = model.encode(texts, show_progress_bar=True)

# Store in ChromaDB
print("Storing in vector database...")
ids = [item["id"] for item in rubric_items]
metadatas = [item["metadata"] for item in rubric_items]

collection.add(
    ids=ids,
    embeddings=embeddings.tolist(),
    documents=texts,
    metadatas=metadatas
)

print(f"\n[SUCCESS] RAG system ready!")
print(f"[SUCCESS] Stored {len(rubric_items)} rubric items in vector database")
print(f"[SUCCESS] Vector database location: ./chroma_db/")

