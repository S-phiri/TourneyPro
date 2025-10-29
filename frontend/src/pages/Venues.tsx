import React from 'react';

const Venues: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Venues</h1>
      
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="mb-6">
          <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-gray-900 mb-2">Venues Coming Soon</h2>
        <p className="text-gray-500">
          We're working on a comprehensive venue management system. 
          Check back soon to discover and manage tournament venues!
        </p>
      </div>
    </div>
  );
};

export default Venues;
