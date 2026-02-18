declare module 'react-native-background-timer' {
  type TimerId = number | string | undefined;
  interface BackgroundTimerAPI {
    setInterval(handler: (...args: any[]) => void, timeout: number): TimerId;
    clearInterval(id: TimerId): void;
    setTimeout(handler: (...args: any[]) => void, timeout: number): TimerId;
    clearTimeout(id: TimerId): void;
  }
  const BackgroundTimer: BackgroundTimerAPI;
  export default BackgroundTimer;
}
