import React from 'react';
import { View, Text } from 'react-native';

const DateTimePicker = (props) => {
  return (
    <View>
      <Text>DatePicker not supported on web</Text>
    </View>
  );
};

export default DateTimePicker;
export const DateTimePickerAndroid = { open: () => {}, dismiss: () => {} };
