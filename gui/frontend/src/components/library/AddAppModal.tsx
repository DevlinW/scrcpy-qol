import React, { useState, useEffect } from 'react';
import { Device, LibraryItem, ScannedPackage, MetadataResult } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AppIcon } from '../common/AppIcon';
import { BitrateControls } from './BitrateControls';
import { scanDevicePackages, getDeviceIconUrl, searchMetadata, addLibraryItem } from '../../api/client';
import { Smartphone, Globe, Search, Plus, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface AddAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDevices: Device[];
  existingLibrary: LibraryItem[];
  onAppAdded: (item: LibraryItem) => void;
}

export const AddAppModal: React.FC<AddAppModalProps> = ({
  isOpen,
  onClose,
  activeDevices,
  existingLibrary,
  onAppAdded,
}) => {
  const [tab, setTab] = useState<'scan' | 'manual'>('scan');

  // Tab 1: Scan
  const [selectedSerial, setSelectedSerial] = useState<string>('');
  const [scannedApps, setScannedApps] = useState<ScannedPackage[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanFilter, setScanFilter] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);

  // Tab 2: Manual / Online Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingMeta, setIsSearchingMeta] = useState(false);
  const [metaResults, setMetaResults] = useState<MetadataResult[]>([]);
  const [manualTitle, setManualTitle] = useState('');
  const [manualPackage, setManualPackage] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualIconUrl, setManualIconUrl] = useState('');
  const [manualBitrate, setManualBitrate] = useState('8M');
  const [manualScreenOff, setManualScreenOff] = useState(false);
  const [manualStayAwake, setManualStayAwake] = useState(true);
  const [manualFullscreen, setManualFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Default to first active device
  useEffect(() => {
    if (activeDevices.length > 0 && !selectedSerial) {
      setSelectedSerial(activeDevices[0].serial);
    }
  }, [activeDevices, selectedSerial]);

  // Trigger scan when device or tab changes
  const handleScan = async (serial: string) => {
    if (!serial) return;
    setIsScanning(true);
    setScanError(null);
    try {
      const res = await scanDevicePackages(serial);
      if (res.success) {
        setScannedApps(res.packages || []);
      } else {
        setScanError(res.error || 'Failed to scan installed packages.');
      }
    } catch (err: any) {
      setScanError(err.message || 'Error scanning device packages.');
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen && tab === 'scan' && selectedSerial) {
      handleScan(selectedSerial);
    }
  }, [isOpen, tab, selectedSerial]);

  const handleAddScannedApp = async (pkg: ScannedPackage) => {
    try {
      const item = await addLibraryItem({
        packageName: pkg.packageName,
        title: pkg.displayName,
        description: `Installed on ${selectedSerial}`,
        iconUrl: getDeviceIconUrl(selectedSerial, pkg.packageName, pkg.apkPath),
        source: 'extracted',
        bitRate: '8M',
        stayAwake: true,
      });
      if (item.success) {
        onAppAdded(item.item);
      }
    } catch (err: any) {
      setScanError(err.message || 'Failed to add app to library');
    }
  };

  const handleSearchOnline = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingMeta(true);
    try {
      const res = await searchMetadata(searchQuery.trim());
      setMetaResults(res.results || []);
    } catch (_) {
      setMetaResults([]);
    } finally {
      setIsSearchingMeta(false);
    }
  };

  const handleSelectMetaResult = (res: MetadataResult) => {
    setManualTitle(res.title);
    if (res.packageName) setManualPackage(res.packageName);
    if (res.description) setManualDesc(res.description);
    if (res.iconUrl) setManualIconUrl(res.iconUrl);
  };

  const handleSaveManual = async () => {
    if (!manualPackage.trim()) {
      setManualError('Android package name (e.g. com.example.app) is required.');
      return;
    }
    setIsSaving(true);
    setManualError(null);
    try {
      const res = await addLibraryItem({
        packageName: manualPackage.trim(),
        title: manualTitle.trim() || manualPackage.trim(),
        description: manualDesc.trim(),
        iconUrl: manualIconUrl.trim() || undefined,
        source: 'manual',
        bitRate: manualBitrate,
        turnScreenOff: manualScreenOff,
        stayAwake: manualStayAwake,
        fullscreen: manualFullscreen,
      });

      if (res.success) {
        onAppAdded(res.item);
        onClose();
      } else {
        setManualError(res.error || 'Failed to save app');
      }
    } catch (err: any) {
      setManualError(err.message || 'Network error while adding app');
    } finally {
      setIsSaving(false);
    }
  };

  const libraryPackageSet = new Set(existingLibrary.map((i) => i.packageName));

  const filteredScannedApps = scannedApps.filter(
    (a) =>
      a.displayName.toLowerCase().includes(scanFilter.toLowerCase()) ||
      a.packageName.toLowerCase().includes(scanFilter.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Game or App to Quick Launch"
      description="Curate your launch library by scanning a connected phone or searching online metadata."
      maxWidth="lg"
    >
      {/* Mode Switcher */}
      <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 mb-5">
        <button
          type="button"
          onClick={() => setTab('scan')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all ${
            tab === 'scan' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Scan Connected Device
        </button>
        <button
          type="button"
          onClick={() => setTab('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-all ${
            tab === 'manual' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Manual Add & Metadata Search
        </button>
      </div>

      {/* TAB 1: DEVICE SCAN */}
      {tab === 'scan' && (
        <div className="space-y-4">
          {/* Device Selector & Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {activeDevices.length > 0 ? (
              <select
                value={selectedSerial}
                onChange={(e) => setSelectedSerial(e.target.value)}
                className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-white shrink-0"
              >
                {activeDevices.map((d) => (
                  <option key={d.serial} value={d.serial}>
                    {d.nickname || d.model} ({d.serial})
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-900/60 p-2.5 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>No active devices connected. Connect a device to scan installed apps.</span>
              </div>
            )}

            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter installed apps..."
                value={scanFilter}
                onChange={(e) => setScanFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {selectedSerial && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleScan(selectedSerial)}
                loading={isScanning}
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Rescan
              </Button>
            )}
          </div>

          {scanError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* App List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/80 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            {isScanning ? (
              <div className="flex flex-col items-center justify-center p-8 text-zinc-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
                <span className="text-xs font-medium">Scanning device packages...</span>
              </div>
            ) : filteredScannedApps.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                {activeDevices.length === 0
                  ? 'Connect an Android device to scan packages.'
                  : 'No 3rd-party apps matched your filter.'}
              </div>
            ) : (
              filteredScannedApps.map((pkg) => {
                const isAlreadyInLib = libraryPackageSet.has(pkg.packageName);
                const iconSrc = getDeviceIconUrl(selectedSerial, pkg.packageName, pkg.apkPath);

                return (
                  <div
                    key={pkg.packageName}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AppIcon src={iconSrc} fallbackName={pkg.displayName} size="sm" />
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{pkg.displayName}</h4>
                        <p className="text-[11px] font-mono text-zinc-400 truncate">{pkg.packageName}</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isAlreadyInLib ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/60">
                          <Check className="w-3 h-3" /> Added
                        </span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAddScannedApp(pkg)}
                          icon={<Plus className="w-3.5 h-3.5" />}
                          className="py-1 px-2.5 text-xs"
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MANUAL ADD & ONLINE SEARCH */}
      {tab === 'manual' && (
        <div className="space-y-4">
          {/* Search Online */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Search Online Game/App Metadata (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Wild Rift, Genshin Impact, Spotify..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchOnline()}
                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSearchOnline}
                loading={isSearchingMeta}
                icon={<Search className="w-3.5 h-3.5" />}
              >
                Search
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {metaResults.length > 0 && (
            <div className="p-2 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-1.5 max-h-36 overflow-y-auto">
              <div className="text-[11px] font-semibold text-zinc-400 px-1">Search Results (Click to autofill):</div>
              {metaResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectMetaResult(r)}
                  className="w-full text-left p-2 rounded hover:bg-zinc-800 flex items-center justify-between gap-2 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {r.iconUrl && <img src={r.iconUrl} alt="" className="w-5 h-5 rounded object-cover" />}
                    <span className="font-medium text-white truncate">{r.title}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0 uppercase">{r.source}</span>
                </button>
              ))}
            </div>
          )}

          {manualError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{manualError}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                App / Game Title
              </label>
              <input
                type="text"
                placeholder="e.g. Wild Rift"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Android Package Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. com.riotgames.league.wildrift"
                value={manualPackage}
                onChange={(e) => setManualPackage(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Fast-paced 5v5 mobile MOBA"
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* App-specific Bitrate & Display options */}
          <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-xl">
            <BitrateControls
              bitRate={manualBitrate}
              onChangeBitRate={setManualBitrate}
              turnScreenOff={manualScreenOff}
              onChangeTurnScreenOff={setManualScreenOff}
              stayAwake={manualStayAwake}
              onChangeStayAwake={setManualStayAwake}
              fullscreen={manualFullscreen}
              onChangeFullscreen={setManualFullscreen}
              compact
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button variant="ghost" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveManual}
              loading={isSaving}
              disabled={!manualPackage.trim()}
              icon={<Plus className="w-4 h-4" />}
            >
              Add to Library
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
