import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Switch, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import adminService from '../../services/admin/adminService';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/theme';
import Toast from 'react-native-toast-message';
import esp8266Service from '../../services/esp8266/esp8266Service';
import { DataTable } from 'react-native-paper';

const AdminUserDetailScreen: React.FC<{ route: any }> = ({ route }) => {
  const { user } = route.params;
  const [rooms, setRooms] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [detail, setDetail] = useState<any>(user);
  const [betaTester, setBetaTester] = useState<boolean>(!!(user?.beta === 1 || user?.beta === '1' || user?.beta === true));
  const [sharedAccessEnabled, setSharedAccessEnabled] = useState<boolean>(!!(user?.sharedAccessEnabled === 1 || user?.sharedAccessEnabled === '1' || user?.sharedAccessEnabled === true));
  const [subscriptionType, setSubscriptionType] = useState<string>(String((user as any)?.subscriptionType || ''));
  const [subscriptionId, setSubscriptionId] = useState<string>(String((user as any)?.subscriptionId || ''));
  const [subdeviceIdsStr, setSubdeviceIdsStr] = useState<string>(Array.isArray((user as any)?.subdeviceIds) ? ((user as any).subdeviceIds as any[]).map(String).join(',') : '');
  const [devEdits, setDevEdits] = useState<Record<string, any>>({});
  const [editDeviceId, setEditDeviceId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const devicesByRoom = useMemo(() => {
    const map: Record<string, any[]> = {};
    devices.forEach((d: any) => {
      let rid = String(d.roomId ?? d.room ?? d.room_id ?? '');
      if (!rid) rid = 'unassigned';
      if (!map[rid]) map[rid] = [];
      map[rid].push(d);
    });
    return map;
  }, [devices]);
  const roomsWithUnassigned = useMemo(() => {
    const unassignedCount = (devicesByRoom['unassigned'] || []).length;
    if (unassignedCount > 0) {
      return [...rooms, { id: 'unassigned', name: 'Unassigned', deviceCount: unassignedCount }];
    }
    return rooms;
  }, [rooms, devicesByRoom]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let targetId = String(user.id);
        let u: any = null;
        try {
          u = await adminService.getUser(targetId);
        } catch (_) { u = null; }
        if (!u || !u.id) {
          try {
            const searchQ = String((user as any)?.email || (user as any)?.name || '').trim();
            if (searchQ) {
              const candidates = await adminService.listUsers(searchQ);
              const found = candidates.find((x:any)=>String(x.email||'').toLowerCase() === String((user as any)?.email||'').toLowerCase());
              if (found) {
                targetId = String(found.id);
                u = await adminService.getUser(targetId);
              }
            }
          } catch (_) { /* ignore */ }
        }
        setDetail(u || user);
        setBetaTester(!!(u?.beta === 1 || u?.beta === '1' || u?.beta === true));
        setSharedAccessEnabled(!!(u?.sharedAccessEnabled === 1 || u?.sharedAccessEnabled === '1' || u?.sharedAccessEnabled === true));
        setSubscriptionType(String(u?.subscriptionType || ''));
        setSubscriptionId(String(u?.subscriptionId || ''));
        setSubdeviceIdsStr(Array.isArray(u?.subdeviceIds) ? (u.subdeviceIds as any[]).map(String).join(',') : '');
        const rs = await adminService.getUserRooms(targetId);
        const ds = await adminService.getUserDevices(targetId);
        setRooms(rs);
        setDevices(ds);
        const next: Record<string, any> = {};
        ds.forEach((d:any) => {
          next[String(d.id)] = {
            name: String(d.name || ''),
            deviceType: String(d.deviceType || d.device_type || ''),
            room: d.room ? String(d.room) : String(d.roomId || d.room_id || ''),
            userId: String(d.userId || d.user_id || ''),
            deviceId: String(d.deviceId || d.device_id || d.id || ''),
            isOn: !!(typeof d.isOn !== 'undefined' ? d.isOn : (String(d.status || '').toLowerCase() === 'on')),
            isConnected: !!(d.isConnected || d.connected),
            macAddress: String(d.macAddress || d.mac_address || ''),
            ip: String(d.ip || d.ip_address || ''),
            ssid: String(d.ssid || ''),
            brightness: typeof d.brightness === 'number' ? d.brightness : Number(d.brightness || 0),
            flowRate: typeof d.flowRate === 'number' ? d.flowRate : Number(d.flow_rate || 0),
            totalLiters: typeof d.totalLiters === 'number' ? d.totalLiters : Number(d.total_liters || 0),
            target: typeof d.target === 'number' ? d.target : Number(d.target || 0),
            device1: typeof d.device1 === 'number' ? (d.device1 === 1) : !!d.device1,
            device2: typeof d.device2 === 'number' ? (d.device2 === 1) : !!d.device2,
            device3: typeof d.device3 === 'number' ? (d.device3 === 1) : !!d.device3,
            device4: typeof d.device4 === 'number' ? (d.device4 === 1) : !!d.device4,
            device5: typeof d.device5 === 'number' ? (d.device5 === 1) : !!d.device5,
            firmwareVersion: String(d.firmwareVersion || d.firmware_version || ''),
            lastSeen: String(d.lastSeen || d.last_seen || ''),
            createdAt: String(d.createdAt || d.created_at || ''),
            subdevice1: String(d.subdevice1 || ''),
            subdevice2: String(d.subdevice2 || ''),
            subdevice3: String(d.subdevice3 || ''),
            subdevice4: String(d.subdevice4 || ''),
            subdevice5: String(d.subdevice5 || ''),
            subscriptionActive: Number(d.subscriptionActive || d.subscription || 0) === 1 ? 1 : 0,
            subscriptionEndDate: d.subscriptionEndDate ? String(d.subscriptionEndDate) : String(d.subscriptionEnd || d.subscription_last_date || ''),
          };
        });
        setDevEdits(next);
      } catch (e) {
        setDetail(user);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  const handleSave = async () => {
    try {
      const payload = {
        name: String(detail?.name || '').trim(),
        email: String(detail?.email || '').trim(),
        phone: String(detail?.phone || '').trim(),
        role: (String(detail?.role || 'user').toLowerCase() === 'admin' ? 'admin' : 'user') as 'user' | 'admin',
        beta: betaTester,
        sharedAccessEnabled,
        subscriptionType: String(subscriptionType || '').trim(),
        subscriptionId: String(subscriptionId || '').trim() || null,
        subdeviceIds: String(subdeviceIdsStr || '').split(',').map(s=>s.trim()).filter(Boolean),
      };
      const updated = await adminService.updateUser(user.id, payload);
      setDetail(updated);
      setBetaTester(!!(updated?.beta === 1 || updated?.beta === '1' || updated?.beta === true));
      setSharedAccessEnabled(!!(updated?.sharedAccessEnabled === 1 || updated?.sharedAccessEnabled === '1' || updated?.sharedAccessEnabled === true));
      setSubscriptionType(String(updated?.subscriptionType || ''));
      setSubscriptionId(String(updated?.subscriptionId || ''));
      setSubdeviceIdsStr(Array.isArray(updated?.subdeviceIds) ? (updated.subdeviceIds as any[]).map(String).join(',') : '');
      setIsEditing(false);
      Toast.show({ type: 'success', text1: 'Updated', text2: 'User details updated', position: 'bottom' });
    } catch (e:any) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: e?.message || 'Could not update user', position: 'bottom' });
    }
  };

  const handleSaveDevice = async (dev: any) => {
    const id = String(dev.id);
    const edit = devEdits[id];
    if (!edit) return;
    try {
      const fields: any = {};
      if (String(edit.name || '') !== String(dev.name || '')) fields.name = String(edit.name || '');
      if (String(edit.deviceType || '') !== String(dev.deviceType || '')) fields.deviceType = String(edit.deviceType || '');
      const roomChanged = String(edit.room || '') !== String(dev.room || dev.room_id || '');
      if (roomChanged) fields.room = String(edit.room || '') ? String(edit.room) : null;
      if (String(edit.userId || '') !== String(dev.userId || dev.user_id || '')) fields.userId = String(edit.userId || '');
      if (String(edit.deviceId || '') !== String(dev.deviceId || dev.device_id || dev.id || '')) fields.deviceId = String(edit.deviceId || '');
      if (String(edit.macAddress || '') !== String(dev.macAddress || dev.mac_address || '')) fields.macAddress = String(edit.macAddress || '');
      if (String(edit.ip || '') !== String(dev.ip || dev.ip_address || '')) fields.ip = String(edit.ip || '');
      if (String(edit.ssid || '') !== String(dev.ssid || '')) fields.ssid = String(edit.ssid || '');
      if (Number(edit.brightness ?? -1) !== Number(dev.brightness ?? -1)) fields.brightness = Number(edit.brightness ?? 0);
      if (Number(edit.flowRate ?? -1) !== Number(dev.flowRate ?? dev.flow_rate ?? -1)) fields.flowRate = Number(edit.flowRate ?? 0);
      if (Number(edit.totalLiters ?? -1) !== Number(dev.totalLiters ?? dev.total_liters ?? -1)) fields.totalLiters = Number(edit.totalLiters ?? 0);
      if (Number(edit.target ?? -1) !== Number(dev.target ?? -1)) fields.target = Number(edit.target ?? 0);
      if (String(edit.firmwareVersion || '') !== String(dev.firmwareVersion || dev.firmware_version || '')) fields.firmwareVersion = String(edit.firmwareVersion || '');
      if (String(edit.lastSeen || '') !== String(dev.lastSeen || dev.last_seen || '')) fields.lastSeen = String(edit.lastSeen || '');
      if (String(edit.createdAt || '') !== String(dev.createdAt || dev.created_at || '')) fields.createdAt = String(edit.createdAt || '');
      if (String(edit.subdevice1 || '') !== String(dev.subdevice1 || '')) fields.subdevice1 = String(edit.subdevice1 || '');
      if (String(edit.subdevice2 || '') !== String(dev.subdevice2 || '')) fields.subdevice2 = String(edit.subdevice2 || '');
      if (String(edit.subdevice3 || '') !== String(dev.subdevice3 || '')) fields.subdevice3 = String(edit.subdevice3 || '');
      if (String(edit.subdevice4 || '') !== String(dev.subdevice4 || '')) fields.subdevice4 = String(edit.subdevice4 || '');
      if (String(edit.subdevice5 || '') !== String(dev.subdevice5 || '')) fields.subdevice5 = String(edit.subdevice5 || '');
      const deviceBits: any = {};
      if (Boolean(edit.device1) !== Boolean(typeof dev.device1 === 'number' ? dev.device1 === 1 : !!dev.device1)) deviceBits.device1 = edit.device1 ? 1 : 0;
      if (Boolean(edit.device2) !== Boolean(typeof dev.device2 === 'number' ? dev.device2 === 1 : !!dev.device2)) deviceBits.device2 = edit.device2 ? 1 : 0;
      if (Boolean(edit.device3) !== Boolean(typeof dev.device3 === 'number' ? dev.device3 === 1 : !!dev.device3)) deviceBits.device3 = edit.device3 ? 1 : 0;
      if (Boolean(edit.device4) !== Boolean(typeof dev.device4 === 'number' ? dev.device4 === 1 : !!dev.device4)) deviceBits.device4 = edit.device4 ? 1 : 0;
      if (Boolean(edit.device5) !== Boolean(typeof dev.device5 === 'number' ? dev.device5 === 1 : !!dev.device5)) deviceBits.device5 = edit.device5 ? 1 : 0;
      Object.assign(fields, deviceBits);
      if (Boolean(edit.isOn) !== Boolean(dev.isOn)) fields.isOn = !!edit.isOn;
      if (Boolean(edit.isConnected) !== Boolean(dev.isConnected || dev.connected)) fields.isConnected = !!edit.isConnected;
      if (Object.keys(fields).length) {
        const ok = await adminService.updateDevice(id, fields);
        if (!ok) throw new Error('Device update failed');
      }
      const subChanged = Number(edit.subscriptionActive || 0) !== Number(dev.subscriptionActive || 0)
        || String(edit.subscriptionEndDate || '') !== String(dev.subscriptionEndDate || '');
      if (subChanged) {
        const okSub = await esp8266Service.updateDeviceSubscription(
          id,
          Number(edit.subscriptionActive || 0) === 1 ? 1 : 0,
          String(edit.subscriptionEndDate || ''),
        );
        if (!okSub) throw new Error('Subscription update failed');
      }
      const updatedDevices = devices.map((d:any) => d.id === id ? {
        ...d,
        name: String(edit.name || ''),
        deviceType: String(edit.deviceType || ''),
        room: String(edit.room || '') || null,
        isOn: !!edit.isOn,
        isConnected: !!edit.isConnected,
        macAddress: String(edit.macAddress || ''),
        ip: String(edit.ip || ''),
        ssid: String(edit.ssid || ''),
        brightness: Number(edit.brightness ?? 0),
        flowRate: Number(edit.flowRate ?? 0),
        totalLiters: Number(edit.totalLiters ?? 0),
        target: Number(edit.target ?? 0),
        device1: edit.device1 ? 1 : 0,
        device2: edit.device2 ? 1 : 0,
        device3: edit.device3 ? 1 : 0,
        device4: edit.device4 ? 1 : 0,
        device5: edit.device5 ? 1 : 0,
        firmwareVersion: String(edit.firmwareVersion || ''),
        lastSeen: String(edit.lastSeen || ''),
        createdAt: String(edit.createdAt || ''),
        userId: String(edit.userId || ''),
        deviceId: String(edit.deviceId || ''),
        subdevice1: String(edit.subdevice1 || ''),
        subdevice2: String(edit.subdevice2 || ''),
        subdevice3: String(edit.subdevice3 || ''),
        subdevice4: String(edit.subdevice4 || ''),
        subdevice5: String(edit.subdevice5 || ''),
        subscriptionActive: Number(edit.subscriptionActive || 0) === 1 ? 1 : 0,
        subscriptionEndDate: String(edit.subscriptionEndDate || ''),
      } : d);
      setDevices(updatedDevices);
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Device updated', position: 'bottom' });
    } catch (e:any) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: e?.message || 'Could not update device', position: 'bottom' });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}><View style={styles.center}><ActivityIndicator /></View></SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>User Details</Text>
          {!isEditing ? (
            <View>
              <Text style={styles.sub}>{detail?.name}</Text>
              <Text style={styles.sub}>{detail?.email} • {detail?.role}</Text>
              {detail?.phone ? <Text style={styles.sub}>{detail?.phone}</Text> : null}
              {detail?.createdAt ? <Text style={styles.sub}>Created: {String(detail?.createdAt).slice(0,10)}</Text> : null}
              {detail?.subscriptionType ? <Text style={styles.sub}>Subscription Type: {String(detail?.subscriptionType)}</Text> : null}
              {detail?.subscriptionId ? <Text style={styles.sub}>Subscription ID: {String(detail?.subscriptionId)}</Text> : null}
              {detail?.planId ? <Text style={styles.sub}>Plan ID: {String(detail?.planId)}</Text> : null}
              {Array.isArray(detail?.subdeviceIds) ? <Text style={styles.sub}>Subdevices: {detail.subdeviceIds.join(', ')}</Text> : null}
              <Text style={styles.sub}>Beta Tester: {betaTester ? 'Yes' : 'No'}</Text>
              <Text style={styles.sub}>Shared Access Enabled: {sharedAccessEnabled ? 'Yes' : 'No'}</Text>
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                value={String(detail?.name || '')}
                onChangeText={(v)=>setDetail((d:any)=>({ ...d, name: v }))}
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={COLORS.textLight}
              />
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                value={String(detail?.email || '')}
                onChangeText={(v)=>setDetail((d:any)=>({ ...d, email: v }))}
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={COLORS.textLight}
              />
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                value={String(detail?.phone || '')}
                onChangeText={(v)=>setDetail((d:any)=>({ ...d, phone: v }))}
                style={styles.input}
                placeholder="Phone"
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.textLight}
              />
              <Text style={styles.inputLabel}>Role</Text>
              <TextInput
                value={String(detail?.role || 'user')}
                onChangeText={(v)=>setDetail((d:any)=>({ ...d, role: v }))}
                style={styles.input}
                placeholder="user | admin"
                autoCapitalize="none"
                placeholderTextColor={COLORS.textLight}
              />
              <View style={{ flexDirection:'row', alignItems:'center', marginTop: 10 }}>
                <Text style={styles.inputLabel}>Beta Tester</Text>
                <Switch value={betaTester} onValueChange={setBetaTester} />
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', marginTop: 10 }}>
                <Text style={styles.inputLabel}>Shared Access Enabled</Text>
                <Switch value={sharedAccessEnabled} onValueChange={setSharedAccessEnabled} />
              </View>
              <Text style={styles.inputLabel}>Subscription Type</Text>
              <TextInput
                value={subscriptionType}
                onChangeText={setSubscriptionType}
                style={styles.input}
                placeholder="Subscription Type"
                autoCapitalize="none"
                placeholderTextColor={COLORS.textLight}
              />
              <Text style={styles.inputLabel}>Subscription ID</Text>
              <TextInput
                value={subscriptionId}
                onChangeText={setSubscriptionId}
                style={styles.input}
                placeholder="Subscription ID"
                autoCapitalize="none"
                placeholderTextColor={COLORS.textLight}
              />
              <Text style={styles.inputLabel}>Subdevice IDs (comma separated)</Text>
              <TextInput
                value={subdeviceIdsStr}
                onChangeText={setSubdeviceIdsStr}
                style={styles.input}
                placeholder="d1,d2,d3"
                autoCapitalize="none"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          )}
          <View style={{ flexDirection:'row', marginTop: 12 }}>
            {!isEditing ? (
              <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={()=>setIsEditing(true)}>
                <Text style={styles.btnTxt}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.secondary }]} activeOpacity={0.85} onPress={handleSave}>
                  <Text style={styles.btnTxt}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.gray, marginLeft: 8 }]} activeOpacity={0.85} onPress={()=>setIsEditing(false)}>
                  <Text style={styles.btnTxt}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Rooms</Text>
          <FlatList
            data={roomsWithUnassigned}
            keyExtractor={(r)=>String(r.id)}
            renderItem={({item}) => {
              const list = devicesByRoom[String(item.id)] || [];
              return (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSub}>{item.deviceCount} devices</Text>
                  <View style={styles.devicesList}>
                    {list.length > 0 ? (
                      list.map((d:any) => (
                        <View key={String(d.id)} style={styles.deviceRow}>
                          <Text style={styles.deviceName}>{String(d.name || '')}</Text>
                          <Text style={styles.deviceType}>{String(d.deviceType || d.device_type || '')}</Text>
                          <TouchableOpacity style={styles.btnSm} activeOpacity={0.85} onPress={() => { setEditDeviceId(String(d.id)); setShowEditModal(true); }}>
                            <Text style={styles.btnTxt}>Edit</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.cardSub}>No devices</Text>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Devices</Text>
          <View style={{ backgroundColor: COLORS.white, borderRadius: SIZES.radius, ...SHADOWS.large }}>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title><Text style={styles.tableHead}>Name</Text></DataTable.Title>
                <DataTable.Title><Text style={styles.tableHead}>Type</Text></DataTable.Title>
                <DataTable.Title><Text style={styles.tableHead}>Room</Text></DataTable.Title>
                <DataTable.Title><Text style={styles.tableHead}>Power</Text></DataTable.Title>
                <DataTable.Title><Text style={styles.tableHead}>Sub</Text></DataTable.Title>
                <DataTable.Title><Text style={styles.tableHead}>Expiry</Text></DataTable.Title>
                <DataTable.Title><Text style={styles.tableHead}>Actions</Text></DataTable.Title>
              </DataTable.Header>
              {devices.map((d:any) => {
                const id = String(d.id);
                const e = devEdits[id] || {};
                return (
                  <DataTable.Row key={id}>
                    <DataTable.Cell style={{ flex: 2 }}>
                      <TextInput
                        value={String(e.name ?? d.name ?? '')}
                        onChangeText={(v)=>setDevEdits((prev)=>({ ...prev, [id]: { ...(prev[id]||{}), name: v } }))}
                        style={styles.tableInput}
                        placeholder="Name"
                        placeholderTextColor={COLORS.textLight}
                      />
                    </DataTable.Cell>
                    <DataTable.Cell style={{ flex: 1.5 }}>
                      <TextInput
                        value={String(e.deviceType ?? d.deviceType ?? '')}
                        onChangeText={(v)=>setDevEdits((prev)=>({ ...prev, [id]: { ...(prev[id]||{}), deviceType: v } }))}
                        style={styles.tableInput}
                        placeholder="Type"
                        placeholderTextColor={COLORS.textLight}
                      />
                    </DataTable.Cell>
                    <DataTable.Cell style={{ flex: 1.5 }}>
                      <TextInput
                        value={String(e.room ?? d.room ?? d.roomId ?? '')}
                        onChangeText={(v)=>setDevEdits((prev)=>({ ...prev, [id]: { ...(prev[id]||{}), room: v } }))}
                        style={styles.tableInput}
                        placeholder="Room ID"
                        placeholderTextColor={COLORS.textLight}
                      />
                      {String(d.roomName || '').length > 0 ? (
                        <Text style={styles.tableSub}>{String(d.roomName)}</Text>
                      ) : null}
                    </DataTable.Cell>
                    <DataTable.Cell style={{ flex: 1 }}>
                      <Switch
                        value={Boolean(e.isOn ?? d.isOn)}
                        onValueChange={(v)=>setDevEdits((prev)=>({ ...prev, [id]: { ...(prev[id]||{}), isOn: v } }))}
                      />
                    </DataTable.Cell>
                    <DataTable.Cell style={{ flex: 1 }}>
                      <Switch
                        value={Number(e.subscriptionActive ?? d.subscriptionActive ?? 0) === 1}
                        onValueChange={(v)=>setDevEdits((prev)=>({ ...prev, [id]: { ...(prev[id]||{}), subscriptionActive: v ? 1 : 0 } }))}
                      />
                    </DataTable.Cell>
                    <DataTable.Cell style={{ flex: 1.5 }}>
                      <TextInput
                        value={String(e.subscriptionEndDate ?? d.subscriptionEndDate ?? '')}
                        onChangeText={(v)=>setDevEdits((prev)=>({ ...prev, [id]: { ...(prev[id]||{}), subscriptionEndDate: v } }))}
                        style={styles.tableInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={COLORS.textLight}
                      />
                    </DataTable.Cell>
                    <DataTable.Cell style={{ flex: 1.2 }}>
                      <TouchableOpacity style={styles.btnSm} activeOpacity={0.85} onPress={()=>handleSaveDevice(d)}>
                        <Text style={styles.btnTxt}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btnSm, { backgroundColor: COLORS.secondary, marginLeft: 8 }]} activeOpacity={0.85} onPress={()=>{ setEditDeviceId(id); setShowEditModal(true); }}>
                        <Text style={styles.btnTxt}>Edit</Text>
                      </TouchableOpacity>
                    </DataTable.Cell>
                  </DataTable.Row>
                );
              })}
              {devices.length === 0 ? (
                <DataTable.Row>
                  <DataTable.Cell>
                    <Text style={styles.cardSub}>No devices</Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ) : null}
            </DataTable>
          </View>
        </View>
      </ScrollView>
      <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={()=>setShowEditModal(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Edit Device</Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              {editDeviceId && (() => {
                const e = devEdits[editDeviceId] || {};
                const setField = (k:string, v:any) => setDevEdits(prev => ({ ...prev, [editDeviceId]: { ...(prev[editDeviceId]||{}), [k]: v } }));
                return (
                  <View>
                    <Text style={styles.inputLabel}>id</Text>
                    <TextInput editable={false} value={editDeviceId} style={styles.input} />
                    <Text style={styles.inputLabel}>user_id</Text>
                    <TextInput value={String(e.userId || '')} onChangeText={(v)=>setField('userId', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>room_id</Text>
                    <TextInput value={String(e.room || '')} onChangeText={(v)=>setField('room', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>name</Text>
                    <TextInput value={String(e.name || '')} onChangeText={(v)=>setField('name', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>device_type</Text>
                    <TextInput value={String(e.deviceType || '')} onChangeText={(v)=>setField('deviceType', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>mac_address</Text>
                    <TextInput value={String(e.macAddress || '')} onChangeText={(v)=>setField('macAddress', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>ip_address</Text>
                    <TextInput value={String(e.ip || '')} onChangeText={(v)=>setField('ip', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>ssid</Text>
                    <TextInput value={String(e.ssid || '')} onChangeText={(v)=>setField('ssid', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <View style={{ flexDirection:'row', alignItems:'center', marginTop: 8 }}>
                      <Text style={styles.inputLabel}>is_connected</Text>
                      <Switch value={!!e.isConnected} onValueChange={(v)=>setField('isConnected', v)} />
                    </View>
                    <View style={{ flexDirection:'row', alignItems:'center', marginTop: 8 }}>
                      <Text style={styles.inputLabel}>is_on</Text>
                      <Switch value={!!e.isOn} onValueChange={(v)=>setField('isOn', v)} />
                    </View>
                    <Text style={styles.inputLabel}>brightness</Text>
                    <TextInput value={String(e.brightness ?? '')} onChangeText={(v)=>setField('brightness', Number(v))} style={styles.input} keyboardType="numeric" placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>flow_rate</Text>
                    <TextInput value={String(e.flowRate ?? '')} onChangeText={(v)=>setField('flowRate', Number(v))} style={styles.input} keyboardType="numeric" placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>total_liters</Text>
                    <TextInput value={String(e.totalLiters ?? '')} onChangeText={(v)=>setField('totalLiters', Number(v))} style={styles.input} keyboardType="numeric" placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>target</Text>
                    <TextInput value={String(e.target ?? '')} onChangeText={(v)=>setField('target', Number(v))} style={styles.input} keyboardType="numeric" placeholderTextColor={COLORS.textLight} />
                    <View style={{ flexDirection:'row', flexWrap:'wrap', marginTop: 8 }}>
                      <View style={styles.bitWrap}><Text style={styles.inputLabel}>device1</Text><Switch value={!!e.device1} onValueChange={(v)=>setField('device1', v)} /></View>
                      <View style={styles.bitWrap}><Text style={styles.inputLabel}>device2</Text><Switch value={!!e.device2} onValueChange={(v)=>setField('device2', v)} /></View>
                      <View style={styles.bitWrap}><Text style={styles.inputLabel}>device3</Text><Switch value={!!e.device3} onValueChange={(v)=>setField('device3', v)} /></View>
                      <View style={styles.bitWrap}><Text style={styles.inputLabel}>device4</Text><Switch value={!!e.device4} onValueChange={(v)=>setField('device4', v)} /></View>
                      <View style={styles.bitWrap}><Text style={styles.inputLabel}>device5</Text><Switch value={!!e.device5} onValueChange={(v)=>setField('device5', v)} /></View>
                    </View>
                    <Text style={styles.inputLabel}>firmware_version</Text>
                    <TextInput value={String(e.firmwareVersion || '')} onChangeText={(v)=>setField('firmwareVersion', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>last_seen</Text>
                    <TextInput value={String(e.lastSeen || '')} onChangeText={(v)=>setField('lastSeen', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>created_at</Text>
                    <TextInput value={String(e.createdAt || '')} onChangeText={(v)=>setField('createdAt', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>deviceId</Text>
                    <TextInput value={String(e.deviceId || '')} onChangeText={(v)=>setField('deviceId', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>subdevice1</Text>
                    <TextInput value={String(e.subdevice1 || '')} onChangeText={(v)=>setField('subdevice1', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>subdevice2</Text>
                    <TextInput value={String(e.subdevice2 || '')} onChangeText={(v)=>setField('subdevice2', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>subdevice3</Text>
                    <TextInput value={String(e.subdevice3 || '')} onChangeText={(v)=>setField('subdevice3', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>subdevice4</Text>
                    <TextInput value={String(e.subdevice4 || '')} onChangeText={(v)=>setField('subdevice4', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                    <Text style={styles.inputLabel}>subdevice5</Text>
                    <TextInput value={String(e.subdevice5 || '')} onChangeText={(v)=>setField('subdevice5', v)} style={styles.input} placeholderTextColor={COLORS.textLight} />
                  </View>
                );
              })()}
            </ScrollView>
            <View style={{ flexDirection:'row', justifyContent:'flex-end' }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.secondary }]} activeOpacity={0.85} onPress={() => {
                const d = devices.find((x:any)=>String(x.id) === String(editDeviceId));
                if (d) handleSaveDevice(d);
                setShowEditModal(false);
              }}>
                <Text style={styles.btnTxt}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.gray, marginLeft: 8 }]} activeOpacity={0.85} onPress={()=>setShowEditModal(false)}>
                <Text style={styles.btnTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: COLORS.background },
  center: { flex:1, alignItems:'center', justifyContent:'center' },
  scrollContent: { paddingBottom: SIZES.margin },
  header: { padding: SIZES.padding },
  title: { ...FONTS.h2, color: COLORS.textDark },
  sub: { ...FONTS.body3, color: COLORS.textLight },
  inputLabel: { ...FONTS.small, color: COLORS.textLight, marginTop: 8 },
  input: { borderWidth: 1, borderColor: COLORS.textVeryLight, borderRadius: SIZES.radius, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6, backgroundColor: COLORS.white },
  btn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnTxt: { ...FONTS.body3, color: COLORS.white },
  section: { paddingHorizontal: SIZES.padding, marginTop: SIZES.margin },
  sectionTitle: { ...FONTS.h3, color: COLORS.textDark, marginBottom: 8 },
  card: { backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, marginBottom: 10, ...SHADOWS.large },
  cardTitle: { ...FONTS.body2, color: COLORS.textDark },
  cardSub: { ...FONTS.body3, color: COLORS.textLight },
  devicesList: { marginTop: 8 },
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  deviceName: { ...FONTS.body3, color: COLORS.textDark },
  deviceType: { ...FONTS.small, color: COLORS.textLight },
  tableHead: { ...FONTS.body3, color: COLORS.textLight },
  tableInput: { borderWidth: 1, borderColor: COLORS.textVeryLight, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.white },
  tableSub: { ...FONTS.small, color: COLORS.textLight, marginTop: 4 },
  btnSm: { backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  modalWrap: { flex:1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems:'center', justifyContent:'center' },
  modalCard: { width: '92%', backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, ...SHADOWS.large },
  bitWrap: { flexDirection:'row', alignItems:'center', marginRight: 12 }
});

export default AdminUserDetailScreen;
