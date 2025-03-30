// src/utils/rewardSystem.js
import { supabase } from '../lib/supabaseClient';

// XP constants
const XP_FOR_CORRECT_ANSWER = 10;
const XP_FOR_INCORRECT_ANSWER = 2;
const XP_FOR_COMPLETING_TOPIC = 50;
const STREAK_BONUS_MULTIPLIER = 0.1; // 10% bonus per day of streak

// Function to update user rewards after answering a problem
export const updateRewardsForProblemSolved = async (isCorrect, difficulty = 1) => {
  try {
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return null;
    
    const userId = userData.user.id;
    
    // Calculate XP (varies based on difficulty and correctness)
    const baseXP = isCorrect ? XP_FOR_CORRECT_ANSWER : XP_FOR_INCORRECT_ANSWER;
    const difficultyMultiplier = difficulty || 1;
    const xpEarned = Math.round(baseXP * difficultyMultiplier);
    
    // Get or create user rewards record
    let { data: userRewards } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!userRewards) {
      // Create a new record if none exists
      const { data: newUserRewards, error } = await supabase
        .from('user_rewards')
        .insert([{ 
          user_id: userId,
          xp_points: 0,
          current_streak: 0,
          last_activity_date: new Date().toISOString().split('T')[0],
          current_level: 1,
          total_problems_solved: 0,
          total_correct_answers: 0
        }])
        .select()
        .single();
      
      if (error) throw error;
      userRewards = newUserRewards;
    }
    
    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const lastActivityDate = userRewards.last_activity_date;
    
    let newStreak = userRewards.current_streak;
    
    if (lastActivityDate) {
      const lastDate = new Date(lastActivityDate);
      const diffTime = Math.abs(new Date(today) - lastDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Consecutive day - increase streak
        newStreak += 1;
      } else if (diffDays > 1) {
        // Streak broken
        newStreak = 1;
      }
      // If diffDays is 0 (same day), keep current streak
    } else {
      // First activity
      newStreak = 1;
    }
    
    // Calculate streak bonus
    const streakBonus = Math.floor(xpEarned * (newStreak * STREAK_BONUS_MULTIPLIER));
    const totalXpEarned = xpEarned + streakBonus;
    
    // Update user rewards
    const { error: updateError } = await supabase
      .from('user_rewards')
      .update({ 
        xp_points: userRewards.xp_points + totalXpEarned,
        current_streak: newStreak,
        last_activity_date: today,
        total_problems_solved: userRewards.total_problems_solved + 1,
        total_correct_answers: userRewards.total_correct_answers + (isCorrect ? 1 : 0),
        current_level: calculateLevel(userRewards.xp_points + totalXpEarned),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (updateError) throw updateError;
    
    // Check for achievements
    await checkForAchievements(userId);
    
    // Return the XP earned for display
    return {
      xpEarned: totalXpEarned,
      baseXP: xpEarned,
      streakBonus,
      currentStreak: newStreak
    };
  } catch (error) {
    console.error('Error updating rewards:', error);
    return null;
  }
};

// Calculate level based on XP
const calculateLevel = (xp) => {
  // Simple level formula: each level requires 20% more XP than the previous
  // Level 1: 0 XP
  // Level 2: 100 XP
  // Level 3: 220 XP (100 + 100*1.2)
  // and so on...
  
  if (xp < 100) return 1;
  
  let level = 1;
  let xpThreshold = 0;
  let nextLevelXP = 100;
  
  while (xp >= xpThreshold + nextLevelXP) {
    xpThreshold += nextLevelXP;
    level++;
    nextLevelXP = Math.round(100 * Math.pow(1.2, level - 2));
  }
  
  return level;
};

// Check for newly earned achievements
const checkForAchievements = async (userId) => {
  try {
    // Get user stats
    const { data: userRewards } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!userRewards) return;
    
    // Get all achievements
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*');
    
    // Get user's already earned achievements
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);
    
    const earnedAchievementIds = userAchievements.map(item => item.achievement_id);
    
    // Get user's accuracy
    let accuracy = 0;
    if (userRewards.total_problems_solved > 0) {
      accuracy = Math.round((userRewards.total_correct_answers / userRewards.total_problems_solved) * 100);
    }
    
    // Check for new achievements
    const newAchievements = [];
    
    for (const achievement of allAchievements) {
      // Skip if already earned
      if (earnedAchievementIds.includes(achievement.id)) continue;
      
      let achieved = false;
      
      switch (achievement.achievement_type) {
        case 'streak':
          achieved = userRewards.current_streak >= achievement.required_value;
          break;
        case 'xp':
          achieved = userRewards.xp_points >= achievement.required_value;
          break;
        case 'problems_solved':
          achieved = userRewards.total_problems_solved >= achievement.required_value;
          break;
        case 'accuracy':
          achieved = accuracy >= achievement.required_value && userRewards.total_problems_solved >= 20;
          break;
        // Other achievement types would be checked here
        default:
          break;
      }
      
      if (achieved) {
        newAchievements.push({
          user_id: userId,
          achievement_id: achievement.id
        });
      }
    }
    
    // Award new achievements
    if (newAchievements.length > 0) {
      await supabase
        .from('user_achievements')
        .insert(newAchievements);
        
      return newAchievements.length;
    }
    
    return 0;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return 0;
  }
};

