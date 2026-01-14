"""
Example usage of the WordNet parser
"""

from interpretability_backend.experiments.wordnet_parser import WordNetParser

# Initialize the parser
wn = WordNetParser('english-wordnet-2024.xml')

# Parse the file (this will take a minute)
wn.parse()

# Example 1: Get all words
print("=" * 60)
print("Example 1: Getting all words")
print("=" * 60)
all_words = wn.get_all_words()
print(f"Total words in WordNet: {len(all_words):,}")
print(f"First 10 words: {all_words[:10]}")
print(f"Last 10 words: {all_words[-10:]}")

# Example 2: Look up a specific word
print("\n" + "=" * 60)
print("Example 2: Looking up 'python'")
print("=" * 60)
word_entries = wn.get_word('python')
if word_entries:
    for entry in word_entries:
        print(f"\nWord: {entry.word} ({entry.part_of_speech})")
        for i, sense in enumerate(entry.senses, 1):
            print(f"  Sense {i}: {sense.definition}")
            if sense.examples:
                for ex in sense.examples[:2]:
                    print(f"    Example: {ex}")

# Example 3: Get definitions in simple format
print("\n" + "=" * 60)
print("Example 3: Get definitions for 'bank'")
print("=" * 60)
definitions = wn.get_definitions('bank')
for defn in definitions[:5]:  # Show first 5
    print(f"\n[{defn['part_of_speech']}] {defn['definition']}")
    if defn['examples']:
        print(f"  Examples: {defn['examples'][0]}")

# Example 4: Search for words with a prefix
print("\n" + "=" * 60)
print("Example 4: Search for words starting with 'comp'")
print("=" * 60)
comp_words = wn.search_words('comp')
print(f"Found {len(comp_words)} words starting with 'comp'")
print(f"First 20: {comp_words[:20]}")

# Example 5: Iterate through all words and their definitions
print("\n" + "=" * 60)
print("Example 5: Find all words with 'obsolete' in definition")
print("=" * 60)
obsolete_words = []
for word in wn.get_all_words():
    defs = wn.get_definitions(word)
    for d in defs:
        if 'obsolete' in d['definition'].lower():
            obsolete_words.append(word)
            break

print(f"Found {len(obsolete_words)} words with 'obsolete' in definition")
print(f"Examples: {obsolete_words[:10]}")

# Example 6: Statistics
print("\n" + "=" * 60)
print("Example 6: WordNet statistics")
print("=" * 60)
stats = wn.get_stats()
for key, value in stats.items():
    print(f"  {key.replace('_', ' ').title()}: {value:,}")
