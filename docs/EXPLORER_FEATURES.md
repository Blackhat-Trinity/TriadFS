# TriadFS Explorer Feature Research

This document tracks the feature baseline used for the desktop Explorer redesign.

## Research Sources

- Microsoft File Explorer navigation model (toolbar, panes, search behavior, keyboard navigation):  
  https://support.microsoft.com/en-us/windows/use-a-screen-reader-to-explore-and-navigate-file-explorer-in-windows-e7d3a548-87dd-459f-a991-9fde3f7ce927
- ReFS integrity goals (checksums, online repair behavior):  
  https://learn.microsoft.com/en-us/windows-server/storage/refs/refs-overview
- GNOME Files search behavior and filters (name/type/date search + in-place actions):  
  https://help.gnome.org/gnome-help/files-search.html
- OpenZFS data integrity model (end-to-end checksums, corruption detection/repair concepts):  
  https://openzfs.github.io/openzfs-docs/Basic%20Concepts/Checksums.html

## Implemented In TriadFS Explorer

- Full Explorer-style window shell with:
  - Navigation pane
  - Command bar
  - Address breadcrumb bar
  - Search box with backend search suggestions
  - Details pane
  - Status bar
- Keyboard shortcuts:
  - `Ctrl+A`, `Ctrl+C`, `Ctrl+X`, `Ctrl+V`
  - `Ctrl+F`, `Ctrl+N`
  - `F2`, `Delete`, `F5`
  - `Alt+Left`, `Alt+Right`, `Backspace`
- Context menu actions:
  - Open, rename, copy, cut, favorite, delete
- Working command actions:
  - New folder/file node
  - Cut/copy/paste
  - Soft delete + recycle bin + restore
  - Rename (local until backend rename endpoint exists)
  - Sort/filter/view mode toggles
  - Share (path copy + shared marker)
- Selection model:
  - Single/multi (`Ctrl`) and range (`Shift`) selection
  - Drag and drop move for folders/files
- File intelligence:
  - Version history panel from backend `/files/{id}/versions`
  - Download specific versions via `/files/{id}/download`
  - Metadata visibility (type, size, modified, path)
- Quick access modes:
  - Home, Recent, Favorites, Shared, Recycle Bin

## Backend-Limited Areas (Planned)

- Rename/move backend APIs (currently local optimistic behavior)
- Hard-delete API endpoint for permanent server-side removal
- Native tag labels and smart-folder query API
- ACL-aware per-node permission editor in details pane
