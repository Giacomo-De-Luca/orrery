"""
Examples demonstrating synset and relationship functionality
"""

from interpretability_backend.experiments.wordnet_parser import WordNetParser

# Initialize and parse
wn = WordNetParser('english-wordnet-2024.xml')
wn.parse()

print("=" * 70)
print("SYNSET EXAMPLES")
print("=" * 70)

# Example 1: Get all synsets for a word
print("\n1. Get all synsets for 'dog'")
print("-" * 70)
synsets = wn.get_synsets_for_word('dog')
print(f"Found {len(synsets)} synsets for 'dog':\n")
for i, synset in enumerate(synsets, 1):
    print(f"{i}. [{synset.id}] {synset.definition}")
    print(f"   Examples: {synset.examples[:2] if synset.examples else 'None'}")

# Example 2: Get synonyms for a word
print("\n" + "=" * 70)
print("2. Get synonyms for 'happy'")
print("-" * 70)
synonyms = wn.get_synonyms('happy')
print(f"All synonyms for 'happy': {synonyms[:10]}")

# Get synonyms for a specific sense
word_entries = wn.get_word('happy')
if word_entries:
    print(f"\nSynonyms by sense:")
    sense_num = 1
    for entry in word_entries:
        for i, sense in enumerate(entry.senses, 1):
            sense_synonyms = wn.get_synonyms('happy', sense_num)
            print(f"  Sense {sense_num} ({sense.definition[:50]}...): {sense_synonyms}")
            sense_num += 1

# Example 3: Get a specific synset and its words
print("\n" + "=" * 70)
print("3. Explore a specific synset")
print("-" * 70)
# Let's use the first synset from 'dog'
if synsets:
    dog_synset = synsets[0]
    print(f"Synset: {dog_synset.id}")
    print(f"Definition: {dog_synset.definition}")
    print(f"Part of Speech: {dog_synset.part_of_speech}")

    # Get all words in this synset (synonyms)
    words_in_synset = wn.get_words_in_synset(dog_synset.id)
    print(f"Words in this synset: {words_in_synset}")

    # Get available relation types
    rel_types = wn.get_relation_types(dog_synset.id)
    print(f"Available relations: {rel_types}")

# Example 4: Navigate synset relationships
print("\n" + "=" * 70)
print("4. Navigate synset relationships for 'dog'")
print("-" * 70)
if synsets:
    dog_synset = synsets[0]

    # Get hypernyms (more general)
    hypernyms = wn.get_hypernyms(dog_synset.id)
    print(f"Hypernyms (more general concepts):")
    for hyper in hypernyms[:5]:
        words = wn.get_words_in_synset(hyper.id)
        print(f"  - {words}: {hyper.definition}")

    # Get hyponyms (more specific)
    hyponyms = wn.get_hyponyms(dog_synset.id)
    print(f"\nHyponyms (more specific concepts) - showing first 10:")
    for hypo in hyponyms[:10]:
        words = wn.get_words_in_synset(hypo.id)
        print(f"  - {words}: {hypo.definition}")

# Example 5: Explore relationship chains
print("\n" + "=" * 70)
print("5. Explore hypernym chain for 'cat' (cat -> animal -> ...)")
print("-" * 70)
cat_synsets = wn.get_synsets_for_word('cat')
if cat_synsets:
    cat_synset = cat_synsets[0]  # Take the first sense
    print(f"Starting from: {wn.get_words_in_synset(cat_synset.id)}")
    print(f"Definition: {cat_synset.definition}\n")

    # Explore hypernym chains
    chains = wn.explore_synset_chain(cat_synset.id, 'hypernym', max_depth=5)

    # Show the first few chains
    print(f"Found {len(chains)} hypernym path(s). Showing first 3:\n")
    for i, chain in enumerate(chains[:3], 1):
        print(f"Chain {i}:")
        for j, synset in enumerate(chain):
            words = wn.get_words_in_synset(synset.id)
            indent = "  " * j
            print(f"{indent}→ {words[0] if words else 'N/A'}: {synset.definition[:60]}...")

# Example 6: Find all relation types in the dataset
print("\n" + "=" * 70)
print("6. Discover all relation types in WordNet")
print("-" * 70)
all_relation_types = set()
for synset in list(wn.synsets.values())[:1000]:  # Sample first 1000
    for relation in synset.relations:
        all_relation_types.add(relation.relation_type)

print(f"Relation types found (sample): {sorted(all_relation_types)}")

# Example 7: Get related synsets of any type
print("\n" + "=" * 70)
print("7. Get all related synsets for 'run' (verb)")
print("-" * 70)
run_synsets = wn.get_synsets_for_word('run')
verb_synsets = [s for s in run_synsets if s.part_of_speech == 'v']

if verb_synsets:
    run_synset = verb_synsets[0]
    print(f"Synset: {run_synset.definition}\n")

    # Get all relations grouped by type
    rel_types = wn.get_relation_types(run_synset.id)
    for rel_type in rel_types[:5]:  # Show first 5 relation types
        related = wn.get_related_synsets(run_synset.id, rel_type)
        print(f"{rel_type}: {len(related)} related synset(s)")
        for rel_synset in related[:2]:  # Show first 2
            words = wn.get_words_in_synset(rel_synset.id)
            print(f"  → {words[:3]}: {rel_synset.definition[:50]}...")

# Example 8: Find semantic similarity by shared hypernyms
print("\n" + "=" * 70)
print("8. Find shared hypernyms between 'cat' and 'dog'")
print("-" * 70)
cat_synsets = wn.get_synsets_for_word('cat')
dog_synsets = wn.get_synsets_for_word('dog')

if cat_synsets and dog_synsets:
    cat_synset = cat_synsets[0]
    dog_synset = dog_synsets[0]

    # Get hypernyms for both
    cat_hypernyms = set(h.id for h in wn.get_hypernyms(cat_synset.id))
    dog_hypernyms = set(h.id for h in wn.get_hypernyms(dog_synset.id))

    # Find shared hypernyms
    shared = cat_hypernyms & dog_hypernyms
    print(f"Shared hypernyms: {len(shared)}")
    for shared_id in list(shared)[:5]:
        synset = wn.get_synset(shared_id)
        if synset:
            words = wn.get_words_in_synset(shared_id)
            print(f"  - {words}: {synset.definition}")

# Example 9: Analyze a word's polysemy (multiple meanings)
print("\n" + "=" * 70)
print("9. Analyze polysemy of 'bank'")
print("-" * 70)
bank_synsets = wn.get_synsets_for_word('bank')
print(f"'bank' has {len(bank_synsets)} different senses:\n")

for i, synset in enumerate(bank_synsets, 1):
    synonyms = wn.get_words_in_synset(synset.id)
    print(f"{i}. [{synset.part_of_speech}] {synset.definition}")
    print(f"   Synonyms: {', '.join(synonyms[:5])}")
    if synset.examples:
        print(f"   Example: {synset.examples[0]}")
    print()

print("=" * 70)
print("Examples complete!")
print("=" * 70)
