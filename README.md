# TIE Tech Tree

**[Live → tietechtree.jethachan.net](https://tietechtree.jethachan.net)**

An interactive, readable version of **[u/GuderianX](https://www.reddit.com/user/GuderianX/)**'s
*[TIE Tech Tree v8](https://www.reddit.com/r/StarWarsShips/comments/1vlkb5i/tie_tech_tree_v8/)*
(posted on r/StarWarsShips): the development lineage of (nearly) every TIE-series
ship across Canon and Legends (EU), with Wookieepedia links for every ship.

**Original chart & research:** u/GuderianX
**Interactive version:** [Jetha Chan](https://x.com/jetha)

- Node color = continuity (Canon and EU / just Canon / just EU)
- Solid arrows = direct development · dashed = loose connection · `?` = uncertain
- Toggle **Legends/EU** on/off, pan/zoom, click any ship for its Wookieepedia page(s)

No dependencies, no build step — plain HTML/CSS/JS + SVG.

## Run locally

```bash
python -m http.server 8123
```

Open `http://localhost:8123/`.

## Layout

| File | Role |
|------|------|
| `index.html` | Chart + sidebar (About / Ships tabs) |
| `styles.css` | UI |
| `main.js` | SVG renderer, pan/zoom, tooltips, Legends toggle |
| `data.js` | Ships, lineage edges, dates, Wookieepedia links (transcribed from the original chart) |

## License

[MIT](./LICENSE) © 2026 Jetha Chan

Star Wars and all ship names are property of Lucasfilm/Disney; this is an
unofficial fan resource with no affiliation. The underlying research and the
original infographic are u/GuderianX's work; article links go to
[Wookieepedia](https://starwars.fandom.com/).
