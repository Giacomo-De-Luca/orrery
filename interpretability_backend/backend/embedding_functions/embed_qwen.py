import pandas as pd
from sentence_transformers import SentenceTransformer
from time import time
import psutil
import os
import numpy as np
import pickle
from typing import Literal

model_size: Literal["0.6B", "4B", "8B"] = "4B"

model = SentenceTransformer(
	"Qwen/Qwen3-Embedding-4B",
	model_kwargs={"device_map": "mps"},
	tokenizer_kwargs={"padding_side": "left"},
	)




print_memory_usage("Model Loaded")

# Sort sentences by length to optimize padding and processing
sorted_sentences = sorted(example_sentences, key=len)

batch_size = 16
all_embeddings = []
total_batches = (len(sorted_sentences) + batch_size - 1) // batch_size

print(f"Processing {len(sorted_sentences)} sentences in {total_batches} batches...")

time_start = time()

for i in range(0, len(sorted_sentences), batch_size):
    batch = sorted_sentences[i:i + batch_size]
    # Encode the batch
    batch_embeddings = model.encode(batch, show_progress_bar=False)
    all_embeddings.append(batch_embeddings)
    
    batch_num = (i // batch_size) + 1
    if batch_num % 10 == 0:
        print_memory_usage(f"After Batch {batch_num}/{total_batches}")

# Combine all batch embeddings
embeddings = np.vstack(all_embeddings)

time_end = time()
print(f"Encoding took {time_end - time_start} seconds")
print_memory_usage("End")
print(f"Final embeddings shape: {embeddings.shape}")
