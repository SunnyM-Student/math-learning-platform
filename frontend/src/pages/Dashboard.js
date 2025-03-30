import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Get the current logged-in user
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      
      if (data?.user) {
        // Get the user's profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();
          
        if (!profileError && profileData) {
          setProfile(profileData);
          
          // If they're a student, fetch math topics for their grade
          if (profileData.role === 'student' && profileData.grade_level) {
            const { data: topicsData } = await supabase
              .from('math_topics')
              .select('*')
              .eq('grade_level', profileData.grade_level)
              .order('order', { ascending: true });
              
            if (topicsData) {
              console.log("Fetched topics:", topicsData);
              setTopics(topicsData || []);
            }
          }
        }
      }
      
      setLoading(false);
    };
    
    getUser();
  }, [navigate]);
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // The page will refresh due to Supabase auth state change
  };
  
  const handleTopicSelect = (topicId) => {
    console.log("Navigating to topic:", topicId);
    navigate(`/practice/${topicId}`);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-light">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-neutral-light">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Math Learning Platform</h1>
          <button 
            onClick={handleSignOut}
            className="btn btn-secondary"
          >
            Sign Out
          </button>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">
            Welcome, {profile?.full_name || user?.email || 'User'}!
          </h2>
          <p>
            {profile?.role === 'student' 
              ? `You are a student in grade ${profile?.grade_level}.`
              : 'You are a teacher.'}
          </p>
        </div>

        {/* Rewards and Achievements Card */}
        {profile?.role === 'student' && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">Rewards & Achievements</h2>
            <div className="flex items-center mb-4">
              <div className="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mr-3">
                <span>XP</span>
              </div>
              <div>
                <p className="mb-1">Earn XP by solving problems and maintaining your daily streak!</p>
                <p className="text-neutral-medium text-sm">View your achievements and track your progress</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/rewards')}
              className="btn btn-primary w-full"
            >
              View Rewards & Achievements
            </button>
          </div>
        )}

        {/* Progress Dashboard Link */}
        {profile?.role === 'student' && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">Track Your Progress</h2>
            <p className="mb-4">
              View detailed statistics about your learning journey, track your mastery of topics, and see your recent activity.
            </p>
            <button
              onClick={() => navigate('/progress')}
              className="btn btn-primary"
            >
              View My Progress
            </button>
          </div>
        )}
        
        {profile?.role === 'student' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Math Topics for Your Grade</h3>
            
            {topics.length === 0 ? (
              <div className="card">
                <p>No topics available for your grade level yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map(topic => (
                  <div 
                    key={topic.id} 
                    className="card hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleTopicSelect(topic.id)}
                  >
                    <h4 className="font-bold">{topic.name}</h4>
                    <p className="text-neutral-medium text-sm mt-1">{topic.description}</p>
                    <button className="btn btn-primary mt-4 w-full">
                      Start Practice
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {profile?.role === 'teacher' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Teacher Dashboard</h3>
            <div className="card">
              <p>Welcome to your teacher dashboard. Features for teachers are coming soon!</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;