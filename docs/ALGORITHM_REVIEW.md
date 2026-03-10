# Algorithm Review: Book Search and Filtering Endpoint

Target: `backend/routes/books.js` (`POST /api/books`)

## What the current algorithm does well

1. **Good defensive SQL construction**
   - Uses parameterized placeholders (`?`) and a separate `params` array, which protects against SQL injection.
2. **Flexible query model**
   - Supports full search (`q`), title-priority search (`q_title`), structured filters (category/author/publisher), price range, sorting, and pagination.
3. **Useful aggregation in one pass**
   - Returns average rating and review count in the same query via joins + aggregation.
4. **Stable ordering**
   - Adds `b.isbn DESC` tiebreakers in sorts, which is useful for deterministic pagination.

## Main algorithmic/DB concerns

1. **`LOWER(column)` inhibits index usage**
   - Conditions like `LOWER(b.title) LIKE ?`, `LOWER(a.full_name) = ?`, and `LOWER(p.name) = ?` can make normal indexes unusable, increasing table scan risk.

2. **`LIKE '%term%'` on multiple joined tables is expensive**
   - Cross-table wildcard matching (`title`, `author`, `publisher`, and optionally `isbn`) can become slow at scale.

3. **`SELECT DISTINCT` + `GROUP BY` together**
   - The query currently does both. With proper grouping, `DISTINCT` is often redundant and may add overhead.

4. **Pagination is offset-based only**
   - `LIMIT ... OFFSET ...` can degrade as `offset` grows because DB still scans/skips many rows.

5. **Potential duplicate amplification from joins**
   - Joining `book_authors` and `reviews` in one aggregation query can expand row count before grouping. The current `COUNT(DISTINCT r.id)` handles one metric safely, but AVG/other aggregates can still be sensitive if relationship cardinalities change.

6. **Edge-case input handling**
   - `price_min` and `price_max` are not cross-validated (`min <= max`).
   - `limit` allows negative values if caller sends them (because only `Math.min` is applied, not `Math.max` lower bound).

## High-impact improvements (recommended order)

1. **Fix input normalization first (low effort, high reliability)**
   - Clamp `limit` with `Math.max(1, Math.min(...))`.
   - Validate `price_min <= price_max` when both provided.
   - Whitelist `sort_by` values instead of branching free-form strings.

2. **Remove redundant `DISTINCT` and simplify aggregation path**
   - Use `GROUP BY b.isbn` (plus SQL-mode compliant columns) and remove `DISTINCT` unless proven necessary by execution plan.

3. **Improve indexability for case-insensitive filters**
   - Prefer case-insensitive collation at schema/index level instead of wrapping columns in `LOWER()`.
   - If DB supports functional indexes, index normalized expressions.

4. **Split heavy joins into pre-aggregated subqueries/CTEs**
   - Pre-aggregate reviews by ISBN, then join the aggregate to books.
   - Optionally pre-aggregate author names per ISBN to avoid multiplicative joins.

5. **Introduce search strategy by mode**
   - Exact ISBN: direct indexed lookup.
   - Prefix title/author search: `term%` where possible.
   - Fuzzy contains search: only when explicitly requested.

6. **Move to keyset pagination for high page numbers**
   - Use cursor based on `(created_at, isbn)` (or chosen sort key) instead of large offsets.

## Optional next step: full-text search

If product requirements include relevance ranking and broad text matching, consider native full-text indexing (MySQL FULLTEXT or external engine like OpenSearch). Keep structured filters in SQL and combine with text engine for scalable ranking.
