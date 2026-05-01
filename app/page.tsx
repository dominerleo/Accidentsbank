import MapView from "@/components/map/MapView";
import Sidebar from "@/components/ui/Sidebar";

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <MapView />
      <Sidebar />
    </main>
  );
}
