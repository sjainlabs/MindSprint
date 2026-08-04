# Enhanced Syllabus UI - Visual Examples

## How Grade 1 vs Grade 3 vs Grade 5 Display

### Grade 1 - Beginner Level Topics

**User navigates to /practice/hub**

```
┌─────────────────────────────────────────────────────────────┐
│                     Practice Hub                             │
│  ← Back                                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Select Grade                                                  │
│ [Grade 1] ○ [Grade 3] ○ [Grade 5] ○                        │
└─────────────────────────────────────────────────────────────┘
(Grade 1 is auto-selected as first option)

┌─────────────────────────────────────────────────────────────┐
│ Select a Topic                                                │
│                                                               │
│ ┌──────────────────────┐  ┌──────────────────────┐           │
│ │ Addition             │  │ Subtraction          │           │
│ │ (Single Digit)       │  │ (Single Digit)       │           │
│ │ [Grade 1] [K] [Beg]  │  │ [Grade 1] [K] [Beg]  │           │
│ └──────────────────────┘  └──────────────────────┘           │
│                                                               │
│ ┌──────────────────────┐                                      │
│ │ Counting             │                                      │
│ │ (1-10)               │                                      │
│ │ [Grade 1] [K] [Beg]  │                                      │
│ └──────────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
(Only 3 topics for Grade 1, all at Beginner level)
```

**User clicks "Addition (Single Digit)" topic**

```
┌─────────────────────────────────────────────────────────────┐
│ Operations for Addition (Single Digit)                        │
│                                                               │
│ [✓] Add Basic                           Difficulty: 10      │
│                                                               │
│ [ ] Add With Carrying                   Difficulty: 20      │
│                                                               │
│ [ ] Add Mixed Problems                  Difficulty: 25      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Number of Questions                                           │
│ [20            ]                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ [Generate Practice Worksheet]                                │
└─────────────────────────────────────────────────────────────┘

(User generates worksheet → navigates to /practice/worksheet)

┌─────────────────────────────────────────────────────────────┐
│ Addition (Single Digit)                                       │
│ Practice these addition problems                              │
│                                                               │
│ Topic Info:                                                   │
│ ┌─────────────┬─────────────┬──────────────┬──────────────┐  │
│ │Topic: Add.. │Grade: 1     │Kumon: K      │Level: Beg.   │  │
│ │Operation: Add Basic       │              │              │  │
│ └─────────────┴─────────────┴──────────────┴──────────────┘  │
│                                                               │
│ Progress: 0/20                                                │
│                                                               │
│ Question 1                                                    │
│ 3 + 2 = ____                                                  │
│ [Your answer                                          ]       │
│                                                               │
│ [... more questions ...]                                      │
│                                                               │
│                              [Submit]                         │
└─────────────────────────────────────────────────────────────┘
```

---

### Grade 3 - Intermediate Level Topics

**User re-enters /practice/hub and selects Grade 3**

```
┌─────────────────────────────────────────────────────────────┐
│ Select Grade                                                  │
│ [ ] Grade 1        [✓] Grade 3        [ ] Grade 5            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Select a Topic                                                │
│                                                               │
│ ┌──────────────────────┐  ┌──────────────────────┐           │
│ │ Addition             │  │ Subtraction          │           │
│ │ (Single Digit)       │  │ (Single Digit)       │           │
│ │ [Grade 1] [K] [Beg]  │  │ [Grade 1] [K] [Beg]  │           │
│ └──────────────────────┘  └──────────────────────┘           │
│                                                               │
│ ┌──────────────────────┐  ┌──────────────────────┐           │
│ │ Multiplication       │  │ Division             │           │
│ │ (2-digit × 1-digit)  │  │ (2-digit ÷ 1-digit)  │           │
│ │ [Grade 3] [J] [Int]  │  │ [Grade 3] [J] [Int]  │           │
│ └──────────────────────┘  └──────────────────────┘           │
│                                                               │
│ ┌──────────────────────┐  ┌──────────────────────┐           │
│ │ Fractions            │  │ Decimals (2-place)   │           │
│ │ (Basic)              │  │                      │           │
│ │ [Grade 3] [I] [Int]  │  │ [Grade 3] [I] [Beg]  │           │
│ └──────────────────────┘  └──────────────────────┘           │
│                                                               │
│ ┌──────────────────────┐                                      │
│ │ Word Problems        │                                      │
│ │ (Simple)             │                                      │
│ │ [Grade 3] [J] [Int]  │                                      │
│ └──────────────────────┘                                      │
│                                                               │
│ (7 topics: 2 inherited from Grade 1, 5 new at Grade 3)       │
│ (Note: All Grade 1 topics appear, plus new Grade 3 topics)  │
└─────────────────────────────────────────────────────────────┘
```

**Key Observation:**
- Grade 1 topics still visible (Addition, Subtraction)
- New Grade 3 topics appear (Multiplication, Division, Fractions, Decimals, Word Problems)
- CBSE Grade badges show 1 or 3 to indicate difficulty level
- Users can practice simpler topics or jump to more complex ones

**User clicks "Multiplication (2-digit × 1-digit)"**

```
┌─────────────────────────────────────────────────────────────┐
│ Operations for Multiplication (2-digit × 1-digit)            │
│                                                               │
│ [ ] Multiply Basic (no carrying)        Difficulty: 15      │
│                                                               │
│ [✓] Multiply With Carrying              Difficulty: 35      │
│                                                               │
│ [ ] Multiply Mixed (carrying + no)      Difficulty: 40      │
└─────────────────────────────────────────────────────────────┘

(Difficulty scores are higher for Grade 3 operations!)

┌─────────────────────────────────────────────────────────────┐
│ [Generate Practice Worksheet]                                │
└─────────────────────────────────────────────────────────────┘

(Navigate to worksheet)

┌─────────────────────────────────────────────────────────────┐
│ Multiplication (2-digit × 1-digit)                            │
│ Practice multiplication with carrying                         │
│                                                               │
│ Topic Info:                                                   │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│ │Topic: Mult.. │Grade: 3      │Kumon: J      │Level: Int.   │ │
│ │Operation: Multiply With Carrying                          │ │
│ └──────────────┴──────────────┴──────────────┴──────────────┘ │
│                                                               │
│ Progress: 0/20                                                │
│                                                               │
│ Question 1                                                    │
│ 23 × 7 = ____                                                 │
│ [Your answer                                          ]       │
│                                                               │
│ Question 2                                                    │
│ 45 × 6 = ____                                                 │
│ [Your answer                                          ]       │
│                                                               │
│ [... more questions ...]                                      │
│                                                               │
│                              [Submit]                         │
└─────────────────────────────────────────────────────────────┘
```

---

### Grade 5 - Advanced Level Topics

**User goes back to practice hub and selects Grade 5**

