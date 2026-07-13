# Prompt: Live Browser QA Pass for "MediCare" (All Three Tiers, Real Running App)

> Copy everything below into an agentic AI tool that has **real browser
> automation access** (Playwright, Puppeteer, a browser-use tool, or
> computer-use with a browser) plus terminal access to start the app. This
> prompt is for testing the **running application in a real browser** —
> it is not a request to read or write test code. If your tool has no
> browser automation capability, stop and say so rather than simulating
> what a browser session would probably show.
>
> This prompt assumes `CODEBASE_WALKTHROUGH.md` (or equivalent) exists in
> the repo describing the real architecture, routes, thresholds, and data
> shapes. Read it first — it's your source of "expected" behavior. If it
> doesn't exist or seems stale, note that explicitly rather than guessing.

---

## Role

You are a QA engineer doing a live, hands-on pass over MediCare — a
three-tier app (React/Vite frontend, Node/Express backend, Python/FastAPI
AI service, MongoDB, plus Cloudinary/OneSignal/Brevo/openFDA/Groq/Gemini
integrations). Your job is to actually click through the running
application in a real browser, compare what you observe against the
documented/coded expected behavior, and produce an evidence-backed report
of what works, what doesn't, and what you couldn't verify.

## Hard Rules

1. **Never claim a test passed without having actually performed the
   browser action in this session.** No test result may be based on
   reading the code alone — that's what the earlier codebase walkthrough
   was for. This pass is about observed, live behavior.
2. **Capture evidence for every test**: a screenshot at minimum, and where
   possible the exact HTTP status code / response body seen in the network
   panel or console for the relevant request. Reference the evidence file
   name in your report.
3. **Distinguish "expected per code/docs" from "observed in browser"
   explicitly**, and flag any mismatch as a discrepancy rather than quietly
   reconciling it in the write-up.
4. **Only use synthetic test data.** Never upload, enter, or reference real
   patient information. If the repo has sample fixture PDFs already (e.g.
   `sample_blood_test.pdf`, `sample_urine_test.pdf`,
   `sample_imaging_xray.pdf`, `sample_ecg.pdf`, `sample_prescription.pdf`,
   `sample_discharge_summary.pdf`, and a scanned/no-text-layer variant),
   use those. If they don't exist, generate clearly-labeled synthetic
   equivalents before testing and say so in the report.
5. **Use a fresh, disposable test account per run** (a timestamped email
   like `qa-test-20260713-1@example.test`) so results aren't polluted by
   state from a previous run, and note the credentials used at the top of
   the report so a human can reproduce or clean up.
6. **Some behaviors are time-bound and may not be verifiable in a single
   session** (e.g., a 15-minute account lockout expiry, a cron sweep that
   runs every 15 minutes checking for doses pending over an hour). For
   these, either genuinely wait/advance through the window if your session
   allows it, or explicitly mark the result as `NOT VERIFIED — time-bound,
requires longer session` rather than assuming it works.
7. **If a step blocks you** (missing env var, service won't start, a page
   crashes), don't skip silently — record it as `BLOCKED` with the exact
   error, and continue testing whatever else you still can.

---

## Phase 0 — Environment Setup & Health Checks

1. Start MongoDB (or confirm an existing connection is reachable).
2. Start the Python AI service (`ai-service/`) and confirm it's actually
   listening (hit its health endpoint or check startup logs) before moving
   on — don't assume it started just because the command didn't error
   immediately.
3. Start the Node backend and confirm the "MongoDB connected" and any
   scheduler-initialization log lines actually appear.
4. Start the frontend dev server and confirm it's serving on its expected
   port.
5. Check whether `GROQ_API_KEY` and/or `GEMINI_API_KEY` are actually set.
   If neither is present, note in the report that AI-dependent tests below
   will only exercise fallback/degraded behavior, not the primary path —
   don't skip those tests, just label results accordingly.
6. Record the exact versions/ports/URLs you're testing against at the top
   of the final report for reproducibility.

---

## Phase 1 — Auth & Account (browser-driven)

For each item: perform the real UI flow, capture a screenshot of the
result, and note the exact status code/response seen in devtools if
relevant.

- Register a new fresh test account through the UI form. Confirm you land
  on the expected post-registration screen/state.
- Attempt to register again with the same email. Confirm the exact error
  message shown matches a real validation failure (not a generic crash).
- Attempt registration with a short/weak password. Confirm client-side
  validation fires before any network request (check devtools — was a
  request even sent?).
- Log out, log back in with correct credentials — confirm success and
  landing page.
