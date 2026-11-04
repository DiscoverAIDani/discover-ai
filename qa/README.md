# Game verification

Run with Node.js 22 or later:

```
node qa/game-stress.cjs
node qa/button-stress.cjs
node qa/ui-buttons.cjs
```

`game-stress.cjs` checks conversation results and calculations, including specific
button regressions. `button-stress.cjs` explores all offered choices from all six
starting buttons to the six-message game limit. It also tests every literal
quick-response label from a fresh game and each category, and explores two further
button selections after the existing conversation regression histories. The
cross-category checks intentionally include out-of-context suggestions.

The button traversal checks response validity, exceptions, score bounds, completion
and no further input after completion. Starting-button routes must retain at least
one suggestion until completion. Some other routes intentionally have no choices
(for example, emergency advice or requests for user-supplied text).

Set BUTTON_REPORT to an output path to inspect paths with no choices or identical
consecutive replies. Repetition is diagnostic, not automatically a failure: a
repeated safety warning or unchanged arithmetic result may be appropriate.

`ui-buttons.cjs` executes the page's actual button callbacks in a minimal DOM test
harness. It checks all 28 example cards across the initial state and six starting
categories, input filling versus sending, six completion/results/restart cycles,
disabled Send after completion, and console errors. It does not test browser
layout, real device input, native speech recognition or microphone permission
dialogs. These still require browser/device checks.
