Alright — you’re asking for the **deep, brutal, architect-level checklist** of what falls under **General Code Quality** — the stuff AI reviewers (CodeRabbit, Shannon, etc.) *primarily* evaluate across frontend, backend, DB, infra, everything.

This is basically the **“universal engineering hygiene layer.”**
Not UI. Not business logic. Not infra.
Just **how good your code actually is.**

I’m going **very extensive** — think like you’re building engineering standards for Avior 👇

---

# 🧠 1. Core Logic & Correctness

The most fundamental layer.

### Logical Soundness

* Incorrect conditional logic
* Off-by-one errors
* Infinite loops
* Deadlocks (basic detection)
* Race conditions (basic inference)
* Improper branching
* Wrong operator usage
* Mutation vs immutability mistakes
* Missing return paths
* Unreachable code
* Incorrect recursion handling
* Boolean confusion
* Wrong assumptions about data types

### Edge Case Handling

* Null / undefined checks missing
* Empty collections
* Boundary conditions
* Large inputs
* Zero values
* Duplicate entries
* Unexpected enum values
* Time zone issues
* Date parsing risks

---

# 🧹 2. Code Structure & Readability

AI tools are very strong here.

### Naming

* Poor variable names
* Inconsistent naming conventions
* Magic abbreviations
* Non-semantic naming
* Shadowed variables

### Organization

* God classes
* Long functions
* Nested logic hell
* Deep callback chains
* Duplicate logic blocks
* Poor file structure
* Lack of modularization
* Tight coupling

### Formatting

* Inconsistent indentation
* Mixed styles
* Long lines
* Missing whitespace
* Mixed language conventions

---

# 🔁 3. DRY / Reusability / Maintainability

They heavily detect duplication patterns.

* Repeated code blocks
* Copy-paste programming
* Similar logic across files
* Repeated API calls
* Duplicate validation logic
* Hardcoded constants
* Missing utility abstractions
* Missing shared services
* Improper reuse patterns

---

# ⚙️ 4. Complexity & Maintainability Metrics

This is a big one in enterprise tools.

* High cyclomatic complexity
* Excessive branching
* Deep nesting
* Large parameter lists
* Massive classes
* Tight dependency graphs
* Hidden side effects
* Overloaded responsibilities
* Long switch/case chains

---

# 🧱 5. SOLID Principles & Design Patterns

AI tools increasingly flag architectural violations.

### Single Responsibility

* Functions doing multiple jobs
* Classes mixing domains

### Open/Closed

* Hardcoded extensibility
* If-else instead of polymorphism

### Liskov Violations

* Broken inheritance contracts

### Interface Segregation

* Overloaded interfaces

### Dependency Inversion

* Direct concrete dependencies
* Global state reliance

---

# 🧩 6. Error Handling & Resilience

Massive area where AI tools help.

* Silent failures
* Empty catch blocks
* Overly generic exception handling
* Missing retries
* Missing fallback logic
* Throwing raw errors
* Logging missing during failures
* Not propagating errors
* Swallowing exceptions
* Improper async error handling
* Promise rejection leaks

---

# 📦 7. Dependency & Package Hygiene

General across FE/BE.

* Unused imports
* Unused packages
* Version mismatches
* Deprecated APIs
* Circular dependencies
* Hidden transitive risks
* Incorrect peer dependencies
* Hardcoded version numbers
* Unpinned dependencies
* Heavy libraries for small tasks

---

# 🔐 8. Basic Security Hygiene (General Layer)

Not deep penetration testing — just code hygiene.

* Hardcoded credentials
* Secrets in config
* Unsafe string interpolation
* Missing input sanitization
* Logging sensitive data
* Exposed tokens
* Weak randomness
* Unsafe file operations
* Debug mode enabled
* Insecure default configs

---

# 🚀 9. Performance Anti-Patterns (General Level)

Not load testing — but code smell detection.

* Nested loops over large datasets
* Redundant computations
* Inefficient data structures
* Blocking calls in async flows
* Memory-heavy operations
* Unnecessary object creation
* Repeated expensive calls
* Inefficient string handling
* Poor caching usage
* Over-serialization

---

# 🧵 10. Concurrency & Async Issues

Very relevant for your FastAPI/Kafka world.

* Missing await
* Blocking event loops
* Shared mutable state
* Thread safety issues
* Race conditions
* Unprotected shared resources
* Improper locking
* Async inside loops
* Parallel execution risks

---

# 🧾 11. Documentation & Developer Experience

Often overlooked — AI tools catch this.

* Missing docstrings
* Outdated comments
* Incorrect comments
* Misleading TODOs
* Dead documentation
* Lack of usage examples
* Missing API contracts
* Missing function descriptions

---

# 🧪 12. Testability & Engineering Hygiene

Even outside test files.

* Hardcoded external calls
* No dependency injection
* Tight coupling to DB
* Unmockable services
* Static global states
* Hidden side effects
* Time-dependent logic
* Randomness without seeding

---

# 🧠 13. Data Handling & Validation

Universal quality layer.

* Missing input validation
* Improper casting
* Unsafe parsing
* Over-trusting external data
* Lack of schema enforcement
* Implicit assumptions
* Inconsistent data shapes

---

# 🧰 14. Configuration & Environment Handling

Big in microservices.

* Hardcoded environment values
* Inline URLs
* Magic ports
* Embedded API keys
* Missing environment fallback
* Config duplication
* Incorrect default configs

---

# 🧬 15. Codebase Health Signals (Advanced AI Reviewers)

Some tools now analyze repo-wide patterns.

* Architectural drift
* Ownership gaps
* Module instability
* High churn areas
* Technical debt hotspots
* Anti-pattern propagation
* Monolith creep
* Duplicate service logic

---

# 🧠 Real Talk — This is the Layer Where AI is STRONGEST

If you deploy CodeRabbit or Shannon correctly:

👉 60–70% of code review comments can be automated here.

Because:

* It’s static
* Pattern-based
* Structure-based
* Language-agnostic

---

# ⚠️ But Even Here — They Still Struggle With:

* Business logic correctness
* Product intent
* Domain rules
* Strategic design
* Tradeoff decisions
* Long-term architecture

---

If you want something next-level useful for you as Avior founder/architect:

I can give you:

✅ **A “Production-Grade Code Review Checklist”**
(the exact checklist senior engineers at funded startups use internally — mapped to microservices + AI products)

That would be insanely useful for building Avior’s engineering culture early.

Want that? 😄
