// frontend/src/components/ImageUpload.jsx
import React, { useRef, useState } from 'react';
import { Button, Space, Image, Spin, message } from 'antd';
import { CameraOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';

// Image compression utility - Direct canvas-based compression
const compressImage = (base64String, maxWidth = 1024, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary canvas to load and compress the image
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      if (!tempCtx) {
        throw new Error('Could not get canvas context');
      }

      // Create image element for loading
      const img = document.createElement('img');
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions maintaining aspect ratio
          if (width > maxWidth) {
            height = Math.round((maxWidth / width) * height);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }

          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with quality compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          
          if (!compressedBase64 || compressedBase64 === 'data:,') {
            throw new Error('Failed to convert canvas to base64');
          }

          // Calculate compression ratio
          const originalSize = base64String.length;
          const compressedSize = compressedBase64.length;
          const ratio = Math.round((1 - compressedSize / originalSize) * 100);
          
          console.log(`Image compressed: ${ratio}% reduction (${Math.round(originalSize / 1024)}KB → ${Math.round(compressedSize / 1024)}KB)`);
          
          resolve(compressedBase64);
        } catch (error) {
          console.error('Error during compression:', error);
          reject(error);
        }
      };

      img.onerror = () => {
        console.error('Image load error');
        reject(new Error('Failed to load image for compression'));
      };

      img.onabort = () => {
        reject(new Error('Image load was aborted'));
      };

      // Set the source to trigger loading
      img.src = base64String;
    } catch (error) {
      console.error('Error in compression function:', error);
      reject(error);
    }
  });
};

// Reverse geocoding function using Nominatim (OpenStreetMap)
const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    // Extract address components
    const address = data.address || {};
    
    // Build address string from components
    let addressString = '';
    if (address.road) addressString += address.road + ', ';
    if (address.city) addressString += address.city + ', ';
    else if (address.town) addressString += address.town + ', ';
    else if (address.village) addressString += address.village + ', ';
    
    if (address.state) addressString += address.state + ', ';
    if (address.country) addressString += address.country;
    
    // Fallback to display_name if building string
    const finalAddress = addressString.trim().replace(/,\s*$/, '') || data.display_name;
    
    console.log('Reverse geocoded address:', finalAddress);
    return finalAddress;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

