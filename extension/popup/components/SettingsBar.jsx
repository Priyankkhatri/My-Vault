import React from 'react';

const SettingsBar = () => {
  return (
    <div className="flex items-center justify-around p-3 border-t bg-white fixed bottom-0 left-0 right-0">
      <button className="text-gray-600 hover:text-blue-600 flex flex-col items-center">
        <span className="text-xs">Vault</span>
      </button>
      <button className="text-gray-600 hover:text-blue-600 flex flex-col items-center">
        <span className="text-xs">Generator</span>
      </button>
      <button className="text-gray-600 hover:text-blue-600 flex flex-col items-center">
        <span className="text-xs">Settings</span>
      </button>
      <button className="text-gray-600 hover:text-red-600 flex flex-col items-center" onClick={() => chrome.runtime.reload()}>
        <span className="text-xs">Lock</span>
      </button>
    </div>
  );
};

export default SettingsBar;
