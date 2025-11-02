import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as constantsV from '../../constants/constatantsV';

export interface AddressDTO {
  id?: string;
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

class AddressApi {
  private baseUrl: string = constantsV.BASE_URL + '/addresses';

  private async authHeaders() {
    const token = await AsyncStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async list(): Promise<AddressDTO[]> {
    const headers = await this.authHeaders();
    const res = await axios.get(`${this.baseUrl}`, { headers });
    const items = res.data?.data || [];
    return items.map((a: any) => ({
      id: String(a.id ?? a._id),
      name: a.name,
      phone: a.phone,
      addressLine1: a.addressLine1 ?? a.address_line1,
      addressLine2: a.addressLine2 ?? a.address_line2,
      city: a.city,
      state: a.state,
      zipCode: a.zipCode ?? a.zip_code,
      country: a.country,
      isDefault: !!a.isDefault || !!a.is_default,
    }));
  }

  async create(data: AddressDTO): Promise<AddressDTO> {
    const headers = await this.authHeaders();
    const res = await axios.post(`${this.baseUrl}`, data, { headers });
    const a = res.data?.data;
    return {
      id: String(a.id ?? a._id),
      name: a.name,
      phone: a.phone,
      addressLine1: a.addressLine1 ?? a.address_line1,
      addressLine2: a.addressLine2 ?? a.address_line2,
      city: a.city,
      state: a.state,
      zipCode: a.zipCode ?? a.zip_code,
      country: a.country,
      isDefault: !!a.isDefault || !!a.is_default,
    };
  }

  async update(id: string, data: AddressDTO): Promise<AddressDTO> {
    const headers = await this.authHeaders();
    const res = await axios.put(`${this.baseUrl}/${id}`, data, { headers });
    const a = res.data?.data;
    return {
      id: String(a.id ?? a._id),
      name: a.name,
      phone: a.phone,
      addressLine1: a.addressLine1 ?? a.address_line1,
      addressLine2: a.addressLine2 ?? a.address_line2,
      city: a.city,
      state: a.state,
      zipCode: a.zipCode ?? a.zip_code,
      country: a.country,
      isDefault: !!a.isDefault || !!a.is_default,
    };
  }

  async remove(id: string): Promise<void> {
    const headers = await this.authHeaders();
    await axios.delete(`${this.baseUrl}/${id}`, { headers });
  }

  async setDefault(id: string): Promise<void> {
    const headers = await this.authHeaders();
    await axios.patch(`${this.baseUrl}/${id}/default`, {}, { headers });
  }
}

export default new AddressApi();