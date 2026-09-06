import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Store,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Edit2,
  Sparkles,
  QrCode,
  Building2,
  Lock,
  LayoutGrid,
  BarChart3,
  HardDriveDownload,
  Settings as SettingsIcon,
  Info,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { Product, SaleTransaction, UserProfile } from '../types';
import { MoreModals } from './MoreModals';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfileScreenProps {
  products: Product[];
  sales: SaleTransaction[];
  profile?: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
  onResetOnboarding?: () => void;
  onResetAllData?: () => void;
}

type ModalType = 'categories' | 'reports' | 'backup' | 'settings' | 'about' | null;

interface ToolMenuItem {
  id: ModalType;
  label: string;
  description?: string;
  icon: React.ElementType;
}

interface ToolSection {
  title: string;
  items: ToolMenuItem[];
}

const DEFAULT_PROFILE: UserProfile = {
  ownerName: 'Store Owner',
  storeName: 'My Store',
  email: '',
  phone: '',
  address: '',
  businessType: 'Retail & Grocery',
  currency: 'PHP (₱)',
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  products,
  sales,
  profile = DEFAULT_PROFILE,
  onUpdateProfile,
  onResetOnboarding,
  onResetAllData,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmResetData, setConfirmResetData] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState(false);

  const [formData, setFormData] = useState<UserProfile>(profile);

  // Sync formData if profile prop updates externally
  React.useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateProfile) {
      onUpdateProfile(formData);
    }
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
  };

  const toolSections: ToolSection[] = [
    {
      title: 'Business Tools',
      items: [
        {
          id: 'categories',
          label: 'Categories',
          description: 'Manage product categories',
          icon: LayoutGrid,
        },
        {
          id: 'reports',
          label: 'Reports',
          description: 'View sales and inventory summaries',
          icon: BarChart3,
        },
      ],
    },
    {
      title: 'Data & Backup',
      items: [
        {
          id: 'backup',
          label: 'Backup & export',
          description: 'Save or export your business data',
          icon: HardDriveDownload,
        },
      ],
    },
    {
      title: 'Application',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          description: 'Manage app preferences',
          icon: SettingsIcon,
        },
        {
          id: 'about',
          label: 'About',
          description: 'App information & version',
          icon: Info,
        },
      ],
    },
  ];

  return (
    <motion.div
      id="profile-screen-view"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-full max-w-[430px] mx-auto px-5 pt-3 sm:pt-4 pb-28 sm:pb-32"
    >
      {/* Profile Subtitle & Action Bar */}
      <div className="mb-5 flex items-center justify-between">
        <p
          id="profile-subtitle"
          className="text-[13.5px] font-medium text-[#6E746F]"
        >
          Store account, tools & settings
        </p>

        <button
          id="edit-profile-button"
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="px-3.5 py-1.5 rounded-full border border-[#DEE3DE] bg-white hover:bg-gray-50 text-[13px] font-medium text-[#252825] flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
        >
          <Edit2 size={14} className="text-[#6E746F]" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-4 p-3.5 bg-[#4F8065]/10 border border-[#4F8065]/20 rounded-xl flex items-center gap-2 text-[#4F8065] text-[13px] font-medium"
        >
          <CheckCircle2 size={16} />
          Profile updated successfully!
        </motion.div>
      )}

      {/* Profile Card */}
      <div className="bg-white border border-[#DEE3DE] rounded-2xl p-5 mb-5 shadow-[0_2px_8px_rgba(37,40,37,0.02)] relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#4F8065]/12 border border-[#4F8065]/20 flex items-center justify-center text-[#4F8065] flex-shrink-0 shadow-xs relative">
            <User size={30} strokeWidth={1.8} />
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#4F8065] border-2 border-white rounded-full flex items-center justify-center z-10">
              <CheckCircle2 size={12} className="text-white" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-bold text-[#252825] truncate">
                {formData.ownerName}
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#4F8065]/12 text-[#4F8065] flex-shrink-0">
                Verified Owner
              </span>
            </div>
            <p className="text-[14px] font-medium text-[#6E746F] mt-0.5 flex items-center gap-1 truncate">
              <Store size={14} className="text-[#6E746F]/70 flex-shrink-0" />
              {formData.storeName}
            </p>
            <p className="text-[12px] text-[#6E746F]/80 mt-1 flex items-center gap-1">
              <ShieldCheck size={13} className="text-[#4F8065]" />
              Store ID: <span className="font-mono text-[11px] font-semibold text-[#252825]">SAGE-8921-PH</span>
            </p>
          </div>
        </div>
      </div>

      {/* Editable Form / Display View */}
      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white border border-[#DEE3DE] rounded-2xl p-5 mb-5 space-y-4 shadow-[0_2px_8px_rgba(37,40,37,0.02)]">
          <div className="flex items-center justify-between border-b border-[#DEE3DE] pb-3 mb-1">
            <h3 className="text-[17px] font-bold text-[#252825]">Edit Profile Details</h3>
            <span className="text-[12px] text-[#6E746F]">Update store & account</span>
          </div>
          
          <div>
            <label className="block text-[12px] font-medium text-[#6E746F] mb-1">Owner Name</label>
            <input
              type="text"
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEE3DE] text-[14px] text-[#252825] focus:outline-none focus:border-[#4F8065] bg-gray-50/50 focus:bg-white transition-colors"
              placeholder="Full name"
              required
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#6E746F] mb-1">Store Name</label>
            <input
              type="text"
              value={formData.storeName}
              onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEE3DE] text-[14px] text-[#252825] focus:outline-none focus:border-[#4F8065] bg-gray-50/50 focus:bg-white transition-colors"
              placeholder="Business or store name"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#6E746F] mb-1">Business Type</label>
              <select
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEE3DE] text-[14px] text-[#252825] focus:outline-none focus:border-[#4F8065] bg-gray-50/50 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="Retail & Grocery">Retail & Grocery</option>
                <option value="Sari-Sari Store">Sari-Sari Store</option>
                <option value="Supermarket & Convenience">Supermarket & Convenience</option>
                <option value="Bakery & Food Stand">Bakery & Food Stand</option>
                <option value="Wholesale & Distribution">Wholesale & Distribution</option>
                <option value="General Merchandising">General Merchandising</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#6E746F] mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEE3DE] text-[14px] text-[#252825] focus:outline-none focus:border-[#4F8065] bg-gray-50/50 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="PHP (₱)">PHP (₱) - Philippine Peso</option>
                <option value="USD ($)">USD ($) - US Dollar</option>
                <option value="EUR (€)">EUR (€) - Euro</option>
                <option value="GBP (£)">GBP (£) - British Pound</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#6E746F] mb-1">Email Address <span className="text-[#6E746F]/70 font-normal">(Optional)</span></label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEE3DE] text-[14px] text-[#252825] focus:outline-none focus:border-[#4F8065] bg-gray-50/50 focus:bg-white transition-colors"
              placeholder="e.g. contact@email.com"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#6E746F] mb-1">Phone Number <span className="text-[#6E746F]/70 font-normal">(Optional)</span></label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEE3DE] text-[14px] text-[#252825] focus:outline-none focus:border-[#4F8065] bg-gray-50/50 focus:bg-white transition-colors"
              placeholder="e.g. +63 917 000 0000"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#6E746F] mb-1">Business Address <span className="text-[#6E746F]/70 font-normal">(Optional)</span></label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#DEE3DE] text-[14px] text-[#252825] focus:outline-none focus:border-[#4F8065] bg-gray-50/50 focus:bg-white transition-colors resize-none"
              placeholder="Store location / address"
            />
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2.5 border border-[#DEE3DE] bg-white text-[#252825] rounded-xl text-[14px] font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#4F8065] text-white rounded-xl text-[14px] font-semibold hover:bg-[#436e57] transition-colors cursor-pointer shadow-2xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        /* Detailed Information & Merged More Tools */
        <div className="space-y-6">
          {/* Business Info Section */}
          <section aria-label="Business Details">
            <h2 className="text-[15px] font-semibold text-[#252825] px-1 mb-2.5">
              Business Contact
            </h2>

            <div className="bg-white border border-[#DEE3DE] rounded-2xl divide-y divide-[#DEE3DE] overflow-hidden shadow-[0_2px_8px_rgba(37,40,37,0.02)]">
              <div className="p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-[#DEE3DE] flex items-center justify-center text-[#6E746F] flex-shrink-0">
                  <Building2 size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-[#6E746F]">Business Type</p>
                  <p className="text-[14px] font-semibold text-[#252825] truncate">{formData.businessType}</p>
                </div>
              </div>

              <div className="p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-[#DEE3DE] flex items-center justify-center text-[#6E746F] flex-shrink-0">
                  <Mail size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-[#6E746F]">Email</p>
                  <p className="text-[14px] font-medium text-[#252825] truncate">
                    {formData.email || <span className="text-[#6E746F]/70 italic font-normal">Not set (Optional)</span>}
                  </p>
                </div>
              </div>

              <div className="p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-[#DEE3DE] flex items-center justify-center text-[#6E746F] flex-shrink-0">
                  <Phone size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-[#6E746F]">Phone</p>
                  <p className="text-[14px] font-medium text-[#252825] truncate">
                    {formData.phone || <span className="text-[#6E746F]/70 italic font-normal">Not set (Optional)</span>}
                  </p>
                </div>
              </div>

              <div className="p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-[#DEE3DE] flex items-center justify-center text-[#6E746F] flex-shrink-0">
                  <MapPin size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-[#6E746F]">Address</p>
                  <p className="text-[14px] font-medium text-[#252825] truncate">
                    {formData.address || <span className="text-[#6E746F]/70 italic font-normal">Not set (Optional)</span>}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Merged "More" Tools Sections */}
          {toolSections.map((section) => (
            <section key={section.title} aria-label={section.title}>
              <h2 className="text-[15px] font-semibold text-[#252825] px-1 mb-2.5">
                {section.title}
              </h2>

              <div className="bg-white border border-[#DEE3DE] rounded-2xl divide-y divide-[#DEE3DE] overflow-hidden shadow-[0_2px_8px_rgba(37,40,37,0.02)]">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      id={`profile-tool-${item.id}`}
                      type="button"
                      onClick={() => setActiveModal(item.id)}
                      className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:bg-gray-50"
                      aria-label={`${item.label}: ${item.description || ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-[#DEE3DE] flex items-center justify-center text-[#252825] flex-shrink-0">
                          <Icon size={16} strokeWidth={1.8} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-[#252825] leading-tight">
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="text-[12px] text-[#6E746F] mt-0.5 leading-normal truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        size={16}
                        className="text-[#6E746F]/60 flex-shrink-0"
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Quick Actions & Preferences */}
          <section aria-label="Account Settings">
            <h2 className="text-[15px] font-semibold text-[#252825] px-1 mb-2.5">
              Preferences & Security
            </h2>

            <div className="bg-white border border-[#DEE3DE] rounded-2xl divide-y divide-[#DEE3DE] overflow-hidden shadow-[0_2px_8px_rgba(37,40,37,0.02)]">
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-[#DEE3DE] flex items-center justify-center text-[#6E746F]">
                    <QrCode size={16} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#252825]">Store QR Code</p>
                    <p className="text-[12px] text-[#6E746F]">Show QR for GCash & Payments</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal('about')}
                  className="text-[12px] font-semibold text-[#4F8065] hover:underline cursor-pointer"
                >
                  View QR
                </button>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4F8065]/10 border border-[#4F8065]/20 flex items-center justify-center text-[#4F8065]">
                    <HardDriveDownload size={16} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#252825]">Install PWA Application</p>
                    <p className="text-[12px] text-[#6E746F]">Add to device for offline POS access</p>
                  </div>
                </div>
                <PWAInstallButton variant="button" />
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4F8065]/10 border border-[#4F8065]/20 flex items-center justify-center text-[#4F8065]">
                    <Lock size={16} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#252825]">Access Mode</p>
                    <p className="text-[12px] text-[#6E746F]">Direct link access (No login needed)</p>
                  </div>
                </div>
                <span className="text-[12px] font-medium text-[#4F8065]">Public / Open</span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-[#DEE3DE] flex items-center justify-center text-[#6E746F]">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#252825]">Plan Tier</p>
                    <p className="text-[12px] text-[#6E746F]">StockApp Business Pro</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#4F8065]/12 text-[#4F8065]">
                  Active
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4F8065]/10 border border-[#4F8065]/20 flex items-center justify-center text-[#4F8065]">
                    <Globe size={16} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#252825]">Store Timezone</p>
                    <p className="text-[12px] text-[#6E746F]">Philippines (Asia/Manila · UTC+8)</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#4F8065]/12 text-[#4F8065]">
                  PHT (UTC+8)
                </span>
              </div>
            </div>
          </section>

          {onResetOnboarding && (
            <div className="pt-1 space-y-2.5">
              <button
                type="button"
                onClick={onResetOnboarding}
                className="w-full py-3 bg-[#FAF9F6] hover:bg-gray-100 border border-[#DEE3DE] rounded-xl text-[#252825] font-medium text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Store size={16} className="text-[#4F8065]" />
                Update Store Identity (Setup Wizard)
              </button>

              {onResetAllData && (
                <div>
                  {!confirmResetData ? (
                    <button
                      type="button"
                      onClick={() => setConfirmResetData(true)}
                      className="w-full py-3 bg-white hover:bg-[#9F3F46]/5 border border-[#DEE3DE] hover:border-[#9F3F46]/40 rounded-xl text-[#9F3F46] font-medium text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>Clear All Data (Start Fresh)</span>
                    </button>
                  ) : (
                    <div className="p-4 bg-[#9F3F46]/10 border border-[#9F3F46]/25 rounded-xl text-center">
                      <p className="text-[13px] font-medium text-[#252825] mb-3">
                        Are you sure? This removes all current products and sales from your local storage.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => setConfirmResetData(false)}
                          className="px-4 py-2 bg-white border border-[#DEE3DE] rounded-lg text-[13px] font-medium text-[#252825] hover:bg-gray-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onResetAllData();
                            setConfirmResetData(false);
                            setResetSuccessMessage(true);
                            setTimeout(() => setResetSuccessMessage(false), 3000);
                          }}
                          className="px-4 py-2 bg-[#9F3F46] text-white rounded-lg text-[13px] font-medium hover:bg-[#85343a] cursor-pointer"
                        >
                          Yes, Clear All
                        </button>
                      </div>
                    </div>
                  )}

                  {resetSuccessMessage && (
                    <p className="text-center text-[12px] font-medium text-[#4F8065] mt-1.5">
                      ✓ All products and sales have been cleared.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Modal from Merged Tools */}
      <MoreModals
        type={activeModal}
        onClose={() => setActiveModal(null)}
        products={products}
        sales={sales}
      />
    </motion.div>
  );
};
