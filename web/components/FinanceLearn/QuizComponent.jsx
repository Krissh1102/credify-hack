"use client";

import React, { useState, useEffect, useRef } from "react";

export function QuizLobby({ startQuiz, isFetching }) {
  const [topic, setTopic] = useState("Investing");
  const [difficulty, setDifficulty] = useState("Easy");

  const financeTopics = [
    "Investing",
    "Budgeting",
    "Credit Score",
    "Savings",
    "EMI & Loans",
    "Taxes",
  ];
  const difficulties = ["Easy", "Medium", "Hard"];

  const handleSubmit = (e) => {
    e.preventDefault();
    startQuiz(topic, difficulty);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Finance Quiz Challenge
      </h2>
      <p className="text-slate-600 mb-6">
        Select a topic and difficulty to start a new, AI-generated quiz. You'll
        have 30 seconds for each question!
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-slate-700"
          >
            Topic
          </label>
          <select
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm"
          >
            {financeTopics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="difficulty"
            className="block text-sm font-medium text-slate-700"
          >
            Difficulty
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm"
          >
            {difficulties.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isFetching}
          className="w-full px-4 py-3 bg-black text-white rounded-lg font-semibold hover:bg-slate-900 transition disabled:bg-slate-400"
        >
          {isFetching ? "Generating Quiz..." : "Start Quiz"}
        </button>
      </form>
    </div>
  );
}

export function QuizInterface({ quiz, setQuiz }) {
  const [timer, setTimer] = useState(30);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef(null);

  const currentQuestion = quiz.questions[quiz.currentQ];
  const answered = quiz.userAnswers.length > quiz.currentQ;

  useEffect(() => {
    if (answered) return;
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev === 1) {
          handleAnswer(-1); // timeout
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [quiz.currentQ, answered]);

  useEffect(() => {
    if (answered) {
      clearInterval(timerRef.current);
      setTotalTime((t) => t + (30 - timer));
    }
  }, [answered]);

  const handleAnswer = (selectedIndex) => {
    if (answered) return;
    const isCorrect = selectedIndex === currentQuestion.a;
    setQuiz((prev) => ({
      ...prev,
      userAnswers: [...prev.userAnswers, selectedIndex],
      score: isCorrect ? prev.score + 1 : prev.score,
    }));
  };

  const nextQuestion = () => {
    if (quiz.currentQ < quiz.questions.length - 1) {
      setQuiz((prev) => ({
        ...prev,
        currentQ: prev.currentQ + 1,
      }));
    } else {
      setQuiz((prev) => ({ ...prev, completed: true, totalTime }));
    }
  };

  if (quiz.completed) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm text-center">
        <h2 className="text-2xl font-bold text-slate-800">Quiz Completed!</h2>
        <p className="text-lg text-slate-600 mt-4">
          Your Score:{" "}
          <span className="font-bold text-blue-600">
            {quiz.score} / {quiz.questions.length}
          </span>
        </p>
        <p className="mt-2 text-slate-600">Total Time Used: {totalTime} seconds</p>
        <button
          onClick={() => setQuiz(null)}
          className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg font-semibold"
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-slate-800">
            {quiz.topic} Quiz ({quiz.difficulty})
          </h2>
          <div
            className={`text-xl font-bold p-2 rounded-full ${
              timer <= 10 ? "text-red-500" : "text-slate-500"
            }`}
          >
            {timer}s
          </div>
        </div>
        <p className="text-slate-500">
          Question {quiz.currentQ + 1} of {quiz.questions.length}
        </p>
        <p className="font-semibold text-lg text-slate-700 my-6">
          {currentQuestion.q}
        </p>
        <div className="space-y-3">
          {currentQuestion.opts.map((opt, idx) => {
            let buttonClass = "border-slate-200 hover:bg-slate-50";
            if (answered) {
              if (idx === currentQuestion.a)
                buttonClass =
                  "bg-green-100 border-green-300 text-green-800 font-semibold";
              else if (idx === quiz.userAnswers[quiz.currentQ])
                buttonClass = "bg-red-100 border-red-300 text-red-800";
            }
            return (
              <button
                key={idx}
                disabled={answered}
                onClick={() => handleAnswer(idx)}
                className={`w-full text-left p-3 border rounded-lg transition ${buttonClass}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 className="font-bold text-slate-800">Explanation</h4>
            <p className="mt-2 text-sm text-slate-600">
              {currentQuestion.explanation}
            </p>
          </div>
        )}
        {answered && (
          <button
            onClick={nextQuestion}
            className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg font-semibold"
          >
            {quiz.currentQ < quiz.questions.length - 1
              ? "Next Question →"
              : "Finish Quiz"}
          </button>
        )}
      </div>
    </div>
  );
}

// Main QuizComponent

export const QuizComponent = ({
  activeQuiz,
  startQuiz,
  setQuiz,
  isFetchingQuiz,
}) => {
  return (
    <section>
      {activeQuiz ? (
        <QuizInterface quiz={activeQuiz} setQuiz={setQuiz} />
      ) : (
        <QuizLobby startQuiz={startQuiz} isFetching={isFetchingQuiz} />
      )}
    </section>
  );
};
