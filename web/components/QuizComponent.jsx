// File: components/QuizComponent.jsx

"use client";

import React from "react";

const quizTopics = ['Savings', 'Investing', 'Credit Score', 'EMI', 'Taxes', 'Budgeting'];

function QuizList({ startQuiz, isFetching }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Test Your Knowledge</h2>
      {isFetching && <p className="text-center font-semibold text-blue-600">Generating your unique finance quiz...</p>}
      {!isFetching && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizTopics.map((topic) => (
            <div key={topic} className="bg-white p-6 rounded-xl shadow-sm flex flex-col">
              <h3 className="text-lg font-bold text-slate-800">{topic} Quiz</h3>
              <p className="text-slate-500 mt-2 mb-4 flex-1">A short, AI-generated quiz on {topic}.</p>
              <button
                onClick={() => startQuiz(topic)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Start Quiz
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuizInterface({ quiz, setQuiz }) {
    const currentQuestion = quiz.questions[0]; // We fetch one question at a time
    const answered = quiz.userAnswers.length > 0;

    const handleAnswer = (selectedIndex) => {
        if (answered) return;
        const isCorrect = selectedIndex === currentQuestion.a;
        setQuiz((prev) => ({ ...prev, userAnswers: [selectedIndex], score: isCorrect ? 1 : 0, completed: true }));
    };

    if (quiz.completed) {
        const selectedIdx = quiz.userAnswers[0];
        const correctIdx = currentQuestion.a;

        return (
            <div>
                 <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold text-slate-800">{quiz.topic} Quiz</h2>
                    <p className="font-semibold text-lg text-slate-700 my-6">{currentQuestion.q}</p>
                    <div className="space-y-3">
                    {currentQuestion.opts.map((option, idx) => {
                        let buttonClass = "border-slate-200";
                        if (idx === correctIdx) buttonClass = "bg-green-100 border-green-300 text-green-800 font-semibold";
                        else if (idx === selectedIdx) buttonClass = "bg-red-100 border-red-300 text-red-800";
                        return (<button key={idx} disabled={true} className={`w-full text-left p-3 border rounded-lg transition ${buttonClass}`}>{option}</button>);
                    })}
                    </div>
                    <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <h4 className="font-bold text-slate-800">Explanation</h4>
                        <p className="mt-2 text-sm text-slate-600">{currentQuestion.explanation}</p>
                    </div>
                    <button onClick={() => setQuiz(null)} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg font-semibold">
                        Next Question &rarr;
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <button onClick={() => setQuiz(null)} className="text-sm font-semibold text-blue-600 mb-4">&larr; Back to Topics</button>
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold text-slate-800">{quiz.topic} Quiz</h2>
                <p className="font-semibold text-lg text-slate-700 my-6">{currentQuestion.q}</p>
                <div className="space-y-3">
                {currentQuestion.opts.map((option, idx) => (
                    <button key={idx} onClick={() => handleAnswer(idx)} className="w-full text-left p-3 border rounded-lg transition border-slate-200 hover:bg-slate-50">
                        {option}
                    </button>
                ))}
                </div>
            </div>
        </div>
    );
}

export const QuizComponent = ({ activeQuiz, startQuiz, setQuiz, isFetchingQuiz }) => {
    return (
        <section>
            {activeQuiz ? (<QuizInterface quiz={activeQuiz} setQuiz={startQuiz} />) : (<QuizList startQuiz={startQuiz} isFetching={isFetchingQuiz} />)}
        </section>
    );
};