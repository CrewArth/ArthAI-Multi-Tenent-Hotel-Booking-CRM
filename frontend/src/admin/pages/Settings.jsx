import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSiteSettings, resetSiteSettings } from '../../redux/siteSettingsSlice';
import '../styles/settings.css';
import fallbackLogo from '../../assets/logo.png';

export default function Settings() {
  const dispatch = useDispatch();
  const { siteName, logoUrl } = useSelector((state) => state.siteSettings);

  const [nameInput, setNameInput] = useState(siteName);
  const [previewUrl, setPreviewUrl] = useState(logoUrl);
  const [logoFile, setLogoFile] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  /* ── Logo file selection ── */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, SVG, WebP, etc.).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2 MB.');
      return;
    }

    setError('');
    setLogoFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── Remove selected / current logo ── */
  const handleRemoveLogo = () => {
    setLogoFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Save ── */
  const handleSave = () => {
    if (!nameInput.trim()) {
      setError('Site name cannot be empty.');
      return;
    }

    setError('');
    dispatch(updateSiteSettings({ siteName: nameInput.trim(), logoUrl: previewUrl }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  /* ── Reset to defaults ── */
  const handleReset = () => {
    dispatch(resetSiteSettings());
    setNameInput('Arth Hotel');
    setPreviewUrl(null);
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError('');
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">Site Settings</h1>
        <p className="settings-subtitle">
          Customise the navbar logo and site name.
        </p>
      </header>

      {/* ── Live preview ── */}
      <section className="settings-card">
        <h2 className="settings-card-title">Live Preview</h2>
        <div className="settings-preview-bar">
          <img src={previewUrl || fallbackLogo} alt="Logo preview" className="settings-preview-logo" />
          <span className="settings-preview-name">{nameInput.trim() || 'Site Name'}</span>
        </div>
      </section>

      {/* ── Logo upload ── */}
      <section className="settings-card">
        <h2 className="settings-card-title">Navbar Logo</h2>
        <p className="settings-card-desc">
          Recommended: square image, at least 100 × 100 px. Max 2 MB. PNG / SVG / WebP preferred.
        </p>

        <div className="settings-logo-row">
          <img src={previewUrl || fallbackLogo} alt="Current logo" className="settings-current-logo" />
          <div className="settings-logo-actions">
            <label className="settings-upload-btn" htmlFor="logo-upload">
              {logoFile ? 'Change Image' : 'Upload Image'}
            </label>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="settings-file-input"
            />
            {previewUrl && (
              <button type="button" className="settings-remove-btn" onClick={handleRemoveLogo}>
                Remove Logo
              </button>
            )}
          </div>
        </div>

        {logoFile && <p className="settings-file-name">Selected: {logoFile.name}</p>}
      </section>

      {/* ── Site name ── */}
      <section className="settings-card">
        <h2 className="settings-card-title">Site Name</h2>
        <p className="settings-card-desc">Displayed in the navbar next to the logo.</p>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => { setNameInput(e.target.value); setSaved(false); }}
          placeholder="Enter site name…"
          className="settings-text-input"
          maxLength={60}
        />
        <span className="settings-char-count">{nameInput.length} / 60</span>
      </section>

      {/* ── Error / success ── */}
      {error && <p className="settings-error">{error}</p>}
      {saved && <p className="settings-success">✓ Settings saved successfully!</p>}

      {/* ── Actions ── */}
      <div className="settings-actions">
        <button className="settings-save-btn" onClick={handleSave}>Save Changes</button>
        <button className="settings-reset-btn" onClick={handleReset}>Reset to Default</button>
      </div>
    </div>
  );
}
