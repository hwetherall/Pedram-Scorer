'use client';

import React from 'react';

const steps = [
  { id: 1, title: 'Upload Gold' },
  { id: 2, title: 'Calibrate' },
  { id: 3, title: 'Upload & Score' },
  { id: 4, title: 'Review Results' },
];

export default function WizardLayout({
  step,
  setStep,
  children,
}: {
  step: number;
  setStep: (s: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Grading Wizard</h1>
      <nav aria-label="Progress" className="mb-6">
        <ol className="grid grid-cols-4 gap-2">
          {steps.map((s) => {
            const active = s.id === step;
            const done = s.id < step;
            return (
              <li key={s.id}>
                <button
                  className={`w-full px-3 py-2 rounded border ${
                    active ? 'bg-blue-600 text-white border-blue-600' : done ? 'bg-green-600 text-white border-green-600' : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                  onClick={() => setStep(s.id)}
                >
                  {s.id}. {s.title}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="bg-white border border-gray-200 rounded p-4">{children}</div>
    </div>
  );
}


