import type { CardItem, FinanceCard } from '@/types/card';
import { imageUrlToBase64 } from '@/utils/image';

function isLocalPath(url: string) {
  return url.startsWith('/uploads/');
}

export async function exportCards(cards: CardItem[]) {
  const exportable = await Promise.all(
    cards.map(async (card) => {
      if (card.type !== 'finance') return card;
      const fc = card as FinanceCard;
      const images = await Promise.all(
        fc.images.map((url) => (isLocalPath(url) ? imageUrlToBase64(url) : url)),
      );
      return { ...card, images };
    }),
  );

  const data = JSON.stringify(
    { cards: exportable, version: 1, exportedAt: new Date().toISOString() },
    null,
    2,
  );
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `team-cards-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
