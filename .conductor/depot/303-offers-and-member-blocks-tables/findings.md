# Review Findings: #303

## [B] Blocking

- None

## [W] Warning

- None

## [I] Info

- No DELETE policy on offers table — intentional, offers are declined/expired not deleted. Admin client needed for cleanup.
- offers UPDATE policy has no WITH CHECK clause — implicit behavior is correct (seller can't reassign offers).
- offers UPDATE policy doesn't restrict columns — application layer (API routes) controls which columns are updateable, consistent with other Nessi tables.
