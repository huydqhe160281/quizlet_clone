# Specification: <Capability Name>

<!--
  Metadata: version 1.0, status: Draft
  Guidance: Define requirements and verification criteria using engine layers and Gherkin scenarios.
-->

## Capability Summary

<!-- One sentence summarizing the user value. -->

## Engine Layer Map

| Layer     | Crate         | Component/Symbol                      |
| --------- | ------------- | ------------------------------------- |
| Core      | `core`        | [Shared types, Traits, Models]        |
| Daemon    | `daemon`      | [Orchestrators, IPC handlers, Broker] |
| Agent     | `sub-agent`   | [LLM loop, Tool logic]                |
| Interface | `mcp-backend` | [MCP Handlers, Resources, Prompts]    |

---

## ADDED Requirements

### Requirement: [Unique Name]

The system SHALL [behavior].
**Constraint**: MUST | SHOULD
**Verification**: [e.g., unit test `test_name()`, integration test `./kit test -p ...`]

#### Scenario: [Success Path]

- **GIVEN** [Initial state]
- **WHEN** [Action performed]
- **THEN** [Expected result]

#### Scenario: [Error Path]

- **GIVEN** [Precondition]
- **WHEN** [Faulty action]
- **THEN** [Graceful error handling result]

---

## Out of Scope

<!-- Explicit non-functional or functional items excluded from this spec. -->
