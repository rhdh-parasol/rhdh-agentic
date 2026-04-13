# justfile for rhdh-agentic

# Default recipe - shows available commands
default:
    @just --list

# Sync meeting agenda from Google Docs
sync-meetings:
    gwt download "$(grep -v '^#' meetings/sources.txt | head -1)" -f md -o meetings/agenda.md --enable-frontmatter -m "type=running-agenda"
