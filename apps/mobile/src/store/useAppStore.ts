import { create } from "zustand";
import * as Localization from "expo-localization";
import type { ChallengeSummary } from "../api";

export type HomeState =
  | "no-active"
  | "pending-payment"
  | "active-countdown"
  | "active-window-open"
  | "checked-in"
  | "missed"
  | "completed"
  | "rewarded";

type AppState = {
  authToken: string | null;
  walletAddress: string | null;
  timezone: string;
  activeChallenge: ChallengeSummary | null;
  homeState: HomeState;
  dayNumber: number;
  rewardAmount: string;
  connectWallet: (payload: { walletAddress: string; authToken: string; timezone: string }) => void;
  setActiveChallenge: (challenge: ChallengeSummary | null) => void;
  setHomeState: (state: HomeState) => void;
  setDayNumber: (dayNumber: number) => void;
};

export const useAppStore = create<AppState>((set) => ({
  authToken: null,
  walletAddress: null,
  timezone: Localization.getCalendars()[0]?.timeZone ?? "Asia/Manila",
  activeChallenge: null,
  homeState: "no-active",
  dayNumber: 1,
  rewardAmount: "0.22",
  connectWallet: ({ walletAddress, authToken, timezone }) =>
    set({
      walletAddress,
      authToken,
      timezone,
      homeState: "no-active",
    }),
  setActiveChallenge: (activeChallenge) => set({ activeChallenge }),
  setHomeState: (homeState) => set({ homeState }),
  setDayNumber: (dayNumber) => set({ dayNumber }),
}));

