import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { pairDevice, connectDevice } from '../../api/client';
import { Wifi, CheckCircle2, ArrowRight, Smartphone, AlertCircle } from 'lucide-react';

interface WirelessPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (serial: string, nickname?: string) => void;
  onError: (msg: string) => void;
}

export const WirelessPairModal: React.FC<WirelessPairModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<'pair_and_connect' | 'connect_only'>('pair_and_connect');

  // Step 1 Form
  const [ip, setIp] = useState('');
  const [pairPort, setPairPort] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);

  // Step 2 Form
  const [mainPort, setMainPort] = useState('');
  const [nickname, setNickname] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Error message
  const [formError, setFormError] = useState<string | null>(null);

  // Validation helpers (Golden Rule 5: Prevent errors)
  const isValidIp = (val: string) => {
    const regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    return regex.test(val.trim());
  };

  const isValidPort = (val: string) => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num > 0 && num <= 65535;
  };

  const isStep1Valid = isValidIp(ip) && isValidPort(pairPort) && pairCode.trim().length >= 6;
  const isStep2Valid = isValidIp(ip) && isValidPort(mainPort);

  const resetForm = () => {
    setStep(1);
    setIp('');
    setPairPort('');
    setPairCode('');
    setMainPort('');
    setNickname('');
    setFormError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePair = async () => {
    if (!isStep1Valid) return;
    setIsPairing(true);
    setFormError(null);

    try {
      const res = await pairDevice(ip.trim(), parseInt(pairPort, 10), pairCode.trim());
      if (res.success) {
        setStep(2);
      } else {
        setFormError(res.error || 'Failed to pair with device. Ensure pairing code is active.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error while pairing.');
    } finally {
      setIsPairing(false);
    }
  };

  const handleConnect = async () => {
    if (!isStep2Valid) return;
    setIsConnecting(true);
    setFormError(null);

    try {
      const res = await connectDevice(ip.trim(), parseInt(mainPort, 10), nickname.trim());
      if (res.success) {
        onSuccess(res.serial || `${ip.trim()}:${mainPort}`, nickname);
        handleClose();
      } else {
        setFormError(res.error || 'Failed to connect. Check that Wireless Debugging is on.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error while connecting.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Wireless Debugging Setup"
      description="Connect your Android phone to scrcpy wirelessly over your Wi-Fi network."
      maxWidth="md"
    >
      {/* Mode Switcher */}
      <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 mb-5">
        <button
          onClick={() => {
            setMode('pair_and_connect');
            setStep(1);
            setFormError(null);
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            mode === 'pair_and_connect'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          New Device (Pair & Connect)
        </button>
        <button
          onClick={() => {
            setMode('connect_only');
            setStep(2);
            setFormError(null);
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            mode === 'connect_only'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Already Paired (Quick Connect)
        </button>
      </div>

      {/* Step Indicator (Golden Rule 4: Design dialogs to yield closure) */}
      {mode === 'pair_and_connect' && (
        <div className="flex items-center gap-2 mb-6">
          <div
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border ${
              step === 1
                ? 'bg-white text-black border-white'
                : 'bg-zinc-900 text-emerald-400 border-zinc-700'
            }`}
          >
            {step === 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>1</span>}
            <span>Pair Code</span>
          </div>

          <div className="w-6 h-px bg-zinc-700" />

          <div
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border ${
              step === 2
                ? 'bg-white text-black border-white'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            <span>2</span>
            <span>Connect</span>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {formError && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs mb-4">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{formError}</span>
        </div>
      )}

      {/* STEP 1: PAIRING */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-lg text-xs text-zinc-300 leading-relaxed space-y-1.5">
            <p className="font-semibold text-white">How to pair over Wi-Fi:</p>
            <p>1. On your phone: <strong>Settings ➔ Developer options ➔ Wireless debugging</strong>.</p>
            <p>2. Tap <strong>"Pair device with pairing code"</strong>.</p>
            <p className="text-amber-300 font-medium">⚠️ Keep that popup open on your phone screen while clicking Pair!</p>
            <p className="text-[11px] text-zinc-400">If your device is already paired, switch to the <strong>"Already Paired (Quick Connect)"</strong> tab above.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              6-Digit Pairing Code
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 123456"
              value={pairCode}
              onChange={(e) => setPairCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white font-mono tracking-widest placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Device IP Address
              </label>
              <input
                type="text"
                placeholder="e.g. 192.168.1.105"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Pairing Port
              </label>
              <input
                type="number"
                placeholder="e.g. 38291"
                value={pairPort}
                onChange={(e) => setPairPort(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button variant="ghost" size="md" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handlePair}
              loading={isPairing}
              disabled={!isStep1Valid}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Pair Device
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: CONNECTING */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-zinc-900/70 border border-zinc-800 p-3 rounded-lg text-xs text-zinc-300 leading-relaxed">
            <p className="font-semibold text-white mb-1">Main Connection Port:</p>
            <p>
              Close the pairing popup on your phone. Look at the <strong>IP address & Port</strong> displayed directly on the main Wireless debugging screen.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Device IP Address
            </label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.105"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Main Port
              </label>
              <input
                type="number"
                placeholder="e.g. 5555 or 42139"
                value={mainPort}
                onChange={(e) => setMainPort(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Device Nickname (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. My Galaxy S23"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
            {mode === 'pair_and_connect' ? (
              <Button variant="ghost" size="md" onClick={() => setStep(1)}>
                Back to Pairing
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button variant="ghost" size="md" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConnect}
                loading={isConnecting}
                disabled={!isStep2Valid}
                icon={<Wifi className="w-4 h-4" />}
              >
                Connect Device
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
