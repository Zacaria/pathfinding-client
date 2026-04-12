```markdown
# pathfinding-client Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `pathfinding-client` repository. The codebase is primarily written in TypeScript, leverages Rust as a framework, and uses modern conventions for file organization, imports/exports, and testing. By following these patterns, contributors can maintain consistency and quality across the project.

## Coding Conventions

### File Naming
- Use **PascalCase** for all file names.
  - Example: `PathFinder.ts`, `NodeMap.ts`

### Import Style
- Use **alias imports** to reference modules.
  - Example:
    ```typescript
    import { PathFinder } from 'algorithms/PathFinder'
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    export function findPath(...) { ... }
    export const MAX_DEPTH = 100
    ```

### Commit Messages
- Follow **Conventional Commits** with the following prefixes:
  - `chore`: for maintenance and non-feature changes
  - `feat`: for new features
- Keep commit messages concise (average 38 characters).
  - Example:
    ```
    feat: add A* algorithm implementation
    chore: update dependencies
    ```

## Workflows

_No automated workflows detected in this repository._

## Testing Patterns

- **Framework:** [vitest](https://vitest.dev/)
- **Test File Pattern:** All test files should be named with the `.test.ts` suffix.
  - Example: `PathFinder.test.ts`
- **Test Example:**
    ```typescript
    import { describe, it, expect } from 'vitest'
    import { findPath } from 'algorithms/PathFinder'

    describe('findPath', () => {
      it('finds the shortest path', () => {
        const result = findPath(start, end, map)
        expect(result).toBeDefined()
      })
    })
    ```

## Commands

| Command         | Purpose                                   |
|-----------------|-------------------------------------------|
| /test           | Run all vitest tests                      |
| /lint           | Run linter to check code style            |
| /build          | Build the TypeScript project              |
| /commit         | Generate a conventional commit message    |
```