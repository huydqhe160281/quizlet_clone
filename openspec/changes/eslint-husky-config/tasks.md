# Tasks: Optimal ESLint & Husky Configuration

- [ ] **Task 1: Update ESLint rules in `eslint.config.mjs`**
  - **BEFORE**:
    - `@typescript-eslint/no-unused-vars` is set to `"warn"`.
    - `@typescript-eslint/no-unused-expressions` is set to `"warn"`.
  - **AFTER**:
    - Update both rules to `"error"` in the TS files configuration block.
  - **VERIFY**:
    - Confirm the file `eslint.config.mjs` contains `@typescript-eslint/no-unused-vars: "error"` and `@typescript-eslint/no-unused-expressions: "error"`.

- [ ] **Task 2: Verify pre-commit hook behavior**
  - **BEFORE**:
    - Creating a temporary file with unused variables or expressions and committing passes without issues.
  - **AFTER**:
    - Create a temporary file (e.g. `src/test-unused.ts`) with:
      ```typescript
      const unusedVar = "hello";
      1 + 1; // unused expression
      ```
    - Attempt to commit this file using `git commit`.
  - **VERIFY**:
    - Ensure the commit fails with clear ESLint errors indicating unused variable and expression.
    - Delete the temporary file.
