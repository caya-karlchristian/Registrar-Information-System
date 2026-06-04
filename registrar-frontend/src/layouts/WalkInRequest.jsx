import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AcademicCapIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';

const WalkInRequest = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const cardClasses = isDark
    ? 'border-[#3e4042] bg-[#18191a] text-[#e4e6eb] hover:border-[#5a5b5c] hover:bg-[#242526]'
    : 'border-[#d7c3c3] bg-white text-[#4a0000] hover:border-[#b97a7a] hover:bg-[#fff8f8]';

  return (
    <div className={`min-h-[calc(100vh-120px)] px-4 py-8 ${isDark ? 'bg-[#18191a]' : 'bg-[#f8f2f2]'}`}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className={`rounded-2xl border px-6 py-7 shadow-sm ${isDark ? 'border-[#3e4042] bg-[#18191a]' : 'border-[#eadada] bg-white'}`}>
          <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${isDark ? 'text-[#b0b3b8]' : 'text-[#7a0000]'}`}>
            Walk-In Request
          </p>
          <h1 className={`mt-2 text-3xl font-black uppercase tracking-tight ${isDark ? 'text-[#f5f6f7]' : 'text-[#4a0000]'}`}>
            Choose request type
          </h1>
          <p className={`mt-3 max-w-2xl text-sm leading-6 ${isDark ? 'text-[#b0b3b8]' : 'text-[#6b4a4a]'}`}>
            Select whether the walk-in is for a student or alumni visitor. You will be taken to the matching request form.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('student')}
            className={`group flex min-h-55 flex-col justify-between rounded-2xl border p-6 text-left transition-all duration-200 ${cardClasses}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.22em] ${isDark ? 'text-[#b0b3b8]' : 'text-[#7a0000]'}`}>
                  Student Walk-In
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight">
                  Student Request Form
                </h2>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-[#eadada] bg-[#fff4f4]'}`}>
                <UserGroupIcon className={`h-6 w-6 ${isDark ? 'text-[#e4e6eb]' : 'text-[#7a0000]'}`} />
              </div>
            </div>

            <p className={`mt-5 max-w-sm text-sm leading-6 ${isDark ? 'text-[#b0b3b8]' : 'text-[#6b4a4a]'}`}>
              Use this path when the visitor is a currently enrolled student and needs the student walk-in request form.
            </p>

            <span className={`mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] ${isDark ? 'text-[#f5f6f7]' : 'text-[#4a0000]'}`}>
              Open student form
              <span aria-hidden="true">→</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('alumni')}
            className={`group flex min-h-55 flex-col justify-between rounded-2xl border p-6 text-left transition-all duration-200 ${cardClasses}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.22em] ${isDark ? 'text-[#b0b3b8]' : 'text-[#7a0000]'}`}>
                  Alumni Walk-In
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight">
                  Alumni Request Form
                </h2>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-[#eadada] bg-[#fff4f4]'}`}>
                <AcademicCapIcon className={`h-6 w-6 ${isDark ? 'text-[#e4e6eb]' : 'text-[#7a0000]'}`} />
              </div>
            </div>

            <p className={`mt-5 max-w-sm text-sm leading-6 ${isDark ? 'text-[#b0b3b8]' : 'text-[#6b4a4a]'}`}>
              Use this path when the visitor is an alumni and needs the alumni walk-in request form.
            </p>

            <span className={`mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] ${isDark ? 'text-[#f5f6f7]' : 'text-[#4a0000]'}`}>
              Open alumni form
              <span aria-hidden="true">→</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalkInRequest;