import React, { useState } from 'react';

const LockScreen = ({ onUnlock }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onUnlock(password);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h2 className="text-xl font-bold mb-4">Vault Locked</h2>
      <form onSubmit={handleSubmit} className="w-full">
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Master Password" 
          className="w-full p-2 border rounded mb-4"
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Unlock
        </button>
      </form>
    </div>
  );
};

export default LockScreen;
