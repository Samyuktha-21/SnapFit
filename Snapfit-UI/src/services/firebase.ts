import type { UserProfile } from '../types/measurements';
import type { BrandData } from '../types/brands';
import { SEEDED_BRANDS } from './sizeMatching';

// MOCK LOCAL DATABASE HANDLERS
const STORAGE_KEYS = {
  USERS: 'snapfit_db_users',
  BRANDS: 'snapfit_db_brands',
  CURRENT_USER: 'snapfit_db_current_user'
};

// Seed initial custom brands database if empty
const getStoredBrands = (): BrandData[] => {
  const data = localStorage.getItem(STORAGE_KEYS.BRANDS);
  return data ? JSON.parse(data) : [];
};

const getStoredUsers = (): Record<string, UserProfile> => {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : {};
};

// FIREBASE MOCK API IMPLEMENTATION
export const firebaseAuth = {
  signUp: async (email: string, gender: 'Men' | 'Women', height: number): Promise<UserProfile> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = getStoredUsers();
        
        // Generate mock UID
        const user_id = 'uid_' + Math.random().toString(36).substring(2, 9);
        const newUser: UserProfile = {
          user_id,
          email,
          gender,
          height_cm: height,
          is_premium: false,
          scan_history: []
        };
        
        users[user_id] = newUser;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
        resolve(newUser);
      }, 800); // simulate network lag
    });
  },

  signIn: async (email: string): Promise<UserProfile> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = getStoredUsers();
        const existingUser = Object.values(users).find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (existingUser) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(existingUser));
          resolve(existingUser);
        } else {
          // If not exists in mock database, auto-create a user for convenience during demo
          const user_id = 'uid_' + Math.random().toString(36).substring(2, 9);
          const newUser: UserProfile = {
            user_id,
            email,
            gender: 'Men',
            height_cm: 175,
            is_premium: false,
            scan_history: []
          };
          users[user_id] = newUser;
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
          resolve(newUser);
        }
      }, 800);
    });
  },

  signInWithGoogle: async (): Promise<UserProfile> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = getStoredUsers();
        const email = 'google.user@gmail.com';
        let existingUser = Object.values(users).find(u => u.email === email);
        
        if (!existingUser) {
          const user_id = 'uid_google_' + Math.random().toString(36).substring(2, 9);
          existingUser = {
            user_id,
            email,
            gender: 'Men',
            height_cm: 180,
            is_premium: false,
            scan_history: []
          };
          users[user_id] = existingUser;
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        }
        
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(existingUser));
        resolve(existingUser);
      }, 1000);
    });
  },

  signOut: async (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        resolve();
      }, 500);
    });
  }
};

export const firestore = {
  // Save or Update user profile
  saveUserProfile: async (profile: UserProfile): Promise<void> => {
    return new Promise((resolve) => {
      const users = getStoredUsers();
      users[profile.user_id] = profile;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(profile));
      resolve();
    });
  },

  // Retrieve user profile
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    return new Promise((resolve) => {
      const users = getStoredUsers();
      resolve(users[userId] || null);
    });
  },

  // Save new brand configuration
  saveBrand: async (brandData: BrandData): Promise<BrandData> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Validation check
        if (!brandData.brand || !brandData.gender || !brandData.fits) {
          reject(new Error("Invalid Brand Data: Missing Brand name, Gender, or Fit charts"));
          return;
        }

        const brands = getStoredBrands();
        const id = 'brand_' + Math.random().toString(36).substring(2, 9);
        const newBrand = { ...brandData, id };
        
        brands.push(newBrand);
        localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
        resolve(newBrand);
      }, 1000);
    });
  },

  // Load all brands (merges Seeded + User Submitted Custom Brands)
  getBrands: async (): Promise<BrandData[]> => {
    return new Promise((resolve) => {
      const customBrands = getStoredBrands();
      resolve([...SEEDED_BRANDS, ...customBrands]);
    });
  }
};
