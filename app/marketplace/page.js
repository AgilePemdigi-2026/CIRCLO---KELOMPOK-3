import Navbar from "@/components/Navbar";
import MaterialCatalog from "@/components/MaterialCatalog";

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
