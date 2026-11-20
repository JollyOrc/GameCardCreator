# Choosing notes

[Back to the manual](manual.md)

A run makes one card for each note you choose. There are three ways to
choose: a deck note, the file explorer, and the run dialog. All three use the
same [kind rules](manual.md#which-note-is-which-card) and the same output
folder, and give the same cards.

## Contents

- [Deck notes](#deck-notes)
- [The file explorer](#the-file-explorer)
- [The run dialog](#the-run-dialog)
- [The saved selection](#the-saved-selection)

## Deck notes

A deck note is an ordinary note whose links list the cards' notes. The cards
come in the order of the links. A note linked twice gives two cards.

```markdown
# Opening Deck

- [[Reed Sweep]]
- [[Reed Whisper|the whisper]]
- [[Fen Hare]]
- [[Reed Sweep]]
```

This deck gives four cards: Reed Sweep, Reed Whisper, Fen Hare, Reed Sweep.
The files are `Opening Deck cards.pdf` and `Opening Deck cards warnings.md`.

To run it, open the note and run **Create cards from this deck note** from
the command palette, or right-click the note and choose the menu item of the
same name.

### What counts as a link

| Counts | Example |
| --- | --- |
| a wikilink, with or without an alias or a folder | `[[Reed Sweep]]`, `[[Reed Sweep\|sweep]]`, `[[Skills/Reed Sweep]]` |
| a Markdown link to a note | `[Reed Sweep](Reed%20Sweep.md)` |
| a link to a heading or block of a note (the note is used) | `[[Reed Sweep#Use]]` |

| Does not count | Example |
| --- | --- |
| embeds and images | `![[Reed Sweep]]`, `![map](map.png)` |
| web links | `[site](https://example.com)` |
| links to the deck note itself | `[[#Notes]]` |
| links in code blocks or inline code | `` `[[Reed Sweep]]` `` |
| links in the deck note's own properties | |

So you can write about the deck around the list, link to a picture, or keep
a few commented-out cards in a code block.

Obsidian decides which note a link means, exactly as when you click it.
Problems are warnings, and the other cards are still made:

| Warning | When |
| --- | --- |
| `DECK_LINK_MISSING` | No note has this name. |
| `DECK_LINK_NOT_A_NOTE` | The link leads to a folder or an image. |
| `DECK_LINK_AMBIGUOUS` | Several notes have this name; the detail names the one Obsidian chose, for example `dup; using a/dup.md`. Write the folder into the link to choose another. |

## The file explorer

Right-click one or several notes or folders and choose **Create cards**:

- a note gives one card;
- a folder gives every note below it, also in sub-folders, sorted by path
  without regard to case;
- the chosen items are taken in the order you chose them, and a note that
  comes twice (on its own and inside a chosen folder) counts at its first
  place;
- files that are not notes are skipped without a warning.

Example: choosing `Z.md` and then the folder `Skills`, which holds
`Skills/B.md`, `Skills/a.md` and `Skills/Sub/C.md`, gives the cards Z, a, B, C.

The files are named after the folder when you chose exactly one folder
(`Skills cards.pdf`), and `Cards cards.pdf` otherwise.

## The run dialog

Open it with the ribbon icon (**Create cards…**) or the command
**Create cards…**.

The dialog holds the output folder, **Choose folder…**, the **Create cards**
button, a red line when the folder is refused, a grey line that says whether
`Cards cards.pdf` will be created or replaced, and **More options**, which
opens the settings tab. The grey line is updated as you type and tick.

Beside the dialog, the **Notes** panel:

- shows the vault's Markdown notes as a tree; folders start collapsed and are
  sorted by name without regard to case;
- shows each note's card kind (`skill`, `spell`, `creature`) as a tag; a note
  without a kind is greyed out (`no card kind`) and cannot be ticked, because
  it would give no card;
- ticking a folder ticks every note with a kind below it;
- **Select all** at the top ticks every note with a kind.

The cards come in the order of the notes' paths, without regard to case:
`Skills/a.md`, `Skills/B.md`, `Skills/Sub/C.md` give the cards a, B, C. The
files are `Cards cards.pdf` and `Cards cards warnings.md`.

### Keys and saving

| You | What happens |
| --- | --- |
| click **Create cards**, or press Enter while it is enabled | The run starts. The folder becomes the output folder of the settings, and the ticked notes become the saved selection. |
| click **Save selection** | The ticked notes are saved (`Selection saved.`); the dialog stays open. |
| press Escape, click the close button or click outside | The dialog closes. Nothing is saved, not even a folder you typed. |

**Create cards** is disabled while the folder is refused or no note is
ticked.

## The saved selection

The saved selection is what the dialog shows ticked the next time it opens,
and what the command **Create cards from the saved selection** runs without
opening the dialog.

- When every note with a kind is ticked, the selection is saved as **all**.
  Notes you add later are then ticked too: a new note `Skills/Reed Sweep.md`
  is in the next run.
- When a selected note or folder is renamed or moved, the selection follows
  it: `Skills/Reed Sweep.md` renamed to `Skills/Reed Sweep II.md` stays
  selected.
- A deleted note drops out of the selection silently.

With no saved selection, the command says
`Nothing selected yet. Open "Create cards…" and choose notes.`
