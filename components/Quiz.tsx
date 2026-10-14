"use client";

import { useState } from "react";
import { FactText } from "@/components/FactText";
import { SectionHeading } from "@/components/SectionHeading";
import { QUIZ } from "@/content/quiz";

export function Quiz() {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = i >= QUIZ.length;
  const q = QUIZ[Math.min(i, QUIZ.length - 1)];

  const choose = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (k === q.answer) setScore((s) => s + 1);
  };
  const next = () => {
    setPicked(null);
    setI((n) => n + 1);
  };
  const restart = () => {
    setI(0);
    setPicked(null);
    setScore(0);
  };

  return (
    <section aria-labelledby="quiz-heading" className="mx-auto max-w-[720px] px-5 pt-14 sm:px-8">
      <SectionHeading kicker="Test yourself" title="How well do you know the story?" id="quiz-heading" />
      <div className="paper rounded-[var(--radius-card)] p-5 ring-1 ring-rule sm:p-6" aria-live="polite">
        {done ? (
          <div className="text-center">
            <p className="font-display text-[2.4rem] font-semibold text-navy">
              {score} of {QUIZ.length}
            </p>
            <p className="mt-2">
              {score === QUIZ.length
                ? "Perfect score. You could join the expedition."
                : score >= QUIZ.length - 2
                  ? "Wonderful! You know this story well."
                  : "Good effort. Every answer is in the sections above."}
            </p>
            <button
              type="button"
              onClick={restart}
              className="mt-6 min-h-14 w-full rounded-full bg-signal px-6 text-[1.1rem] font-semibold text-navy sm:w-auto"
            >
              Play again
            </button>
          </div>
        ) : (
          <>
            <p className="font-mono text-[1rem] font-semibold text-teal-ink">
              Question {i + 1} of {QUIZ.length}
            </p>
            <h3 className="mt-2 text-[1.4rem] font-semibold text-navy">{q.q}</h3>
            <div className="mt-5 grid gap-3">
              {q.options.map((opt, k) => {
                const state =
                  picked === null ? "idle" : k === q.answer ? "right" : k === picked ? "wrong" : "dim";
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => choose(k)}
                    disabled={picked !== null}
                    className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl px-5 py-3 text-left text-[1.1rem] font-semibold transition-colors ${
                      state === "idle"
                        ? "bg-paper text-navy ring-2 ring-rule hover:ring-teal"
                        : state === "right"
                          ? "bg-teal text-white ring-2 ring-teal"
                          : state === "wrong"
                            ? "bg-slate text-white ring-2 ring-slate"
                            : "bg-paper text-ink-muted ring-1 ring-rule"
                    }`}
                  >
                    <span>{opt}</span>
                    {state === "right" && <span aria-label="correct answer">✓</span>}
                    {state === "wrong" && <span aria-label="your answer, not correct">✗</span>}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="mt-5">
                <p className="font-semibold text-navy">{picked === q.answer ? "That's right!" : "Not quite."}</p>
                <FactText id={q.fact} className="mt-1" />
                <button
                  type="button"
                  onClick={next}
                  className="mt-5 min-h-14 w-full rounded-full bg-navy px-6 text-[1.1rem] font-semibold text-foam sm:w-auto"
                >
                  {i === QUIZ.length - 1 ? "See my score" : "Next question →"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
