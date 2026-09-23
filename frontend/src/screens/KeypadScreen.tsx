import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Keypad } from '../components/dialer/Keypad';

export const KeypadScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleCall = (recipient: string) => {
    navigate('/app/calls', { state: { autoDial: recipient } });
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 select-none animate-fadeIn">
      {/* Top Header */}
      <div className="text-center mt-1">
        <h1 className="text-xs uppercase font-bold tracking-widest text-slate-400">
          Phone Dialer
        </h1>
      </div>

      {/* Main Interactive Phone Keypad */}
      <div className="flex-1 flex flex-col justify-center my-2">
        <Keypad onCall={handleCall} />
      </div>

      {/* Subtle Bottom Note */}
      <div className="text-center pb-1">
        <p className="text-[10px] text-slate-500 font-medium">
          Protected by Zero-Server-Audio AI
        </p>
      </div>
    </div>
  );
};
