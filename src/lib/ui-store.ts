"use client";

import { create } from "zustand";

import type { Pin } from "./types";

interface UiState {
  addPinOpen: boolean;
  openAddPin: () => void;
  closeAddPin: () => void;
  // When set, the add-pin flow opens prefilled and saves as an update.
  editPin: Pin | null;
  openEditPin: (pin: Pin) => void;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  selectedPinId: string | null;
  selectPin: (id: string | null) => void;
  // Set by feed/board "view on map" so the map can fly there on mount.
  flyTo: { lng: number; lat: number } | null;
  setFlyTo: (target: { lng: number; lat: number } | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  addPinOpen: false,
  openAddPin: () => set({ addPinOpen: true, editPin: null }),
  closeAddPin: () => set({ addPinOpen: false, editPin: null }),
  editPin: null,
  openEditPin: (pin) => set({ addPinOpen: true, editPin: pin, selectedPinId: null }),
  profileOpen: false,
  setProfileOpen: (open) => set({ profileOpen: open }),
  selectedPinId: null,
  selectPin: (id) => set({ selectedPinId: id }),
  flyTo: null,
  setFlyTo: (target) => set({ flyTo: target }),
}));
