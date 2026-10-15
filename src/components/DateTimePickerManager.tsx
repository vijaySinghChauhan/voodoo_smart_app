
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import {
  DatePickerModal,
  TimePickerModal,
} from 'react-native-paper-dates';

export interface DateTimePickerConfig {
  value: Date | null;
  onChange: (d: Date) => void;
  type: 'date' | 'time' | 'datetime';
}

export interface DateTimePickerManagerRef {
  open: (config: DateTimePickerConfig) => void;
}

export const DateTimePickerManager =
  forwardRef<DateTimePickerManagerRef, {}>((props, ref) => {
    const [pickerVisible, setPickerVisible] = useState(false);
    const [timePickerVisible, setTimePickerVisible] = useState(false);
    const [pickerConfig, setPickerConfig] =
      useState<DateTimePickerConfig | null>(null);
    const [tempDate, setTempDate] = useState(new Date());

    const configRef = useRef<DateTimePickerConfig | null>(null);
    const tempDateRef = useRef(new Date());
    const pendingConfigRef = useRef<DateTimePickerConfig | null>(null);
    const openingRef = useRef(false);

    const updateTempDate = (date: Date) => {
      tempDateRef.current = date;
      setTempDate(date);
    };

    const open = useCallback((config: DateTimePickerConfig) => {
      // Queue a new request if the previous modal is still open.
      if (openingRef.current) {
        pendingConfigRef.current = config;
        setPickerVisible(false);
        setTimePickerVisible(false);
        return;
      }

      openingRef.current = true;
      configRef.current = config;
      setPickerConfig(config);

      const initialDate = config.value
        ? new Date(config.value)
        : new Date();

      updateTempDate(initialDate);

      if (config.type === 'time') {
        setTimePickerVisible(true);
      } else {
        setPickerVisible(true);
      }
    }, []);

    useImperativeHandle(ref, () => ({ open }), [open]);

    const finishAndOpenPending = useCallback(() => {
      configRef.current = null;
      setPickerConfig(null);
      openingRef.current = false;

      const pending = pendingConfigRef.current;
      pendingConfigRef.current = null;

      if (pending) {
        // Let the previous modal finish its dismissal first.
        requestAnimationFrame(() => open(pending));
      }
    }, [open]);

    const onConfirmDate = useCallback(
      ({ date }: { date?: Date }) => {
        setPickerVisible(false);

        const config = configRef.current;
        if (!config) {
          finishAndOpenPending();
          return;
        }

        const previous = tempDateRef.current;
        const selectedDate = new Date(date ?? previous);

        selectedDate.setHours(
          previous.getHours(),
          previous.getMinutes(),
          0,
          0,
        );

        updateTempDate(selectedDate);

        if (config.type === 'datetime') {
          // Keep the configuration active for the time selection.
          requestAnimationFrame(() => setTimePickerVisible(true));
        } else {
          config.onChange(selectedDate);
          finishAndOpenPending();
        }
      },
      [finishAndOpenPending],
    );

    const onConfirmTime = useCallback(
      ({ hours, minutes }: { hours: number; minutes: number }) => {
        setTimePickerVisible(false);

        const config = configRef.current;
        if (!config) {
          finishAndOpenPending();
          return;
        }

        const selectedDate = new Date(tempDateRef.current);
        selectedDate.setHours(hours, minutes, 0, 0);

        updateTempDate(selectedDate);
        config.onChange(selectedDate);

        finishAndOpenPending();
      },
      [finishAndOpenPending],
    );

    const dismiss = useCallback(() => {
      setPickerVisible(false);
      setTimePickerVisible(false);
      pendingConfigRef.current = null;
      finishAndOpenPending();
    }, [finishAndOpenPending]);

    return (
      <>
        <DatePickerModal
          locale="en"
          mode="single"
          visible={pickerVisible}
          onDismiss={dismiss}
          date={tempDate}
          onConfirm={onConfirmDate}
        />

        <TimePickerModal
          visible={timePickerVisible}
          onDismiss={dismiss}
          onConfirm={onConfirmTime}
          hours={tempDate.getHours()}
          minutes={tempDate.getMinutes()}
        />
      </>
    );
  });
