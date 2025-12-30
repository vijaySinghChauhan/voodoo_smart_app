import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';

export interface DateTimePickerConfig {
  value: Date | null;
  onChange: (d: Date) => void;
  type: 'date' | 'time' | 'datetime';
}

export interface DateTimePickerManagerRef {
  open: (config: DateTimePickerConfig) => void;
}

export const DateTimePickerManager = forwardRef<DateTimePickerManagerRef, {}>((props, ref) => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [pickerConfig, setPickerConfig] = useState<DateTimePickerConfig | null>(null);
  const [tempDate, setTempDate] = useState(new Date());

  useImperativeHandle(ref, () => ({
    open: (config: DateTimePickerConfig) => {
      setPickerConfig(config);
      const initialDate = config.value ? new Date(config.value) : new Date();
      setTempDate(initialDate);
      
      if (config.type === 'time') {
        setTimePickerVisible(true);
      } else {
        setPickerVisible(true);
      }
    }
  }));

  const onConfirmDate = ({ date }: any) => {
    setPickerVisible(false);
    if (!pickerConfig) return;

    const baseDate = date || tempDate;
    const prev = tempDate;
    
    const newDate = new Date(baseDate);
    // Keep previous time
    newDate.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
    setTempDate(newDate);

    if (pickerConfig.type === 'datetime') {
        // Proceed to time picker
        setTimeout(() => setTimePickerVisible(true), 300);
    } else {
        // Done (type='date')
        pickerConfig.onChange(newDate);
        setPickerConfig(null);
    }
  };

  const onConfirmTime = ({ hours, minutes }: any) => {
    setTimePickerVisible(false);
    if (!pickerConfig) return;

    const newDate = new Date(tempDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    
    pickerConfig.onChange(newDate);
    setPickerConfig(null);
  };

  return (
    <>
      <DatePickerModal
        locale="en"
        mode="single"
        visible={pickerVisible}
        onDismiss={() => setPickerVisible(false)}
        date={tempDate}
        onConfirm={onConfirmDate}
      />
      <TimePickerModal
        visible={timePickerVisible}
        onDismiss={() => setTimePickerVisible(false)}
        onConfirm={onConfirmTime}
        hours={tempDate.getHours()}
        minutes={tempDate.getMinutes()}
      />
    </>
  );
});
