# Feedback Rewrite — For Your Approval

The date-stuck bug is fixed in `app.html`. This doc is the proposed rewrite of every feedback phrasing — adapted to actually reflect multiple-choice, fill-in-the-blank, and written-response work as a teacher would write it.

**Format:** each section shows the current text, then the proposed rewrite. **Strike anything you don't want.** Reply with edits or just say "approve" and I'll apply them all to `app.html` in one pass.

Voice rules I'm following:
- Polished but personal (no slang, no run-on commas)
- Full sentences with real punctuation
- Closer is "I'm here if you have any questions" or "Reach out anytime."
- No personal name — uses "[Your Name]" placeholder where signed
- Date prefix `Graded {d} -` stays as-is (handled by the new date-sync fix)

---

## FIRST ASSIGNMENT · Welcome (1st Nine Weeks)
*Context: usually a syllabus quiz or first multiple-choice check.*

**Variation 1 (default)**
> Graded {d} — Welcome to the class. I reviewed your first assignment and you are off to a strong start. Your answers were clear and showed real effort. Keep that energy going; it is a great way to begin the school year. I am here if you have any questions.

**Variation 2**
> Graded {d} — Great first impression. Your responses show that you took the time to read through the lesson before answering, which is exactly the right mindset heading into the school year. Reach out anytime you need help.

**Variation 3**
> Graded {d} — Nice work on your very first assignment. You clearly put effort into reading each question carefully, and it shows in your score. Keep that approach going. I am always here if something does not make sense.

---

## FIRST ASSIGNMENT · Welcome (2nd / 3rd / 4th Nine Weeks)
*Same structure, three variations each — same voice, term-appropriate framing. Approve "rewrite all" and I'll mirror the polish above across all three.*

---

## ASSIGNMENT · Perfect
*Context: typically multiple-choice or fill-in-the-blank where every answer hit.*

**Variation 1 (default)**
> Graded {d} — Every answer was correct. You clearly read each question carefully and pulled your answers directly from the lesson. Keep up this consistent effort.

**Variation 2**
> Graded {d} — A perfect score. Your responses show that you actually engaged with the material rather than guessing, and that focus is what builds a strong grade over time. Nice work.

**Variation 3**
> Graded {d} — Great job. Every question was answered correctly and your work showed real attention to detail. This is exactly the kind of effort that pays off.

---

## ASSIGNMENT · Partial Credit
*Context: multiple-choice or fill-in-the-blank where some answers missed the mark.*

**Variation 1 (default)**
> Graded {d} — I reviewed your responses and gave you credit on every question I could. The ones that missed credit needed answers pulled directly from the lesson — slow down and make sure each response matches what the material covered. If you would like to retake this one, message me.

**Variation 2**
> Graded {d} — Good effort, but a few answers did not line up with what the lesson was teaching. Take another pass through the material and focus on matching each answer to the source. I am happy to reset this assignment if you would like another attempt.

**Variation 3**
> Graded {d} — You earned partial credit on this one. The key is making sure every answer ties back directly to the lesson rather than a best guess. Reach out if you want me to reopen it so you can retry.

---

## ASSIGNMENT · Assignment Resubmit
*Context: blank submission or too little work to grade.*

**Variation 1 (default)**
> Graded {d} — This assignment came in blank or without enough completed work to grade fairly. Message me and I will reset it. I want to make sure you have a chance to attempt it with a clear understanding of what is being asked.

**Variation 2**
> Graded {d} — There was not enough completed work here to grade. No problem — send me a quick message and I will reset the assignment so you can give it a real attempt.

**Variation 3**
> Graded {d} — This one came in mostly empty. Reach out and I will reopen it for you. We can talk through anything that is unclear before you resubmit.

---

## PROJECT · Perfect
*Context: written or multi-part project, usually rubric-graded.*

**Variation 1 (default)**
> Graded {d} — Excellent work. Your project was well organized, thoroughly completed, and exceeded the expectations on every part of the rubric. This is exactly what a top-tier project looks like.

**Variation 2**
> Graded {d} — Great project. The organization was clear, the details were thoughtful, and the effort you put in shows in every section. Keep this standard up.

**Variation 3**
> Graded {d} — A strong submission. You went beyond what was required and the quality came through. This is the kind of work that sets the bar for the rest of the class.

---

## PROJECT · Good Overall Project
*Context: solid project but room to grow.*

**Variation 1 (default)**
> Graded {d} — Good work overall. The required pieces are all here. To push this into perfect-score territory next time, focus on the details that are easy to skip — extra creativity, deeper explanation, and a clean final pass before submitting.

**Variation 2**
> Graded {d} — Solid project. The structure is right and the content is there. What separates good from great is the small stuff: an extra example, a clearer transition, a stronger conclusion. Keep that in mind on the next one.

**Variation 3**
> Graded {d} — Nice effort on this project. The foundation is strong; the next step is putting more polish on the final details. You have the skills — give every section your full attention next round.

---

## PROJECT · Missing Work
*Context: no file uploaded.*

**Variation 1 (default)**
> Graded {d} — Your file is missing on this one. Please reach out so I can help you get back on track. The grade will stay a zero until I hear from you, but it is fixable — I am here to help.

**Variation 2**
> Graded {d} — I do not see your file uploaded for this project. Message me and we will figure out what happened. The zero is temporary; I just need to hear from you.

**Variation 3**
> Graded {d} — Nothing came through for this project. Reach out and I will help you get back on track. Let me know if there was an issue with the upload or if you need the assignment explained again.

---

## Other Tweaks I Recommend (separate approval)

1. **Add "Fill in the Blank Mostly Right" scenario** under ASSIGNMENT — for partial-credit on a fill-in where most answers were right but a couple were typos or close-but-not-exact. Currently you'd use "Partial Credit" which sounds harsher.
2. **Add a "Written Response Partial Credit" scenario** — softens the "pull from the lesson" language since written responses are about reasoning, not lookup.
3. **Rename "Assignment Resubmit" → "Submitted Blank"** — clearer at a glance in the dropdown.

Reply with:
- **"approve all"** — apply the 8 rewrites above to `app.html`
- **"approve except 1, 5"** (etc.) — surgical
- **"approve and add 1+2 from Other Tweaks"** — bigger change
- Or just comment inline on anything you want phrased differently
