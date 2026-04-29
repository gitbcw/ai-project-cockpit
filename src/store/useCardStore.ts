import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { CardItem, TaskCard, FinanceCard, TabType, SortMode, Subtask } from '@/types/card';
import { validateCards } from '@/utils/validate';

interface CardStore {
  cards: CardItem[];
  selectedCardId: string | null;
  activeTab: TabType;
  searchQuery: string;
  isNewCard: boolean;
  sortMode: SortMode;

  addCard: (card: CardItem) => void;
  updateCard: (id: string, updates: Partial<Omit<TaskCard, 'type'>> | Partial<Omit<FinanceCard, 'type'>>) => void;
  deleteCard: (id: string) => void;
  reorderCards: (cardIds: string[]) => void;
  selectCard: (id: string | null) => void;
  setActiveTab: (tab: TabType) => void;
  setSearchQuery: (query: string) => void;
  clearIsNew: () => void;
  setSortMode: (mode: SortMode) => void;

  createTaskCard: (data: Omit<TaskCard, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'type'>) => void;
  createFinanceCard: (data: Omit<FinanceCard, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'type'>) => void;
  toggleSubtask: (cardId: string, subtaskId: string) => void;
  addSubtask: (cardId: string, title: string) => void;
  deleteSubtask: (cardId: string, subtaskId: string) => void;
  duplicateCard: (id: string) => void;
  importCards: (json: string) => boolean;
}

export const useCardStore = create<CardStore>()(
  persist(
    (set, get) => ({
      cards: [],
      selectedCardId: null,
      activeTab: 'task' as TabType,
      searchQuery: '',
      isNewCard: false,
      sortMode: 'manual' as SortMode,

      addCard: (card) =>
        set((state) => ({ cards: [...state.cards, card] })),

      updateCard: (id, updates) =>
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === id ? ({ ...c, ...updates, updatedAt: new Date().toISOString() } as CardItem) : c
          ),
        })),

      deleteCard: (id) =>
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== id),
          selectedCardId: state.selectedCardId === id ? null : state.selectedCardId,
        })),

      reorderCards: (cardIds) =>
        set((state) => {
          const reorderedMap = new Map(cardIds.map((id, index) => [id, index]));
          const newCards = state.cards.map((c) => {
            const newOrder = reorderedMap.get(c.id);
            return newOrder !== undefined
              ? ({ ...c, order: newOrder } as CardItem)
              : c;
          });
          return { cards: newCards };
        }),

      selectCard: (id) => set({ selectedCardId: id, isNewCard: false }),
      setActiveTab: (tab) => set({ activeTab: tab, searchQuery: '' }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      clearIsNew: () => set({ isNewCard: false }),
      setSortMode: (mode) => set({ sortMode: mode }),

      createTaskCard: (data) => {
        const now = new Date().toISOString();
        const id = uuidv4();
        const cards = get().cards;
        const maxOrder = cards.reduce((max, c) => Math.max(max, c.order), -1);
        const card: TaskCard = {
          ...data,
          id,
          type: 'task',
          createdAt: now,
          updatedAt: now,
          order: maxOrder + 1,
        };
        set((state) => ({
          cards: [...state.cards, card],
          selectedCardId: id,
          isNewCard: true,
        }));
      },

      createFinanceCard: (data) => {
        const now = new Date().toISOString();
        const id = uuidv4();
        const cards = get().cards;
        const maxOrder = cards.reduce((max, c) => Math.max(max, c.order), -1);
        const card: FinanceCard = {
          ...data,
          id,
          type: 'finance',
          createdAt: now,
          updatedAt: now,
          order: maxOrder + 1,
        };
        set((state) => ({
          cards: [...state.cards, card],
          selectedCardId: id,
          isNewCard: true,
        }));
      },

      toggleSubtask: (cardId, subtaskId) =>
        set((state) => ({
          cards: state.cards.map((c) => {
            if (c.id !== cardId || c.type !== 'task') return c;
            const card = c as TaskCard;
            const subtasks = card.subtasks.map((st) =>
              st.id === subtaskId ? { ...st, completed: !st.completed } : st
            );
            const completed = subtasks.filter((st) => st.completed).length;
            const progress = subtasks.length > 0 ? Math.round((completed / subtasks.length) * 100) : 0;
            return { ...card, subtasks, progress, updatedAt: new Date().toISOString() };
          }),
        })),

      addSubtask: (cardId, title) =>
        set((state) => ({
          cards: state.cards.map((c) => {
            if (c.id !== cardId || c.type !== 'task') return c;
            const card = c as TaskCard;
            const newSubtask: Subtask = { id: uuidv4(), title, completed: false };
            const subtasks = [...card.subtasks, newSubtask];
            const completed = subtasks.filter((st) => st.completed).length;
            const progress = subtasks.length > 0 ? Math.round((completed / subtasks.length) * 100) : 0;
            return { ...card, subtasks, progress, updatedAt: new Date().toISOString() };
          }),
        })),

      deleteSubtask: (cardId, subtaskId) =>
        set((state) => ({
          cards: state.cards.map((c) => {
            if (c.id !== cardId || c.type !== 'task') return c;
            const card = c as TaskCard;
            const subtasks = card.subtasks.filter((st) => st.id !== subtaskId);
            const completed = subtasks.filter((st) => st.completed).length;
            const progress = subtasks.length > 0 ? Math.round((completed / subtasks.length) * 100) : 0;
            return { ...card, subtasks, progress, updatedAt: new Date().toISOString() };
          }),
        })),

      duplicateCard: (id) =>
        set((state) => {
          const card = state.cards.find((c) => c.id === id);
          if (!card) return state;
          const now = new Date().toISOString();
          const maxOrder = state.cards.reduce((max, c) => Math.max(max, c.order), -1);
          const clone: CardItem = {
            ...JSON.parse(JSON.stringify(card)),
            id: uuidv4(),
            title: card.title + ' (副本)',
            createdAt: now,
            updatedAt: now,
            order: maxOrder + 1,
          };
          return { cards: [...state.cards, clone] };
        }),

      importCards: (json) => {
        try {
          const data = JSON.parse(json);
          const validCards = validateCards(data);
          if (!validCards) return false;
          set({ cards: validCards });
          return true;
        } catch {
          return false;
        }
      },
    }),
    { name: 'team-cards-storage' }
  )
);
