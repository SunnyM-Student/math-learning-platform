// src/pages/PracticeProblem.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { updateRewardsForProblemSolved } from '../utils/rewardSystem';
import Confetti from 'react-confetti';

const PracticeProblem = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [topic, setTopic] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    totalTime: 0
  });
  const [xpEarned, setXpEarned] = useState(null);
  
  // Confetti and sound effects
  const [showConfetti, setShowConfetti] = useState(false);
  const correctSoundRef = useRef(null);
  const incorrectSoundRef = useRef(null);

  // Initialize sound effects
  useEffect(() => {
    correctSoundRef.current = new Audio('/sounds/correct.mp3');
    incorrectSoundRef.current = new Audio('/sounds/incorrect.mp3');
  }, []);
  
  // Fetch problems from the database
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true);
        // Get the topic info
        const { data: topicData, error: topicError } = await supabase
          .from('math_topics')
          .select('*')
          .eq('id', topicId)
          .single();
          
        if (topicError) throw topicError;
        setTopic(topicData);
        
        // Get problems for this topic
        const { data: problemsData, error: problemsError } = await supabase
          .from('math_problems')
          .select('*')
          .eq('topic_id', topicId)
          .order('difficulty');
          
        if (problemsError) throw problemsError;
        
        if (problemsData && problemsData.length > 0) {
          setProblems(problemsData);
          setStartTime(Date.now());
        } else {
          setError('No problems found for this topic.');
        }
      } catch (err) {
        console.error('Error fetching problems:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProblems();
  }, [topicId]);

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) return;
    setIsSubmitting(true);
    
    const currentProblem = problems[currentProblemIndex];
    const isCorrect = selectedAnswer === currentProblem.correct_answer;
    const timeSpent = Date.now() - startTime;

    // Play sound and show confetti for correct answers
    if (isCorrect) {
      if (correctSoundRef.current) {
        correctSoundRef.current.currentTime = 0;
        correctSoundRef.current.play().catch(e => console.error("Sound error:", e));
      }
      setShowConfetti(true);
      
      // Update streak
      setStreak(streak + 1);
      setSessionStats({
        ...sessionStats,
        correct: sessionStats.correct + 1,
        totalTime: sessionStats.totalTime + timeSpent
      });
    } else {
      if (incorrectSoundRef.current) {
        incorrectSoundRef.current.currentTime = 0;
        incorrectSoundRef.current.play().catch(e => console.error("Sound error:", e));
      }
      
      setStreak(0);
      setSessionStats({
        ...sessionStats,
        incorrect: sessionStats.incorrect + 1,
        totalTime: sessionStats.totalTime + timeSpent
      });
    }

    setFeedback({
      isCorrect,
      explanation: currentProblem.explanation
    });
    
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        // Record progress
        await supabase.from('user_progress').insert([
          {
            user_id: userData.user.id,
            problem_id: currentProblem.id,
            is_correct: isCorrect,
            time_spent: Math.floor(timeSpent / 1000) // convert to seconds
          }
        ]);
        
        // Update rewards and get XP earned
        const rewardUpdate = await updateRewardsForProblemSolved(
          isCorrect,
          currentProblem.difficulty
        );
        
        if (rewardUpdate) {
          setXpEarned(rewardUpdate);
        }
      }
    } catch (err) {
      console.error('Error recording progress:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    // Reset states for next problem
    setShowConfetti(false);
    setSelectedAnswer('');
    setFeedback(null);
    setShowHint(false);
    setXpEarned(null);
    
    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex(currentProblemIndex + 1);
      setStartTime(Date.now());
    } else {
      // All problems completed
      navigate('/practice/completed', {
        state: {
          topicId,
          topicName: topic?.name,
          stats: sessionStats
        }
      });
    }
  };

  const handleHint = () => {
    setShowHint(true);
  };

  // Generate a simple hint based on the question and correct answer
  const generateHint = () => {
    const correctAnswer = currentProblem.correct_answer;
    
    // If it's a calculation problem
    if (currentProblem.question.includes('+') ||
        currentProblem.question.includes('-') ||
        currentProblem.question.includes('×') ||
        currentProblem.question.includes('÷')) {
      return "Try breaking down the calculation into simpler steps.";
    }
    
    // If it's a "What is" question
    if (currentProblem.question.toLowerCase().includes('what is')) {
      return "Think about the definition or formula you need to apply here.";
    }
    
    // If it's a comparison
    if (currentProblem.question.toLowerCase().includes('which') ||
        currentProblem.question.toLowerCase().includes('compare')) {
      return "Try comparing the options one by one to find the answer.";
    }
    
    // Default hint
    return "Look carefully at what the question is asking for.";
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading problems...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-light p-8">
        <div className="card max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-error mb-2">Error</h2>
          <p>{error}</p>
          <button
            onClick={() => navigate('/topics')}
            className="btn btn-primary mt-4"
          >
            Back to Topics
          </button>
        </div>
      </div>
    );
  }

  // No problems state
  if (problems.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-light p-8">
        <div className="card max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-2">No Problems Available</h2>
          <p>There are no problems available for this topic yet.</p>
          <button
            onClick={() => navigate('/topics')}
            className="btn btn-primary mt-4"
          >
            Back to Topics
          </button>
        </div>
      </div>
    );
  }

  const currentProblem = problems[currentProblemIndex];
  
  // Parse options with error handling
  let options = [];
  try {
    if (currentProblem.options) {
      if (typeof currentProblem.options === 'object') {
        options = currentProblem.options;
      } else {
        options = JSON.parse(currentProblem.options);
      }
    }
    
    // Ensure options is always an array
    if (!Array.isArray(options)) {
      options = [];
      console.warn('Options is not an array:', currentProblem.options);
    }
  } catch (err) {
    console.error('Error parsing options:', currentProblem.options, err);
  }

  return (
    <div className="min-h-screen bg-neutral-light p-4 sm:p-6 lg:p-8">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
        />
      )}
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-primary">{topic?.name}</h1>
            <p className="text-neutral-medium">
              Problem {currentProblemIndex + 1} of {problems.length}
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="inline-block bg-neutral-light px-3 py-1 rounded-full text-sm mb-2">
              Difficulty: {Array(currentProblem.difficulty).fill('★').join('')}
            </div>
            {streak > 0 && (
              <div className="inline-block bg-success/20 px-3 py-1 rounded-full text-sm text-success font-bold">
                🔥 Streak: {streak}
              </div>
            )}
          </div>
        </div>
        
        <div className="card mb-6">
          <h2 className="text-lg font-bold mb-4">Question:</h2>
          <p className="text-xl mb-6">{currentProblem.question}</p>
          
          <div className="space-y-3">
            <h3 className="font-medium">Select your answer:</h3>
            {options.map((option, index) => (
              <div
                key={index}
                className={`p-3 border rounded-md cursor-pointer transition-all ${
                  selectedAnswer === option
                    ? 'border-primary bg-primary/10'
                    : feedback
                      ? (feedback.isCorrect && option === currentProblem.correct_answer)
                        ? 'border-success bg-success/10'
                        : (option === selectedAnswer)
                          ? 'border-error bg-error/10'
                          : 'border-neutral-medium'
                      : 'border-neutral-medium hover:border-primary'
                }`}
                onClick={() => !feedback && handleAnswerSelect(option)}
              >
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="answer"
                    checked={selectedAnswer === option}
                    onChange={() => !feedback && handleAnswerSelect(option)}
                    className="mr-3"
                    disabled={!!feedback}
                  />
                  <span>{option}</span>
                  {feedback && option === currentProblem.correct_answer && (
                    <span className="ml-auto text-success">✓</span>
                  )}
                  {feedback && option === selectedAnswer && option !== currentProblem.correct_answer && (
                    <span className="ml-auto text-error">✗</span>
                  )}
                </label>
              </div>
            ))}
          </div>
          
          {!feedback ? (
            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer || isSubmitting}
                className="btn btn-primary w-full mb-3"
              >
                {isSubmitting ? 'Checking...' : 'Check Answer'}
              </button>
              
              {!showHint && (
                <button
                  onClick={handleHint}
                  className="btn btn-secondary w-full"
                >
                  Need a Hint?
                </button>
              )}
              
              {showHint && (
                <div className="mt-3 p-3 bg-accent/10 rounded-md">
                  <p className="font-medium">Hint:</p>
                  <p>{generateHint()}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6">
              <div className={`p-4 rounded-md mb-4 ${
                feedback.isCorrect
                  ? 'bg-success/10 border border-success/20'
                  : 'bg-error/10 border border-error/20'
              }`}>
                <h3 className={`font-bold text-lg ${
                  feedback.isCorrect ? 'text-success' : 'text-error'
                }`}>
                  {feedback.isCorrect
                    ? streak > 2
                      ? `Correct! 🔥 Streak: ${streak}`
                      : 'Correct!'
                    : 'Incorrect'}
                </h3>
                
                {/* XP earned display */}
                {xpEarned && (
                  <div className="flex items-center mt-2 mb-3 bg-accent/10 p-2 rounded">
                    <span className="font-bold mr-2">+{xpEarned.xpEarned} XP</span>
                    {xpEarned.streakBonus > 0 && (
                      <span className="text-sm bg-success/20 px-2 py-1 rounded text-success">
                        +{xpEarned.streakBonus} streak bonus
                      </span>
                    )}
                  </div>
                )}
                
                <p>{feedback.explanation}</p>
              </div>
              
              <button
                onClick={handleNext}
                className="btn btn-primary w-full"
              >
                {currentProblemIndex < problems.length - 1 ? 'Next Problem' : 'Complete Practice'}
              </button>
            </div>
          )}
        </div>
        
        <div className="flex justify-between">
          <button
            onClick={() => navigate('/topics')}
            className="btn btn-secondary"
          >
            Back to Topics
          </button>
          
          <div className="bg-neutral-medium/20 px-4 py-2 rounded-full">
            <div className="text-neutral-medium text-sm">
              Progress: {Math.round(((currentProblemIndex + 1) / problems.length) * 100)}%
            </div>
            <div className="w-full h-2 bg-neutral-light rounded-full mt-1">
              <div
                className="h-2 bg-primary rounded-full"
                style={{ width: `${Math.round(((currentProblemIndex + 1) / problems.length) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeProblem;