import React, { useState } from 'react';

const GeneratorView = () => {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);

  const generatePassword = () => {
    // Generate secure password logic
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let retVal = "";
    for (let i = 0; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(retVal);
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-bold text-lg">Password Generator</h3>
      <div className="border p-4 rounded bg-gray-100 text-center font-mono break-all min-h-[40px]">
        {password || 'Click Generate'}
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600">Length: {length}</label>
        <input 
          type="range" 
          min="8" 
          max="64" 
          value={length} 
          onChange={(e) => setLength(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      <button 
        onClick={generatePassword}
        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium"
      >
        Generate
      </button>
    </div>
  );
};

export default GeneratorView;
