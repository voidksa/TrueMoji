// TrueMoji (Keep fork) 2.0.1.5: ask Google Docs for its screen reader text layer (the same switch
// Grammarly and other writing extensions use). Docs then adds an invisible <rect> with the text of each run
// over its canvas, which content.js uses to place Apple emoji over the canvas drawn ones.
// Runs in the page itself, before Docs' own scripts, because Docs reads this window property at start.
try { if (!window._docs_annotate_canvas_by_ext) window._docs_annotate_canvas_by_ext = 'elcfpmpgobljibnhecmkmpgdmljdfbbg'; } catch (e) {}
