# Testing Methodology

## Purpose
Document the standardized approach for conducting fair comparisons between AI coding agents.

## Principles

### 1. Fairness
- **Identical Prompts**: Each agent receives exactly the same prompt
- **No Hints**: Prompts should not favor any particular implementation approach
- **Equal Resources**: Both agents operate under similar constraints

### 2. Transparency
- **Open Process**: All prompts and implementations are publicly visible
- **Version Control**: Full history of changes preserved
- **Clear Documentation**: Evaluation process is well-documented

### 3. Reproducibility
- **Deterministic Tests**: Use fixed test cases
- **Environment Details**: Document runtime environments
- **Version Information**: Record agent versions/models used

## Project Selection Criteria

Projects should be:
- **Well-Defined**: Clear requirements and success criteria
- **Appropriately Scoped**: Completable in a single session
- **Varied**: Cover different programming paradigms and domains
- **Practical**: Represent real-world coding tasks

## Implementation Process

### Step 1: Prompt Creation
1. Write clear, unambiguous requirements
2. Specify expected inputs/outputs
3. Define success criteria
4. Avoid implementation hints

### Step 2: Agent Implementation
1. Create separate branch from prompt branch
2. Provide prompt to agent
3. Allow agent to implement solution
4. Capture all agent interactions
5. No manual code modifications

### Step 3: Integration
1. Copy implementation to main branch
2. Preserve original structure
3. Add any necessary documentation
4. Create comparison view

### Step 4: Evaluation
1. Run automated tests
2. Manual code review
3. Apply scoring criteria
4. Document findings

## Prompt Guidelines

### Good Prompts Include:
- Clear problem statement
- Specific requirements
- Input/output examples
- Constraints and limitations
- Success criteria

### Prompts Should Avoid:
- Implementation hints
- Language-specific requirements (unless testing language choice)
- Ambiguous requirements
- Subjective success criteria

## Example Prompt Template

```markdown
# Project: [Name]

## Description
[Clear description of what needs to be built]

## Requirements
1. [Specific requirement 1]
2. [Specific requirement 2]
3. ...

## Inputs
- [Input format and constraints]

## Expected Output
- [Output format and examples]

## Constraints
- [Any limitations or requirements]

## Success Criteria
- [How to determine if implementation is successful]

## Examples
[Provide concrete examples if helpful]
```

## Handling Edge Cases

### Agent Limitations
- Document when agents hit token limits
- Note if multiple sessions were required
- Record any clarifications provided

### Technical Issues
- Document any platform-specific issues
- Note workarounds required
- Record any manual interventions

## Data Collection

For each implementation, record:
- Date and time of implementation
- Agent version/model
- Platform used (Cursor, Windsurf, API)
- Token usage (if available)
- Time to completion
- Number of iterations/corrections

## Ethical Considerations

- No proprietary code in prompts
- Respect licensing of generated code
- Clear attribution of AI-generated content
- Educational and research focus

## Future Improvements

As we gather more data:
- Refine evaluation criteria
- Identify common patterns
- Develop better prompts
- Improve comparison methodology