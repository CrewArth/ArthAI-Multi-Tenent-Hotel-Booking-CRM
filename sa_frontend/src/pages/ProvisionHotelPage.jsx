import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  User, Building2, ShieldCheck, CheckCircle2, ArrowLeft, ArrowRight, 
  Check, FileText, UploadCloud, Edit2, AlertCircle, Sparkles, Building, Mail, Phone, Server, Layers, Calendar
} from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { saTenantApi } from '../api/saApi';
import { CredentialsModal } from '../components/CredentialsModal';
import { FileUploadZone } from '../components/FileUploadZone';

export const ProvisionHotelPage = () => {
  const navigate = useNavigate();
  const { tenantId: routeTenantId } = useParams();
  const isEditMode = Boolean(routeTenantId);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [newCredentials, setNewCredentials] = useState(null);
  const [newTenantName, setNewTenantName] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    personalDetails: {
      fullName: '',
      signature: null,
      phone1: '',
      phone2: '',
      email1: '',
      email2: '',
      legalDocNumber: '',
      residentialAddress: '',
      businessAddress: '',
      sameAsResidential: false,
      govtIdProof: null,
    },
    hotelDetails: {
      legalPropertyName: '',
      hotelName: '',
      tenantId: '',
      propertyType: 'Hotel',
      hotelLogo: null,
      plan: 'pro',
      expiryDate: '', // Format: YYYY-MM-DD
    },
    legalCompliance: {
      gstCertificate: null,
      panCardPhoto: null,
      shopLicencePhoto: null,
      fireSafetyNoc: null,
    },
  });

  // Fetch Existing Tenant details for Edit Mode
  useEffect(() => {
    if (!isEditMode) return;

    const fetchTenantDetails = async () => {
      setFetching(true);
      setError(null);
      try {
        const res = await saTenantApi.getTenant(routeTenantId);
        const t = res.data.tenant;
        if (t) {
          const formatFileVal = (val) => {
            if (!val) return null;
            if (typeof val === 'string' && val.trim()) {
              const filename = val.split('/').pop() || 'Uploaded Document';
              return { name: filename, dataUrl: val, size: 'Existing File' };
            }
            return val;
          };

          const formattedExpiry = t.expiryDate 
            ? new Date(t.expiryDate).toISOString().split('T')[0] 
            : '';

          setFormData({
            personalDetails: {
              fullName: t.personalDetails?.fullName || t.owner?.name || '',
              signature: formatFileVal(t.personalDetails?.signature),
              phone1: t.personalDetails?.phone1 || t.owner?.phone || '',
              phone2: t.personalDetails?.phone2 || '',
              email1: t.personalDetails?.email1 || t.owner?.email || '',
              email2: t.personalDetails?.email2 || '',
              legalDocNumber: t.personalDetails?.legalDocNumber || '',
              residentialAddress: t.personalDetails?.residentialAddress || '',
              businessAddress: t.personalDetails?.businessAddress || '',
              sameAsResidential: t.personalDetails?.residentialAddress && t.personalDetails?.residentialAddress === t.personalDetails?.businessAddress,
              govtIdProof: formatFileVal(t.personalDetails?.govtIdProof),
            },
            hotelDetails: {
              legalPropertyName: t.hotelDetails?.legalPropertyName || t.name || '',
              hotelName: t.hotelDetails?.hotelName || t.name || '',
              tenantId: t.tenantId,
              propertyType: t.hotelDetails?.propertyType || 'Hotel',
              hotelLogo: formatFileVal(t.hotelDetails?.hotelLogo || t.config?.logoUrl),
              plan: t.plan || 'pro',
              expiryDate: formattedExpiry,
            },
            legalCompliance: {
              gstCertificate: formatFileVal(t.legalCompliance?.gstCertificate),
              panCardPhoto: formatFileVal(t.legalCompliance?.panCardPhoto),
              shopLicencePhoto: formatFileVal(t.legalCompliance?.shopLicencePhoto),
              fireSafetyNoc: formatFileVal(t.legalCompliance?.fireSafetyNoc),
            },
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load tenant details for editing');
      } finally {
        setFetching(false);
      }
    };

    fetchTenantDetails();
  }, [routeTenantId, isEditMode]);

  // Handle Nested State Updates
  const updatePersonalDetails = (field, value) => {
    setFormData((prev) => {
      const updatedPersonal = { ...prev.personalDetails, [field]: value };
      if (field === 'sameAsResidential' && value) {
        updatedPersonal.businessAddress = updatedPersonal.residentialAddress;
      }
      return { ...prev, personalDetails: updatedPersonal };
    });
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const updateHotelDetails = (field, value) => {
    setFormData((prev) => {
      const updatedHotel = { ...prev.hotelDetails, [field]: value };
      if (!isEditMode && field === 'hotelName' && (!prev.hotelDetails.tenantId || prev.hotelDetails.tenantId === prev.hotelDetails.hotelName.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        updatedHotel.tenantId = value.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
      return { ...prev, hotelDetails: updatedHotel };
    });
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const updateLegalCompliance = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      legalCompliance: { ...prev.legalCompliance, [field]: value }
    }));
  };

  // Step Validation logic
  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      const { fullName, phone1, email1, legalDocNumber, residentialAddress, businessAddress, govtIdProof } = formData.personalDetails;
      if (!fullName.trim()) errors.fullName = 'Full Name is required';
      if (!phone1) errors.phone1 = 'Phone Number 1 is required';
      if (!email1.trim()) errors.email1 = 'Email 1 is required';
      else if (!/\S+@\S+\.\S+/.test(email1)) errors.email1 = 'Invalid email address format';
      if (!legalDocNumber.trim()) errors.legalDocNumber = 'Legal Document Number is required';
      if (!residentialAddress.trim()) errors.residentialAddress = 'Residential Address is required';
      if (!businessAddress.trim()) errors.businessAddress = 'Business Address is required';
      if (!govtIdProof) errors.govtIdProof = 'Government ID Proof document is required';
    } else if (step === 2) {
      const { legalPropertyName, hotelName, tenantId, propertyType } = formData.hotelDetails;
      if (!legalPropertyName.trim()) errors.legalPropertyName = 'Legal Property Name is required';
      if (!hotelName.trim()) errors.hotelName = 'Hotel Name is required';
      if (!tenantId.trim()) errors.tenantId = 'Tenant Slug / ID is required';
      if (!propertyType) errors.propertyType = 'Property Type is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setError(null);
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const payload = {
      name: formData.hotelDetails.hotelName,
      tenantId: formData.hotelDetails.tenantId,
      ownerName: formData.personalDetails.fullName,
      ownerEmail: formData.personalDetails.email1,
      ownerPhone: formData.personalDetails.phone1,
      plan: formData.hotelDetails.plan,
      expiryDate: formData.hotelDetails.expiryDate ? new Date(formData.hotelDetails.expiryDate).toISOString() : null,
      personalDetails: {
        fullName: formData.personalDetails.fullName,
        signature: formData.personalDetails.signature?.dataUrl || '',
        phone1: formData.personalDetails.phone1,
        phone2: formData.personalDetails.phone2,
        email1: formData.personalDetails.email1,
        email2: formData.personalDetails.email2,
        legalDocNumber: formData.personalDetails.legalDocNumber,
        residentialAddress: formData.personalDetails.residentialAddress,
        businessAddress: formData.personalDetails.businessAddress,
        govtIdProof: formData.personalDetails.govtIdProof?.dataUrl || formData.personalDetails.govtIdProof?.name || '',
      },
      hotelDetails: {
        legalPropertyName: formData.hotelDetails.legalPropertyName,
        hotelName: formData.hotelDetails.hotelName,
        propertyType: formData.hotelDetails.propertyType,
        hotelLogo: formData.hotelDetails.hotelLogo?.dataUrl || '',
        expiryDate: formData.hotelDetails.expiryDate ? new Date(formData.hotelDetails.expiryDate).toISOString() : null,
      },
      legalCompliance: {
        gstCertificate: formData.legalCompliance.gstCertificate?.dataUrl || formData.legalCompliance.gstCertificate?.name || '',
        panCardPhoto: formData.legalCompliance.panCardPhoto?.dataUrl || formData.legalCompliance.panCardPhoto?.name || '',
        shopLicencePhoto: formData.legalCompliance.shopLicencePhoto?.dataUrl || formData.legalCompliance.shopLicencePhoto?.name || '',
        fireSafetyNoc: formData.legalCompliance.fireSafetyNoc?.dataUrl || formData.legalCompliance.fireSafetyNoc?.name || '',
      },
    };

    try {
      if (isEditMode) {
        await saTenantApi.updateTenant(routeTenantId, payload);
        setSuccessMessage('Hotel details updated successfully!');
        setTimeout(() => navigate('/'), 1500);
      } else {
        const res = await saTenantApi.provisionTenant(payload);
        setNewCredentials(res.data.generatedCredentials);
        setNewTenantName(formData.hotelDetails.hotelName);
      }
    } catch (err) {
      setError(err.response?.data?.message || (isEditMode ? 'Failed to update hotel details' : 'Failed to provision hotel workspace'));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, label: 'Personal Details', icon: User },
    { id: 2, label: 'Hotel Details', icon: Building2 },
    { id: 3, label: 'Legal & Compliance', icon: ShieldCheck },
    { id: 4, label: isEditMode ? 'Review & Update' : 'Review & Provision', icon: CheckCircle2 },
  ];

  if (fetching) {
    return (
      <div style={{ maxWidth: '840px', margin: '60px auto', textAlign: 'center', color: '#64748b' }}>
        <p style={{ fontSize: '16px', fontWeight: '600' }}>Loading hotel details for editing...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
            {isEditMode ? `Edit Hotel: ${formData.hotelDetails.hotelName || routeTenantId}` : 'New Hotel Onboarding'}
          </h1>
        </div>

        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
            color: '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* Stepper Navigation Bar */}
      <div className="panel-card" style={{ padding: '20px 24px', marginBottom: '24px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          
          {/* Connector Line */}
          <div style={{
            position: 'absolute', top: '18px', left: '40px', right: '40px', height: '2px',
            background: '#e2e8f0', zIndex: 0
          }} />

          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;

            return (
              <div
                key={step.id}
                onClick={() => isCompleted && setCurrentStep(step.id)}
                style={{
                  position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', cursor: isCompleted ? 'pointer' : 'default'
                }}
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px',
                  background: isCompleted ? '#16a34a' : isActive ? '#2563eb' : '#ffffff',
                  color: isCompleted || isActive ? '#ffffff' : '#64748b',
                  border: isCompleted ? '2px solid #16a34a' : isActive ? '2px solid #2563eb' : '2px solid #cbd5e1',
                  boxShadow: isActive ? '0 0 0 4px rgba(37, 99, 235, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}>
                  {isCompleted ? <Check size={18} /> : <Icon size={18} />}
                </div>

                <span style={{
                  marginTop: '8px', fontSize: '12px', fontWeight: isActive || isCompleted ? '700' : '600',
                  color: isActive ? '#2563eb' : isCompleted ? '#16a34a' : '#64748b'
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="panel-card" style={{ padding: '32px', background: '#ffffff' }}>
        
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {successMessage && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} /> {successMessage}
          </div>
        )}

        {/* STEP 1: Personal Details */}
        {currentStep === 1 && (
          <div>
            <div style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Step 1: Personal Details
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Full Name & Legal Doc Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Full Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter primary owner full name"
                    value={formData.personalDetails.fullName}
                    onChange={(e) => updatePersonalDetails('fullName', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: validationErrors.fullName ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      fontSize: '14px', outline: 'none'
                    }}
                  />
                  {validationErrors.fullName && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.fullName}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Legal Document Number (Aadhaar / Govt ID) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1234 5678 9012"
                    value={formData.personalDetails.legalDocNumber}
                    onChange={(e) => updatePersonalDetails('legalDocNumber', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: validationErrors.legalDocNumber ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      fontSize: '14px', outline: 'none'
                    }}
                  />
                  {validationErrors.legalDocNumber && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.legalDocNumber}</span>}
                </div>
              </div>

              {/* Phone Numbers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Phone Number 1 (Primary) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <PhoneInput
                    international
                    defaultCountry="IN"
                    countryCallingCodeEditable={false}
                    placeholder="Primary phone number"
                    value={formData.personalDetails.phone1}
                    onChange={(val) => updatePersonalDetails('phone1', val || '')}
                  />
                  {validationErrors.phone1 && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.phone1}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Phone Number 2 (Secondary / Alternate)
                  </label>
                  <PhoneInput
                    international
                    defaultCountry="IN"
                    countryCallingCodeEditable={false}
                    placeholder="Alternate phone number (optional)"
                    value={formData.personalDetails.phone2}
                    onChange={(val) => updatePersonalDetails('phone2', val || '')}
                  />
                </div>
              </div>

              {/* Emails */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Email 1 (Primary Contact) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="owner@hotel.com"
                    value={formData.personalDetails.email1}
                    onChange={(e) => updatePersonalDetails('email1', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: validationErrors.email1 ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      fontSize: '14px', outline: 'none'
                    }}
                  />
                  {validationErrors.email1 && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.email1}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Email 2 (Billing / Secondary)
                  </label>
                  <input
                    type="email"
                    placeholder="billing@hotel.com (optional)"
                    value={formData.personalDetails.email2}
                    onChange={(e) => updatePersonalDetails('email2', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Addresses */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Residential Address <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Owner residential street address, city, state, pincode"
                    value={formData.personalDetails.residentialAddress}
                    onChange={(e) => updatePersonalDetails('residentialAddress', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: validationErrors.residentialAddress ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      fontSize: '14px', outline: 'none', resize: 'vertical'
                    }}
                  />
                  {validationErrors.residentialAddress && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.residentialAddress}</span>}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      Business Address <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <label style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="checkbox"
                        checked={formData.personalDetails.sameAsResidential}
                        onChange={(e) => updatePersonalDetails('sameAsResidential', e.target.checked)}
                      />
                      Same as Residential
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Business office address"
                    value={formData.personalDetails.businessAddress}
                    onChange={(e) => updatePersonalDetails('businessAddress', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: validationErrors.businessAddress ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      fontSize: '14px', outline: 'none', resize: 'vertical'
                    }}
                  />
                  {validationErrors.businessAddress && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.businessAddress}</span>}
                </div>
              </div>

              {/* Signature & Govt ID Proof Uploads */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <FileUploadZone
                    label="Owner Signature Photo / Scan"
                    required={false}
                    accept="image/*"
                    value={formData.personalDetails.signature}
                    onChange={(val) => updatePersonalDetails('signature', val)}
                    helperText="PNG, JPG or SVG signature file (Max 5MB)"
                  />
                </div>

                <div>
                  <FileUploadZone
                    label="Government ID Proof (Aadhaar / Passport / Voter ID)"
                    required={true}
                    accept="image/*,application/pdf"
                    value={formData.personalDetails.govtIdProof}
                    onChange={(val) => updatePersonalDetails('govtIdProof', val)}
                    helperText="Upload official ID scan (PDF or Image)"
                  />
                  {validationErrors.govtIdProof && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.govtIdProof}</span>}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* STEP 2: Hotel Details */}
        {currentStep === 2 && (
          <div>
            <div style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Step 2: Property Configuration
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Legal Property Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Registered legal entity (e.g. Grand Palace Pvt Ltd)"
                    value={formData.hotelDetails.legalPropertyName}
                    onChange={(e) => updateHotelDetails('legalPropertyName', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: validationErrors.legalPropertyName ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      fontSize: '14px', outline: 'none'
                    }}
                  />
                  {validationErrors.legalPropertyName && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.legalPropertyName}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Hotel / Property Display Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grand Palace Hotel"
                    value={formData.hotelDetails.hotelName}
                    onChange={(e) => updateHotelDetails('hotelName', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: validationErrors.hotelName ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      fontSize: '14px', outline: 'none'
                    }}
                  />
                  {validationErrors.hotelName && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.hotelName}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Tenant Slug / Unique Database ID <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. grandpalace"
                    disabled={isEditMode}
                    value={formData.hotelDetails.tenantId}
                    onChange={(e) => updateHotelDetails('tenantId', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: validationErrors.tenantId ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      fontSize: '14px', outline: 'none', fontFamily: 'monospace',
                      background: isEditMode ? '#f1f5f9' : '#ffffff',
                      color: isEditMode ? '#64748b' : '#0f172a',
                      cursor: isEditMode ? 'not-allowed' : 'text'
                    }}
                  />
                  {validationErrors.tenantId && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{validationErrors.tenantId}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Property Type <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={formData.hotelDetails.propertyType}
                    onChange={(e) => updateHotelDetails('propertyType', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#ffffff'
                    }}
                  >
                    <option value="Guest House">Guest House</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Palace">Palace</option>
                    <option value="Stay House">Stay House</option>
                  </select>
                </div>
              </div>

              {/* Plan & Expiry Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Subscription Plan
                  </label>
                  <select
                    value={formData.hotelDetails.plan}
                    onChange={(e) => updateHotelDetails('plan', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#ffffff'
                    }}
                  >
                    <option value="basic">Basic Plan (Standard management)</option>
                    <option value="pro">Pro Plan (Advanced telemetry & S3)</option>
                    <option value="enterprise">Enterprise Plan (Dedicated features & support)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Subscription Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.hotelDetails.expiryDate}
                    onChange={(e) => updateHotelDetails('expiryDate', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#ffffff', color: '#0f172a'
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Leave blank for lifetime access. Once expired, login will be restricted.
                  </span>
                </div>
              </div>

              <div>
                <FileUploadZone
                  label="Hotel Logo"
                  required={false}
                  accept="image/*"
                  value={formData.hotelDetails.hotelLogo}
                  onChange={(val) => updateHotelDetails('hotelLogo', val)}
                  helperText="Upload official hotel logo for invoices & UI"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Legal & Compliance */}
        {currentStep === 3 && (
          <div>
            <div style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Step 3: Legal & Compliance Documentation
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <FileUploadZone
                label="GST Registration Certificate"
                required={false}
                accept="image/*,application/pdf"
                value={formData.legalCompliance.gstCertificate}
                onChange={(val) => updateLegalCompliance('gstCertificate', val)}
                helperText="Upload GST certificate scan or PDF"
              />

              <FileUploadZone
                label="PAN Card Photo / Scan"
                required={false}
                accept="image/*,application/pdf"
                value={formData.legalCompliance.panCardPhoto}
                onChange={(val) => updateLegalCompliance('panCardPhoto', val)}
                helperText="Company or Owner PAN document"
              />

              <FileUploadZone
                label="Shop & Establishment Licence"
                required={false}
                accept="image/*,application/pdf"
                value={formData.legalCompliance.shopLicencePhoto}
                onChange={(val) => updateLegalCompliance('shopLicencePhoto', val)}
                helperText="Local municipal trade / shop licence"
              />

              <FileUploadZone
                label="Fire Safety NOC Certificate"
                required={false}
                accept="image/*,application/pdf"
                value={formData.legalCompliance.fireSafetyNoc}
                onChange={(val) => updateLegalCompliance('fireSafetyNoc', val)}
                helperText="Fire department clearance certificate"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Review */}
        {currentStep === 4 && (
          <div>
            <div style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Step 4: Final Review
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Personal Details Summary */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} color="#2563eb" /> Personal Details
                  </h3>
                  <button
                    onClick={() => setCurrentStep(1)}
                    style={{ background: 'transparent', color: '#2563eb', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Full Name</span>
                    <strong style={{ color: '#0f172a' }}>{formData.personalDetails.fullName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Legal Doc Number</span>
                    <strong style={{ color: '#0f172a' }}>{formData.personalDetails.legalDocNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Govt ID Uploaded</span>
                    <strong style={{ color: formData.personalDetails.govtIdProof ? '#16a34a' : '#dc2626' }}>
                      {formData.personalDetails.govtIdProof ? (formData.personalDetails.govtIdProof.name || 'Uploaded') : 'Missing'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Phone 1</span>
                    <span style={{ color: '#0f172a', fontWeight: '600' }}>{formData.personalDetails.phone1}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Email 1</span>
                    <span style={{ color: '#0f172a', fontWeight: '600' }}>{formData.personalDetails.email1}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Signature</span>
                    <span style={{ color: formData.personalDetails.signature ? '#16a34a' : '#64748b', fontWeight: '600' }}>
                      {formData.personalDetails.signature ? 'Uploaded' : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hotel Details Summary */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={16} color="#2563eb" /> Hotel Details
                  </h3>
                  <button
                    onClick={() => setCurrentStep(2)}
                    style={{ background: 'transparent', color: '#2563eb', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Legal Property Name</span>
                    <strong style={{ color: '#0f172a' }}>{formData.hotelDetails.legalPropertyName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Hotel Display Name</span>
                    <strong style={{ color: '#0f172a' }}>{formData.hotelDetails.hotelName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Tenant Slug</span>
                    <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                      {formData.hotelDetails.tenantId}
                    </code>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Property Type</span>
                    <strong style={{ color: '#0f172a' }}>{formData.hotelDetails.propertyType}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Subscription Plan</span>
                    <span style={{ color: '#7c3aed', fontWeight: '700', textTransform: 'uppercase' }}>
                      {formData.hotelDetails.plan}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Expiry Date</span>
                    <span style={{ color: formData.hotelDetails.expiryDate ? '#2563eb' : '#64748b', fontWeight: '700' }}>
                      {formData.hotelDetails.expiryDate || 'No Expiry (Lifetime)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legal & Compliance Summary */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} color="#2563eb" /> Statutory Compliance Attachments
                  </h3>
                  <button
                    onClick={() => setCurrentStep(3)}
                    style={{ background: 'transparent', color: '#2563eb', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>GST Certificate: </span>
                    <strong style={{ color: formData.legalCompliance.gstCertificate ? '#16a34a' : '#64748b' }}>
                      {formData.legalCompliance.gstCertificate ? (formData.legalCompliance.gstCertificate.name || 'Uploaded') : 'Not provided'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>PAN Card Photo: </span>
                    <strong style={{ color: formData.legalCompliance.panCardPhoto ? '#16a34a' : '#64748b' }}>
                      {formData.legalCompliance.panCardPhoto ? (formData.legalCompliance.panCardPhoto.name || 'Uploaded') : 'Not provided'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Shop Licence: </span>
                    <strong style={{ color: formData.legalCompliance.shopLicencePhoto ? '#16a34a' : '#64748b' }}>
                      {formData.legalCompliance.shopLicencePhoto ? (formData.legalCompliance.shopLicencePhoto.name || 'Uploaded') : 'Not provided'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Fire Safety NOC: </span>
                    <strong style={{ color: formData.legalCompliance.fireSafetyNoc ? '#16a34a' : '#64748b' }}>
                      {formData.legalCompliance.fireSafetyNoc ? (formData.legalCompliance.fireSafetyNoc.name || 'Uploaded') : 'Not provided'}
                    </strong>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Stepper Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1 || loading}
            style={{
              padding: '10px 20px', borderRadius: '8px', background: currentStep === 1 ? '#f1f5f9' : '#ffffff',
              color: currentStep === 1 ? '#cbd5e1' : '#475569', border: '1px solid #cbd5e1', fontWeight: '600',
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <ArrowLeft size={16} /> Previous
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              style={{
                padding: '10px 24px', borderRadius: '8px', background: '#2563eb', color: '#ffffff',
                fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              Next Step <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: '12px 28px', borderRadius: '8px', background: isEditMode ? '#2563eb' : '#16a34a', color: '#ffffff',
                fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: isEditMode ? '0 2px 10px rgba(37, 99, 235, 0.3)' : '0 2px 10px rgba(22, 163, 74, 0.3)'
              }}
            >
              {loading ? (
                isEditMode ? 'Saving Updates...' : 'Provisioning Database...'
              ) : (
                <>
                  {isEditMode ? 'Save & Update Hotel' : 'Create Hotel'}
                </>
              )}
            </button>
          )}
        </div>

      </div>

      {/* Credentials Modal Popup (For New Hotel Creation) */}
      {newCredentials && (
        <CredentialsModal
          credentials={newCredentials}
          tenantName={newTenantName}
          onClose={() => {
            setNewCredentials(null);
            navigate('/');
          }}
        />
      )}
    </div>
  );
};
