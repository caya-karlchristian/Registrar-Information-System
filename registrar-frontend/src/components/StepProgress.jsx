import React from "react";
import { CheckIcon } from "@heroicons/react/24/solid";

const StepProgress = ({ steps, currentStep, isDark, onStepClick }) => {
  return (
    <div
      className={`w-full max-w-3xl mx-auto px-6 py-4 mb-4 rounded-2xl border shadow-sm transition-all duration-300 ${
        isDark
          ? "bg-[#1f2023] border-[#3e4042]/70"
          : "bg-white border-gray-200/80 shadow-gray-200/50"
      }`}
    >
      <div className="flex items-center justify-between relative">
        {steps.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isClickable = Boolean(onStepClick && isCompleted);

          const handleClick = () => {
            if (isClickable && step.id !== currentStep) {
              onStepClick(step.id);
            }
          };

          return (
            <React.Fragment key={step.id}>
              {/* Step Node */}
              <button
                type="button"
                onClick={handleClick}
                disabled={!isClickable}
                title={
                  isCompleted
                    ? `Click to go back to ${step.label}`
                    : isActive
                    ? `Current step: ${step.label}`
                    : `Step ${step.id}: ${step.label}`
                }
                className={`flex flex-col items-center relative z-10 focus:outline-none group transition-all duration-200 ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    isCompleted
                      ? isDark
                        ? "bg-pup-yellow text-pup-dark-maroon shadow-md shadow-yellow-500/20 group-hover:scale-110 group-hover:ring-2 group-hover:ring-yellow-400"
                        : "bg-pup-maroon text-pup-yellow shadow-md group-hover:scale-110 group-hover:ring-2 group-hover:ring-pup-maroon/30"
                      : isActive
                      ? isDark
                        ? "bg-pup-yellow text-pup-dark-maroon ring-4 ring-[#F8BF1E]/30 shadow-lg shadow-yellow-500/30"
                        : "bg-pup-yellow text-pup-maroon ring-4 ring-yellow-400/40 border border-yellow-500 shadow-md font-extrabold"
                      : isDark
                      ? "bg-[#2b2c2f] text-gray-400 border border-[#3e4042]"
                      : "bg-gray-100 text-gray-400 border-2 border-gray-300"
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-5 h-5 stroke-current stroke-2" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-xs sm:text-sm font-semibold tracking-wide transition-colors duration-300 text-center ${
                    isActive
                      ? isDark
                        ? "text-pup-yellow font-bold"
                        : "text-pup-maroon font-extrabold"
                      : isCompleted
                      ? isDark
                        ? "text-gray-200 font-semibold group-hover:text-pup-yellow group-hover:underline"
                        : "text-gray-800 font-semibold group-hover:text-pup-maroon group-hover:underline"
                      : isDark
                      ? "text-gray-400 font-medium"
                      : "text-gray-400 font-medium"
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {/* Connecting Line between steps */}
              {idx < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 sm:mx-3 -mt-6 relative z-0">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      step.id < currentStep
                        ? isDark
                          ? "bg-pup-yellow"
                          : "bg-pup-maroon"
                        : isDark
                        ? "bg-[#3e4042]"
                        : "bg-gray-200"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepProgress;
