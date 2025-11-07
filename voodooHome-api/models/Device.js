const { pool } = require('../config/db');

class Device {
  constructor(row) {
    this._id = row.id; this.id = row.id;
    this.name = row.name;
    this.deviceType = row.device_type;
    this.macAddress = row.mac_address;
    this.ipAddress = row.ip_address;
    this.ssid = row.ssid;
    this.isConnected = !!row.is_connected;
    this.isOn = !!row.is_on;
    this.brightness = row.brightness;
    this.flowRate = row.flow_rate;
    this.totalLiters = row.total_liters;
    this.target = row.target;
    this.device1 = row.device1;
    this.device2 = row.device2;
    this.device3 = row.device3;
    this.device4 = row.device4;
    this.device5 = row.device5;
    this.firmwareVersion = row.firmware_version;
    this.lastSeen = row.last_seen;
    this.room = row.room_id;
    this.user = row.user_id;
    this.createdAt = row.created_at;
  }

  static async findByMacAddress(mac){
    const [rows] = await pool.query('SELECT * FROM devices WHERE mac_address=? LIMIT 1',[mac]);
    return rows[0]? new Device(rows[0]) : null;
  }

  static async find(filter={}){
    const where=[]; const params=[];
    if (filter.user){ where.push('user_id=?'); params.push(filter.user); }
    if (filter.room){ where.push('room_id=?'); params.push(filter.room); }
    const [rows] = await pool.query(`SELECT * FROM devices${where.length? ' WHERE '+where.join(' AND '):''}` , params);
    return rows.map(r=>new Device(r));
  }

  static async findById(id){
    const [rows] = await pool.query('SELECT * FROM devices WHERE id=? LIMIT 1',[id]);
    return rows[0]? new Device(rows[0]) : null;
  }

  static async create(data){
    const [res] = await pool.query(
      'INSERT INTO devices (user_id,room_id,name,device_type,mac_address,ip_address,ssid,is_connected,is_on,brightness,flow_rate,total_liters,target,device1,device2,device3,device4,device5,firmware_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        data.user,
        data.room || null,
        data.name,
        data.deviceType,
        data.macAddress,
        data.ipAddress || null,
        data.ssid || null,
        data.isConnected?1:0,
        data.isOn?1:0,
        data.brightness || 100,
        data.flowRate ?? 0,
        data.totalLiters ?? 0,
        data.target ?? null,
        data.device1 ?? null,
        data.device2 ?? null,
        data.device3 ?? null,
        data.device4 ?? null,
        data.device5 ?? null,
        data.firmwareVersion || null
      ]
    );
    return await Device.findById(res.insertId);
  }

  static async findByIdAndUpdate(id, data){
    const map = {
      name: data.name,
      device_type: data.deviceType,
      mac_address: data.macAddress,
      ip_address: data.ipAddress,
      ssid: data.ssid,
      is_connected: typeof data.isConnected==='boolean' ? (data.isConnected?1:0) : undefined,
      is_on: typeof data.isOn==='boolean' ? (data.isOn?1:0) : undefined,
      brightness: data.brightness,
      flow_rate: data.flowRate,
      total_liters: data.totalLiters,
      target: data.target,
      device1: data.device1,
      device2: data.device2,
      device3: data.device3,
      device4: data.device4,
      device5: data.device5,
      firmware_version: data.firmwareVersion,
      user_id: data.user,
      room_id: data.room,
      last_seen: data.lastSeen
    };
    const updates=[]; const params=[];
    for (const [k,v] of Object.entries(map)) { if (v!==undefined){ updates.push(`${k}=?`); params.push(v); } }
    if (updates.length){ params.push(id); await pool.query(`UPDATE devices SET ${updates.join(', ')} WHERE id=?`, params); }
    return await Device.findById(id);
  }

  async remove(){
    await pool.query('DELETE FROM devices WHERE id=?',[this.id]);
  }
}

module.exports = Device;
