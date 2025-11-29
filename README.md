# 🤖 Coding Agent Comparison Lab

> A systematic comparison of AI coding assistants by implementing identical project prompts across different models

## 📊 Overview

This repository contains mini-projects implemented by different AI coding agents using identical prompts. The goal is to provide a transparent, side-by-side comparison of how different AI models approach the same coding challenges.

### Participating Agents
- **Claude (Anthropic)** - Claude 3.5 Sonnet via Cursor/Windsurf
- **OpenAI Codex** - GPT-4 via GitHub Copilot/OpenAI API

## 🏗️ Repository Structure

```
coder-comps/
│
├── projects/               # Main project implementations
│   ├── project-01/        # First comparison project
│   │   ├── prompt.md      # Original project prompt
│   │   ├── claude/        # Claude's implementation
│   │   └── codex/         # Codex's implementation
│   │
│   ├── project-02/        # Second comparison project
│   │   ├── prompt.md
│   │   ├── claude/
│   │   └── codex/
│   │
│   └── .../               # Additional projects
│
├── evaluations/           # Comparison metrics and analysis
│   └── criteria.md        # Evaluation criteria
│
└── docs/                  # Documentation
    └── methodology.md     # Testing methodology
```

## 🌳 Branch Strategy

Each project follows this branching pattern:

```
main
 ├── project-01-prompt     # Contains only the prompt
 │   ├── project-01-claude # Claude's implementation
 │   └── project-01-codex  # Codex's implementation
 │
 ├── project-02-prompt
 │   ├── project-02-claude
 │   └── project-02-codex
 └── ...
```

After implementation, branches are merged into the main branch's folder structure for easy comparison.

## 📝 Project List

| Project | Description | Status | Claude | Codex |
|---------|-------------|--------|--------|-------|
| Project 01 | TBD | 🔜 Planned | - | - |
| Project 02 | TBD | 🔜 Planned | - | - |
| Project 03 | TBD | 🔜 Planned | - | - |
| Project 04 | TBD | 🔜 Planned | - | - |
| Project 05 | TBD | 🔜 Planned | - | - |

### Status Legend
- 🔜 **Planned** - Prompt not yet created
- 📝 **Prompt Ready** - Prompt created, awaiting implementation
- 🚧 **In Progress** - Currently being implemented
- ✅ **Complete** - Both implementations finished
- 📊 **Evaluated** - Comparison analysis complete

## 🎯 Evaluation Criteria

Each implementation will be assessed on:

1. **Correctness** - Does it meet the requirements?
2. **Code Quality** - Readability, structure, best practices
3. **Performance** - Efficiency and optimization
4. **Documentation** - Comments, README, setup instructions
5. **Testing** - Test coverage and quality
6. **Innovation** - Creative solutions and extra features
7. **Error Handling** - Robustness and edge cases

## 🚀 Getting Started

### For Contributors

1. **Creating a New Project Prompt**
   ```bash
   git checkout -b project-XX-prompt
   # Add prompt.md to projects/project-XX/
   git commit -m "Add prompt for project XX"
   ```

2. **Implementing with an Agent**
   ```bash
   git checkout -b project-XX-[agent-name] project-XX-prompt
   # Let the agent implement the solution
   git commit -m "Project XX: [Agent] implementation"
   ```

3. **Merging to Main**
   ```bash
   git checkout main
   # Copy implementation to projects/project-XX/[agent-name]/
   git commit -m "Add [Agent] implementation for project XX"
   ```

### For Viewers

Browse the `projects/` directory to see side-by-side comparisons of how different AI agents approach the same problems.

## 📈 Insights & Observations

Key findings and patterns will be documented here as projects are completed.

## 🤝 Contributing

This is an experimental project to understand AI coding capabilities. If you'd like to suggest project ideas or evaluation criteria, please open an issue.

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [Claude Documentation](https://docs.anthropic.com/claude)
- [OpenAI Codex](https://openai.com/blog/openai-codex)
- [Methodology Details](docs/methodology.md)

---

*This repository is maintained for educational and research purposes to understand the capabilities and differences between AI coding assistants.*