import { useState } from "react";

const RiskDisclaimer = () => {
  const [accepted, setAccepted] = useState(() => {
    // Check if user has already accepted
    return localStorage.getItem("risk-disclaimer-accepted") === "true";
  });
  const [showModal, setShowModal] = useState(!accepted);

  const handleAccept = () => {
    localStorage.setItem("risk-disclaimer-accepted", "true");
    setAccepted(true);
    setShowModal(false);
  };

  const handleDecline = () => {
    // Redirect or show message
    alert("You must accept the risk disclaimer to use this service.");
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-w-2xl rounded-2xl border border-red-500/50 bg-bg-panel p-6 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-red-400">⚠️ Risk Disclaimer</h2>
        
        <div className="mb-6 max-h-96 space-y-4 overflow-y-auto text-sm text-gray-300">
          <p>
            <strong className="text-red-400">IMPORTANT:</strong> Please read this disclaimer carefully before using CoreTime Clicker.
          </p>

          <div>
            <h3 className="mb-2 font-semibold text-white">Smart Contract Risks</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>Smart contracts are experimental technology and may contain bugs</li>
              <li>Contracts are unaudited (MVP version)</li>
              <li>You may lose funds due to bugs, hacks, or errors</li>
              <li>Blockchain transactions are irreversible</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">Randomness Limitations</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>MVP uses commit-reveal randomness (not cryptographically secure)</li>
              <li>Randomness may be predictable by block producers</li>
              <li>Upgrade to attested VRF planned for production</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">Financial Risks</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>Entry fees are non-refundable</li>
              <li>No guarantee of winning</li>
              <li>You may lose all entry fees</li>
              <li>Gas costs apply to all transactions</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">No Warranties</h3>
            <p>
              This service is provided "as is" without any warranties. We are not responsible for any losses or damages.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">Your Responsibility</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>Secure your wallet and private keys</li>
              <li>Verify all transactions before signing</li>
              <li>Use at your own risk</li>
              <li>Only use funds you can afford to lose</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleAccept}
            className="flex-1 rounded-lg bg-primary px-6 py-3 font-semibold text-bg-dark transition hover:brightness-110"
          >
            I Understand and Accept the Risks
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 rounded-lg border border-gray-500 px-6 py-3 font-semibold text-gray-300 transition hover:bg-gray-500"
          >
            Decline
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          By accepting, you acknowledge that you have read, understood, and agree to the risks associated with using this service.
        </p>
      </div>
    </div>
  );
};

export default RiskDisclaimer;

