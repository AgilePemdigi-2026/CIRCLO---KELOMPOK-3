import Navbar from '@/components/Navbar';
import MaterialCatalog from '@/components/MaterialCatalog';

// Halaman Material Catalog. Juga menjadi tujuan redirect setelah Seller menekan Confirm
// di halaman upload material (user story 5.5).
export default function MarketplacePage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <MaterialCatalog />
      </main>
    </>
  );
}
