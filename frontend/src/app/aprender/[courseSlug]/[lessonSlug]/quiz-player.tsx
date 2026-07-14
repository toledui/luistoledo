"use client";
import { apiFetch } from "@/lib/api";
import {
  CheckCircle2,
  CircleHelp,
  LoaderCircle,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./learning.module.css";
type Quiz = {
  passingScore: number;
  maxAttempts: number;
  attemptsUsed: number;
  questions: {
    id: string;
    text: string;
    type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
    options: { id: string; text: string }[];
  }[];
};
type Result = {
  score: number;
  passed: boolean;
  attemptsRemaining: number;
  results: {
    questionId: string;
    correct: boolean;
    explanation?: string;
    correctOptionIds: string[];
  }[];
};
export function QuizPlayer({
  lessonId,
  onPassed,
}: {
  lessonId: string;
  onPassed: () => void;
}) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void apiFetch<Quiz>(`/learning/lessons/${lessonId}/quiz`)
      .then(setQuiz)
      .catch((v) => setError(v instanceof Error ? v.message : "No disponible"))
      .finally(() => setLoading(false));
  }, [lessonId]);
  function choose(questionId: string, optionId: string, multiple: boolean) {
    if (result) return;
    setAnswers((current) => {
      const selected = current[questionId] || [];
      return {
        ...current,
        [questionId]: multiple
          ? selected.includes(optionId)
            ? selected.filter((id) => id !== optionId)
            : [...selected, optionId]
          : [optionId],
      };
    });
  }
  async function submit() {
    if (!quiz) return;
    if (quiz.questions.some((q) => !answers[q.id]?.length)) {
      setError("Responde todas las preguntas antes de entregar.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const value = await apiFetch<Result>(
        `/learning/lessons/${lessonId}/quiz/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: quiz.questions.map((q) => ({
              questionId: q.id,
              selectedOptionIds: answers[q.id],
            })),
          }),
        },
      );
      setResult(value);
      if (value.passed) onPassed();
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "No fue posible entregar.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  if (loading) return <LoaderCircle className={styles.spin} />;
  if (!quiz) return <p>{error}</p>;
  return (
    <div className={styles.quizPlayer}>
      <header>
        <CircleHelp />
        <div>
          <h1>Comprueba tu aprendizaje</h1>
          <p>
            Calificación mínima: {quiz.passingScore}% · Intento{" "}
            {quiz.attemptsUsed + 1} de {quiz.maxAttempts}
          </p>
        </div>
      </header>
      {result && (
        <div className={result.passed ? styles.quizPassed : styles.quizFailed}>
          {result.passed ? <CheckCircle2 /> : <XCircle />}
          <div>
            <strong>{result.score}%</strong>
            <span>
              {result.passed
                ? "Cuestionario aprobado"
                : "Todavía no alcanzas la calificación mínima"}
            </span>
          </div>
        </div>
      )}
      {quiz.questions.map((question, index) => {
        const qr = result?.results.find(
          (item) => item.questionId === question.id,
        );
        return (
          <section key={question.id}>
            <h2>
              <i>{index + 1}</i>
              {question.text}
            </h2>
            <div>
              {question.options.map((option) => {
                const selected = answers[question.id]?.includes(option.id);
                const correct = qr?.correctOptionIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    className={`${selected ? styles.selectedAnswer : ""} ${result && correct ? styles.correctAnswer : ""}`}
                    onClick={() =>
                      choose(
                        question.id,
                        option.id,
                        question.type === "MULTIPLE_CHOICE",
                      )
                    }
                  >
                    <span>
                      {question.type === "MULTIPLE_CHOICE"
                        ? selected
                          ? "✓"
                          : "□"
                        : selected
                          ? "●"
                          : "○"}
                    </span>
                    {option.text}
                  </button>
                );
              })}
            </div>
            {qr?.explanation && <p>{qr.explanation}</p>}
          </section>
        );
      })}
      {error && <p className={styles.quizError}>{error}</p>}
      {!result ? (
        <button
          className={styles.submitQuiz}
          onClick={() => void submit()}
          disabled={submitting}
        >
          {submitting ? (
            <LoaderCircle className={styles.spin} />
          ) : (
            <CheckCircle2 />
          )}
          Entregar cuestionario
        </button>
      ) : !result.passed && result.attemptsRemaining > 0 ? (
        <button
          className={styles.submitQuiz}
          onClick={() => {
            setResult(null);
            setAnswers({});
          }}
        >
          <RotateCcw />
          Intentar nuevamente
        </button>
      ) : null}
    </div>
  );
}
