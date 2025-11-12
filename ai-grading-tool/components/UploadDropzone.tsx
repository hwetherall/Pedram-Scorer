'use client';

import React, { useCallback, useRef, useState } from 'react';

type UploadDropzoneProps = {
  multiple?: boolean;
  accept?: string;
  onFiles: (files: File[]) => void;
  label?: string;
};

export default function UploadDropzone({ multiple, accept, onFiles, label }: UploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const files = Array.from(list);
      onFiles(files);
    },
    [onFiles]
  );

  return (
    <div
      className={`border-2 border-dashed rounded p-6 text-center cursor-pointer ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple={!!multiple}
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="text-gray-700">
        {label || (multiple ? 'Drag & drop files here, or click to select' : 'Drag & drop a file here, or click to select')}
      </div>
    </div>
  );
}


