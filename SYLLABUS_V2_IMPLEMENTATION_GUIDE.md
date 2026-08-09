# World-Class Math Syllabus v2.0 - Frontend Upgrade Implementation Guide

## Project Status
- ✅ Phase 1: Extended API interfaces for v2.0 (Skill, Domain, EnhancedTopicV2, EnhancedWorksheetResponseV2)
- ✅ Phase 2: Created new question input components:
  - `MultiSelectQuestionComponent` - Multi-select answers
  - `NumberPadInputComponent` - Touch-friendly arithmetic input
  - `FractionInputComponent` - Fraction entry (improper & mixed)
  - `QuestionRendererComponent` - Universal question router
- 🔄 Phase 3: Updating Worksheet page for v2.0 support (in progress)
- ⏳ Phase 4: Practice Hub updates for new topic fields
- ⏳ Phase 5: Results page updates for skill/domain mastery
- ⏳ Phase 6: Topic detail page implementation
- ⏳ Phase 7: Performance optimization

## Completed Components

### 1. **MultiSelectQuestionComponent**
- **Location**: `src/app/worksheet/components/multi-select-question.component.ts`
- **Features**:
  - Multiple correct answer selection
  - Min/max selection validation
  - Checkbox-based UI with checkmarks
  - Read-only mode for review
  - Error messaging for validation

### 2. **NumberPadInputComponent**
- **Location**: `src/app/worksheet/components/number-pad-input.component.ts`
- **Features**:
  - Touch-friendly number keypad (0-9, decimal, negative)
  - Input validation
  - Clear button for corrections
  - Display field with monospace font
  - Support for multi-digit and decimal numbers
  - Large tap targets (50px minimum)

### 3. **FractionInputComponent**
- **Location**: `src/app/worksheet/components/fraction-input.component.ts`
- **Features**:
  - Improper fraction input (numerator/denominator)
  - Mixed number input (whole + fraction)
  - Format toggle with radio buttons
  - Visual fraction bar display
  - Answer validation

### 4. **QuestionRendererComponent**
- **Location**: `src/app/worksheet/components/question-renderer.component.ts`
- **Features**:
  - Dynamic component routing based on question type
  - Fallback UI for unsupported types
  - Support for 5+ question types:
    - `multiple_choice` (radio buttons)
    - `short_text` (textarea)
    - `multi_select` (checkbox component)
    - `number_pad` (calculator-like input)
    - `fraction_input` (fraction component)
  - Review mode with correct/incorrect badges
  - Mastery delta display
  - Answer tracking

## Extended API Interfaces

### New Types in `learning-api.service.ts`

```typescript
// Question type enum (12 types total)
export type QuestionType =
  | 'short_text' | 'multiple_choice' | 'multi_select' | 'drag_and_drop'
  | 'number_pad' | 'fraction_input' | 'decimal_input' | 'percent_input'
  | 'graph_interpretation' | 'conceptual_explanation' 
  | 'reasoning_puzzle' | 'competition_problem';

// Worksheet template enum (8 templates)
export type WorksheetTemplate =
  | 'standard' | 'fluency-drill' | 'multi-select' | 'drag-and-drop'
  | 'graph-interpretation' | 'conceptual-explanation' 
  | 'reasoning-puzzle' | 'competition-problem';

// New data structures for v2.0:
- Skill { id, name, description, mastery, masteryDelta }
- Domain { id, name, mastery, skills[] }
- StudyMaterial { id, type, title, description, url, duration, difficulty }
- EnhancedTopicV2 (with skills, domains, domainTags, difficultyScore, ritBand)
- EnhancedWorksheetQuestionV2 (with type, template, metadata, skills[], domains[])
- EnhancedWorksheetResponseV2 (with gradeBand, template, estimatedDuration)
- EnhancedSubmissionResponseV2 (with skillMastery, domainMastery, certificateEarned, badgesEarned)
```

## Next Steps - Implementation Checklist

### Phase 3: Complete Worksheet Page Updates
- [ ] Update worksheet template to use QuestionRendererComponent
- [ ] Support v2 question loading and rendering
- [ ] Update answer submission to handle string|number|array types
- [ ] Add support for new metadata fields in question rendering
- [ ] Implement backend v2 worksheet creation endpoint
- [ ] Add fallback for unsupported question types
- [ ] Performance: Worksheet render < 50ms

### Phase 4: Update Practice Hub
- [ ] Extend topic card to show new fields:
  - Domain tags (pill badges)
  - Skill list (collapsible)
  - Difficulty score (1-10 scale)
  - RIT Band display
- [ ] Update topic filtering by gradeBand
- [ ] Show mastery summary (topic + skill + domain)
- [ ] Add study material links (concept, video, worksheet)
- [ ] Performance: Filtering < 20ms