- Log in with the wrong password **5 times in a row** (the documented
  lockout threshold) and confirm the 6th attempt — even with the _correct_
  password — is rejected. Capture the exact error text and status code.
- If your session allows waiting ~15 minutes (the documented lockout
  window), wait it out and confirm the account unlocks; otherwise mark this
  specific sub-check `NOT VERIFIED — time-bound`.
- Trigger "forgot password." Confirm whether a reset mechanism is actually
  reachable from the browser side (e.g., a console-logged link in dev mode,
  or a real email if you have access to a test inbox) — if you cannot
  complete the loop, mark it `BLOCKED` with what you could verify (e.g.,
  the request succeeded server-side per the network panel) versus what you
  couldn't (actually receiving/using the reset link).
- Update profile fields (name, phone, allergies, language, notification
  preferences) via the Settings page. Refresh the page and confirm
  persistence.
- Open a second browser context (incognito or a second profile), register
  a second test account, and attempt to navigate directly to a resource URL
  (e.g., a report ID) belonging to the first account. Confirm it's blocked,
  and capture the exact status/behavior observed.
- Delete the second test account via the UI. Confirm the confirmation step
  exists (not a single accidental click), and confirm you're logged out
  afterward.

---

## Phase 2 — Report Upload & Category-Aware Processing (the core feature)

For **each** sample report type available:

- Upload it through the real drop-zone/upload UI. Watch and screenshot the
  processing status as it changes (e.g., processing → done) — confirm the
  UI actually reflects intermediate state rather than jumping straight to
  a final result with no feedback.
- Once complete, screenshot the rendered result and check it against the
  category schema documented in the walkthrough:
  - **Blood/urine test**: results grouped into sensible panels, not one
    flat list; status badges present and colored per value.
  - **Imaging**: rendered as findings/impression/recommendation text, not
    forced into numeric test rows.
  - **ECG**: interval fields (PR/QRS/QT/QTc) rendered as their own
    section, with the documented borderline logic reflected in status
    (spot-check one value you know is borderline/abnormal in the fixture).
  - **Prescription**: medication list rendered, and the "Add to my
    medications" action present and functional — actually click it and
    confirm the medication appears on the Medications page afterward, and
    that doing this twice with the same report doesn't create a duplicate.
  - **Discharge summary**: diagnoses/procedures/medications/follow-up
    rendered as distinct sections.
- For the scanned/no-text-layer fixture specifically: confirm the pipeline
  still produces a usable result (this is what actually exercises the OCR
  fallback path) and note how long it took relative to the clean-PDF
  uploads — a large latency difference here is expected and worth
  recording, not treating as a bug.
- Check whether any field in any result is shown with a low-confidence
  indicator, and if so, screenshot it and note whether it corresponds to
  something genuinely ambiguous in the source fixture.
- Try uploading an oversized file and a wrong-file-type file. Confirm
  client-side rejection happens with a clear message before any upload
  request is sent (check devtools).
- Use the report Q&A feature (if present) to ask one answerable question
  and one out-of-scope question about an uploaded report. Screenshot both
  responses and note whether the out-of-scope one actually declined rather
  than answering anyway.

---

## Phase 3 — Report Comparison & Trends

- With two blood-test uploads present (upload the sample twice under
  different dates if needed, or use two distinct fixtures with overlapping
  parameters), use the Compare feature. Screenshot the result and confirm
  the delta direction (improved/worsened) matches the actual numbers in the
  two source fixtures.
- Attempt comparing a blood test against the imaging report. Screenshot
  what actually happens — confirm it's handled sensibly (blocked with a
  clear message, or explicitly labeled as not comparable) rather than
  producing a nonsensical diff.
- Open Trends for a parameter present in only one report. Confirm a
  sensible "not enough data" state rather than a broken/empty chart.

---

## Phase 4 — Medications

- Add a medication through the UI with a simple frequency. Screenshot the
  auto-generated schedule and confirm it looks correct for the frequency
  chosen.
- Add two medications documented to trigger an interaction warning (or two
  that plausibly would). Screenshot the warning banner if one appears.
- If your browser tool supports network throttling/blocking, block the
  `openFDA` domain specifically and repeat the interaction check. Confirm a
  fallback warning is shown (per the documented local-fallback behavior)
  and that it's visibly labeled as a fallback rather than presented
  identically to a live openFDA result.
- Mark a scheduled dose "taken" from the Today's Schedule view. Screenshot
  the before/after state and confirm any adherence percentage indicator
  updates.
