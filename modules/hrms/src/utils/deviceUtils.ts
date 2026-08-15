export const getDeviceId = (): string => {
  try {
    let deviceId = localStorage.getItem('hrms_device_id');
    
    if (!deviceId) {
      // Generate a unique ID if not exists
      deviceId = 'DEV-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
      localStorage.setItem('hrms_device_id', deviceId);
    }
    
    return deviceId;
  } catch (e) {
    console.error("Error accessing localStorage for deviceId:", e);
    // Fallback to a session-based ID if localStorage is blocked
    return 'SESSION-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
  }
};
