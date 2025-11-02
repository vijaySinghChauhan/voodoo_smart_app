import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  ViewStyle,
  TextStyle,
  TextInputProps 
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../theme/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  labelStyle,
  inputStyle,
  errorStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      )}
      
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          inputStyle
        ]}
        placeholderTextColor={COLORS.textVeryLight}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      
      {error && (
        <Text style={[styles.errorText, errorStyle]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.margin,
  },
  label: {
    ...FONTS.body2,
    color: COLORS.textMedium,
    marginBottom: SIZES.base,
  },
  input: {
    height: 50,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: SIZES.radius / 2,
    paddingHorizontal: SIZES.padding / 2,
    color: COLORS.textDark,
    ...FONTS.body2,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    ...FONTS.body3,
    color: COLORS.error,
    marginTop: SIZES.base / 2,
  },
});

export default Input;