- If feasible within your session length, leave a dose unmarked past its
  scheduled time and either wait through the documented sweep window or
  mark this sub-check `NOT VERIFIED — time-bound`.
- Delete a medication that was added via the prescription "Add to my
  medications" flow, from the report that spawned it. Then check the
  original report is still intact and — per the documented concern about
  this exact interaction — confirm whether deleting the _report_ afterward
  cascades to delete the medication or only unlinks it. Screenshot whatever
  actually happens; this is a specifically flagged risk area, so be precise
  about what you observe rather than assuming either behavior.

---

## Phase 5 — Symptoms

- Log a symptom entry with multiple symptoms, pain level, mood, and vitals
  through the real form. Screenshot the saved entry.
- Log a symptom shortly after the medication added in Phase 4 (same
  session, so "shortly after" just means after it exists in the system).
  Screenshot whether any AI correlation insight appears and what it says.
- Try to submit an out-of-range value (e.g., manipulate a slider past its
  visual max via keyboard if possible, or check whether the form allows an
  invalid submission at all). Confirm client-side validation catches it.
- View the pain/mood trend chart after only 1–2 log entries. Screenshot to
  confirm it doesn't render a misleadingly smooth/interpolated trend line
  from sparse data.

---

## Phase 6 — Timeline, Dashboard & Notifications

- View the Dashboard as this fresh test account after completing Phases
  1–5. Screenshot and confirm the summary stats (report count, active
  medication count, average pain, etc.) actually match what you did in
  this session — this is a direct correctness check, not just a visual
  check.
- View the Timeline. Confirm chronological ordering and that report/
  medication/symptom events are visually distinguishable.
- Filter the timeline by a date range that should exclude everything you
  just did, and confirm the view actually empties out (check the network
  request's query params too, not just the visual result).
- Open the notification bell. Screenshot its state, mark one notification
  read, and confirm the unread count updates without a full page reload.

---

## Phase 7 — Responsiveness, Errors & Security Spot-Checks

- Resize the browser to a mobile viewport on the Dashboard, Upload, Report
  Detail, and Medications pages. Screenshot each and note any overflow or
  broken layout.
- Using devtools network throttling, simulate a slow connection on the
  Dashboard load. Screenshot the loading state — confirm skeleton/loading
  UI appears rather than a blank screen.
- Go offline (devtools network → offline) and attempt an action. Screenshot
  the resulting error state and confirm there's a retry affordance rather
  than a silent failure or raw browser error.
- Rapidly submit the login form with wrong credentials well past the
  documented rate-limit threshold. Confirm you actually receive a
  rate-limit-style rejection (capture the status code) rather than the app
  just continuing to accept attempts.
- Open the browser console throughout your entire session and note any
  uncaught JS errors, failed asset loads, or exposed sensitive data
  (tokens, keys) printed to the console — list anything found verbatim in
  the report.

---

## Phase 8 — Deliverable

Produce `BROWSER_QA_REPORT.md` at the repo root with:

1. **Run metadata**: date/time, test account(s) used, ports/URLs tested,
   whether AI keys were present, and a note on which time-bound checks were
   fully verified vs. marked not-verified.
2. **Results table**, one row per test performed:

   | Phase | Test | Expected (per code/docs) | Observed | Status | Evidence |
   | ----- | ---- | ------------------------ | -------- | ------ | -------- |

   Status is one of: `PASS`, `FAIL`, `BLOCKED`, `NOT VERIFIED (time-bound)`.
   Evidence is a filename/reference to the screenshot or captured
   network detail.

3. **Discrepancies section**: anything where documented/expected behavior
   and observed behavior diverged, described specifically (not "mostly
   works").
4. **Specifically re-verify these previously-flagged risk areas** and give
   each its own clearly labeled result: the report-delete vs. linked-
   medication behavior (Phase 4), the scanned-PDF OCR fallback actually
   producing usable output (Phase 2), and the openFDA-fallback labeling
   being visibly distinct from a live result (Phase 4).
5. **Console/network anomalies** found during Phase 7, listed verbatim.
6. **Suggested next steps**: anything you were blocked on or couldn't
   verify that a human should follow up on, and anything that clearly
   failed and needs a fix before this is demo/production ready.

## Style Rules

- Every row in the results table must correspond to a real action you took
  in this session — no rows describing what "should" happen based on
  reading code alone.
- Prefer exact captured text/values over paraphrased summaries ("returned
  409 Conflict with message 'Email already registered'" beats "showed an
  error").
- If you run out of session time before completing all phases, stop and
  clearly mark which phases were and weren't completed rather than
  fabricating results for the remainder.
