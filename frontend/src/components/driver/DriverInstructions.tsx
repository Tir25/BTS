import React from 'react';

const DriverInstructions: React.FC = () => {
  return (
    <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
      <h3 className="font-semibold text-blue-200 mb-3 flex items-center gap-2">
        <span className="text-xl">ℹ️</span>
        Instructions
      </h3>
      <ul className="text-sm text-blue-100 space-y-2">
        <li className="flex items-start gap-2">
          <span className="text-blue-300 mt-0.5">•</span>
          <span>Click "Start Tracking" to begin sending location updates</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-300 mt-0.5">•</span>
          <span>Your location will be sent every few seconds</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-300 mt-0.5">•</span>
          <span>Students and admin can see your bus location in real-time</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-300 mt-0.5">•</span>
          <span>Make sure to allow location access when prompted</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-300 mt-0.5">•</span>
          <span>The map shows your current position with a blue marker</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-300 mt-0.5">•</span>
          <span>Keep the app running in the foreground for best results</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-300 mt-0.5">•</span>
          <span>Use "Stop Tracking" when you finish your route</span>
        </li>
      </ul>
    </div>
  );
};

export default DriverInstructions;
