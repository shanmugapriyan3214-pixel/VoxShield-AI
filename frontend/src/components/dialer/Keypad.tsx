import React, { useState, useEffect } from 'react';
import { Delete, Phone, User as UserIcon, Shield } from 'lucide-react';
import { playDtmfTone } from './dtmf';
import { contactService } from '../../contacts/WebContactProvider';
import { User } from '../../types/domain';

interface KeypadProps {
  onCall: (recipient: string) => void;
  initialValue?: string;
  className?: string;
}

const KEYPAD_BUTTONS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'A B C' },
  { digit: '3', letters: 'D E F' },
  { digit: '4', letters: 'G H I' },
  { digit: '5', letters: 'J K L' },
  { digit: '6', letters: 'M N O' },
  { digit: '7', letters: 'P Q R S' },
  { digit: '8', letters: 'T U V' },
  { digit: '9', letters: 'W X Y Z' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
];

export const Keypad: React.FC<KeypadProps> = ({ onCall, initialValue = '', className = '' }) => {
  const [dialedNumber, setDialedNumber] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (initialValue) {
      setDialedNumber(initialValue);
    }
  }, [initialValue]);

  // Lookup matching contacts when input changes
  useEffect(() => {
    const trimmed = dialedNumber.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    let active = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const matches = await contactService.searchUsers(trimmed);
        if (active) {
          setSuggestions(matches.slice(0, 3));
        }
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [dialedNumber]);

  const handleKeyPress = (digit: string) => {
    playDtmfTone(digit);
    setDialedNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setDialedNumber((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDialedNumber('');
  };

  const handleCallSubmit = (target?: string) => {
    const recipient = (target || dialedNumber).trim();
    if (recipient) {
      onCall(recipient);
    }
  };

  return (
    <div className={`flex flex-col items-center justify-between w-full max-w-sm mx-auto select-none ${className}`}>
      {/* Dialer Display */}
      <div className="w-full flex flex-col items-center justify-center min-h-[80px] px-4 my-2">
        <div className="w-full flex items-center justify-between">
          <div className="w-10" />
          <input
            type="text"
            value={dialedNumber}
            onChange={(e) => setDialedNumber(e.target.value)}
            placeholder="Dial number or ID"
            aria-label="Phone number input"
            className="text-center font-mono text-3xl font-semibold tracking-wider text-slate-100 bg-transparent outline-none w-full placeholder:text-slate-600 truncate"
          />
          <div className="w-10 flex justify-end">
            {dialedNumber.length > 0 && (
              <button
                type="button"
                onClick={handleBackspace}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleClear();
                }}
                aria-label="Delete digit"
                className="p-2 text-slate-400 hover:text-slate-200 active:scale-95 transition-transform"
              >
                <Delete className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Contact Match Suggestions */}
        {suggestions.length > 0 && (
          <div className="w-full mt-2 flex flex-col gap-1.5 animate-fadeIn">
            {suggestions.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  setDialedNumber(user.voxshieldId);
                  handleCallSubmit(user.voxshieldId);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-all text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{user.displayName}</p>
                    <p className="text-[10px] font-mono text-cyan-400/90 truncate">{user.voxshieldId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 shrink-0 font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Call</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3x4 Keypad Grid */}
      <div className="grid grid-cols-3 gap-y-3.5 gap-x-5 my-3 w-full px-4">
        {KEYPAD_BUTTONS.map(({ digit, letters }) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleKeyPress(digit)}
            aria-label={`Digit ${digit}`}
            className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-slate-800/80 hover:bg-slate-700/90 active:bg-slate-600/90 text-slate-100 flex flex-col items-center justify-center transition-all duration-100 active:scale-95 shadow-sm border border-slate-700/40"
          >
            <span className="text-2xl sm:text-3xl font-medium leading-none">{digit}</span>
            {letters && (
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold tracking-widest mt-0.5">
                {letters}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Action Controls (Call Button) */}
      <div className="w-full flex items-center justify-center mt-3 mb-2">
        <button
          type="button"
          onClick={() => handleCallSubmit()}
          disabled={dialedNumber.trim().length === 0}
          aria-label="Start voice call"
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 ${
            dialedNumber.trim().length > 0
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          <Phone className="w-7 h-7 fill-current" />
        </button>
      </div>
    </div>
  );
};
