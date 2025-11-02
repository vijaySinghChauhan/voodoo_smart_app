import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

class AddressService {
  private STORAGE_KEY = 'USER_ADDRESSES';
  private DEFAULT_ID_KEY = 'DEFAULT_ADDRESS_ID';

  async getAddresses(): Promise<Address[]> {
    try {
      const json = await AsyncStorage.getItem(this.STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      console.error('Failed to load addresses', e);
      return [];
    }
  }

  async saveAddresses(addresses: Address[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(addresses));
    } catch (e) {
      console.error('Failed to save addresses', e);
    }
  }

  async addAddress(address: Omit<Address, 'id'>): Promise<Address> {
    const addresses = await this.getAddresses();
    const newAddress: Address = { id: 'addr_' + Date.now(), ...address };
    // If no default exists, set the first address as default
    const hasDefault = addresses.some(a => a.isDefault);
    if (!hasDefault) {
      newAddress.isDefault = true;
      await AsyncStorage.setItem(this.DEFAULT_ID_KEY, newAddress.id);
    }
    addresses.push(newAddress);
    await this.saveAddresses(addresses);
    return newAddress;
  }

  async updateAddress(updated: Address): Promise<boolean> {
    const addresses = await this.getAddresses();
    const idx = addresses.findIndex(a => a.id === updated.id);
    if (idx === -1) return false;
    addresses[idx] = { ...addresses[idx], ...updated };
    await this.saveAddresses(addresses);
    return true;
  }

  async deleteAddress(id: string): Promise<boolean> {
    const addresses = await this.getAddresses();
    const filtered = addresses.filter(a => a.id !== id);
    const deletedWasDefault = addresses.find(a => a.id === id)?.isDefault;
    await this.saveAddresses(filtered);
    if (deletedWasDefault && filtered.length > 0) {
      // promote first as default
      filtered[0].isDefault = true;
      await AsyncStorage.setItem(this.DEFAULT_ID_KEY, filtered[0].id);
      await this.saveAddresses(filtered);
    } else if (filtered.length === 0) {
      await AsyncStorage.removeItem(this.DEFAULT_ID_KEY);
    }
    return true;
  }

  async setDefaultAddress(id: string): Promise<boolean> {
    const addresses = await this.getAddresses();
    let found = false;
    const updated = addresses.map(a => {
      if (a.id === id) {
        found = true;
        return { ...a, isDefault: true };
      }
      return { ...a, isDefault: false };
    });
    if (!found) return false;
    await AsyncStorage.setItem(this.DEFAULT_ID_KEY, id);
    await this.saveAddresses(updated);
    return true;
  }

  async getDefaultAddress(): Promise<Address | null> {
    const addresses = await this.getAddresses();
    const def = addresses.find(a => a.isDefault);
    return def || null;
  }

  // Tries to autofill current location using IP-based geolocation and reverse geocoding
  async getCurrentLocationAddress(): Promise<Partial<Address>> {
    try {
      const ipInfo = await fetch('https://ipapi.co/json/').then(r => r.json());
      const latitude = ipInfo.latitude;
      const longitude = ipInfo.longitude;
      let addressLine1 = '';
      let city = ipInfo.city || '';
      let state = ipInfo.region || '';
      let zipCode = ipInfo.postal || '';
      let country = ipInfo.country_name || '';

      if (latitude && longitude) {
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
          const rev = await fetch(nominatimUrl, {
            headers: {
              'User-Agent': 'voodoohomeS2/1.0 (support@voodoohome.local)'
            }
          }).then(r => r.json());
          const addr = rev.address || {};
          addressLine1 = rev.display_name || '';
          city = addr.city || addr.town || addr.village || city;
          state = addr.state || state;
          zipCode = addr.postcode || zipCode;
          country = addr.country || country;
        } catch (e) {
          // If reverse geocoding fails, fallback to ip data
        }
      }

      return {
        addressLine1,
        city,
        state,
        zipCode,
        country,
      };
    } catch (e) {
      console.error('Failed to fetch current location address', e);
      return {};
    }
  }
}

export default new AddressService();