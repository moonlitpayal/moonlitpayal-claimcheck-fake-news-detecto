# PROJECT 1: FAKE NEWS DETECTION USING PROPOSITIONAL LOGIC & GRAPH THEORY

**Project Goal:** Create a system that checks if news articles are real or fake by analyzing how claims connect to each other.

---

## QUICK OVERVIEW

Imagine news as a web of connected statements. Real news has statements that support each other logically. Fake news has contradictions or makes illogical jumps. This project builds a tool that detects these patterns.

---

## PHASE 1: PLANNING & SETUP (Cost: ₹0)

### What You Need
- Laptop/Desktop computer
- Python installed (free)
- Text editor or IDE (VS Code - free)

### Steps

**Step 1: Learn the Basics (3-4 days)**
- Understand Propositional Logic: If A is true, then B must be true
- Understand Graph Theory: Things (claims) connected by relationships
- Watch 2-3 YouTube tutorials on these topics

**Step 2: Set Up Your Computer (2 hours)**
1. Download Python from python.org (free)
2. Install it on your computer
3. Open command prompt/terminal
4. Type: `pip install flask networkx matplotlib` (this installs the tools you'll use)
5. Create a folder called "FakeNewsProject"

**Step 3: Understand the Logic (2 days)**
- Draw out how claims connect on paper
- Example: "It rained yesterday" → "The ground is wet" → "Plants look fresh"
- Real news: statements flow logically
- Fake news: statements don't connect or contradict

---

## PHASE 2: BUILDING THE SYSTEM (Cost: ₹0)

### Step 4: Create the Logical Framework (1 week)

**What to Build:**
A system that checks if claims are consistent with each other.

**Simple Code Structure:**
```
1. Take a claim as input
2. Check it against known facts (using Boolean logic: True/False)
3. Mark it as valid or suspicious
```

**Example Logic:**
- Claim: "It's snowing in Mumbai"
- Known fact: Mumbai doesn't get snow
- Result: Suspicious/Fake

**Time Required:** 3-4 days
**Cost:** ₹0

---

### Step 5: Build the Graph Structure (1 week)

**What This Does:**
Creates a visual map showing how claims connect to each other.

**How It Works:**
- Each claim = one dot (called a "node")
- Relationship between claims = line connecting dots (called an "edge")
- If claims support each other = green line
- If claims contradict each other = red line

**What You Code:**
1. Create nodes for each claim
2. Draw edges (connections) between them
3. Analyze the graph pattern
4. Count red vs green lines
   - Too many red lines = Likely fake news

**Time Required:** 4-5 days
**Cost:** ₹0

---

### Step 6: Create the Detection Algorithm (5-6 days)

**Simple Logic:**
1. Input: An article with multiple claims
2. Extract all claims from the article
3. Check each claim using propositional logic
4. Build graph showing relationships
5. Analyze inconsistencies
6. Output: "Likely Real" or "Likely Fake" with confidence score

**Example Output:**
```
Article: "COVID vaccines cause magnetism and change DNA"
Claim 1: "Vaccines have magnetic properties"
Claim 2: "Vaccines change human DNA"
Claim 3: "Government is hiding this"

Analysis:
- Claim 1: No scientific evidence (FALSE)
- Claim 2: No scientific evidence (FALSE)
- Claim 3: Unverifiable assertion (SUSPICIOUS)

Result: LIKELY FAKE (87% confidence)
```

**Time Required:** 5-6 days
**Cost:** ₹0

---

## PHASE 3: USER INTERFACE (Cost: ₹0)

### Step 7: Build a Simple Website (3-4 days)

**What You'll Create:**
A basic web page where users can:
1. Paste an article
2. Click "Check Article"
3. See if it's real or fake

**Technology:** Flask (simple Python web framework)

**Simple Design:**
```
[Text Area - Paste Article Here]
[CHECK ARTICLE Button]
_________________________
RESULT: Likely FAKE
Confidence: 87%
Reasons: 
- Multiple unverifiable claims
- Contradicts known science
- Pattern matches known fake news
```

**Time Required:** 3-4 days
**Cost:** ₹0

---

## PHASE 4: TESTING & IMPROVEMENT (Cost: ₹0)

### Step 8: Test Your System (1 week)

**What to Test:**
1. Test with 10 real news articles → Should say "Real"
2. Test with 10 fake articles → Should say "Fake"
3. Test with mixed articles → Should show confidence score

**Track Results:**
- How many did you get right? (Aim for 70%+)
- Which types of fake news fool it?
- Which types it catches easily?

**Time Required:** 5-7 days
**Cost:** ₹0

---

### Step 9: Improve the System (Ongoing)

**Ways to Make It Better:**
1. Add more news sources to learn from
2. Improve the logic rules
3. Add more fact-checking databases
4. Improve the graph analysis

---

## CHALLENGES & HOW TO OVERCOME THEM

### Challenge 1: System Says Everything is Fake
**Problem:** Your logic is too strict

**Solution:**
- Add nuance: Not every new claim is fake
- Allow for emerging stories
- Ask if it contradicts WELL-ESTABLISHED facts, not just existing facts

---

### Challenge 2: Can't Distinguish Between Opinion & Fact
**Problem:** Opinions are hard to detect as fake

**Solution:**
- Separate factual claims from opinion statements
- Tag claims: "[FACT]" or "[OPINION]"
- Only check facts for truthfulness

---

### Challenge 3: System is Too Slow
**Problem:** Checking every connection takes too long

**Solution:**
- Process claims in batches
- Focus on key claims first
- Use simplified logic checks

---

### Challenge 4: Don't Know if a Claim is True
**Problem:** Your logic checks if claims are consistent, but where do "known facts" come from?

**Solution:**
- Create a "Fact Database" with verified information
- Use Wikipedia, scientific journals, news archives
- Ask: "Does this claim match my database?"

---

## TIMELINE SUMMARY

| Phase | Task | Time | Cost |
|-------|------|------|------|
| 1 | Planning & Setup | 1 week | ₹0 |
| 2 | Logical Framework | 1 week | ₹0 |
| 2 | Graph Structure | 1 week | ₹0 |
| 2 | Detection Algorithm | 1 week | ₹0 |
| 3 | User Interface | 1 week | ₹0 |
| 4 | Testing | 1 week | ₹0 |
| 4 | Improvements | Ongoing | ₹0 |

**Total Time: 6-7 weeks**
**Total Cost: ₹0**

---

## COST BREAKDOWN

```
Laptop: Already have
Python: Free
Libraries (Flask, NetworkX): Free
Server hosting (optional): ₹0-500 if you want to host online

TOTAL: ₹0-500
```

---

## FINAL CHECKLIST

- [ ] Python installed
- [ ] Libraries installed
- [ ] Propositional logic code written
- [ ] Graph structure created
- [ ] Detection algorithm working
- [ ] Website interface built
- [ ] Tested with 20+ articles
- [ ] Accuracy above 70%
- [ ] Documentation completed

---

## HOW TO PRESENT THIS PROJECT

1. **Explanation:** Show how real vs fake news differs in logical structure
2. **Demo:** Paste a real article → Show it's detected as real
3. **Demo:** Paste a fake article → Show it's detected as fake
4. **Code Walkthrough:** Explain the propositional logic
5. **Graph Visual:** Show how claims connect on screen
6. **Challenges:** Explain what was difficult and how you solved it

---

## NEXT STEPS

1. Start Phase 1 immediately
2. Spend time learning the theory (don't skip this!)
3. Build step by step
4. Test frequently
5. Document as you go
6. Keep a journal of what works and what doesn't

Good luck! 🚀
