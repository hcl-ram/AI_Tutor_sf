import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Lightbulb } from 'lucide-react';

const QuizCard = ({ question, onAnswer, showHint = false, language }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHintText, setShowHintText] = useState(false);

  const handleSubmit = () => {
    if (selectedAnswer !== null) {
      setShowExplanation(true);
      onAnswer(selectedAnswer === question.correctAnswer);
    }
  };

  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card max-w-2xl mx-auto"
    >
      {/* Question */}
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        {question.question}
      </h3>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {question.options.map((option, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => !showExplanation && setSelectedAnswer(index)}
            disabled={showExplanation}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              selectedAnswer === index
                ? showExplanation
                  ? index === question.correctAnswer
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                  : 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${showExplanation ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{option}</span>
              {showExplanation && index === question.correctAnswer && (
                <CheckCircle className="text-green-500" size={20} />
              )}
              {showExplanation && selectedAnswer === index && index !== question.correctAnswer && (
                <XCircle className="text-red-500" size={20} />
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Hint Button */}
      {showHint && !showExplanation && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => setShowHintText(!showHintText)}
          className="mb-4 flex items-center space-x-2 text-accent-600 hover:text-accent-700 font-medium"
        >
          <Lightbulb size={18} />
          <span>{showHintText ? 'Hide Hint' : 'Show Hint'}</span>
        </motion.button>
      )}

      {/* Hint Text */}
      {showHintText && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 p-4 bg-accent-50 border-l-4 border-accent-500 rounded-lg"
        >
          <p className="text-sm text-gray-700">{question.hint}</p>
        </motion.div>
      )}

      {/* Explanation */}
      {showExplanation && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`mb-4 p-4 rounded-lg border-l-4 ${
            isCorrect
              ? 'bg-green-50 border-green-500'
              : 'bg-red-50 border-red-500'
          }`}
        >
          <div className="flex items-center space-x-2 mb-2">
            {isCorrect ? (
              <CheckCircle className="text-green-600" size={20} />
            ) : (
              <XCircle className="text-red-600" size={20} />
            )}
            <span className="font-semibold text-gray-900">
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </span>
          </div>
          <p className="text-sm text-gray-700">{question.explanation}</p>
        </motion.div>
      )}

      {/* Submit Button */}
      {!showExplanation && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={selectedAnswer === null}
          className={`w-full btn-primary ${
            selectedAnswer === null ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Check Answer
        </motion.button>
      )}
    </motion.div>
  );
};

export default QuizCard;
