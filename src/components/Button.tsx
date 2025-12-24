import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle 
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../theme/theme';
import logService from '../services/logging/logService';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'small',
  disabled = false,
  loading = false,
  style,
  labelStyle,
}) => {
  // Determine button styles based on variant and size
  const getButtonStyles = () => {
    let buttonStyle: ViewStyle = {};
    
    // Variant styles
    switch (variant) {
      case 'primary':
        buttonStyle = styles.primaryButton;
        break;
      case 'secondary':
        buttonStyle = styles.secondaryButton;
        break;
      case 'outline':
        buttonStyle = styles.outlineButton;
        break;
      case 'ghost':
        buttonStyle = styles.ghostButton;
        break;
    }
    
    // Size styles
    switch (size) {
      case 'small':
        buttonStyle = { ...buttonStyle, ...styles.smallButton };
        break;
      case 'medium':
        buttonStyle = { ...buttonStyle, ...styles.mediumButton };
        break;
      case 'large':
        buttonStyle = { ...buttonStyle, ...styles.largeButton };
        break;
    }
    
    // Disabled state
    if (disabled) {
      buttonStyle = { ...buttonStyle, ...styles.disabledButton };
    }
    
    return buttonStyle;
  };
  
  // Determine text styles based on variant
  const getTextStyles = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'ghost':
        return styles.ghostText;
      default:
        return styles.primaryText;
    }
  };
  
  const handlePress = async () => {
    try {
      // Log the click with label and variant/size metadata
      await logService.logButtonClick(label, { variant, size });
    } catch (e) { /* ignore */ }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' || variant === 'secondary' ? COLORS.white : COLORS.primary} 
          size="small" 
        />
      ) : (
        <Text style={[getTextStyles(), labelStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Variant styles
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostButton: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Size styles
  smallButton: {
    paddingVertical: SIZES.base * 0.75,
    paddingHorizontal: SIZES.padding / 3,
  },
  mediumButton: {
    paddingVertical: SIZES.base * 1.5,
    paddingHorizontal: SIZES.padding,
  },
  largeButton: {
    paddingVertical: SIZES.base * 2,
    paddingHorizontal: SIZES.padding * 1.5,
  },
  
  // State styles
  disabledButton: {
    opacity: 0.6,
  },
  
  // Text styles
  primaryText: {
    ...FONTS.body2,
    color: COLORS.white,
    fontWeight: '600',
  },
  secondaryText: {
    ...FONTS.body2,
    color: COLORS.white,
    fontWeight: '600',
  },
  outlineText: {
    ...FONTS.body2,
    color: COLORS.primary,
    fontWeight: '600',
  },
  ghostText: {
    ...FONTS.body2,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default Button;
