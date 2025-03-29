// src/pages/Login.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setErrorMsg('Please fill in all fields');
      return;
    }
    
    try {
      setLoading(true);
      setErrorMsg('');
      
      // Sign in with session duration based on "Remember Me"
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          // If "Remember Me" is checked, keep session for 30 days
          // Otherwise use default (shorter) session
          expiresIn: rememberMe ? 60 * 60 * 24 * 30 : undefined
        }
      });
      
      if (error) throw error;
      
      setMessage('Login successful! Redirecting...');
    } catch (error) {
      console.error('Error logging in:', error);
      setErrorMsg(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-light flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <h1 className="text-primary text-center mb-6">Math Learning Platform</h1>
        <h2 className="text-xl font-medium mb-6 text-center">Sign In</h2>
        
        {errorMsg && (
          <div className="bg-error/10 text-error p-3 rounded-md mb-4">
            {errorMsg}
          </div>
        )}
        
        {message && (
          <div className="bg-success/10 text-success p-3 rounded-md mb-4">
            {message}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="your@email.com"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
            />
          </div>
          
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="rememberMe">Remember me</label>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:text-primary-dark">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;