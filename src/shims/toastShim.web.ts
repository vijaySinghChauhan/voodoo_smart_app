const Toast = {
  show({ type, text1, text2, position }: { type?: string; text1?: string; text2?: string; position?: string }) {
    const tag = type ? `[${type}]` : '';
    const pos = position ? ` (${position})` : '';
    console.log(`Toast${pos} ${tag}: ${text1 || ''} ${text2 || ''}`);
  },
};

export default Toast;

