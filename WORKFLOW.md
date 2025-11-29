# Workflow Guide

## Quick Start for New Projects

### 1. Create Project Prompt
```bash
# Create a new branch for the prompt
git checkout -b project-01-prompt

# Create the prompt file
mkdir -p projects/project-01
cp projects/TEMPLATE-prompt.md projects/project-01/prompt.md
# Edit the prompt file with your requirements

# Commit the prompt
git add .
git commit -m "Add prompt for project-01: [Brief Description]"
git push -u origin project-01-prompt
```

### 2. Implement with Claude
```bash
# Create Claude implementation branch
git checkout -b project-01-claude project-01-prompt

# Use Cursor/Windsurf to implement
# Copy prompt.md content to the agent
# Let Claude implement the solution in projects/project-01/

# Commit Claude's implementation
git add .
git commit -m "Project-01: Claude implementation"
git push -u origin project-01-claude
```

### 3. Implement with Codex
```bash
# Create Codex implementation branch
git checkout -b project-01-codex project-01-prompt

# Use GitHub Copilot/OpenAI to implement
# Copy prompt.md content to the agent
# Let Codex implement the solution in projects/project-01/

# Commit Codex's implementation
git add .
git commit -m "Project-01: Codex implementation"
git push -u origin project-01-codex
```

### 4. Merge to Main for Comparison
```bash
# Switch to main branch
git checkout main
git pull origin main

# Create project structure
mkdir -p projects/project-01/claude
mkdir -p projects/project-01/codex

# Copy Claude implementation
git checkout project-01-claude -- projects/project-01/
mv projects/project-01/* projects/project-01/claude/ 2>/dev/null || true

# Copy Codex implementation
git checkout project-01-codex -- projects/project-01/
mv projects/project-01/* projects/project-01/codex/ 2>/dev/null || true

# Copy the prompt to the main structure
git checkout project-01-prompt -- projects/project-01/prompt.md

# Commit the combined structure
git add .
git commit -m "Add project-01 implementations for comparison"
git push origin main
```

### 5. Create Evaluation
```bash
# Create evaluation file
touch projects/project-01/evaluation.md

# Fill in evaluation based on criteria.md template
# Update README.md project status

git add .
git commit -m "Add evaluation for project-01"
git push origin main
```

## Working with Git Worktrees (Advanced)

For easier side-by-side development:

```bash
# Set up worktrees for each agent
git worktree add ../coder-comps-claude project-01-claude
git worktree add ../coder-comps-codex project-01-codex

# Work in separate directories simultaneously
cd ../coder-comps-claude  # For Claude implementation
cd ../coder-comps-codex   # For Codex implementation
```

## Tips

### Keeping Branches Clean
- Always branch from the prompt branch for implementations
- Don't modify the prompt after creating implementation branches
- Use descriptive commit messages

### Fair Comparison
- Give each agent the same amount of time/effort
- Don't provide additional hints to one agent
- Document any clarifications given to both agents

### Documentation
- Update README.md project status after each step
- Include screenshots if the project has a UI
- Note any interesting differences in approach

## Common Issues

### Merge Conflicts
If you encounter conflicts when merging to main:
```bash
# Use the implementation from the branch
git checkout --theirs projects/project-XX/
# Or manually resolve in your editor
```

### Large Files
If implementations include large files:
```bash
# Consider using Git LFS
git lfs track "*.model"
git add .gitattributes
```

### Different File Structures
If agents create very different structures:
- Preserve each agent's structure in their folder
- Add a comparison note in the evaluation