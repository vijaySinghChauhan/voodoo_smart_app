import * as React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {  TextInput } from 'react-native-paper';
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';

export function DateTime({
  label,
  value,
  onChange,
  type = 'datetime',
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  type?: 'date' | 'time' | 'datetime';
}) {
  const [dateVisible, setDateVisible] = React.useState(false);
  const [timeVisible, setTimeVisible] = React.useState(false);
const [workingDate, setWorkingDate] = React.useState<Date>(value ?? new Date());

  const showPicker = () => {
    if (type === 'time') {
      setTimeVisible(true);
    } else {
      setDateVisible(true);
    }
  };
  React.useEffect(() => {
  if (value) setWorkingDate(value);
}, [value]);

const onConfirmDate = ({ date }: any) => {
  setDateVisible(false);

  const updated = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    workingDate.getHours(),
    workingDate.getMinutes()
  );

  setWorkingDate(updated);
  onChange(updated);

  if (type === 'datetime') {
    setTimeout(() => setTimeVisible(true), 300);
  }
};


 const onConfirmTime = ({ hours, minutes }: any) => {
  setTimeVisible(false);

  const updated = new Date(
    workingDate.getFullYear(),
    workingDate.getMonth(),
    workingDate.getDate(),
    hours,
    minutes
  );

  setWorkingDate(updated);
  onChange(updated);
};


  return (
    <View>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={showPicker}>
      <TextInput
        editable={false}
        label={label}
        style={{ backgroundColor: 'transparent' }}
        underlineColor="transparent"
        activeUnderlineColor="transparent"
        value={value ? (type === 'time' ? value.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : value.toLocaleString()) : ''}
      />
      </TouchableOpacity>

      <DatePickerModal
        locale="en"
        mode="single"
        visible={dateVisible}
        date={workingDate}
        onDismiss={() => setDateVisible(false)}
        onConfirm={onConfirmDate}
      />

      <TimePickerModal
        visible={timeVisible}
        onDismiss={() => { setTimeVisible(false); }}
        onConfirm={onConfirmTime}
        hours={value?.getHours() ?? new Date().getHours()}
        minutes={value?.getMinutes() ?? new Date().getMinutes()}
      />
    </View>
  );
}
