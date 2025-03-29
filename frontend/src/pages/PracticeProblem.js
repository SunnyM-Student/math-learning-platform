// src/pages/PracticeProblem.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const PracticeProblem = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [topic, setTopic] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
            time_spent: 0 // We're not tracking time right now
          }
        ]);
      }
    } catch (err) {
      console.error('Error recording progress:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleNext = () => {
    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex(currentProblemIndex + 1);
      setSelectedAnswer('');
      setFeedback(null);
    } else {
      // All problems completed
      navigate('/topics');
    }
  };
  
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
  let options = [];
  try {
    if (currentProblem.options) {
      // Check if it's already an object (might be auto-parsed by Supabase client)
      if (typeof currentProblem.options === 'object') {
        options = currentProblem.options;
      } else {
        // Try to parse it as JSON
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
  
  // Add these debug logs
  console.log('Current problem:', currentProblem);
  console.log('Raw options value:', currentProblem.options);
  console.log('Options type:', typeof currentProblem.options);
  
  return (
    <div className="min-h-screen bg-neutral-light p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-primary">{topic?.name}</h1>
            <p className="text-neutral-medium">
              Problem {currentProblemIndex + 1} of {problems.length}
            </p>
          </div>
          
          <div className="text-right">
            <div className="inline-block bg-neutral-light px-3 py-1 rounded-full text-sm">
              Difficulty: {Array(currentProblem.difficulty).fill('★').join('')}
            </div>
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
                className={`p-3 border rounded-md cursor-pointer ${
                  selectedAnswer === option 
                    ? 'border-primary bg-primary/10' 
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
                </label>
              </div>
            ))}
          </div>
          
          {!feedback ? (
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer || isSubmitting}
              className="btn btn-primary mt-6 w-full"
            >
              {isSubmitting ? 'Checking...' : 'Check Answer'}
            </button>
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
                  {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                </h3>
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
          
          <div className="text-neutral-medium text-sm">
            Progress: {Math.round(((currentProblemIndex + 1) / problems.length) * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeProblem;