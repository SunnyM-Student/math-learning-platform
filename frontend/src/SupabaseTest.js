import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';

function SupabaseTest() {
  const [status, setStatus] = useState('Checking connection...');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Just check if we can connect at all by calling a basic function
        const { data } = await supabase.auth.getSession();
        
        // If we get here without errors, the connection is working
        console.log("Connection test result:", data);
        setStatus('✅ Successfully connected to Supabase!');
      } catch (error) {
        console.error('Connection error:', error);
        setError(error.message || 'Unknown error occurred');
        setStatus('❌ Failed to connect to Supabase');
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-light p-8">
      <div className="card max-w-md mx-auto">
        <h1 className="text-primary mb-4">Supabase Connection Test</h1>
        
        <div className={`p-4 rounded-md mb-4 ${status.includes('✅') ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
          <p className="font-medium">{status}</p>
          {error && (
            <p className="mt-2 text-error text-sm">{error}</p>
          )}
        </div>
        
        <div className="mt-4">
          <h2 className="text-lg font-medium mb-2">Connection Details:</h2>
          <p className="text-sm mb-1">URL: {process.env.REACT_APP_SUPABASE_URL ? '✓ Set' : '✗ Missing'}</p>
          <p className="text-sm mb-4">API Key: {process.env.REACT_APP_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}</p>
          
          <div className="text-sm bg-neutral-light p-3 rounded-md">
            <p className="font-medium mb-2">Next steps:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Create the database tables in Supabase</li>
              <li>Set up authentication</li>
              <li>Create the login and registration pages</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupabaseTest;