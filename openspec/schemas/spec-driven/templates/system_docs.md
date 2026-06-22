# System Documentation Staging Area

This directory is the staging area for authoring system documentation updates.
Please create your delta files in the respective subdirectories according to the tier you are updating:

- `detail_design/<area>/<feature>.md` (For component-level detail design docs, fully generated)

For `srs` and `basic_design` tiers, you MUST NOT generate a single monolithic `<feature>.md` file. Instead, you MUST split the output into multiple separate fragment files (e.g., `srs/1-introduction.md`, `basic_design/architecture-overview.md`) strictly following the file names defined in `_templates/handbook/doc-generation-map.yaml`.

> **Important**: Refer to `_templates/handbook/` for the exact frontmatter and template structure required for each tier.
