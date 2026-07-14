"use client";

import { apiFetch } from "@/lib/api";
import { Check, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "../courses.module.css";

type Option = { text: string; isCorrect: boolean };
type Question = {
  text: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  explanation?: string;
  options: Option[];
};
type Quiz = {
  passingScore: number;
  maxAttempts: number;
  timeLimitMinutes?: number | null;
  shuffleQuestions: boolean;
  requirePreviousLessons: boolean;
  questions: Question[];
};
const emptyQuestion = (): Question => ({
  text: "",
  type: "SINGLE_CHOICE",
  explanation: "",
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ],
});

export function QuizEditor({ lessonId }: { lessonId: string }) {
  const [quiz, setQuiz] = useState<Quiz>({
    passingScore: 70,
    maxAttempts: 3,
    timeLimitMinutes: null,
    shuffleQuestions: false,
    requirePreviousLessons: true,
    questions: [emptyQuestion()],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void apiFetch<Quiz | null>(`/admin/courses/lessons/${lessonId}/quiz`)
      .then((value) => value && setQuiz(value))
      .finally(() => setLoading(false));
  }, [lessonId]);

  function updateQuestion(index: number, patch: Partial<Question>) {
    setQuiz((current) => ({
      ...current,
      questions: current.questions.map((question, position) =>
        position === index ? { ...question, ...patch } : question,
      ),
    }));
  }
  function updateOption(
    questionIndex: number,
    optionIndex: number,
    patch: Partial<Option>,
  ) {
    const question = quiz.questions[questionIndex];
    let options = question.options.map((option, position) =>
      position === optionIndex ? { ...option, ...patch } : option,
    );
    if (patch.isCorrect && question.type !== "MULTIPLE_CHOICE")
      options = options.map((option, position) => ({
        ...option,
        isCorrect: position === optionIndex,
      }));
    updateQuestion(questionIndex, { options });
  }
  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const value = await apiFetch<Quiz>(
        `/admin/courses/lessons/${lessonId}/quiz`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quiz),
        },
      );
      setQuiz(value);
      setMessage("Cuestionario guardado correctamente.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible guardar.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading) return <LoaderCircle className={styles.spin} />;
  return (
    <div className={styles.quizEditor}>
      <div className={styles.quizSettings}>
        <label>
          Calificación mínima
          <input
            type="number"
            min="1"
            max="100"
            value={quiz.passingScore}
            onChange={(event) =>
              setQuiz({ ...quiz, passingScore: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Intentos permitidos
          <input
            type="number"
            min="1"
            value={quiz.maxAttempts}
            onChange={(event) =>
              setQuiz({ ...quiz, maxAttempts: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Tiempo límite (minutos)
          <input
            type="number"
            min="1"
            value={quiz.timeLimitMinutes || ""}
            onChange={(event) =>
              setQuiz({
                ...quiz,
                timeLimitMinutes: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          />
        </label>
        <label className={styles.quizCheck}>
          <input
            type="checkbox"
            checked={quiz.shuffleQuestions}
            onChange={(event) =>
              setQuiz({ ...quiz, shuffleQuestions: event.target.checked })
            }
          />
          Aleatorizar preguntas
        </label>
        <label className={styles.quizCheck}>
          <input
            type="checkbox"
            checked={quiz.requirePreviousLessons}
            onChange={(event) =>
              setQuiz({
                ...quiz,
                requirePreviousLessons: event.target.checked,
              })
            }
          />
          Aplicar después de completar las lecciones anteriores
        </label>
      </div>
      {quiz.questions.map((question, questionIndex) => (
        <article className={styles.questionEditor} key={questionIndex}>
          <header>
            <strong>Pregunta {questionIndex + 1}</strong>
            <select
              value={question.type}
              onChange={(event) =>
                updateQuestion(questionIndex, {
                  type: event.target.value as Question["type"],
                  options:
                    event.target.value === "TRUE_FALSE"
                      ? [
                          { text: "Verdadero", isCorrect: true },
                          { text: "Falso", isCorrect: false },
                        ]
                      : question.options,
                })
              }
            >
              <option value="SINGLE_CHOICE">Opción única</option>
              <option value="MULTIPLE_CHOICE">Selección múltiple</option>
              <option value="TRUE_FALSE">Verdadero o falso</option>
            </select>
            <button
              type="button"
              className={styles.deleteQuestion}
              disabled={quiz.questions.length === 1}
              title={
                quiz.questions.length === 1
                  ? "El cuestionario debe conservar al menos una pregunta"
                  : `Eliminar pregunta ${questionIndex + 1}`
              }
              aria-label={`Eliminar pregunta ${questionIndex + 1}`}
              onClick={() =>
                setQuiz({
                  ...quiz,
                  questions: quiz.questions.filter(
                    (_, index) => index !== questionIndex,
                  ),
                })
              }
            >
              <Trash2 />
              <span>Eliminar</span>
            </button>
          </header>
          <textarea
            placeholder="Escribe la pregunta"
            value={question.text}
            onChange={(event) =>
              updateQuestion(questionIndex, { text: event.target.value })
            }
          />
          <div className={styles.optionList}>
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex}>
                <button
                  className={option.isCorrect ? styles.correctOption : ""}
                  onClick={() =>
                    updateOption(questionIndex, optionIndex, {
                      isCorrect: !option.isCorrect,
                    })
                  }
                  title="Marcar como correcta"
                >
                  <Check />
                </button>
                <input
                  value={option.text}
                  disabled={question.type === "TRUE_FALSE"}
                  placeholder={`Opción ${optionIndex + 1}`}
                  onChange={(event) =>
                    updateOption(questionIndex, optionIndex, {
                      text: event.target.value,
                    })
                  }
                />
                {question.type !== "TRUE_FALSE" &&
                  question.options.length > 2 && (
                    <button
                      onClick={() =>
                        updateQuestion(questionIndex, {
                          options: question.options.filter(
                            (_, index) => index !== optionIndex,
                          ),
                        })
                      }
                    >
                      <Trash2 />
                    </button>
                  )}
              </div>
            ))}
            {question.type !== "TRUE_FALSE" && (
              <button
                onClick={() =>
                  updateQuestion(questionIndex, {
                    options: [
                      ...question.options,
                      { text: "", isCorrect: false },
                    ],
                  })
                }
              >
                <Plus /> Agregar opción
              </button>
            )}
          </div>
          <input
            placeholder="Retroalimentación después de responder (opcional)"
            value={question.explanation || ""}
            onChange={(event) =>
              updateQuestion(questionIndex, { explanation: event.target.value })
            }
          />
        </article>
      ))}
      <div className={styles.quizActions}>
        <button
          onClick={() =>
            setQuiz({
              ...quiz,
              questions: [...quiz.questions, emptyQuestion()],
            })
          }
        >
          <Plus /> Nueva pregunta
        </button>
        <button onClick={() => void save()} disabled={saving}>
          {saving ? <LoaderCircle className={styles.spin} /> : <Save />}
          Guardar cuestionario
        </button>
      </div>
      {message && <p className={styles.quizMessage}>{message}</p>}
    </div>
  );
}
