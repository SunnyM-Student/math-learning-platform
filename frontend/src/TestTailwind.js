import React from 'react';

function TestTailwind() {
  return (
    <div className="min-h-screen bg-neutral-light p-8">
      <div className="card max-w-md mx-auto">
        <h1 className="text-primary mb-4">Tailwind Test</h1>
        <p className="mb-6">If you see this with custom styling, Tailwind is working!</p>
        <button className="btn btn-primary">Primary Button</button>
      </div>
    </div>
  );
}

export default TestTailwind;