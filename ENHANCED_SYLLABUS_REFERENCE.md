# Enhanced Syllabus - Quick Reference Guide

## TypeScript Interfaces

### EnhancedTopic
```typescript
export interface EnhancedTopic {
  id: string;                                    // e.g., "addition-single"
  name: string;                                  // e.g., "Addition (Single Digit)"
  cbseGrade: number;                            // 1, 3, 5, etc.
  kumonBand: string;                            // "K", "J", "I", "H", etc.
  practiceLevel: string;                        // "Beginner", "Intermediate", "Advanced"
  skills: { 
    id: string;                                 // e.g., "add-basic"
    difficultyScore: number;                    // 10, 20, 30, etc.
  }[];
}
```

### EnhancedSyllabusResponse
```typescript
export interface EnhancedSyllabusResponse {
  topics: EnhancedTopic[];
}
```

---

## Component Signals

### Practice Hub Signals
```typescript
// Loading state
syllabusLoading: WritableSignal<boolean>
syllabusError: WritableSignal<string>

// Selection state
selectedGrade: WritableSignal<number>
topics: WritableSignal<EnhancedTopic[]>
selectedTopic: WritableSignal<EnhancedTopic | null>
selectedOperation: WritableSignal<string | null>
questionCount: WritableSignal<number>

// Computed values
allowedGrades: Signal<number[]>  // Unique grades from topics
filteredTopics: Signal<EnhancedTopic[]>  // Topics where cbseGrade <= selectedGrade
canGenerate: Signal<boolean>  // grade && topic && operation && !generating
```

---

## Method Reference

### PracticeConfigService

```typescript
// Fetch full syllabus
getSyllabus(): Observable<EnhancedSyllabusResponse>

// Get all topics
getTopics(): Observable<EnhancedTopic[]>

// Get topics for specific grade
getTopicsForGrade(grade: number): Observable<EnhancedTopic[]>
```

### PracticeHubComponent

```typescript
// Load syllabus from backend
loadSyllabus(): void

// Handle grade selection
onGradeChange(grade: number): void

// Select a topic and show its operations
selectTopic(topic: EnhancedTopic): void

// Select an operation from selected topic
selectOperation(operation: string): void

// Generate practice worksheet
async generatePractice(): Promise<void>
```

---

## Data Flow Diagram

```
User visits /practice/hub
        ↓
loadSyllabus() called
        ↓
GET /v2/syllabus/topics
        ↓
topics signal updated
allowedGrades computed
        ↓
User selects grade
        ↓
filteredTopics computed (grade filter applied)
Topic cards rendered
        ↓
User clicks topic card
        ↓
selectTopic(topic) called
selectedTopic signal updated
filteredTopics updates to show operations
        ↓
User selects operation
        ↓
selectOperation(operation) called
selectedOperation signal updated
canGenerate becomes true
        ↓
User clicks "Generate Practice Worksheet"
        ↓
generatePractice() called
        ↓
POST /v1/practice/worksheet with:
  - studentId
  - grade (from selectedGrade)
  - topic (from selectedTopic.id)
  - level (from selectedTopic.practiceLevel)
  - questionCount
  - source: 'practice'
        ↓
Navigate to /practice/worksheet with state:
  - worksheet response
  - selectedGrade
  - selectedTopic (EnhancedTopic object)
  - selectedOperation
  - questionCount
        ↓
Worksheet page displays topic info + questions
```

---

## Common Tasks

### Adding New Topic
The topics are loaded from backend, no frontend changes needed.

### Changing Difficulty Mapping
Update backend EnhancedTopic data:
- Adjust `difficultyScore` in skills array
- Adjust `practiceLevel` string value
- UI automatically reflects changes

### Filtering Topics by Custom Criteria
In PracticeHubComponent, modify `filteredTopics` computed:
```typescript
filteredTopics = computed<EnhancedTopic[]>(() => {
  const grade = this.selectedGrade();
  const allTopics = this.topics();
  if (!grade || !allTopics.length) return [];
  
  // Add custom filter logic here
  return allTopics
    .filter((t) => t.cbseGrade <= grade)
    .filter(t => /* custom criteria */);
});
```

### Display New Topic Metadata
1. Add property to EnhancedTopic interface
2. Update HTML template to show new property in topic card
3. Update CSS if needed for styling

Example:
```typescript
// Interface
export interface EnhancedTopic {
  // ... existing fields
  customField?: string;
}

// Template
<div class="topic-card">
  <h4>{{ topic.name }}</h4>
  <div class="topic-details">
    <!-- ... existing badges ... -->
    <span class="badge">{{ topic.customField }}</span>
  </div>
</div>

// CSS
.badge {
  /* existing styles */
}
```

---

## CSS Class Reference

### Topic Cards
- `.topic-card` - Main container
- `.topic-card.selected` - Selected state (green)
- `.topic-card:hover` - Hover state
- `.topic-details` - Badge container
- `.badge` - Blue badge (default)
- `.kumon-badge` - Indigo badge (Kumon band)
- `.level-badge` - Purple badge (practice level)

### Operations
- `.operations-list` - Container
- `.operation-btn` - Operation button
- `.operation-btn.active` - Selected operation
- `.operation-name` - Operation ID text
- `.difficulty-score` - Difficulty score text

