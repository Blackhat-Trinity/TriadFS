# TriadFS Architecture

Full architecture documentation is available at:

- `docs/ARCHITECTURE.md`

Highlights:

- Modular Spring Boot backend with separate engines (metadata, storage, transfer, benchmark)
- Strategy pattern for runtime transfer strategy switching
- Chunk hash deduplication and versioned file reconstruction
- React dashboard for benchmark analytics and strategy comparison