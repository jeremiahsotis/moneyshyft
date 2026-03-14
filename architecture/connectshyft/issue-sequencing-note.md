# Issue Sequencing Note

Recommended order:

1. Neighbor texting preference persistence and display
2. SMS target resolution from thread and neighbor context

Reason:
- target-resolution gating depends on correct and trustworthy `prefers_texting` state
- fixing preference persistence first reduces debugging ambiguity in issue 2
