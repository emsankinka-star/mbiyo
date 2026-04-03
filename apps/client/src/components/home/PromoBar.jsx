'use client';

export default function PromoBar() {
  return (
    <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-4 mt-4 text-white shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-white/80">🔥 Promo du jour</p>
          <p className="font-bold text-lg">Livraison gratuite</p>
          <p className="text-xs text-white/80">Sur votre 1ère commande</p>
        </div>
        <div className="text-4xl">🛵</div>
      </div>
    </div>
  );
}
