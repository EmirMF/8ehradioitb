'use client';

import { useState, useEffect } from "react";
import ButtonPrimary from "@/app/components/ButtonPrimary";
import { FiCopy, FiEdit, FiTrash2, FiEye, FiLink, FiCalendar, FiBarChart2, FiLock, FiPlus, FiX } from "react-icons/fi";
import { BsQrCode } from "react-icons/bs";
import QRCodeModal from "@/app/components/QRCodeModal";

function FormInput({ label, type = "text", placeholder, value, onChange, name, error }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-800 mb-2 font-body">{label}</label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-body text-gray-900 transition-colors ${error ? 'border-red-500' : ''}`}
            />
            {error && <p className="text-red-600 text-sm mt-1 font-body">{error}</p>}
        </div>
    );
}

function ShortLinkCard({ shortLink, onEdit, onDelete, onViewAnalytics, onViewQR }) {
    const [copied, setCopied] = useState(false);
    const fullUrl = `https://8eh.link/${shortLink.slug}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="font-heading font-semibold text-gray-900 mb-2">
                        {shortLink.title || 'Untitled Link'}
                    </h3>
                    <p className="text-sm text-gray-600 font-body mb-3 break-all">{shortLink.destination}</p>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-blue-600 font-body">8eh.link/{shortLink.slug}</span>
                        <button
                            onClick={copyToClipboard}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        >
                            <FiCopy size={16} />
                        </button>
                        {copied && <span className="text-xs text-green-600 font-body">Copied!</span>}
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => onViewAnalytics(shortLink)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                        title="View Analytics"
                    >
                        <FiBarChart2 size={18} />
                    </button>
                    <button
                        onClick={() => onViewQR(shortLink)}
                        className="p-2 text-gray-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50"
                        title="QR Code"
                    >
                        <BsQrCode size={18} />
                    </button>
                    <button
                        onClick={() => onEdit(shortLink)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                        title="Edit"
                    >
                        <FiEdit size={18} />
                    </button>
                    <button
                        onClick={() => onDelete(shortLink.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        title="Delete"
                    >
                        <FiTrash2 size={18} />
                    </button>
                </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500 font-body">
                <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                        <FiEye size={14} />
                        <span>{shortLink._count?.clicks || 0} clicks</span>
                    </span>
                    <span className="flex items-center space-x-1">
                        <FiCalendar size={14} />
                        <span>{new Date(shortLink.createdAt).toLocaleDateString()}</span>
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    {shortLink.password && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-body flex items-center gap-1">
                            <FiLock size={12} />
                            Protected
                        </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-body ${shortLink.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {shortLink.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
        </div>
    );
}

function AnalyticsModal({ shortLink, analytics, isOpen, onClose }) {
    if (!isOpen) return null;

    // Close modal if click on backdrop
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{
                backgroundColor: "rgba(17,24,39,0.25)" // Tailwind's gray-900 with 25% opacity
            }}
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-heading font-bold text-gray-900">Analytics for {shortLink.title || 'Untitled Link'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
                        <FiX size={24} />
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-heading font-semibold text-gray-900 mb-2">Total Clicks</h3>
                            <p className="text-2xl font-bold text-blue-600 font-body">{analytics.totalClicks}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-heading font-semibold text-gray-900 mb-2">Short URL</h3>
                            <p className="text-sm text-gray-600 break-all font-body">8eh.link/{shortLink.slug}</p>
                        </div>
                    </div>

                    {analytics.chartData && analytics.chartData.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-heading font-semibold text-gray-900 mb-4">Clicks Over Time</h3>
                            <div className="space-y-2">
                                {analytics.chartData.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                                        <span className="text-sm text-gray-600 font-body">{item.date}</span>
                                        <span className="text-sm font-medium text-gray-900 font-body">{item.clicks} clicks</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {analytics.topReferrers && analytics.topReferrers.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-heading font-semibold text-gray-900 mb-4">Top Referrers</h3>
                            <div className="space-y-2">
                                {analytics.topReferrers.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                                        <span className="text-sm text-gray-600 font-body truncate">{item.referer}</span>
                                        <span className="text-sm font-medium text-gray-900 font-body">{item.clicks} clicks</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function LinksDashboardPage() {
    const [formData, setFormData] = useState({ destination: '', title: '', slug: '', password: '' });
    const [shortLinks, setShortLinks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [analyticsModal, setAnalyticsModal] = useState({ isOpen: false, shortLink: null, analytics: null });
    const [qrModal, setQrModal] = useState({ isOpen: false, shortLink: null });

    useEffect(() => {
        fetchShortLinks();
    }, []);

    const fetchShortLinks = async () => {
        try {
            const response = await fetch('/api/shortlinks');
            if (response.ok) {
                const data = await response.json();
                setShortLinks(data);
            }
        } catch (error) {
            console.error('Error fetching short links:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.destination) {
            newErrors.destination = 'Destination URL is required';
        } else {
            try {
                new URL(formData.destination);
            } catch {
                newErrors.destination = 'Please enter a valid URL';
            }
        }
        // Slug tidak boleh kosong saat edit
        if ((isEditing && !formData.slug) || (!isEditing && formData.slug === '')) {
            newErrors.slug = 'Custom back-half cannot be empty';
        }
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            const url = isEditing ? `/api/shortlinks` : '/api/shortlinks';
            const method = isEditing ? 'PUT' : 'POST';
            const body = isEditing ? { ...formData, id: editingId } : formData;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const result = await response.json();
                await fetchShortLinks();
                resetForm();
            } else {
                const errorData = await response.json();
                if (errorData.error === 'Custom back-half already exists') {
                    setErrors({ slug: 'This custom back-half is already taken' });
                } else {
                    setErrors({ general: errorData.error || 'Something went wrong' });
                }
            }
        } catch (error) {
            console.error('Error saving short link:', error);
            setErrors({ general: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (shortLink) => {
        setFormData({
            destination: shortLink.destination,
            title: shortLink.title || '',
            slug: shortLink.slug,
            password: shortLink.password || ''
        });
        setIsEditing(true);
        setEditingId(shortLink.id);
        setErrors({});
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this short link?')) return;

        try {
            const response = await fetch(`/api/shortlinks/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await fetchShortLinks();
            } else {
                console.error('Error deleting short link');
            }
        } catch (error) {
            console.error('Error deleting short link:', error);
        }
    };

    const handleViewQR = (shortLink) => {
        setQrModal({ isOpen: true, shortLink });
    };

    const handleViewAnalytics = async (shortLink) => {
        try {
            const response = await fetch(`/api/shortlinks/${shortLink.id}/analytics`);
            if (response.ok) {
                const analytics = await response.json();
                setAnalyticsModal({ isOpen: true, shortLink, analytics });
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            destination: '',
            title: '',
            slug: '',
            password: ''
        });
        setIsEditing(false);
        setEditingId(null);
        setErrors({});
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md mb-8 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-heading font-bold text-gray-800">
                        {isEditing ? 'Edit Short Link' : 'Create a Short Link'}
                    </h1>
                    {isEditing && (
                        <button 
                            onClick={resetForm} 
                            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 font-body cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <FiX size={16} /> Cancel Edit
                        </button>
                    )}
                </div>

                {isEditing && (
                    <div className="mb-6 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                        <div className="flex items-center">
                            <FiEdit className="w-5 h-5 text-pink-600 mr-2" />
                            <span className="text-pink-800 font-medium font-body">Editing: {formData.title || 'Untitled Link'}</span>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6 text-gray-900 font-body">
                    <FormInput
                        label="Destination URL"
                        name="destination"
                        value={formData.destination}
                        onChange={handleChange}
                        placeholder="https://8ehradioitb.com/example"
                        error={errors.destination}
                    />
                    <FormInput
                        label="Title (optional)"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Website 8EH"
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2 font-body">Customization</label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value="8eh.link"
                                readOnly
                                className="w-1/3 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 font-body cursor-not-allowed"
                            />
                            <span className="text-gray-500 font-body">/</span>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug}
                                onChange={handleChange}
                                placeholder="custom-back-half"
                                className={`flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-body text-gray-900 transition-colors ${errors.slug ? 'border-red-500' : ''}`}
                            />
                        </div>
                        {errors.slug && <p className="text-red-600 text-sm mt-1 font-body">{errors.slug}</p>}
                    </div>
                    <FormInput
                        label="Password (optional)"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="**********"
                    />
                    {errors.general && (
                        <p className="text-red-600 text-sm font-body">{errors.general}</p>
                    )}
                    <div className="flex justify-end pt-4">
                        <ButtonPrimary type="submit" disabled={loading} className="!flex !items-center !gap-2">
                            <FiPlus size={16}/>
                            {loading ? 'Saving...' : (isEditing ? 'Update Link' : 'Create Link')}
                        </ButtonPrimary>
                    </div>
                </form>
            </div>

            {shortLinks.length > 0 && (
                <div>
                    <h2 className="text-xl font-heading font-bold mb-6 text-gray-800">All Short Links & QR Codes</h2>
                    <div className="space-y-4">
                        {shortLinks.map((shortLink) => (
                            <ShortLinkCard
                                key={shortLink.id}
                                shortLink={shortLink}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onViewAnalytics={handleViewAnalytics}
                                onViewQR={handleViewQR}
                            />
                        ))}
                    </div>
                </div>
            )}

            <AnalyticsModal
                shortLink={analyticsModal.shortLink}
                analytics={analyticsModal.analytics}
                isOpen={analyticsModal.isOpen}
                onClose={() => setAnalyticsModal({ isOpen: false, shortLink: null, analytics: null })}
            />
            <QRCodeModal
                shortLink={qrModal.shortLink}
                isOpen={qrModal.isOpen}
                onClose={() => setQrModal({ isOpen: false, shortLink: null })}
            />
        </div>
    );
} 