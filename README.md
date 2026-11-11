# Game Card Creator

An [Obsidian](https://obsidian.md) plugin that turns notes into print-ready
game cards and writes them as a PDF.

- **Card size:** 62 mm x 88 mm.
- **Sheet:** A4, as many cards per page as fit inside a 1 cm safe margin
  (3 x 3 = 9 cards).
- **Templates:**
  - *Skill* — one skill per card: the skill tags on top and the full
    description text, no pictures.
  - *Spell* — one spell per card: the full description text, no pictures.
  - *Creature* — one creature per card: the statblock, the instincts and
    attacks; a picture only if there is space.
- **Engine:** Typst, as in Obsidian2Typst.

**Status:** project set up; no story written yet. Development follows the
process in `CLAUDE.md` (SCAR review, user story, tests, tickets, code).

## Development

```bash
npm install
npm run typecheck && npm run build && npm run lint && npm test
```

## Licence

MIT, see `LICENSE`.
