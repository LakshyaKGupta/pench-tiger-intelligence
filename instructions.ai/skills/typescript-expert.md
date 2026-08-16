# Skill: TypeScript Expert Engineering

Use this skill when writing, auditing, fixing, or refactoring TypeScript or TSX code. Strict type safety is non-negotiable.

## 1. Type Safety Mandate
- **No `any`**: Use `unknown` for external inputs and narrow with type guards. If `any` is unavoidable, document why with an inline comment.
- **Explicit return types**: All exported functions must declare return types explicitly — never rely on inference for public API.
- **Discriminated unions over optional fields**: Model state machines as `{ status: "loading" } | { status: "success"; data: T } | { status: "error"; error: string }`, not a flat object with many optionals.
- **Branded types for IDs**: `type AgentId = string & { readonly __brand: "AgentId" }` prevents category errors across domain boundaries.
- **`satisfies` over `as`**: Use `satisfies Interface` when assigning literals to ensure shape compliance without losing literal types.

## 2. Configuration & Tooling Standards
- **tsconfig**: Always enable `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"moduleResolution": "bundler"`.
- **Zod at API boundaries**: Parse with `schema.parse()`, never `.safeParse()` silently ignored. Export inferred types: `export type Agent = z.infer<typeof AgentSchema>`.
- **React TSX**: All component props in explicit named interfaces. Use `React.ChangeEvent<HTMLInputElement>`, typed refs (`useRef<HTMLDivElement>(null)`), and typed context values.
- **Result pattern for fallible ops**: `type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }`.
- **Verification**: After every TS task, run `tsc --noEmit` and confirm zero errors. No `@ts-ignore` without a documented justification.
