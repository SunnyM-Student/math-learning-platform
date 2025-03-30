// src/pages/RewardsDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserAchievements, getUserRewardsSummary } from '../utils/rewardSystem';

const RewardsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState(null);
  const [achievements, setAchievements] = useState({ earned: [], unearned: [] });
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    const fetchRewardsData = async () => {
      try {
        setLoading(true);
        const rewardsData = await getUserRewardsSummary();
        const achievementsData = await getUserAchievements();
        
        setRewards(rewardsData);
        setAchievements(achievementsData);
      } catch (error) {
        console.error('Error fetching rewards data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRewardsData();
  }, []);
  
  const categorizeAchievements = (achievementsList) => {
    const categories = {};
    
    achievementsList.forEach(achievement => {
      if (!categories[achievement.achievement_type]) {
        categories[achievement.achievement_type] = [];
      }
      categories[achievement.achievement_type].push(achievement);
    });
    
    return categories;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading rewards data...</p>
        </div>
      </div>
    );
  }
  
  const earnedCategories = categorizeAchievements(achievements.earned);
  const unearnedCategories = categorizeAchievements(achievements.unearned);
  
  return (
    <div className="min-h-screen bg-neutral-light p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Your Rewards & Achievements</h1>
          <p className="text-neutral-medium">
            Track your progress, earn XP, and unlock achievements
          </p>
        </div>
        
        {/* Tabs */}
        <div className="mb-6 border-b border-neutral-medium">
          <div className="flex">
            <button
              className={`py-2 px-4 font-medium ${activeTab === 'overview' ? 'border-b-2 border-primary text-primary' : 'text-neutral-medium'}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`py-2 px-4 font-medium ${activeTab === 'achievements' ? 'border-b-2 border-primary text-primary' : 'text-neutral-medium'}`}
              onClick={() => setActiveTab('achievements')}
            >
              Achievements
            </button>
          </div>
        </div>
        
        {activeTab === 'overview' && (
          <div>
            {/* Level and XP Progress */}
            <div className="card mb-6">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl mr-4">
                  {rewards?.current_level}
                </div>
                <div>
                  <h2 className="text-xl font-bold">Level {rewards?.current_level}</h2>
                  <p className="text-neutral-medium">
                    {rewards?.xpToNextLevel} XP to Level {rewards?.current_level + 1}
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>{rewards?.xp_points} XP</span>
                  <span>Level {rewards?.current_level + 1}</span>
                </div>
                <div className="h-2 bg-neutral-light rounded-full w-full">
                  <div 
                    className="h-2 bg-primary rounded-full"
                    style={{ width: `${rewards?.levelProgress || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="card">
                <h3 className="font-bold mb-2">Current Streak</h3>
                <div className="flex items-center">
                  <span className="text-3xl mr-2">🔥</span>
                  <span className="text-2xl font-bold">{rewards?.current_streak} days</span>
                </div>
                <p className="text-neutral-medium text-sm mt-2">
                  Keep practicing daily to increase your streak!
                </p>
              </div>
              
              <div className="card">
                <h3 className="font-bold mb-2">Problems Solved</h3>
                <div className="text-2xl font-bold">
                  {rewards?.total_problems_solved}
                </div>
                <p className="text-neutral-medium text-sm mt-2">
                  {rewards?.total_correct_answers} correct answers ({Math.round((rewards?.total_correct_answers / Math.max(1, rewards?.total_problems_solved)) * 100)}% accuracy)
                </p>
              </div>
              
              <div className="card">
                <h3 className="font-bold mb-2">Achievements</h3>
                <div className="text-2xl font-bold">
                  {rewards?.achievementsCount} / {achievements.earned.length + achievements.unearned.length}
                </div>
                <p className="text-neutral-medium text-sm mt-2">
                  Unlock more by completing challenges!
                </p>
              </div>
            </div>
            
            {/* Recent Achievements */}
            <div className="card">
              <h3 className="font-bold mb-4">Recent Achievements</h3>
              
              {achievements.earned.length === 0 ? (
                <p className="text-neutral-medium">
                  You haven't earned any achievements yet. Keep practicing to unlock some!
                </p>
              ) : (
                <div>
                  {achievements.earned.slice(0, 3).map(achievement => (
                    <div key={achievement.id} className="flex items-center mb-4">
                      <div className="text-2xl mr-3">{achievement.icon}</div>
                      <div>
                        <h4 className="font-bold">{achievement.name}</h4>
                        <p className="text-sm text-neutral-medium">{achievement.description}</p>
                        <p className="text-xs text-neutral-medium">
                          Earned on {new Date(achievement.earned_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => setActiveTab('achievements')}
                    className="btn btn-secondary w-full mt-2"
                  >
                    View All Achievements
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'achievements' && (
          <div>
            <div className="card mb-6">
              <h2 className="text-xl font-bold mb-4">Your Achievements</h2>
              <p className="mb-4">
                You've earned {achievements.earned.length} out of {achievements.earned.length + achievements.unearned.length} achievements.
              </p>
              
              {/* Earned Achievements */}
              <h3 className="font-bold mb-2">Earned Achievements</h3>
              
              {Object.entries(earnedCategories).map(([category, categoryAchievements]) => (
                <div key={category} className="mb-6">
                  <h4 className="font-medium text-neutral-medium uppercase text-sm mb-2">
                    {category.replace('_', ' ')}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryAchievements.map(achievement => (
                      <div key={achievement.id} className="bg-neutral-light p-3 rounded-lg flex">
                        <div className="text-2xl mr-3">{achievement.icon}</div>
                        <div>
                          <h5 className="font-bold">{achievement.name}</h5>
                          <p className="text-sm">{achievement.description}</p>
                          <p className="text-xs text-neutral-medium">
                            Earned on {new Date(achievement.earned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {achievements.earned.length === 0 && (
                <p className="text-neutral-medium my-4">
                  You haven't earned any achievements yet.
                </p>
              )}
              
              {/* Unearned Achievements */}
              <h3 className="font-bold mb-2 mt-6">Achievements to Unlock</h3>
              
              {Object.entries(unearnedCategories).map(([category, categoryAchievements]) => (
                <div key={category} className="mb-6">
                  <h4 className="font-medium text-neutral-medium uppercase text-sm mb-2">
                    {category.replace('_', ' ')}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryAchievements.map(achievement => (
                      <div key={achievement.id} className="bg-neutral-light/50 p-3 rounded-lg flex opacity-70">
                        <div className="text-2xl mr-3">{achievement.icon}</div>
                        <div>
                          <h5 className="font-bold">{achievement.name}</h5>
                          <p className="text-sm">{achievement.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
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

export default RewardsDashboard;