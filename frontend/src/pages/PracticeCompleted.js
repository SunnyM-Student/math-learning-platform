// src/pages/PracticeCompleted.js
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PracticeCompleted = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { topicId, topicName, stats } = location.state || {};
  
  // Calculate statistics
  const totalProblems = stats ? stats.correct + stats.incorrect : 0;
  const accuracy = totalProblems > 0 ? Math.round((stats.correct / totalProblems) * 100) : 0;
  const averageTimePerQuestion = totalProblems > 0 ? Math.round(stats.totalTime / totalProblems / 1000) : 0;
  
  // Determine feedback based on performance
  const getFeedback = () => {
    if (accuracy >= 90) {
      return {
        emoji: '🏆',
        title: 'Excellent!',
        message: 'You\'ve mastered this topic! Keep up the great work!'
      };
    } else if (accuracy >= 70) {
      return {
        emoji: '🌟',
        title: 'Great Job!',
        message: 'You\'re doing well! A bit more practice and you\'ll master this topic.'
      };
    } else if (accuracy >= 50) {
      return {
        emoji: '👍',
        title: 'Good Effort!',
        message: 'You\'re making progress! Keep practicing to improve your score.'
      };
    } else {
      return {
        emoji: '📚',
        title: 'Keep Learning!',
        message: 'This topic needs more practice. Don\'t worry, you\'ll get better with time!'
      };
    }
  };
  
  const feedback = getFeedback();
  
  return (
    <div className="min-h-screen bg-neutral-light p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="card text-center">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{feedback.emoji}</span>
          </div>
          
          <h1 className="text-2xl font-bold text-primary mb-2">{feedback.title}</h1>
          <p className="text-neutral-medium mb-6">
            You've completed all problems in {topicName || 'this topic'}.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-neutral-light rounded-lg p-4">
              <div className="text-3xl font-bold text-primary">
                {accuracy}%
              </div>
              <div className="text-neutral-medium">Accuracy</div>
            </div>
            
            <div className="bg-neutral-light rounded-lg p-4">
              <div className="text-3xl font-bold text-primary">
                {stats?.correct || 0}/{totalProblems}
              </div>
              <div className="text-neutral-medium">Correct Answers</div>
            </div>
            
            <div className="bg-neutral-light rounded-lg p-4">
              <div className="text-3xl font-bold text-primary">
                {averageTimePerQuestion} sec
              </div>
              <div className="text-neutral-medium">Avg. Time per Problem</div>
            </div>
          </div>
          
          <p className="mb-6">{feedback.message}</p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate('/topics')}
              className="btn btn-primary"
            >
              Practice Another Topic
            </button>
            
            <button
              onClick={() => navigate(`/practice/${topicId}`)}
              className="btn btn-secondary"
            >
              Try This Topic Again
            </button>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeCompleted;