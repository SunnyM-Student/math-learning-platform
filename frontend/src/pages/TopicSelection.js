// src/pages/TopicSelection.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const TopicSelection = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        
        if (!userData?.user) {
          navigate('/login');
          return;
        }
        
        // Get user profile to determine grade level
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userData.user.id)
          .single();
          
        if (profileError) throw profileError;
        setProfile(profileData);
        
        // Get topics for user's grade level
        const { data: topicsData, error: topicsError } = await supabase
          .from('math_topics')
          .select('*')
          .eq('grade_level', profileData.grade_level)
          .order('order');
          
        if (topicsError) throw topicsError;
        setTopics(topicsData || []);
      } catch (err) {
        console.error('Error fetching topics:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTopics();
  }, [navigate]);
  
  const handleTopicSelect = (topicId) => {
    navigate(`/practice/${topicId}`);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading topics...</p>
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
  
  return (
    <div className="min-h-screen bg-neutral-light p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Choose a Topic to Practice</h1>
          <p className="text-neutral-medium">
            Select a math topic to start practicing problems for grade {profile?.grade_level}.
          </p>
        </div>
        
        {topics.length === 0 ? (
          <div className="card">
            <p>No topics available for your grade level yet.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary mt-4"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <div 
                key={topic.id} 
                className="card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleTopicSelect(topic.id)}
              >
                <h3 className="text-lg font-bold mb-2">{topic.name}</h3>
                <p className="text-neutral-medium mb-4">{topic.description}</p>
                <button className="btn btn-primary w-full">
                  Start Practice
                </button>
              </div>
            ))}
          </div>
        )}
        
        <button
          onClick={() => navigate('/dashboard')}
          className="btn btn-secondary mt-6"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default TopicSelection;