```
┌─────────────────────────────────────────────────────────────┐
│ Select Grade                                                  │
│ [ ] Grade 1        [ ] Grade 3        [✓] Grade 5            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Select a Topic                                                │
│                                                               │
│ ┌──────────────────────┐  ┌──────────────────────┐           │
│ │ Addition             │  │ Subtraction          │           │
│ │ (Single Digit)       │  │ (Single Digit)       │           │
│ │ [Grade 1] [K] [Beg]  │  │ [Grade 1] [K] [Beg]  │           │
│ └──────────────────────┘  └──────────────────────┘           │
│                                                               │
│ ┌──────────────────────┐  ┌──────────────────────┐           │
│ │ Multiplication       │  │ Division             │           │
│ │ (2-digit × 1-digit)  │  │ (2-digit ÷ 1-digit)  │           │
│ │ [Grade 3] [J] [Int]  │  │ [Grade 3] [J] [Int]  │           │
│ └──────────────────────┘  └──────────────────────┘           │
│                                                               │
│ ┌──────────────────────┐  ┌──────────────────────┐           │
│ │ Fractions            │  │ Decimals (2-place)   │           │
│ │ (Basic)              │  │                      │           │
│ │ [Grade 3] [I] [Int]  │  │ [Grade 3] [I] [Beg]  │           │
│ └──────────────────────┘  └──────────────────────┘           │
│                                                               │
│ ┌──────────────────────┐  ┌──────────────────────┐           │
│ │ Decimals (4-place)   │  │ Percentages          │           │
│ │                      │  │                      │           │
│ │ [Grade 5] [H] [Adv]  │  │ [Grade 5] [H] [Adv]  │           │
│ └──────────────────────┘  └──────────────────────┘           │
│                                                               │
│ ┌──────────────────────┐  ┌──────────────────────┐           │
│ │ Ratios & Proportions │  │ Word Problems        │           │
│ │                      │  │ (Complex)            │           │
│ │ [Grade 5] [H] [Adv]  │  │ [Grade 5] [H] [Adv]  │           │
│ └──────────────────────┘  └──────────────────────┘           │
│                                                               │
│ (11 topics: all Grade 1 + Grade 3 + new Grade 5)             │
│ (Badge colors show: blue [Grade 1], indigo [Grade 3], blue   │
│  [Grade 5], purple level badges)                             │
└─────────────────────────────────────────────────────────────┘
```

**User clicks "Percentages" (advanced Grade 5 topic)**

```
┌─────────────────────────────────────────────────────────────┐
│ Operations for Percentages                                    │
│                                                               │
│ [ ] Calculate Basic Percentage          Difficulty: 50      │
│                                                               │
│ [✓] Find Percentage of Number           Difficulty: 60      │
│                                                               │
│ [ ] Percentage Increase/Decrease        Difficulty: 75      │
│                                                               │
│ [ ] Complex Percentage Problems         Difficulty: 90      │
│                                                               │
│ (Much higher difficulty scores for Grade 5!)                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ [Generate Practice Worksheet]                                │
└─────────────────────────────────────────────────────────────┘

(Navigate to worksheet)

┌─────────────────────────────────────────────────────────────┐
│ Percentages                                                   │
│ Find percentages of numbers and amounts                      │
│                                                               │
│ Topic Info:                                                   │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│ │Topic: Percent│Grade: 5      │Kumon: H      │Level: Adv.   │ │
│ │Operation: Find Percentage of Number                       │ │
│ └──────────────┴──────────────┴──────────────┴──────────────┘ │
│                                                               │
│ Progress: 0/20                                                │
│                                                               │
│ Question 1                                                    │
│ What is 25% of 200?                                           │
│ [Your answer                                          ]       │
│                                                               │
│ Question 2                                                    │
│ What is 33% of 450?                                           │
│ [Your answer                                          ]       │
│                                                               │
│ [... more questions ...]                                      │
│                                                               │
│                              [Submit]                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Difficulty Progression Visualization

### Topic Hierarchy by Grade

```
GRADE 1 (Beginner)
├── Addition (Single Digit) ─ Difficulty: 10-25
├── Subtraction (Single Digit) ─ Difficulty: 10-25
└── Counting (1-10) ─ Difficulty: 5-10

GRADE 3 (Intermediate) [Inherits all Grade 1 + adds]
├── Multiplication (2-digit × 1-digit) ─ Difficulty: 15-40
├── Division (2-digit ÷ 1-digit) ─ Difficulty: 20-45
├── Fractions (Basic) ─ Difficulty: 25-40
├── Decimals (2-place) ─ Difficulty: 25-35
└── Word Problems (Simple) ─ Difficulty: 30-45