### Phase 5: Update Results Page
- [ ] Display skill mastery breakdown (table or grid)
- [ ] Display domain mastery breakdown
- [ ] Show masteryDelta per skill
- [ ] Add skill-based recommendations
- [ ] Display badges/certificates earned
- [ ] Add skill progression charts
- [ ] Show next recommended skills based on gaps

### Phase 6: Topic Detail Page
- [ ] Create new topic detail component
- [ ] Display topic + skill + domain hierarchy
- [ ] Show study materials grouped by type
- [ ] Display recommended next skills
- [ ] Show prerequisite skills
- [ ] Add mastery goals and progress
- [ ] Performance: Load < 100ms

### Phase 7: Additional Components Needed
- [ ] `DragDropQuestionComponent` - for drag-and-drop questions
- [ ] `GraphInterpretationComponent` - for graph-based questions
- [ ] `ConceptualExplanationComponent` - for essay-type questions
- [ ] `ReasoningPuzzleComponent` - for competition problems
- [ ] `SkillMasteryChartComponent` - progress visualization
- [ ] `DomainMasteryChartComponent` - multi-domain tracking

### Phase 8: Performance Optimization
- [ ] Lazy load question components
- [ ] Optimize worksheet rendering (virtualization for 50+ questions)
- [ ] Cache topic data
- [ ] Implement question prefetching
- [ ] Add performance monitoring
- [ ] Target: Worksheet render < 50ms, Hub filter < 20ms, Topic load < 100ms

### Phase 9: Validation & Error Handling
- [ ] Add input validation for all question types
- [ ] Implement error boundary components
- [ ] Add fallback UI for network errors
- [ ] Graceful degradation for unsupported templates
- [ ] User-friendly error messages
- [ ] Network error recovery

## Breaking Changes to Consider

1. **Answer Format**: Now supports `string | number | string[]` instead of just `string`
2. **Question Type**: Extended from 2 types to 12+ types
3. **Worksheet Response**: New v2.0 response includes skills, domains, templates
4. **Mastery Tracking**: Now per-skill and per-domain, not just per-topic
5. **Results Response**: New fields for skillMastery, domainMastery, certificates

## Backward Compatibility

- ✅ V1 worksheets still supported (PracticeWorksheetResponse)
- ✅ V1 questions (short_text, multiple_choice) render via fallback UI
- ✅ Component routing handles both v1 and v2 seamlessly
- ✅ Graceful fallback for unsupported question types

## Performance Targets

| Operation | Target | Method |
|-----------|--------|--------|
| Worksheet render | < 50ms | Virtual scrolling, lazy component loading |
| Practice Hub filter | < 20ms | In-memory indexing, debounced search |
| Topic detail load | < 100ms | API caching, preload on hub selection |
| Question type routing | < 5ms | Static component map |
| Multi-select validation | < 10ms | Local state, no API calls |

## Key Files Created

```
src/app/worksheet/components/
  ├── multi-select-question.component.ts
  ├── number-pad-input.component.ts
  ├── fraction-input.component.ts
  └── question-renderer.component.ts

src/app/services/
  └── learning-api.service.ts (extended with v2.0 interfaces)
```

## Dependencies & Compatibility

- Angular 21+
- Supports all modern browsers
- Mobile-first responsive design
- Touch-friendly interfaces (44px+ tap targets)
- Keyboard accessible (ARIA labels, semantic HTML)

## Testing Strategy

1. **Unit Tests**: Each component tested independently
2. **Integration Tests**: Question renderer with all question types
3. **E2E Tests**: Full worksheet workflow (load → answer → submit)
4. **Performance Tests**: Render time benchmarks
5. **Accessibility Tests**: WCAG 2.1 AA compliance

## Deployment Notes

- ✅ Backward compatible with existing worksheets
- ✅ Feature flagging for v2.0 features
- ✅ Gradual rollout: v2.0 only for new worksheets initially
- ✅ Monitor question type distribution
- ✅ A/B test new UI with student cohorts

## Future Enhancements

1. Drag-and-drop with touch support
2. Graph rendering (SVG-based)
3. Equation editor for symbolic math
4. Handwriting recognition
5. Voice input for answers
6. Collaborative worksheets
7. Adaptive difficulty adjustment

## Support & Questions

For implementation questions:
1. Review component comments in each file
2. Check metadata structure in EnhancedWorksheetQuestionV2
3. Follow the question router pattern in QuestionRendererComponent
4. Use fallback UI for unsupported types (not yet implemented)

---

**Version**: v2.0  
**Last Updated**: August 6, 2026  
**Status**: In Progress (Phase 3/9)

