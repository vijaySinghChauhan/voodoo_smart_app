import * as React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';

export function SimpleDateTime({
  label,
  value,
  onPress,
  type = 'datetime',
}: {
  label: string;
  value: Date | null;
  onPress: () => void;
  type?: 'date' | 'time' | 'datetime';
}) {
  return (
    <View>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={onPress}>
        <TextInput
          editable={false}
          label={label}
          style={{ backgroundColor: 'transparent' }}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          multiline={true}
          numberOfLines={2}
          value={value ? (type === 'time' ? value.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : value.toLocaleDateString([], {day: 'numeric', month: 'short', year: 'numeric'}) + ' ' + value.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})) : ''}
        />
      </TouchableOpacity>
    </View>
  );
}