### Topic Info (Worksheet)
- `.topic-info` - Main container
- `.info-group` - Single field
- `.info-group .label` - Field label
- `.info-group .value` - Field value

---

## Grade Display Examples

### Frontend Display
```
Grade 1 Topics:
  ├─ Addition (Single Digit)
  └─ Subtraction (Single Digit)

Grade 3 Topics:
  ├─ Addition (2-digit + 1-digit)
  ├─ Multiplication (2-digit × 1-digit)
  ├─ Division (2-digit ÷ 1-digit)
  └─ Fractions (Basic)

Grade 5 Topics:
  ├─ Decimals (4-place)
  └─ Percentages
```

### CBSE Grade Mapping
- Grade 1 (K): Age 5-6 years
- Grade 3 (J-I): Age 7-8 years
- Grade 5 (H): Age 9-10 years

---

## Navigation Examples

### From Student Dashboard to Practice
```typescript
// In student-dashboard component
navigateToPractice(): void {
  this.router.navigate(['/practice/hub']);
}
```

### From Practice Hub to Worksheet
```typescript
// Already handled in PracticeHubComponent.generatePractice()
await this.router.navigate(['/practice/worksheet'], {
  state: {
    worksheet,
    selectedGrade,
    selectedTopic,
    selectedOperation,
    questionCount,
  },
});
```

### From Worksheet Back to Practice Hub
```typescript
// In worksheet component
navigateBackToPractice(): void {
  this.router.navigate(['/practice/hub']);
}
```

---

## Error Handling

### Loading Errors
```typescript
// In loadSyllabus()
error: () => {
  this.syllabusError.set('Unable to load practice topics. Please try again.');
  this.syllabusLoading.set(false);
}
```

### Generation Errors
```typescript
// In generatePractice()
catch {
  this.worksheetError.set('Failed to generate worksheet. Please try again.');
}
```

---

## Testing Checklist

```
Grade Selection
  ☐ All unique grades from topics displayed
  ☐ Grade chips click-selectable
  ☐ Selected grade shows active state

Topic Filtering
  ☐ filteredTopics updates when grade changes
  ☐ Only topics with cbseGrade <= selectedGrade shown
  ☐ Topics sorted by cbseGrade

Topic Cards
  ☐ Topic name displays correctly
  ☐ cbseGrade badge shows numeric value
  ☐ kumonBand badge shows letter value
  ☐ practiceLevel badge shows level name
  ☐ Card clickable and selects topic
  ☐ Selected topic highlights in green

Operation Selection
  ☐ Operations appear for selected topic
  ☐ Each operation shows skill ID
  ☐ Each operation shows difficulty score
  ☐ Operations single-selectable (radio style)
  ☐ Selected operation highlighted

Worksheet Generation
  ☐ "Generate" button disabled until all fields selected
  ☐ Correct data passed to backend
  ☐ Loading spinner appears during generation
  ☐ Navigation to worksheet succeeds
  ☐ Worksheet state contains all required fields

Worksheet Display
  ☐ Topic info section displays
  ☐ All 5 topic fields shown (name, grade, band, level, operation)
  ☐ Topic info styled with blue background
  ☐ Questions display below topic info
  ☐ Submit button works correctly

Error Handling
  ☐ Syllabus load error shows message
  ☐ Retry button functional
  ☐ Worksheet generation error caught
  ☐ User can retry generation
```

---

## Backend Endpoints

### GET /v2/syllabus
Returns full syllabus response

### GET /v2/syllabus/topics
Returns all topics

### GET /v2/syllabus/topics?grade={grade}
Returns topics filtered by CBSE grade

### POST /v1/practice/worksheet
Creates practice worksheet
- Request: `grade`, `topic`, `level`, `questionCount`, `source`
- Response: `PracticeWorksheetResponse` with questions

---

## Troubleshooting

### Topics Not Loading
1. Check GET /v2/syllabus/topics returns valid EnhancedTopic[]
2. Verify backend returns topics with all required fields
3. Check browser console for HTTP errors
4. Verify API URL in environment.ts

### Grade Filtering Not Working
1. Verify topics have cbseGrade property
2. Check filteredTopics computed logic
3. Ensure selectedGrade is numeric, not string
4. Check for sorting issues in filtered output

### Operations Not Showing
1. Verify selectedTopic has skills array
2. Check skills array not empty
3. Ensure selectTopic() method called when topic clicked
4. Verify HTML has operations-list div

### Worksheet Not Generating
1. Verify canGenerate returns true
2. Check all 3 selections made (grade, topic, operation)
3. Verify POST /v1/practice/worksheet endpoint working
4. Check error message in worksheetError signal

---

## Performance Notes

- Syllabus fetched once on component init
- Topics cached in signal (no repeated API calls)
- Filtering done via computed() (lazy evaluation)
- Template uses *ngFor with trackBy not needed (small dataset)
- No pagination needed (syllabi typically < 50 topics)

---

## Migration Notes

If migrating from old practice system:

1. **Old Route Aliases** - Maintain `/practice/level/:levelName` redirects
2. **State Backwards Compatibility** - Worksheet component handles both old and new state
3. **LearningLevel Type** - Still used elsewhere, not affected by this change
4. **Gradual Rollout** - Can deploy new UI without changing backend immediately


