import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    gradeLevel: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.fullName || !formData.email || !formData.password) {
      setErrorMsg('Please fill in all required fields');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    
    if (formData.role === 'student' && !formData.gradeLevel) {
      setErrorMsg('Please select a grade level');
      return;
    }
    
    try {
      setLoading(true);
      setErrorMsg('');
      
      console.log("Starting registration process...");
      
      // Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          }
        }
      });
      
      if (authError) {
        console.error("Auth error during signup:", authError);
        throw authError;
      }
      
      console.log("Authentication successful:", authData.user ? "User created" : "No user object returned");
      
      // If signup is successful, create a profile
      if (authData.user) {
        console.log("Creating profile for user ID:", authData.user.id);
        
        // Prepare profile data
        const profileData = {
          user_id: authData.user.id,
          full_name: formData.fullName,
          role: formData.role,
          grade_level: formData.role === 'student' ? formData.gradeLevel : null
        };
        
        console.log("Profile data to insert:", profileData);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert([profileData])
          .select();
          
        if (profileError) {
          console.error("Profile creation error:", profileError);
          throw profileError;
        }
        
        console.log("Profile created successfully:", profile);
        
        // Verify profile was created
        const { data: verifyProfile, error: verifyError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();
        
        if (verifyError) {
          console.warn("Could not verify profile creation:", verifyError);
        } else {
          console.log("Profile verification successful:", verifyProfile);
        }
        
        setSuccessMsg('Registration successful! You can now sign in.');
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // This is unusual - we should have a user if auth was successful
        console.warn("Auth successful but no user object returned");
        setErrorMsg('Registration partially completed. Please try logging in.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrorMsg(error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-neutral-light flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <h1 className="text-primary text-center mb-6">Math Learning Platform</h1>
        <h2 className="text-xl font-medium mb-6 text-center">Create an Account</h2>
        
        {errorMsg && (
          <div className="bg-error/10 text-error p-3 rounded-md mb-4">
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="bg-success/10 text-success p-3 rounded-md mb-4">
            {successMsg}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="fullName" className="block text-sm font-medium mb-1">Full Name*</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="input"
              value={formData.fullName}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email*</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password*</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
              minLength={6}
            />
            <p className="text-xs text-neutral-medium mt-1">At least 6 characters</p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">Confirm Password*</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="input"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="role" className="block text-sm font-medium mb-1">I am a*</label>
            <select
              id="role"
              name="role"
              className="input"
              value={formData.role}
              onChange={handleChange}
              disabled={loading}
              required
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          
          {formData.role === 'student' && (
            <div className="mb-6">
              <label htmlFor="gradeLevel" className="block text-sm font-medium mb-1">Grade Level*</label>
              <select
                id="gradeLevel"
                name="gradeLevel"
                className="input"
                value={formData.gradeLevel}
                onChange={handleChange}
                disabled={loading}
                required
              >
                <option value="">Select your grade</option>
                <option value="K">Kindergarten</option>
                <option value="1">1st Grade</option>
                <option value="2">2nd Grade</option>
                <option value="3">3rd Grade</option>
                <option value="4">4th Grade</option>
                <option value="5">5th Grade</option>
                <option value="6">6th Grade</option>
                <option value="7">7th Grade</option>
                <option value="8">8th Grade</option>
                <option value="9">9th Grade</option>
                <option value="10">10th Grade</option>
                <option value="11">11th Grade</option>
                <option value="12">12th Grade</option>
              </select>
            </div>
          )}
          
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <p className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-primary-dark">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;