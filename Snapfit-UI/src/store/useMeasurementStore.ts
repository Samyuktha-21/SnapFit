import { create } from 'zustand';
import type { UserProfile, BodyMeasurements, ScanHistoryItem } from '../types/measurements';
import type { BrandData, FitPref } from '../types/brands';

interface MeasurementState {
  // Auth state
  isAuthenticated: boolean;
  user: UserProfile | null;
  
  // Height & Gender
  height: number;
  gender: 'Men' | 'Women';

  // Display + fit preferences
  unit: 'cm' | 'in';
  fitPref: FitPref;
  
  // Stored profile (if scanned)
  bodyProfile: BodyMeasurements | null;
  
  // Scan captures
  capturedLandmarks: any | null;
  
  // Custom brands added via the portal
  customBrands: BrandData[];
  
  // UI actions
  setHeight: (height: number) => void;
  setGender: (gender: 'Men' | 'Women') => void;
  setUnit: (unit: 'cm' | 'in') => void;
  setFitPref: (pref: FitPref) => void;
  setBodyProfile: (profile: BodyMeasurements | null) => void;
  setCapturedLandmarks: (landmarks: any | null) => void;
  addCustomBrand: (brand: BrandData) => void;
  loginUser: (email: string, gender: 'Men' | 'Women') => void;
  logoutUser: () => void;
  addScanToHistory: (scan: Omit<ScanHistoryItem, 'id' | 'date'>) => void;
  clearScanHistory: () => void;
}

const STORAGE_KEYS = {
  USER: 'snapfit_user',
  HEIGHT: 'snapfit_height',
  GENDER: 'snapfit_gender',
  PROFILE: 'snapfit_profile',
  CUSTOM_BRANDS: 'snapfit_custom_brands',
  UNIT: 'snapfit_unit',
  FITPREF: 'snapfit_fitpref'
};

export const useMeasurementStore = create<MeasurementState>((set) => {
  // Initialize from LocalStorage
  const savedUserJson = localStorage.getItem(STORAGE_KEYS.USER);
  const savedUser = savedUserJson ? JSON.parse(savedUserJson) : null;
  const savedHeight = localStorage.getItem(STORAGE_KEYS.HEIGHT);
  const savedGender = localStorage.getItem(STORAGE_KEYS.GENDER) as 'Men' | 'Women' | null;
  const savedProfileJson = localStorage.getItem(STORAGE_KEYS.PROFILE);
  const savedProfile = savedProfileJson ? JSON.parse(savedProfileJson) : null;
  const savedCustomBrandsJson = localStorage.getItem(STORAGE_KEYS.CUSTOM_BRANDS);
  const savedCustomBrands = savedCustomBrandsJson ? JSON.parse(savedCustomBrandsJson) : [];

  return {
    isAuthenticated: !!savedUser,
    user: savedUser,
    height: savedHeight ? Number(savedHeight) : 175, // default
    gender: savedGender || 'Men', // default
    unit: (localStorage.getItem(STORAGE_KEYS.UNIT) as 'cm' | 'in') || 'cm',
    fitPref: (localStorage.getItem(STORAGE_KEYS.FITPREF) as FitPref) || 'True',
    bodyProfile: savedProfile,
    capturedLandmarks: null,
    customBrands: savedCustomBrands,
    
    setHeight: (height) => {
      localStorage.setItem(STORAGE_KEYS.HEIGHT, height.toString());
      set((state) => {
        const updatedUser = state.user ? { ...state.user, height_cm: height } : null;
        if (updatedUser) {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        }
        return { height, user: updatedUser };
      });
    },
    
    setUnit: (unit) => {
      localStorage.setItem(STORAGE_KEYS.UNIT, unit);
      set({ unit });
    },

    setFitPref: (fitPref) => {
      localStorage.setItem(STORAGE_KEYS.FITPREF, fitPref);
      set({ fitPref });
    },

    setGender: (gender) => {
      localStorage.setItem(STORAGE_KEYS.GENDER, gender);
      set((state) => {
        const updatedUser = state.user ? { ...state.user, gender } : null;
        if (updatedUser) {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        }
        return { gender, user: updatedUser };
      });
    },
    
    setBodyProfile: (bodyProfile) => {
      if (bodyProfile) {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(bodyProfile));
      } else {
        localStorage.removeItem(STORAGE_KEYS.PROFILE);
      }
      set((state) => {
        const updatedUser = state.user && bodyProfile ? {
          ...state.user,
          shoulder_width_cm: bodyProfile.shoulderWidth,
          chest_or_bust_cm: bodyProfile.chestWidth,
          waist_cm: bodyProfile.waistWidth,
          hip_cm: bodyProfile.hipWidth,
          confidence: bodyProfile.confidence,
        } : state.user;
        
        if (updatedUser) {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        }
        return { bodyProfile, user: updatedUser };
      });
    },
    
    setCapturedLandmarks: (capturedLandmarks) => set({ capturedLandmarks }),
    
    addCustomBrand: (brand) => {
      set((state) => {
        const updatedBrands = [...state.customBrands, brand];
        localStorage.setItem(STORAGE_KEYS.CUSTOM_BRANDS, JSON.stringify(updatedBrands));
        return { customBrands: updatedBrands };
      });
    },
    
    loginUser: (email, gender) => {
      const mockUser: UserProfile = {
        user_id: 'mock_uid_' + Math.random().toString(36).substring(2, 9),
        email,
        gender,
        height_cm: 175,
        scan_history: []
      };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
      localStorage.setItem(STORAGE_KEYS.GENDER, gender);
      localStorage.setItem(STORAGE_KEYS.HEIGHT, '175');
      localStorage.removeItem(STORAGE_KEYS.PROFILE); // reset profile on fresh login
      set({
        isAuthenticated: true,
        user: mockUser,
        gender,
        height: 175,
        bodyProfile: null
      });
    },
    
    logoutUser: () => {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      set({
        isAuthenticated: false,
        user: null,
        bodyProfile: null,
        capturedLandmarks: null
      });
    },

    addScanToHistory: (scanDetails) => {
      set((state) => {
        if (!state.user) return {};
        const newScan: ScanHistoryItem = {
          id: 'scan_' + Math.random().toString(36).substring(2, 9),
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          shoulder_width_cm: scanDetails.shoulder_width_cm,
          chest_or_bust_cm: scanDetails.chest_or_bust_cm,
          waist_cm: scanDetails.waist_cm,
          hip_cm: scanDetails.hip_cm,
          confidence: scanDetails.confidence,
          recommended_size: scanDetails.recommended_size
        };
        const updatedHistory = [newScan, ...(state.user.scan_history || [])];
        const updatedUser: UserProfile = {
          ...state.user,
          scan_history: updatedHistory
        };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        return { user: updatedUser };
      });
    },

    clearScanHistory: () => {
      set((state) => {
        if (!state.user) return {};
        const updatedUser: UserProfile = {
          ...state.user,
          scan_history: []
        };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        return { user: updatedUser };
      });
    }
  };
});
