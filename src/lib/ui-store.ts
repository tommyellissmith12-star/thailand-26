"use client";

import { create } from "zustand";

interface UiState {
  addPinOpen: boolean;
  openAddPin: () => void;
  closeAddPin: () => void;
  selectedPinId: string | null;
  selectPin: (id: string | null) => void;
  // Set by feed/board "view on map" so the map can fly there on mount.
  flyTo: { lng: number; lat: number } | null;
  setFlyTo: (target: { lng: number; lat: number } | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  addPinOpen: false,
  openAddPin: () => set({ addPinOpen: true }),
  closeAddPin: () => set({ addPinOpen: false }),
  selectedPinId: null,
  selectPin: (id) => set({ selectedPinId: id }),
  flyTo: null,
  setFlyTo: (target) => set({ flyTo: target }),
}));
