# justfile for rhdh-agentic

# Default recipe - shows available commands
default:
    @just --list

# Sync meeting agenda from Google Docs
sync-meetings:
    gwt download "$(grep -v '^#' meetings/sources.txt | head -1)" -f md -o meetings/agenda.md --enable-frontmatter -m "type=running-agenda"

# Validate all catalog entity YAML files
catalog-validate:
    @echo "Validating catalog YAML files..."
    @find catalog \( -path '*/skeleton*' -o -path '*/skeletons/*' \) -prune -o \( -name '*.yaml' -o -name '*.yml' \) -print | while read f; do \
        yq '.' "$f" > /dev/null 2>&1 && echo "✓ $f" || echo "✗ $f"; \
    done
    @echo "Done."
