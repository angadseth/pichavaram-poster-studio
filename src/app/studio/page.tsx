import { listHouses } from "@/lib/requests";
import { requireUser } from "@/lib/session";
import { todayIST } from "@/lib/validation";
import { Wizard } from "./wizard";

export const metadata = { title: "New poster · Pichavaram Poster Studio" };

export default async function StudioPage() {
  const user = await requireUser();
  const houses = (await listHouses()).map(({ id, name, logo }) => ({ id, name, logo }));
  return (
    <div className="shell pt-12">
      <Wizard houses={houses} defaults={{ hostName: user.name, region: user.region, email: user.email }} today={todayIST()} />
    </div>
  );
}
