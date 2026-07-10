> Checkpointed alignment state — not a contract. Verify against code before treating any claim as current.

## Intent
Build a CLI tool that manages personal reading lists from the terminal. Users can add books, mark them as read, rate them, and get recommendations based on their reading history. The goal is a fast, keyboard-driven alternative to Goodreads for developers who live in the terminal.

## Success Criteria
- Users can add a book by title + author in under 5 seconds
- Reading list persists across sessions (local SQLite)
- `readlist suggest` returns 3 recommendations based on genre/author patterns
- Works offline — no API calls required for core features
- Installable via `npm install -g readlist` or `brew install readlist`

## Taste Notes
A good implementation feels like `git` — terse commands, predictable output, no emoji or color unless piped to a terminal. Bad: a "fun" CLI with spinners, ASCII art, or chatty output. The tool should be invisible when it works and informative when it doesn't.

## Out of Scope
- Web UI or dashboard
- Multi-user / shared lists
- ISBN lookup or book cover images
- Reading progress tracking (page numbers)
- Integration with Kindle or other e-readers

## Open Questions
- Should ratings be 1-5 stars or thumbs up/down?
- How should we handle duplicate book entries (same title, different edition)?
- Should `suggest` use a local algorithm or allow an optional OpenAI call?
