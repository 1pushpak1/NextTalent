import { useRef, useState } from 'react';
import api from '../api/axios';
import Button from './Button';
import StatusBadge from './StatusBadge';

export default function FileUpload({ label, status = 'Pending', hasUploadedFile = false, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const openPicker = () => {
    inputRef.current?.click();
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', label);

    setUploading(true);
    try {
      const { data } = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded?.(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="grid items-center gap-2 rounded-xl border border-[rgba(200,169,107,0.18)] bg-[rgba(255,255,255,0.025)] p-3 md:grid-cols-[1fr_auto_auto]">
      <span className="text-sm font-medium text-[#e8e8ed]">{label}</span>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
        accept=".pdf,.png,.jpg,.jpeg,.webp"
      />
      <Button type="button" variant="secondary" disabled={uploading} onClick={openPicker}>
        {uploading ? 'Uploading...' : hasUploadedFile ? 'Change File' : 'Upload File'}
      </Button>
      <StatusBadge status={status} />
    </div>
  );
}
