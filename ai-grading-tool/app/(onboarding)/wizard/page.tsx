'use client';

import React, { useEffect, useState } from 'react';
import WizardLayout from '../../../components/Wizard/WizardLayout';
import Step1UploadGold from '../../../components/Wizard/Step1UploadGold';
import Step2Calibrate from '../../../components/Wizard/Step2Calibrate';
import Step3UploadBatch from '../../../components/Wizard/Step3UploadBatch';
import Step4Results from '../../../components/Wizard/Step4Results';
import Modal from '../../../components/Modal';

export default function WizardPage() {
  const [step, setStep] = useState<number>(1);

  // Step 1 gating: welcome and optional gold explainer
  const [welcomeShown, setWelcomeShown] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [showGoldInfo, setShowGoldInfo] = useState<boolean>(false);
  const [goldReady, setGoldReady] = useState<boolean>(false);

  useEffect(() => {
    if (step === 1 && !welcomeShown) {
      setShowWelcome(true);
    }
  }, [step, welcomeShown]);

  const renderStep = () => {
    if (step === 1) {
      if (!goldReady) {
        // Hold back the uploader until user confirms they want to upload gold and sees the explainer
        return <div className="text-gray-600">Follow the prompts to continue.</div>;
      }
      return <Step1UploadGold onGoToCalibrate={() => setStep(2)} />;
    }
    if (step === 2) return <Step2Calibrate />;
    if (step === 3) return <Step3UploadBatch />;
    if (step === 4) return <Step4Results />;
    return null;
  };

  return (
    <>
      <WizardLayout step={step} setStep={setStep}>
        {renderStep()}
        <div className="mt-6 flex justify-between">
          <button className="px-3 py-2 rounded border" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>Back</button>
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => setStep((s) => Math.min(4, s + 1))}>{step === 4 ? 'Finish' : 'Next'}</button>
        </div>
      </WizardLayout>

      {/* Welcome modal (Step 1 only) */}
      <Modal
        open={showWelcome && step === 1}
        title="Welcome to the Wizard, Lynda!"
        onClose={() => { setShowWelcome(false); setWelcomeShown(true); }}
        actions={
          <>
            <button className="px-3 py-2 rounded border" onClick={() => { 
              // Skip gold upload
              setShowWelcome(false); 
              setWelcomeShown(true); 
              setGoldReady(false);
              setStep(3);
            }}>
              Skip for now
            </button>
            <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => {
              // Proceed to gold upload with explainer
              setShowWelcome(false);
              setWelcomeShown(true);
              setShowGoldInfo(true);
            }}>
              Yes, use my graded papers
            </button>
          </>
        }
      >
        <div className="space-y-3 text-gray-700">
          <p>We’ll guide you through getting set up for grading.</p>
          <p>Have you already graded some papers? If so, we can use them to train our AI to score like you. Alternatively, we can skip ahead.</p>
        </div>
      </Modal>

      {/* Gold explainer modal (shown when user chose Yes) */}
      <Modal
        open={showGoldInfo && step === 1}
        title="About Gold Examples"
        onClose={() => setShowGoldInfo(false)}
        actions={
          <>
            <button className="px-3 py-2 rounded border" onClick={() => setShowGoldInfo(false)}>Close</button>
            <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => {
              setShowGoldInfo(false);
              setGoldReady(true);
            }}>
              Continue
            </button>
          </>
        }
      >
        <div className="space-y-3 text-gray-700">
          <p>Gold examples are papers you’ve already graded. We use them to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Learn your rubric interpretation and scoring style.</li>
            <li>Measure and correct model bias at each rubric item.</li>
            <li>Increase consistency before scoring new submissions.</li>
          </ul>
          <p>You can upload a document (PDF/DOCX) and optionally attach line‑by‑line rubric scores or just a final score. We’ll process and store these for calibration.</p>
        </div>
      </Modal>
    </>
  );
}