// Get all achievements for a user (both earned and unearned)
export const getUserAchievements = async () => {
  try {
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return { earned: [], unearned: [] };
    
    const userId = userData.user.id;
    
    // Get all achievements
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*')
      .order('achievement_type')
      .order('required_value');
    
    // Get user's earned achievements
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('*, achievements(*)')
      .eq('user_id', userId);
    
    const earnedAchievementIds = userAchievements.map(item => item.achievement_id);
    
    // Split into earned and unearned
    const earned = userAchievements.map(item => ({
      ...item.achievements,
      earned_at: item.earned_at
    }));
    
    const unearned = allAchievements.filter(
      achievement => !earnedAchievementIds.includes(achievement.id)
    );
    
    return { earned, unearned };
  } catch (error) {
    console.error('Error getting achievements:', error);
    return { earned: [], unearned: [] };
  }
};

// Get user rewards summary
export const getUserRewardsSummary = async () => {
  try {
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return null;
    
    const userId = userData.user.id;
    
    // Get user rewards
    const { data: userRewards } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!userRewards) {
      // Create default record if none exists
      const defaultRewards = {
        user_id: userId,
        xp_points: 0,
        current_streak: 0,
        current_level: 1,
        total_problems_solved: 0,
        total_correct_answers: 0
      };
      
      await supabase
        .from('user_rewards')
        .insert([defaultRewards]);
        
      return defaultRewards;
    }
    
    // Calculate progress to next level
    const currentLevelXP = getXPForLevel(userRewards.current_level);
    const nextLevelXP = getXPForLevel(userRewards.current_level + 1);
    const xpForCurrentLevel = userRewards.xp_points - currentLevelXP;
    const xpRequiredForNextLevel = nextLevelXP - currentLevelXP;
    const levelProgress = Math.round((xpForCurrentLevel / xpRequiredForNextLevel) * 100);
    
    // Get count of earned achievements
    const { count } = await supabase
      .from('user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    return {
      ...userRewards,
      levelProgress,
      xpToNextLevel: xpRequiredForNextLevel - xpForCurrentLevel,
      achievementsCount: count || 0
    };
  } catch (error) {
    console.error('Error getting user rewards:', error);
    return null;
  }
};

// Helper function to calculate XP required for a level
const getXPForLevel = (level) => {
  if (level <= 1) return 0;
  
  let totalXP = 0;
  let levelXP = 100;
  
  for (let i = 2; i <= level; i++) {
    if (i === 2) {
      totalXP += 100;
    } else {
      levelXP = Math.round(100 * Math.pow(1.2, i - 2));
      totalXP += levelXP;
    }
  }
  
  return totalXP;
};