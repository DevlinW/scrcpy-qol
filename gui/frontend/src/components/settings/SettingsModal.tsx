import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AppSettings, SystemStatus } from '../../types';
import { testFolderPath } from '../../api/client';
import { CheckCircle2, AlertTriangle, FolderSearch, Save, Info } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
  systemStatus: SystemStatus | null;
  onSaveSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  systemStatus,
  onSaveSettings,
}) => {
  const [adbPath, setAdbPath] = useState('');
  const [scrcpyPath, setScrcpyPath] = useState('');
  const [folderTest, setFolderTest] = useState<string>('');
  const [testResult, setTestResult] = useState<{
    hasAdb: boolean;
    hasScrcpy: boolean;
    error?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setAdbPath(settings.customAdbPath || '');
      setScrcpyPath(settings.customScrcpyPath || '');
    }
  }, [settings, isOpen]);

  const handleTestFolder = async () => {
    if (!folderTest.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testFolderPath(folderTest.trim());
      setTestResult(res);
      if (res.hasAdb) setAdbPath(folderTest.trim());
      if (res.hasScrcpy) setScrcpyPath(folderTest.trim());
    } catch (_) {
      setTestResult({ hasAdb: false, hasScrcpy: false, error: 'Could not test path' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveSettings({
      customAdbPath: adbPath.trim(),
      customScrcpyPath: scrcpyPath.trim(),
    });
    setIsSaving(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Application Settings"
      description="Configure executable paths and environment settings for scrcpy and ADB."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Current Binary Status Overview */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Detected Environment
          </h4>

          {/* ADB */}
          <div className="flex items-start justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-white">ADB (Android Debug Bridge):</span>
              <p className="font-mono text-[11px] text-zinc-400 mt-0.5 break-all">
                {systemStatus?.adb.path || 'Not detected'}
              </p>
            </div>
            {systemStatus?.adb.found ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-400 font-medium shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" /> Missing
              </span>
            )}
          </div>

          <div className="h-px bg-zinc-800/80" />

          {/* Scrcpy */}
          <div className="flex items-start justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-white">scrcpy Binary:</span>
              <p className="font-mono text-[11px] text-zinc-400 mt-0.5 break-all">
                {systemStatus?.scrcpy.path || 'Not detected'}
              </p>
            </div>
            {systemStatus?.scrcpy.found ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-400 font-medium shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" /> Missing
              </span>
            )}
          </div>
        </div>

        {/* Quick Folder Tester */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-zinc-300">
            Quick Folder Auto-Detect
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. C:\Users\Lenovo\Downloads\scrcpy-win64"
              value={folderTest}
              onChange={(e) => setFolderTest(e.target.value)}
              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestFolder}
              loading={isTesting}
              disabled={!folderTest.trim()}
              icon={<FolderSearch className="w-3.5 h-3.5" />}
            >
              Test Folder
            </Button>
          </div>

          {testResult && (
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className={testResult.hasAdb ? 'text-emerald-400' : 'text-rose-400'}>
                  {testResult.hasAdb ? '✓ Found adb.exe' : '✗ adb.exe not in this folder'}
                </span>
                <span className="text-zinc-600">•</span>
                <span className={testResult.hasScrcpy ? 'text-emerald-400' : 'text-rose-400'}>
                  {testResult.hasScrcpy ? '✓ Found scrcpy.exe' : '✗ scrcpy.exe not in this folder'}
                </span>
              </div>
              {testResult.hasAdb || testResult.hasScrcpy ? (
                <p className="text-[11px] text-zinc-400">
                  Paths have been filled below. Click "Save Settings" to persist.
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Custom Path Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Custom ADB Directory or File Path
            </label>
            <input
              type="text"
              placeholder="e.g. C:\platform-tools\ or C:\platform-tools\adb.exe"
              value={adbPath}
              onChange={(e) => setAdbPath(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Custom scrcpy Directory or File Path
            </label>
            <input
              type="text"
              placeholder="e.g. C:\scrcpy\ or C:\scrcpy\scrcpy.exe"
              value={scrcpyPath}
              onChange={(e) => setScrcpyPath(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-2 text-xs text-zinc-400 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/60">
          <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <span>
            If left blank, the app will search your Windows system PATH, standard Android SDK directories, and the repository root.
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            loading={isSaving}
            icon={<Save className="w-4 h-4" />}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};
