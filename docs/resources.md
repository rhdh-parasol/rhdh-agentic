# Resources

Existing codebases, tools, and content relevant to this project.

## Backstage Upstream

| Resource                                                                             | Description                                                                                                                                                                              |
|--------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Backstage MCP Actions](https://github.com/backstage/backstage/issues/30218)         | RFC #30218 — 11 merged tools (5 catalog, 5 scaffolder, 1 auth) provide the mechanism layer the CLI builds on                                                                             |
| [TechDocs MCP Actions](https://github.com/backstage/backstage/pull/33412)            | PR #33412 — `get-techdocs-metadata`, `get-techdocs-content` (in progress)                                                                                                                |
| [BEP-0013 AI Skills](https://github.com/backstage/backstage/pull/33173)              | Shared AI skills for Backstage development (orthogonal — coding *on* Backstage, not *using* it)                                                                                          |
| [MCP Catalog Modeling](https://github.com/backstage/backstage/issues/32062)          | RFC #32062 — `kind: API, type: mcp-server` modeling pattern                                                                                                                              |
| [Model Server Catalog Modeling](https://github.com/backstage/backstage/issues/33060) | RFC #33060 — `kind: API, type: ai-model-server` modeling pattern, based off of MCP Catalog Modeling RFC; additional use of `kind: Resource` and `kind: Component` proposed / asked about |

## Enterprise Catalog Content

| Resource | Description |
|----------|-------------|
| [benwilcock/backstage-catalogs](https://github.com/benwilcock/backstage-catalogs) | ~140 OSS components organized into teams, domains, and systems. Largest enterprise simulation in the Backstage ecosystem |
| [benwilcock/rhdh-lab](https://github.com/benwilcock/rhdh-lab) | Local RHDH runtime environment with pre-configured plugins and catalog loading |
| [rhdh-composable-plugin-experiment](https://github.com/rh-ita-ssa-devhub-org/rhdh-composable-plugin-experiment) | Composable architecture plugin — visual drag-and-drop canvas with scaffolder integration. Customer-validated prior art |
| [rhdh-demo-software-templates](https://github.com/rh-ita-ssa-devhub-org/rhdh-demo-software-templates) | Banking domain catalog: systems, components, and scaffolder templates |

## RHDH Templates

| Resource | Description                                                            |
|----------|------------------------------------------------------------------------|
| [red-hat-developer-hub-software-templates](https://github.com/redhat-developer/red-hat-developer-hub-software-templates) | RHDH-specific templates: ArgoCD, Quarkus, Spring Boot, Tekton, Ansible |
| [backstage/software-templates](https://github.com/backstage/software-templates) | Official upstream templates: React, Spring Boot, Rails, etc.           |
| [red-hat-developer-hub-openshift-ai-software-templates](https://github.com/redhat-ai-dev/ai-lab-template) | RHDH-specific templates: ArgoCD, Tekton, KServe, KubeFlow, LlamaStack  |