export default function ImageUpload({ value, onChange, label = 'Upload Image' }) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [aspectRatio, setAspectRatio] = useState('75%'); // Default 4:3 = 75%
  const [geoLocation, setGeoLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle, locating, getting-address, ready, error

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      convertFileToBase64(file);
    }
  };

  const convertFileToBase64 = (file) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64String = reader.result;
        // Compress the image before saving
        const compressedBase64 = await compressImage(base64String, 1024, 0.7);
        onChange(compressedBase64);
        message.success('Image uploaded and compressed successfully');
      } catch (error) {
        console.error('Error compressing image:', error);
        message.error('Failed to compress image');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      message.error('Failed to read file');
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      setLoading(true);
      setGeoStatus('locating');
      
      // Request geolocation with longer timeout
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude, accuracy } = position.coords;
              
              // First set location
              setGeoLocation({
                latitude: latitude.toFixed(6),
                longitude: longitude.toFixed(6),
                accuracy: accuracy.toFixed(0),
                timestamp: new Date(),
                address: null, // Will be filled after geocoding
              });
              setGeoError(null);
              
              // Then fetch address
              setGeoStatus('getting-address');
              const address = await reverseGeocode(latitude, longitude);
              
              // Update with address
              setGeoLocation(prev => ({
                ...prev,
                address: address || 'Address not found',
              }));
              
              setGeoStatus('ready');
              console.log('Geolocation with address acquired:', { latitude, longitude, address });
            } catch (err) {
              console.error('Error fetching address:', err);
              setGeoStatus('ready');
              // Still set location even if address fetch fails
            }
          },
          (error) => {
            console.warn('Geolocation error:', error.code, error.message);
            setGeoError(error.message);
            setGeoLocation(null);
            setGeoStatus('error');
            // Still allow camera to work even if geo fails
            message.warning('Location not available - camera ready without geotag');
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 30000,
          }
        );
      } else {
        console.warn('Geolocation not supported');
        setGeoError('Geolocation not supported');
        setGeoStatus('error');
        message.info('Your browser does not support geolocation');
      }

      // First set camera active to render the video element
      setIsCameraActive(true);
      
      // Wait a tick to ensure video element is in DOM
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try with minimal constraints first
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err) {
        console.error('Simple constraints failed, trying with specific facingMode:', err);
        // Fallback with specific facing mode
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
      }
      
      if (!videoRef.current) {
        console.error('Video ref not available');
        message.error('Video element not ready');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Attach stream to video element
      videoRef.current.srcObject = stream;
      setCameraStream(stream);
      
      // Detect aspect ratio once metadata is loaded
      const handleLoadedMetadata = () => {
        const video = videoRef.current;
        if (video.videoWidth && video.videoHeight) {
          const ratio = video.videoHeight / video.videoWidth;
          const paddingPercent = (ratio * 100) + '%';
          console.log(`Camera aspect ratio: ${video.videoWidth}x${video.videoHeight}, padding: ${paddingPercent}`);
          setAspectRatio(paddingPercent);
        }
      };

      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Play video with error handling
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .catch((err) => {
            console.error('Play error:', err);
            message.error('Could not start video playback: ' + err.message);
          });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsCameraActive(false);
      
      if (error.name === 'NotAllowedError') {
        message.error('Camera permission denied. Please allow camera access.');
      } else if (error.name === 'NotFoundError') {
        message.error('No camera found on this device.');
      } else if (error.name === 'NotReadableError') {
        message.error('Camera is already in use by another application.');
      } else {
        message.error('Error: ' + (error.message || 'Could not access camera'));
      }
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setAspectRatio('75%'); // Reset to default
    setGeoLocation(null);
    setGeoError(null);
    setGeoStatus('idle');
  };

  const drawGeotagOverlay = (canvas, geoData) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !geoData) return;

    const padding = 15;
    const lineHeight = 24;
    const fontSize = 14;
    const textColor = '#FFFFFF';
    const bgColor = 'rgba(0, 0, 0, 0.7)';
    const borderColor = '#FFD700'; // Gold border

    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = textColor;
    ctx.strokeStyle = borderColor;

    // Prepare text lines
    const timestamp = geoData.timestamp.toLocaleString();
    const lines = [];
    
    // Add address if available
    if (geoData.address) {
      lines.push(`📍 ${geoData.address}`);
    }
    
    lines.push(`Lat: ${geoData.latitude}°`);
    lines.push(`Long: ${geoData.longitude}°`);
    lines.push(`📅 ${timestamp}`);

    if (geoData.accuracy) {
      lines.push(`🎯 Accuracy: ±${geoData.accuracy}m`);
    }

    // Calculate box dimensions
    const measurements = lines.map(line => ctx.measureText(line));
    const maxWidth = Math.max(...measurements.map(m => m.width));
    const boxWidth = maxWidth + padding * 2;
    const boxHeight = lines.length * lineHeight + padding * 2;

    // Draw background box at bottom
    const x = padding;
    const y = canvas.height - boxHeight - padding;

    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, boxWidth, boxHeight);

    // Draw border
    ctx.lineWidth = 2;
    ctx.strokeStyle = borderColor;
    ctx.strokeRect(x, y, boxWidth, boxHeight);

    // Draw text
    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px Arial`;
    lines.forEach((line, index) => {
      ctx.fillText(line, x + padding, y + padding + (index + 1) * lineHeight - 5);
    });
  };

  const capturePhoto = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        message.error('Camera not ready');
        return;
      }

      const video = videoRef.current;
      const context = canvasRef.current.getContext('2d');

      if (!context) {
        message.error('Could not get canvas context');
        return;
      }

      // Set canvas dimensions to match video actual dimensions
      canvasRef.current.width = video.videoWidth || video.offsetWidth;
      canvasRef.current.height = video.videoHeight || video.offsetHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);

      // Add geotag overlay if location is available
      if (geoLocation) {
        drawGeotagOverlay(canvasRef.current, geoLocation);
      }

      // Convert canvas to base64
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.9);
      
      if (!imageData || imageData === 'data:,') {
        message.error('Failed to capture image data');
        return;
      }

      setLoading(true);
      
      // Compress the captured image
      const compressedImage = await compressImage(imageData, 1024, 0.7);
      onChange(compressedImage);
      message.success('Photo captured with geotag and compressed successfully');
      
      // Stop camera
      stopCamera();
    } catch (error) {
      console.error('Error capturing photo:', error);
      message.error('Failed to process photo: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    onChange(null);
    message.success('Image removed');
  };

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>
          {label}
        </label>
      </div>

      {isCameraActive ? (
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              backgroundColor: '#000',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '12px',
              paddingBottom: aspectRatio, // Dynamic aspect ratio based on device camera
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                backgroundColor: '#000',
              }}
            />
            {/* Geolocation status indicator */}
            <div
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor:
                  geoStatus === 'ready'
                    ? 'rgba(34, 139, 34, 0.8)'
                    : geoStatus === 'error'
                    ? 'rgba(184, 134, 11, 0.8)'
                    : 'rgba(30, 144, 255, 0.8)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                zIndex: 10,
              }}
            >
              {geoStatus === 'ready'
                ? '✓ Geotag Ready'
                : geoStatus === 'error'
                ? '⚠ No Location'
                : geoStatus === 'getting-address'
                ? '⌛ Getting Address...'
                : '◐ Detecting...'}
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <Space>
            <Button
              type="primary"
              icon={<CameraOutlined />}
              onClick={capturePhoto}
              loading={loading}
            >
              Capture Photo
            </Button>
            <Button onClick={stopCamera}>Cancel</Button>
          </Space>
        </div>
      ) : (
        <>
          {value ? (
            <div style={{ marginBottom: '12px' }}>
              <Image
                src={value}
                alt="Uploaded"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: '4px',
                  marginBottom: '12px',
                }}
              />
              <div>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                  size="small"
                >
                  Remove Image
                </Button>
              </div>
            </div>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                icon={<CameraOutlined />}
                onClick={startCamera}
                loading={loading}
                block
              >
                Take Photo from Camera
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => fileInputRef.current?.click()}
                block
              >
                Upload Image from Device
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </Space>
          )}
        </>
      )}
    </div>
  );
}