GRADE 5 (Advanced) [Inherits all Grade 1 + Grade 3 + adds]
├── Decimals (4-place) ─ Difficulty: 40-60
├── Percentages ─ Difficulty: 50-90
├── Ratios & Proportions ─ Difficulty: 55-85
└── Word Problems (Complex) ─ Difficulty: 60-90
```

### CBSE Grade vs Kumon Band Mapping

```
CBSE Grade 1  → Kumon Band K  (Age 5-6)   → beginner/very_easy
CBSE Grade 3  → Kumon Band J  (Age 7-8)   → intermediate/easy_medium
CBSE Grade 5  → Kumon Band H  (Age 9-10)  → advanced/medium_hard
```

---

## Badge Color Reference

### How Badges Display

```
Grade 1 Topics:
  ┌─────────┐  ┌─────┐  ┌─────────┐
  │ Grade 1 │  │  K  │  │Beginner │
  └─────────┘  └─────┘  └─────────┘
   BLUE         INDIGO   PURPLE
  (#2563eb)    (#6366f1) (#a855f7)

Grade 3 Topics:
  ┌─────────┐  ┌─────┐  ┌──────────┐
  │ Grade 3 │  │  J  │  │Intermed. │
  └─────────┘  └─────┘  └──────────┘
   BLUE         INDIGO   PURPLE
  (#2563eb)    (#6366f1) (#a855f7)

Grade 5 Topics:
  ┌─────────┐  ┌─────┐  ┌─────────┐
  │ Grade 5 │  │  H  │  │Advanced  │
  └─────────┘  └─────┘  └─────────┘
   BLUE         INDIGO   PURPLE
  (#2563eb)    (#6366f1) (#a855f7)
```

---

## Key UI Behaviors

### 1. Topic Filtering
```
When Grade 1 Selected: Show topics with cbseGrade <= 1
  → Result: 3 topics (all beginner level)

When Grade 3 Selected: Show topics with cbseGrade <= 3
  → Result: 7 topics (beginner + intermediate mix)

When Grade 5 Selected: Show topics with cbseGrade <= 5
  → Result: 11 topics (full difficulty range)
```

### 2. Card Selection
```
Before Selection:
  ┌──────────────────────┐
  │ Topic Name           │
  │ [Badge] [Badge] [B]  │
  └──────────────────────┘  (light gray background)

After Selection:
  ┌──────────────────────┐
  │ Topic Name           │
  │ [Badge] [Badge] [B]  │
  └──────────────────────┘  (green background, green border)
```

### 3. Operation Display
```
When Topic Selected (not yet): "No operations section shown"

When Topic Selected: "Operations for [Topic Name]"
  ○ Operation 1        Difficulty: 10
  ○ Operation 2        Difficulty: 20
  ○ Operation 3        Difficulty: 30
  
Selected operation shows checkmark (✓) and blue highlight
```

### 4. Worksheet Context
```
Before viewing questions: "Topic Info section displayed"
  ┌────────────────────────────────────────┐
  │ Topic: [name]   Grade: [#]   Band: [#] │
  │ Level: [level]  Operation: [id]        │
  └────────────────────────────────────────┘
  
This reminds user what they're practicing!
```

---

## Summary: Grade 1 vs Grade 3 vs Grade 5

| Feature | Grade 1 | Grade 3 | Grade 5 |
|---------|---------|---------|---------|
| **Topics Available** | 3 | 7 | 11 |
| **Difficulty Level** | Beginner | Intermediate | Advanced |
| **Kumon Band** | K | J, I, H | H |
| **Operations** | 2-3 per topic | 3-4 per topic | 4-5 per topic |
| **Difficulty Scores** | 5-25 | 15-45 | 40-90 |
| **Example Topic** | Addition | Multiplication | Percentages |
| **Problem Type** | Single digit | 2-digit | Decimal/Percentage |
| **UI Color** | Blue badges | Indigo badges | Blue badges |
| **Practice Level Badge** | Beginner (purple) | Intermediate (purple) | Advanced (purple) |

---

## Implementation Complete ✅

The UI now correctly displays difficulty progression from Grade 1 → Grade 3 → Grade 5, with:
- ✅ Visual difficulty indicators (CBSE Grade badges)
- ✅ Proper topic filtering (cbseGrade <= selectedGrade)
- ✅ Increasing complexity of operations
- ✅ Higher difficulty scores for advanced topics
- ✅ Clear topic information in worksheets
- ✅ Professional, color-coded UI

Students can now see exactly what difficulty level they're practicing at!


