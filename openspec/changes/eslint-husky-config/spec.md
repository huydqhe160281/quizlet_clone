# Specification: Optimal ESLint & Husky Configuration

## 1. Problem Statement
Currently, code declared but not used (e.g., unused variables) is allowed to be committed because the ESLint rule `@typescript-eslint/no-unused-vars` is set to `"warn"`. Husky runs `lint-staged`, which executes `eslint --fix`. Since warnings do not result in a non-zero exit code, the commit succeeds despite the presence of unused variables.

## 2. Proposed Changes
To fix this and optimize the ESLint/Husky configurations, we will perform the following changes:

### 2.1 ESLint Configuration (`eslint.config.mjs`)
- Update the `@typescript-eslint/no-unused-vars` rule from `"warn"` to `"error"`.
- Update the `@typescript-eslint/no-unused-expressions` rule from `"warn"` to `"error"`.
- This ensures that ESLint exits with code 1 (failure) when there are unused variables or expressions in TypeScript files, which will block `lint-staged` and prevent the commit from completing.

### 2.2 Husky and Lint-Staged Configuration (`package.json`)
- Keep `eslint --fix` inside `package.json`'s `lint-staged` config.

## 3. Scenarios (Given/When/Then)

### Scenario 1: Commit blocked by unused variables
- **Given** a TypeScript file with a declared but unused variable.
- **When** the developer runs `git commit` to commit the file.
- **Then** the Husky pre-commit hook runs `lint-staged`, which runs `eslint --fix`.
- **And** ESLint fails with code 1 due to the unused variable.
- **And** the commit is blocked.

### Scenario 2: Commit blocked by unused expressions
- **Given** a TypeScript file with an unused expression (e.g., `1 + 1;` or an uncalled function expression).
- **When** the developer runs `git commit` to commit the file.
- **Then** the Husky pre-commit hook runs `lint-staged`, which runs `eslint --fix`.
- **And** ESLint fails with code 1 due to the unused expression.
- **And** the commit is blocked.

### Scenario 3: Commit passes with clean code
- **Given** a TypeScript file with no unused variables or expressions.
- **When** the developer runs `git commit` to commit the file.
- **Then** ESLint passes with code 0.
- **And** the commit succeeds.

## 4. Edge Cases
- **Self-fixing errors**: If ESLint can auto-fix an issue, it will fix it during `eslint --fix` and return code 0, allowing the commit to proceed. Unused variables cannot be auto-fixed safely, so they will always block.
- **Ignored files**: Files matching the `ignores` pattern in `eslint.config.mjs` (e.g., `.next/**`) will not be checked, avoiding false positives on build files.

## 5. Non-Goals
- We will not add `tsc --noEmit` to the pre-commit hook as it runs a full typecheck which is slow and would significantly increase commit times. Typechecking will be handled in CI/CD instead.
