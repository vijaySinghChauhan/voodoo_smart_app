import React from 'react';

type ShowParams = { type?: string; text1?: string; text2?: string; position?: string };

const show = ({ type, text1, text2, position }: ShowParams) => {
  const tag = type ? `[${type}]` : '';
  const pos = position ? ` (${position})` : '';
  // Lightweight console-based feedback for web shim
  // Mirrors API shape of react-native-toast-message's Toast.show
  console.log(`Toast${pos} ${tag}: ${text1 || ''} ${text2 || ''}`);
};

const ToastComponent: React.FC & { show: (params: ShowParams) => void } = () => null;
ToastComponent.show = show;

export default ToastComponent;
