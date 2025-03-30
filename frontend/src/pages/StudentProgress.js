// src/pages/StudentProgress.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const StudentProgress = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [topicProgress, setTopicProgress] = useState([]);
  const [overallStats, setOverallStats] = useState({
    totalProblems: 0,
    correctAnswers: 0,
    averageAccuracy: 0,
    totalTopics: 0,
    topicsStarted: 0,
    topicsMastered: 0, // 90% or higher accuracy
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');

  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          navigate('/login');
          return;
        }

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userData.user.id)
          .single();
          
        if (profileError) throw profileError;
        setProfile(profileData);

        // Get all topics for this grade level
        const { data: topicsData, error: topicsError } = await supabase
          .from('math_topics')
          .select('id, name, description, "order"')
          .eq('grade_level', profileData.grade_level)
          .order('"order"');
          
        if (topicsError) throw topicsError;

        // Get all problems by topic
        const { data: problemsData, error: problemsError } = await supabase
          .from('math_problems')
          .select('id, topic_id')
          .in('topic_id', topicsData.map(topic => topic.id));
          
        if (problemsError) throw problemsError;

        // Create a map of topic_id to problem count
        const problemCountByTopic = {};
        problemsData.forEach(problem => {
          if (!problemCountByTopic[problem.topic_id]) {
            problemCountByTopic[problem.topic_id] = 0;
          }
          problemCountByTopic[problem.topic_id]++;
        });

        // Get user progress data
        let progressQuery = supabase
          .from('user_progress')
          .select('*, math_problems(topic_id)')
          .eq('user_id', userData.user.id);

        // Apply timeframe filter
        if (selectedTimeframe !== 'all') {
          let daysToSubtract = 0;
          switch(selectedTimeframe) {
            case 'week':
              daysToSubtract = 7;
              break;
            case 'month':
              daysToSubtract = 30;
              break;
            case 'year':
              daysToSubtract = 365;
              break;
            default:
              break;
          }
          
          if (daysToSubtract > 0) {
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - daysToSubtract);
            progressQuery = progressQuery.gte('created_at', fromDate.toISOString());
          }
        }

        const { data: progressData, error: progressError } = await progressQuery;
        if (progressError) throw progressError;

        // Group progress data by topic
        const progressByTopic = {};
        progressData.forEach(progress => {
          const topicId = progress.math_problems.topic_id;
          
          if (!progressByTopic[topicId]) {
            progressByTopic[topicId] = {
              attempts: 0,
              correct: 0,
              totalTime: 0
            };
          }
          
          progressByTopic[topicId].attempts++;
          if (progress.is_correct) {
            progressByTopic[topicId].correct++;
          }
          progressByTopic[topicId].totalTime += progress.time_spent || 0;
        });

        // Calculate topic progress
        const topicsWithProgress = topicsData.map(topic => {
          const progress = progressByTopic[topic.id] || { attempts: 0, correct: 0, totalTime: 0 };
          const totalProblems = problemCountByTopic[topic.id] || 0;
          const accuracy = progress.attempts > 0 ? (progress.correct / progress.attempts * 100) : 0;
          const completion = totalProblems > 0 ? (progress.attempts / totalProblems * 100) : 0;
          
          return {
            ...topic,
            totalProblems,
            attempts: progress.attempts,
            correct: progress.correct,
            accuracy: Math.round(accuracy),
            completion: Math.round(completion),
            averageTime: progress.attempts > 0 ? (progress.totalTime / progress.attempts) : 0,
            status: accuracy >= 90 ? 'mastered' : accuracy >= 50 ? 'in-progress' : progress.attempts > 0 ? 'needs-work' : 'not-started'
          };
        });

        setTopicProgress(topicsWithProgress);

        // Calculate overall statistics
        const totalAttempts = progressData.length;
        const correctAnswers = progressData.filter(p => p.is_correct).length;
        const topicsStarted = Object.keys(progressByTopic).length;
        const topicsMastered = topicsWithProgress.filter(t => t.status === 'mastered').length;

        setOverallStats({
          totalProblems: totalAttempts,
          correctAnswers,
          averageAccuracy: totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0,
          totalTopics: topicsData.length,
          topicsStarted,
          topicsMastered
        });

        // Get recent activity (last 10 problems attempted)
        const { data: recentData, error: recentError } = await supabase
          .from('user_progress')
          .select(`
            *,
            math_problems(
              id, 
              question, 
              topic_id, 
              difficulty
            )
          `)
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentError) throw recentError;

        // Add topic names to recent activity
        const topicMap = {};
        topicsData.forEach(topic => {
          topicMap[topic.id] = topic.name;
        });

        const formattedRecentActivity = recentData.map(activity => ({
          id: activity.id,
          question: activity.math_problems.question,
          topicId: activity.math_problems.topic_id,
          topicName: topicMap[activity.math_problems.topic_id],
          isCorrect: activity.is_correct,
          timeSpent: activity.time_spent,
          difficulty: activity.math_problems.difficulty,
          date: new Date(activity.created_at).toLocaleDateString()
        }));

        setRecentActivity(formattedRecentActivity);
      } catch (err) {
        console.error('Error fetching progress data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [navigate, selectedTimeframe]);

  const handleTopicClick = (topicId) => {
    navigate(`/practice/${topicId}`);
  };

  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading your progress data...</p>
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
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary mt-4"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'mastered':
        return 'bg-success text-white';
      case 'in-progress':
        return 'bg-primary text-white';
      case 'needs-work':
        return 'bg-warning text-neutral-dark';
      default:
        return 'bg-neutral-medium text-white';
    }
  };

  // Helper function to get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'mastered':
        return 'Mastered';
      case 'in-progress':
        return 'In Progress';
      case 'needs-work':
        return 'Needs Work';
      default:
        return 'Not Started';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-light p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">My Learning Progress</h1>
          <p className="text-neutral-medium">
            Track your math learning journey for grade {profile?.grade_level}
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="mb-6 flex justify-end">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                selectedTimeframe === 'all' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-neutral-dark hover:bg-neutral-light'
              }`}
              onClick={() => handleTimeframeChange('all')}
            >
              All Time
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                selectedTimeframe === 'week' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-neutral-dark hover:bg-neutral-light'
              }`}
              onClick={() => handleTimeframeChange('week')}
            >
              This Week
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                selectedTimeframe === 'month' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-neutral-dark hover:bg-neutral-light'
              }`}
              onClick={() => handleTimeframeChange('month')}
            >
              This Month
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                selectedTimeframe === 'year' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-neutral-dark hover:bg-neutral-light'
              }`}
              onClick={() => handleTimeframeChange('year')}
            >
              This Year
            </button>
          </div>
        </div>

        {/* Overall Progress Stats */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Overall Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-neutral-light p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary">{overallStats.totalProblems}</div>
              <div className="text-sm text-neutral-medium">Problems Solved</div>
            </div>

            <div className="bg-neutral-light p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary">{overallStats.averageAccuracy}%</div>
              <div className="text-sm text-neutral-medium">Average Accuracy</div>
            </div>

            <div className="bg-neutral-light p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary">{overallStats.topicsStarted}/{overallStats.totalTopics}</div>
              <div className="text-sm text-neutral-medium">Topics Started</div>
            </div>

            <div className="bg-neutral-light p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary">{overallStats.topicsMastered}</div>
              <div className="text-sm text-neutral-medium">Topics Mastered</div>
            </div>

            <div className="bg-neutral-light p-4 rounded-lg text-center md:col-span-1 lg:col-span-2">
              <div className="h-4 bg-white rounded-full">
                <div 
                  className="h-4 bg-primary rounded-full"
                  style={{ width: `${Math.min(100, (overallStats.topicsStarted / overallStats.totalTopics) * 100)}%` }}
                ></div>
              </div>
              <div className="text-sm text-neutral-medium mt-2">
                {Math.round((overallStats.topicsStarted / overallStats.totalTopics) * 100)}% of Course Completed
              </div>
            </div>
          </div>
        </div>

        {/* Topic Progress */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Topic Progress</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-light">
                <tr>
                  <th className="px-4 py-2 text-left">Topic</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-center">Accuracy</th>
                  <th className="px-4 py-2 text-center">Completion</th>
                  <th className="px-4 py-2 text-center">Problems</th>
                  <th className="px-4 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {topicProgress.map((topic) => (
                  <tr key={topic.id} className="border-b border-neutral-light">
                    <td className="px-4 py-3">
                      <div className="font-medium">{topic.name}</div>
                      <div className="text-sm text-neutral-medium">{topic.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(topic.status)}`}>
                        {getStatusText(topic.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <div className="mr-2">{topic.accuracy}%</div>
                        <div className="w-16 h-2 bg-neutral-light rounded-full">
                          <div 
                            className={`h-2 rounded-full ${
                              topic.accuracy >= 90 ? 'bg-success' : 
                              topic.accuracy >= 50 ? 'bg-primary' : 
                              'bg-warning'
                            }`}
                            style={{ width: `${topic.accuracy}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <div className="mr-2">{topic.completion}%</div>
                        <div className="w-16 h-2 bg-neutral-light rounded-full">
                          <div 
                            className="h-2 bg-primary rounded-full"
                            style={{ width: `${topic.completion}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {topic.correct}/{topic.attempts} 
                      <span className="text-neutral-medium text-sm"> (of {topic.totalProblems})</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleTopicClick(topic.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Practice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
          {recentActivity.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-light">
                  <tr>
                    <th className="px-4 py-2 text-left">Question</th>
                    <th className="px-4 py-2 text-left">Topic</th>
                    <th className="px-4 py-2 text-center">Result</th>
                    <th className="px-4 py-2 text-center">Time</th>
                    <th className="px-4 py-2 text-center">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((activity) => (
                    <tr key={activity.id} className="border-b border-neutral-light">
                      <td className="px-4 py-3">
                        <div className="truncate max-w-xs">{activity.question}</div>
                      </td>
                      <td className="px-4 py-3">{activity.topicName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${activity.isCorrect ? 'bg-success text-white' : 'bg-error text-white'}`}>
                          {activity.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {activity.timeSpent} {activity.timeSpent === 1 ? 'sec' : 'secs'}
                      </td>
                      <td className="px-4 py-3 text-center">{activity.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-neutral-medium text-center py-6">No recent activity to show.</p>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-secondary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentProgress;