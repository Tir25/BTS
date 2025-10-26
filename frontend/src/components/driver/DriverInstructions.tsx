import React from 'react';

const DriverInstructions: React.FC = () => {
  return (
    <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
      <h3 className="font-semibold text-blue-200 mb-2 flex items-center gap-2">
        <span className="text-xl">ℹ️</span>
        Instructions
      </h3>
      <ul className="text-sm text-blue-100 space-y-1">
        <li>• Click "Start Tracking" to begin sending location updates</li>
        <li>• Your location will be sent every few seconds</li>
        <li>• Students and admin can see your bus location in real-time</li>
        <li>• Make sure to allow location access when prompted</li>
        <li>• The map shows your current position with a blue marker</li>
        <li>• Keep the app running in the foreground for best results</li>
        <li>• Use "Stop Tracking" when you finish your route</li>
      </ul>
    </div>
  );
};

export default DriverInstructions;
