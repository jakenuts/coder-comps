# Evaluation Criteria for Agent Comparisons

## Overview
This document outlines the systematic approach for evaluating and comparing implementations from different AI coding agents.

## Scoring System
Each criterion is scored on a 1-10 scale:
- **1-3**: Poor/Missing
- **4-6**: Adequate
- **7-8**: Good
- **9-10**: Excellent

## Primary Criteria

### 1. Correctness (Weight: 30%)
- **Functional Requirements**: Does the code meet all specified requirements?
- **Edge Cases**: Are edge cases handled properly?
- **Bug-Free**: Is the implementation free of obvious bugs?

### 2. Code Quality (Weight: 25%)
- **Readability**: Is the code easy to understand?
- **Structure**: Is the code well-organized with proper separation of concerns?
- **Best Practices**: Does it follow language-specific conventions and patterns?
- **DRY Principle**: Is code duplication minimized?

### 3. Performance (Weight: 10%)
- **Time Complexity**: Is the algorithm efficient?
- **Space Complexity**: Is memory usage optimized?
- **Scalability**: Will it handle larger inputs well?

### 4. Documentation (Weight: 15%)
- **Code Comments**: Are complex sections explained?
- **README**: Is setup and usage clearly documented?
- **API Documentation**: Are functions/methods properly documented?

### 5. Testing (Weight: 10%)
- **Test Coverage**: Are critical paths tested?
- **Test Quality**: Are tests meaningful and well-structured?
- **Edge Case Testing**: Are boundary conditions tested?

### 6. Error Handling (Weight: 5%)
- **Input Validation**: Are inputs properly validated?
- **Error Messages**: Are errors informative and helpful?
- **Graceful Failure**: Does the code fail gracefully?

### 7. Innovation (Weight: 5%)
- **Creative Solutions**: Are there clever or elegant approaches?
- **Extra Features**: Are useful features added beyond requirements?
- **User Experience**: Are there thoughtful UX improvements?

## Comparison Matrix Template

```markdown
| Criterion | Weight | Claude Score | Codex Score | Notes |
|-----------|--------|--------------|-------------|-------|
| Correctness | 30% | X/10 | X/10 | |
| Code Quality | 25% | X/10 | X/10 | |
| Performance | 10% | X/10 | X/10 | |
| Documentation | 15% | X/10 | X/10 | |
| Testing | 10% | X/10 | X/10 | |
| Error Handling | 5% | X/10 | X/10 | |
| Innovation | 5% | X/10 | X/10 | |
| **Weighted Total** | **100%** | **X.X/10** | **X.X/10** | |
```

## Qualitative Assessment

In addition to scores, each evaluation should include:

### Strengths
- What did each agent do particularly well?

### Weaknesses
- Where did each agent fall short?

### Unique Approaches
- What different strategies did the agents use?

### Recommendations
- Which implementation would you recommend and why?

## Evaluation Process

1. **Independent Review**: Each implementation reviewed without comparison
2. **Side-by-Side Comparison**: Direct comparison of approaches
3. **Testing**: Run both implementations with same test cases
4. **Documentation Review**: Assess clarity and completeness
5. **Final Scoring**: Apply weighted scoring system

## Notes
- Evaluations should be objective and based on observable criteria
- Consider the constraints of each platform (token limits, capabilities)
- Document any assumptions or interpretations of requirements